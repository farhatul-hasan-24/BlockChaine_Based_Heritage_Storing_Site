import { useSyncExternalStore } from "react";
import {
  addressFromEmail, canonicalMeta, delay, makeCid, randomHex, sha256Hex, signPayload, txHash,
} from "./crypto";
import { buildSeed, personaName } from "./seed";
import { toast } from "./toast";
import {
  BID_GAS, BUY_GAS, CONTRACTS, FAUCET_AMOUNT, LIST_GAS, MAX_LISTING_HOURS, MIN_BID_INCREMENT,
  REGISTRY_GAS,
} from "./types";
import type {
  Artifact, ArtifactMeta, AppState, Certificate, Invoice, Listing, Tx, WalletInfo,
} from "./types";

const KEY = "arca-ledger-v3";
const HOUR = 3600_000;

function blankState(): AppState {
  return {
    v: 3, booted: false, block: 6_482_117, gasGwei: 14.2, wallet: null, user: null,
    artifacts: [], listings: [], txs: [], invoices: [], certificates: [],
    balances: {}, fauceted: [], pending: null,
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blankState();
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.v !== 3) return blankState();
    return { ...blankState(), ...parsed, pending: null, booted: true };
  } catch {
    return blankState();
  }
}

let state: AppState = load();
const listeners = new Set<() => void>();
let persistTimer: number | null = null;

function persist() {
  if (persistTimer) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    try {
      const snap = { ...state, pending: null };
      localStorage.setItem(KEY, JSON.stringify(snap));
    } catch (e) {
      console.warn("ARCA: state too large to persist", e);
    }
  }, 600);
}

function set(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
  persist();
}

export function getState(): AppState {
  return state;
}

export function useChain(): AppState {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state
  );
}

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

let booted = false;
export async function boot() {
  if (booted) return;
  booted = true;
  if (!state.booted) {
    await delay(700); // let the splash breathe
    const seed = await buildSeed();
    set({ ...seed, booted: true });
  }
  window.setInterval(tick, 4000);
}

/* ------------------------------------------------------------------ */
/* block production + automatic settlement                             */
/* ------------------------------------------------------------------ */

function tick() {
  const now = Date.now();
  const drift = (Math.random() - 0.48) * 1.6;
  const gasGwei = Math.min(42, Math.max(7, +(state.gasGwei + drift).toFixed(1)));
  let next: Partial<AppState> = { block: state.block + 1, gasGwei };

  const due = state.listings.filter((l) => l.status === "active" && l.endsAt <= now);
  if (due.length) {
    next = { ...next, ...applySettlements(due, now, state.block + 1) };
  }
  set(next);
}

function applySettlements(due: Listing[], now: number, block: number): Partial<AppState> {
  let artifacts = [...state.artifacts];
  let txs = [...state.txs];
  let invoices = [...state.invoices];
  let certificates = [...state.certificates];
  const balances = { ...state.balances };
  const dueIds = new Set(due.map((l) => l.tokenId));

  const listings = state.listings.map((l) => {
    if (!dueIds.has(l.tokenId)) return l;

    if (l.kind === "auction" && l.bids.length > 0) {
      const winner = l.bids.reduce((a, b) => (b.amountEth > a.amountEth ? b : a));
      const tx: Tx = {
        hash: txHash(), kind: "settle", from: CONTRACTS.marketplace, to: l.seller,
        valueEth: winner.amountEth, gasEth: 0, block, ts: now, artifactId: l.tokenId,
        label: "Auction settled · " + artifactTitle(l.tokenId),
      };
      txs = [...txs, tx];

      artifacts = artifacts.map((a) => {
        if (a.tokenId !== l.tokenId) return a;
        return {
          ...a,
          owner: winner.bidder,
          provenance: [
            ...a.provenance,
            { kind: "transfer" as const, from: l.seller, to: winner.bidder, txHash: tx.hash, block, ts: now, priceEth: winner.amountEth, note: "Auction settlement · highest bid" },
          ],
        };
      });

      balances[l.seller] = round6((balances[l.seller] ?? 0) + winner.amountEth);
      invoices = [
        ...invoices,
        saleInvoice(l.tokenId, winner.bidder, l.seller, winner.amountEth, tx.hash, now),
        purchaseInvoice(l.tokenId, winner.bidder, l.seller, winner.amountEth, tx.hash, now),
      ];
      certificates = [...certificates];

      const losers = l.bids.filter((b) => b.bidder !== winner.bidder);
      losers.forEach((b) => {
        const rTx: Tx = {
          hash: txHash(), kind: "refund", from: CONTRACTS.marketplace, to: b.bidder,
          valueEth: b.amountEth, gasEth: 0, block, ts: now, artifactId: l.tokenId,
          label: "Outbid refund · " + artifactTitle(l.tokenId),
        };
        txs = [...txs, rTx];
        balances[b.bidder] = round6((balances[b.bidder] ?? 0) + b.amountEth);
        invoices = [
          ...invoices,
          {
            id: "INV-" + l.tokenId + "-" + now + "-" + b.bidder.slice(2, 6), kind: "refund",
            artifactId: l.tokenId, tokenId: l.tokenId, title: artifactTitle(l.tokenId),
            priceEth: b.amountEth, counterparty: CONTRACTS.marketplace, owner: b.bidder,
            txHash: rTx.hash, ts: now, gasEth: 0, network: "sepolia",
          },
        ];
      });

      toast(`Auction settled — ${personaName(winner.bidder)} wins “${artifactTitle(l.tokenId)}” for ${winner.amountEth} ETH`, "ok");
      return { ...l, status: "sold" as const, result: { winner: winner.bidder, amountEth: winner.amountEth, txHash: tx.hash, ts: now } };
    }

    toast(`Listing expired · “${artifactTitle(l.tokenId)}” was delisted after the ${MAX_LISTING_HOURS}h window`, "warn");
    return { ...l, status: "expired" as const };
  });

  // async certificate for the winner — fire and forget, then re-set
  due.forEach((l) => {
    if (l.kind === "auction" && l.bids.length > 0) {
      const winner = l.bids.reduce((a, b) => (b.amountEth > a.amountEth ? b : a));
      issueCertificate(l.tokenId, winner.bidder, txHash()).then((cert) => {
        if (cert) set({ certificates: [...getState().certificates, cert] });
      });
    }
  });

  return { listings, artifacts, txs, invoices, certificates, balances };
}

async function issueCertificate(tokenId: number, holder: string, tx: string): Promise<Certificate | null> {
  const a = getState().artifacts.find((x) => x.tokenId === tokenId);
  if (!a) return null;
  const issuedAt = Date.now();
  const payload = JSON.stringify({ tokenId, holder, metadataHash: a.metadataHash, mediaHash: a.mediaHash, issuedAt, via: tx });
  const signature = await signPayload(payload, CONTRACTS.registry);
  return {
    id: "CERT-" + tokenId + "-" + Math.floor(issuedAt / 1000),
    tokenId, artifactId: tokenId, title: a.meta.title, category: a.meta.category, era: a.meta.era,
    holder, originalOwner: a.originalOwner, issuedAt, signature,
    metadataHash: a.metadataHash, mediaHash: a.mediaHash, mediaCid: a.mediaCid, network: "sepolia",
  };
}

function saleInvoice(tokenId: number, buyer: string, seller: string, priceEth: number, tx: string, ts: number): Invoice {
  return {
    id: "INV-" + tokenId + "-" + ts, kind: "sale", artifactId: tokenId, tokenId,
    title: artifactTitle(tokenId), priceEth, counterparty: buyer, owner: seller, txHash: tx,
    ts, gasEth: 0.0004, network: "sepolia",
  };
}
function purchaseInvoice(tokenId: number, buyer: string, seller: string, priceEth: number, tx: string, ts: number): Invoice {
  return {
    id: "INV-" + tokenId + "-" + ts + "-p", kind: "purchase", artifactId: tokenId, tokenId,
    title: artifactTitle(tokenId), priceEth, counterparty: seller, owner: buyer, txHash: tx,
    ts, gasEth: 0.0019, network: "sepolia",
  };
}

function round6(n: number) {
  return Math.round(n * 1e6) / 1e6;
}

export function artifactTitle(tokenId: number): string {
  const a = state.artifacts.find((x) => x.tokenId === tokenId);
  return a ? a.meta.title : "Artifact #" + tokenId;
}

/* ------------------------------------------------------------------ */
/* wallet + identity                                                   */
/* ------------------------------------------------------------------ */

export async function connectWallet(): Promise<WalletInfo> {
  await delay(900); // wallet popup round-trip
  const user = state.user;
  const address = user ? addressFromEmail(user.email) : "0x" + randomHex(20);
  const wallet: WalletInfo = { address, label: user ? user.name : "Wallet", network: "sepolia" };
  const patch: Partial<AppState> = { wallet };
  if (!state.fauceted.includes(address)) {
    patch.balances = { ...state.balances, [address]: round6((state.balances[address] ?? 0) + FAUCET_AMOUNT) };
    patch.fauceted = [...state.fauceted, address];
    toast(`Sepolia faucet · ${FAUCET_AMOUNT} test ETH sent to your wallet`, "ok");
  } else {
    toast("Wallet connected · " + address.slice(0, 10) + "…", "ok");
  }
  set(patch);
  return wallet;
}

export function disconnectWallet() {
  set({ wallet: null });
  toast("Wallet disconnected", "info");
}

export async function switchNetwork(network: WalletInfo["network"]) {
  await delay(700);
  if (!state.wallet) return;
  set({ wallet: { ...state.wallet, network } });
  toast(
    network === "sepolia" ? "Switched wallet to Sepolia testnet" : "Switched wallet to Ethereum mainnet — transactions are disabled here",
    network === "sepolia" ? "ok" : "warn"
  );
}

export function signIn(user: AppState["user"]) {
  set({ user });
  toast("Signed in as " + (user?.name ?? ""), "ok");
  if (user && state.wallet) {
    // re-bind the demo wallet to this identity
    const address = addressFromEmail(user.email);
    if (!state.fauceted.includes(address)) {
      set({
        wallet: { ...state.wallet, address, label: user.name },
        balances: { ...state.balances, [address]: round6((state.balances[address] ?? 0) + FAUCET_AMOUNT) },
        fauceted: [...state.fauceted, address],
      });
      toast(`Sepolia faucet · ${FAUCET_AMOUNT} test ETH sent to your wallet`, "ok");
    } else {
      set({ wallet: { ...state.wallet, address, label: user.name } });
    }
  }
}

export function signOut() {
  set({ user: null });
  toast("Signed out", "info");
}

export function myAddress(): string | null {
  return state.wallet?.address ?? null;
}

export function myBalance(): number {
  const a = myAddress();
  return a ? state.balances[a] ?? 0 : 0;
}

/** gate every write action behind Google session + wallet + correct network */
export function readiness(): { ok: boolean; missing: "user" | "wallet" | "network" | null } {
  if (!state.user) return { ok: false, missing: "user" };
  if (!state.wallet) return { ok: false, missing: "wallet" };
  if (state.wallet.network !== "sepolia") return { ok: false, missing: "network" };
  return { ok: true, missing: null };
}

/* ------------------------------------------------------------------ */
/* transaction runner (MetaMask-style confirmation flow)               */
/* ------------------------------------------------------------------ */

interface TxOpts {
  label: string;
  kind: Tx["kind"];
  from: string;
  to: string | null;
  valueEth: number;
  gasUnits: number;
  artifactId?: number;
  apply: (tx: Tx) => Promise<void> | void;
}

async function runTx(o: TxOpts): Promise<Tx> {
  const hash = txHash();
  set({ pending: { label: o.label, step: 0, confirmations: 0, txHash: hash, artifactId: o.artifactId, kind: o.kind } });
  await delay(1050);
  set({ pending: { label: o.label, step: 1, confirmations: 0, txHash: hash, artifactId: o.artifactId, kind: o.kind } });
  await delay(1250);
  set({ pending: { label: o.label, step: 2, confirmations: 0, txHash: hash, artifactId: o.artifactId, kind: o.kind } });
  await delay(950);
  set({ pending: { label: o.label, step: 2, confirmations: 1, txHash: hash, artifactId: o.artifactId, kind: o.kind } });
  await delay(1050);
  const gasEth = round6(o.gasUnits * state.gasGwei * 1e-9);
  const tx: Tx = {
    hash, kind: o.kind, from: o.from, to: o.to, valueEth: o.valueEth, gasEth,
    block: state.block + 1, ts: Date.now(), artifactId: o.artifactId ?? null, label: o.label,
  };
  set({ pending: { label: o.label, step: 2, confirmations: 2, txHash: hash, artifactId: o.artifactId, kind: o.kind } });
  await delay(650);
  await o.apply(tx);
  set({ pending: { label: o.label, step: 3, confirmations: 2, txHash: hash, artifactId: o.artifactId, kind: o.kind } });
  await delay(1000);
  set({ pending: null });
  return tx;
}

/* ------------------------------------------------------------------ */
/* actions                                                             */
/* ------------------------------------------------------------------ */

export interface RegisterInput {
  meta: ArtifactMeta;
  media: string;
  mediaName: string;
  mediaSize: number;
  mediaHash: string;
}

export async function registerArtifact(input: RegisterInput): Promise<number> {
  const from = myAddress();
  if (!from) throw new Error("no wallet");
  const metadataHash = await sha256Hex(canonicalMeta(input.meta, input.mediaHash));
  let mintedId = 0;

  await runTx({
    label: "Register artifact on ArtifactRegistry",
    kind: "mint",
    from,
    to: CONTRACTS.registry,
    valueEth: 0,
    gasUnits: REGISTRY_GAS,
    apply: (tx) => {
      const tokenId = Math.max(2000, ...state.artifacts.map((a) => a.tokenId)) + 1;
      mintedId = tokenId;
      const artifact: Artifact = {
        tokenId,
        metadataHash,
        metaCid: makeCid(metadataHash),
        mediaCid: makeCid(input.mediaHash),
        media: input.media,
        mediaName: input.mediaName,
        mediaSize: input.mediaSize,
        mediaHash: input.mediaHash,
        meta: input.meta,
        owner: from,
        originalOwner: from,
        registeredAt: tx.ts,
        registeredBlock: tx.block,
        provenance: [
          { kind: "mint", from: null, to: from, txHash: tx.hash, block: tx.block, ts: tx.ts, note: "Registered on-chain · original owner" },
        ],
        verified: true,
      };
      set({ artifacts: [...state.artifacts, artifact], txs: [...state.txs, tx] });
      return issueCertificate(tokenId, from, tx.hash).then((cert) => {
        if (cert) set({ certificates: [...getState().certificates, cert] });
      });
    },
  });

  toast(`Token #${mintedId} minted · provenance anchored on-chain`, "ok");
  return mintedId;
}

export async function createListing(tokenId: number, kind: Listing["kind"], priceEth: number, hours: number): Promise<void> {
  const from = myAddress();
  if (!from) throw new Error("no wallet");
  if (hours <= 0 || hours > MAX_LISTING_HOURS) throw new Error("duration exceeds 48h cap");
  if (state.listings.some((l) => l.tokenId === tokenId && l.status === "active")) throw new Error("already listed");

  await runTx({
    label: kind === "buy" ? "Open instant-buy listing" : "Open auction listing",
    kind: "list",
    from,
    to: CONTRACTS.marketplace,
    valueEth: 0,
    gasUnits: LIST_GAS,
    artifactId: tokenId,
    apply: (tx) => {
      const now = tx.ts;
      const listing: Listing = {
        tokenId, seller: from, kind, priceEth,
        createdAt: now, endsAt: now + hours * HOUR,
        status: "active", bids: [], flags: [],
      };
      set({ listings: [listing, ...state.listings], txs: [...state.txs, tx] });
    },
  });
  toast(kind === "buy" ? "Instant-buy listing is live" : "Auction is live — settlement is automatic at close", "ok");
}

export function bidFloor(l: Listing): number {
  const top = l.bids.reduce((m, b) => Math.max(m, b.amountEth), 0);
  return top > 0 ? round6(top + MIN_BID_INCREMENT) : l.priceEth;
}

export async function placeBid(tokenId: number, amountEth: number): Promise<void> {
  const from = myAddress();
  if (!from) throw new Error("no wallet");
  const l = state.listings.find((x) => x.tokenId === tokenId && x.status === "active");
  if (!l || l.kind !== "auction") throw new Error("no active auction");
  if (l.endsAt <= Date.now()) throw new Error("auction ended");
  if (l.seller.toLowerCase() === from.toLowerCase()) throw new Error("seller cannot bid");
  const floor = bidFloor(l);
  if (amountEth < floor) throw new Error(`bid must be ≥ ${floor} ETH`);
  const gas = BID_GAS * state.gasGwei * 1e-9;
  if ((state.balances[from] ?? 0) < amountEth + gas) throw new Error("insufficient balance for bid + gas");

  await runTx({
    label: "Place auction bid",
    kind: "bid",
    from,
    to: CONTRACTS.marketplace,
    valueEth: amountEth,
    gasUnits: BID_GAS,
    artifactId: tokenId,
    apply: (tx) => {
      const listings = state.listings.map((x) =>
        x.tokenId === tokenId && x.status === "active"
          ? { ...x, bids: [...x.bids, { bidder: from, amountEth, txHash: tx.hash, ts: tx.ts }] }
          : x
      );
      set({
        listings,
        txs: [...state.txs, tx],
        balances: { ...state.balances, [from]: round6((state.balances[from] ?? 0) - amountEth - tx.gasEth) },
      });
    },
  });
  toast("Bid locked in escrow — losing bids are refunded automatically at settlement", "ok");
}

export async function buyNow(tokenId: number): Promise<void> {
  const from = myAddress();
  if (!from) throw new Error("no wallet");
  const l = state.listings.find((x) => x.tokenId === tokenId && x.status === "active" && x.kind === "buy");
  if (!l) throw new Error("listing unavailable");
  if (l.endsAt <= Date.now()) throw new Error("listing expired");
  if (l.seller.toLowerCase() === from.toLowerCase()) throw new Error("seller cannot buy their own listing");
  const gas = BUY_GAS * state.gasGwei * 1e-9;
  if ((state.balances[from] ?? 0) < l.priceEth + gas) throw new Error("insufficient balance for price + gas");

  await runTx({
    label: "Instant buy · atomic ownership transfer",
    kind: "buy",
    from,
    to: l.seller,
    valueEth: l.priceEth,
    gasUnits: BUY_GAS,
    artifactId: tokenId,
    apply: async (tx) => {
      const listings = state.listings.map((x) =>
        x.tokenId === tokenId && x.status === "active"
          ? { ...x, status: "sold" as const, result: { winner: from, amountEth: l.priceEth, txHash: tx.hash, ts: tx.ts } }
          : x
      );
      const artifacts = state.artifacts.map((a) =>
        a.tokenId === tokenId
          ? {
              ...a,
              owner: from,
              provenance: [
                ...a.provenance,
                { kind: "transfer" as const, from: l.seller, to: from, txHash: tx.hash, block: tx.block, ts: tx.ts, priceEth: l.priceEth, note: "Instant buy · atomic settlement" },
              ],
            }
          : a
      );
      const balances = {
        ...state.balances,
        [from]: round6((state.balances[from] ?? 0) - l.priceEth - tx.gasEth),
        [l.seller]: round6((state.balances[l.seller] ?? 0) + l.priceEth),
      };
      set({
        listings, artifacts, balances,
        txs: [...state.txs, tx],
        invoices: [
          ...state.invoices,
          saleInvoice(tokenId, from, l.seller, l.priceEth, tx.hash, tx.ts),
          purchaseInvoice(tokenId, from, l.seller, l.priceEth, tx.hash, tx.ts),
        ],
      });
      const cert = await issueCertificate(tokenId, from, tx.hash);
      if (cert) set({ certificates: [...getState().certificates, cert] });
    },
  });
  toast(`Ownership transferred — “${artifactTitle(tokenId)}” is now in your vault`, "ok");
}

/* ------------------------------------------------------------------ */
/* verification, flags, admin                                          */
/* ------------------------------------------------------------------ */

export async function verifyArtifact(tokenId: number): Promise<boolean> {
  await delay(900);
  const a = state.artifacts.find((x) => x.tokenId === tokenId);
  if (!a) return false;
  const recomputed = await sha256Hex(canonicalMeta(a.meta, a.mediaHash));
  const ok = recomputed === a.metadataHash;
  set({ artifacts: state.artifacts.map((x) => (x.tokenId === tokenId ? { ...x, verified: ok } : x)) });
  toast(ok ? "Record verified — metadata hash matches the on-chain commitment" : "Verification failed — metadata diverges from the on-chain hash", ok ? "ok" : "err");
  return ok;
}

export async function flagListing(tokenId: number, reason: string): Promise<void> {
  const by = myAddress() ?? "guest";
  set({
    listings: state.listings.map((l) =>
      l.tokenId === tokenId ? { ...l, flags: [...l.flags, { reason, by, ts: Date.now() }] } : l
    ),
  });
  toast("Report filed — a platform administrator will review this listing", "info");
}

export function adminResolve(tokenId: number, action: "clear" | "remove") {
  set({
    listings: state.listings.map((l) =>
      l.tokenId === tokenId
        ? action === "clear"
          ? { ...l, flags: [] }
          : { ...l, flags: [], removedByAdmin: true, status: l.status === "active" ? "expired" : l.status }
        : l
    ),
  });
  toast(action === "clear" ? "Flags cleared — listing reinstated" : "Listing removed from the marketplace", action === "clear" ? "ok" : "warn");
}
