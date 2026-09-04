import { useMemo, useState } from "react";
import { bidFloor, buyNow, createListing, placeBid, flagListing, useChain } from "../lib/chain";
import { artifactTitle } from "../lib/chain";
import { toast } from "../lib/toast";
import { cx, formatEth } from "../lib/format";
import { BID_GAS, BUY_GAS, LIST_GAS, MAX_LISTING_HOURS } from "../lib/types";
import type { Listing } from "../lib/types";
import { Modal, requireChain, useNow } from "./ui";
import { IBolt, IGas, IGavel } from "./icons";

function GasNote({ gasUnits }: { gasUnits: number }) {
  const s = useChain();
  const eth = gasUnits * s.gasGwei * 1e-9;
  return (
    <div className="flex items-start gap-2.5 plate px-3.5 py-3 text-[12px] text-mist-500 leading-relaxed">
      <IGas width={15} height={15} className="text-bronze-400 mt-0.5 shrink-0" />
      <span>
        Network fee ≈ <strong className="text-mist-300 font-mono">{eth.toFixed(6)} ETH</strong> ({gasUnits.toLocaleString()} gas ×{" "}
        {s.gasGwei.toFixed(1)} gwei) on <strong className="text-patina-300">Sepolia testnet</strong>. Disclosed before you sign; settled by your wallet, never by ARCA.
      </span>
    </div>
  );
}

/* ---------------- create listing ---------------- */
export function ListingModal({ tokenId, open, onClose }: { tokenId: number; open: boolean; onClose: () => void }) {
  const [kind, setKind] = useState<"buy" | "auction">("auction");
  const [price, setPrice] = useState("1.5");
  const [hours, setHours] = useState(24);
  const [busy, setBusy] = useState(false);
  const priceNum = parseFloat(price);
  const valid = !isNaN(priceNum) && priceNum > 0 && hours >= 1 && hours <= MAX_LISTING_HOURS;

  const submit = async () => {
    if (!requireChain() || !valid) return;
    setBusy(true);
    try {
      await createListing(tokenId, kind, priceNum, hours);
      onClose();
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} width="max-w-md">
      <div className="p-7">
        <div className="kicker mb-2">Marketplace · token #{tokenId}</div>
        <h3 className="font-display text-xl text-mist-100 mb-6">List “{artifactTitle(tokenId)}”</h3>

        <div className="grid grid-cols-2 gap-2 mb-5">
          <button onClick={() => setKind("auction")} className={cx("p-3.5 border text-left transition-all", kind === "auction" ? "border-bronze-500 bg-bronze-500/10" : "border-ink-600 hover:border-ink-500")}>
            <IGavel width={17} height={17} className={kind === "auction" ? "text-bronze-300" : "text-mist-500"} />
            <span className="block text-sm mt-1.5 text-mist-200">Auction</span>
            <span className="block text-[11.5px] text-mist-700 mt-0.5">Highest bid wins at close</span>
          </button>
          <button onClick={() => setKind("buy")} className={cx("p-3.5 border text-left transition-all", kind === "buy" ? "border-lapis-500 bg-lapis-500/10" : "border-ink-600 hover:border-ink-500")}>
            <IBolt width={17} height={17} className={kind === "buy" ? "text-lapis-300" : "text-mist-500"} />
            <span className="block text-sm mt-1.5 text-mist-200">Instant buy</span>
            <span className="block text-[11.5px] text-mist-700 mt-0.5">Fixed price, atomic transfer</span>
          </button>
        </div>

        <label className="block font-mono text-[11px] uppercase tracking-wider text-mist-700 mb-1.5">
          {kind === "auction" ? "Starting price (ETH)" : "Fixed price (ETH)"}
        </label>
        <input className="field font-mono tabular" type="number" min="0.01" step="0.05" value={price} onChange={(e) => setPrice(e.target.value)} />

        <label className="flex justify-between font-mono text-[11px] uppercase tracking-wider text-mist-700 mt-5 mb-2">
          <span>Listing window</span>
          <span className="text-bronze-300 tabular">{hours}h / {MAX_LISTING_HOURS}h max</span>
        </label>
        <input type="range" min={1} max={MAX_LISTING_HOURS} value={hours} onChange={(e) => setHours(+e.target.value)} className="w-full" />
        <p className="text-[12px] text-mist-700 mt-2 leading-relaxed">
          The {MAX_LISTING_HOURS}-hour cap is enforced by the Marketplace contract — <em>no extensions</em>. Unsold listings auto-expire; re-list afterwards if you wish.
        </p>

        <div className="mt-5"><GasNote gasUnits={LIST_GAS} /></div>

        <button className="btn-bronze w-full mt-5 py-3 text-sm flex items-center justify-center gap-2" disabled={!valid || busy} onClick={submit}>
          {busy && <span className="spin-slow inline-block w-4 h-4 border-2 border-ink-900/40 border-t-ink-900 rounded-full" />}
          {kind === "auction" ? "Open auction" : "List for instant buy"}
        </button>
      </div>
    </Modal>
  );
}

/* ---------------- place bid ---------------- */
export function BidModal({ listing, open, onClose }: { listing: Listing | null; open: boolean; onClose: () => void }) {
  const s = useChain();
  const now = useNow();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const floor = useMemo(() => (listing ? bidFloor(listing) : 0), [listing, s.listings]);
  const amt = parseFloat(amount);
  const me = s.wallet?.address ?? "";
  const myTopBid = listing?.bids.filter((b) => b.bidder.toLowerCase() === me.toLowerCase()).reduce((m, b) => Math.max(m, b.amountEth), 0) ?? 0;
  const balance = me ? s.balances[me] ?? 0 : 0;
  const gas = BID_GAS * s.gasGwei * 1e-9;
  const insufficient = !isNaN(amt) && amt + gas > balance;
  const valid = listing && !isNaN(amt) && amt >= floor && !insufficient;
  const msLeft = listing ? listing.endsAt - now : 0;

  const submit = async () => {
    if (!requireChain() || !listing || !valid) return;
    setBusy(true);
    try {
      await placeBid(listing.tokenId, amt);
      setAmount("");
      onClose();
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(false);
    }
  };

  if (!listing) return null;
  return (
    <Modal open={open} onClose={onClose} width="max-w-md">
      <div className="p-7">
        <div className="kicker mb-2">Auction · token #{listing.tokenId}</div>
        <h3 className="font-display text-xl text-mist-100 mb-6">Bid on “{artifactTitle(listing.tokenId)}”</h3>

        <div className="grid grid-cols-3 gap-2 mb-5 font-mono text-center">
          <div className="plate p-3"><div className="text-[10px] uppercase tracking-wider text-mist-700 mb-1">Current top</div><div className="text-bronze-300 tabular text-sm">{formatEth(listing.bids.reduce((m, b) => Math.max(m, b.amountEth), 0))} ETH</div></div>
          <div className="plate p-3"><div className="text-[10px] uppercase tracking-wider text-mist-700 mb-1">Min next bid</div><div className="text-mist-200 tabular text-sm">{formatEth(floor)} ETH</div></div>
          <div className="plate p-3"><div className="text-[10px] uppercase tracking-wider text-mist-700 mb-1">Closes in</div><div className={cx("tabular text-sm", msLeft < 3600_000 ? "text-oxide-400" : "text-patina-300")}>{Math.max(0, Math.floor(msLeft / 3600_000))}h {Math.max(0, Math.floor((msLeft % 3600_000) / 60000))}m</div></div>
        </div>

        <label className="block font-mono text-[11px] uppercase tracking-wider text-mist-700 mb-1.5">Your bid (ETH)</label>
        <input className="field font-mono tabular" type="number" min={floor} step="0.05" value={amount} placeholder={`≥ ${formatEth(floor)}`} onChange={(e) => setAmount(e.target.value)} />
        <div className="flex gap-2 mt-2.5">
          {[0, 0.1, 0.25].map((d) => (
            <button key={d} onClick={() => setAmount((floor + d).toFixed(2))} className="btn-ghost px-3 py-1.5 font-mono text-[11.5px] tabular">
              {d === 0 ? "min" : "+" + d}
            </button>
          ))}
          {myTopBid > 0 && <span className="ml-auto self-center font-mono text-[11px] text-mist-700">your escrow: {formatEth(myTopBid)} ETH</span>}
        </div>
        {insufficient && <p className="text-[12px] text-oxide-400 mt-2">Insufficient balance — bid plus gas exceeds {formatEth(balance, 3)} ETH.</p>}

        <p className="text-[12px] text-mist-700 mt-4 leading-relaxed">
          Your bid is locked in contract escrow. Outbid amounts and losing bids are <strong className="text-mist-400">refunded automatically at settlement</strong> — no manual claiming.
        </p>
        <div className="mt-4"><GasNote gasUnits={BID_GAS} /></div>

        <button className="btn-bronze w-full mt-5 py-3 text-sm flex items-center justify-center gap-2" disabled={!valid || busy} onClick={submit}>
          {busy && <span className="spin-slow inline-block w-4 h-4 border-2 border-ink-900/40 border-t-ink-900 rounded-full" />}
          Place bid of {isNaN(amt) ? "…" : formatEth(amt)} ETH
        </button>
      </div>
    </Modal>
  );
}

/* ---------------- instant buy ---------------- */
export function BuyModal({ listing, open, onClose }: { listing: Listing | null; open: boolean; onClose: () => void }) {
  const s = useChain();
  const [busy, setBusy] = useState(false);
  const me = s.wallet?.address ?? "";
  const balance = me ? s.balances[me] ?? 0 : 0;
  const gas = BUY_GAS * s.gasGwei * 1e-9;
  if (!listing) return null;
  const total = listing.priceEth + gas;
  const insufficient = total > balance;

  const submit = async () => {
    if (!requireChain()) return;
    setBusy(true);
    try {
      await buyNow(listing.tokenId);
      onClose();
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} width="max-w-md">
      <div className="p-7">
        <div className="kicker mb-2">Instant buy · token #{listing.tokenId}</div>
        <h3 className="font-display text-xl text-mist-100 mb-6">Acquire “{artifactTitle(listing.tokenId)}”</h3>
        <div className="plate p-4 font-mono text-[12.5px] space-y-2.5 mb-4">
          <div className="flex justify-between"><span className="text-mist-700">PRICE</span><span className="text-mist-200 tabular">{formatEth(listing.priceEth)} ETH</span></div>
          <div className="flex justify-between"><span className="text-mist-700">NETWORK FEE</span><span className="text-mist-200 tabular">≈ {gas.toFixed(6)} ETH</span></div>
          <div className="ruled pt-2.5 flex justify-between"><span className="text-bronze-400">TOTAL</span><span className="text-bronze-300 tabular">{formatEth(total, 6)} ETH</span></div>
          <div className="flex justify-between"><span className="text-mist-700">BALANCE</span><span className={cx("tabular", insufficient ? "text-oxide-400" : "text-patina-300")}>{formatEth(balance, 5)} ETH</span></div>
        </div>
        <p className="text-[12.5px] text-mist-500 leading-relaxed mb-4">
          One signed transaction moves funds to the seller and rewrites <strong className="text-mist-300">Current Owner</strong> to your address — atomic, or nothing happens. The{" "}
          <strong className="text-mist-300">Original Owner</strong> field stays permanently anchored to the registrant.
        </p>
        {insufficient && <p className="text-[12px] text-oxide-400 mb-4">Insufficient SepoliaETH for price + fee.</p>}
        <button className="btn-bronze w-full py-3 text-sm flex items-center justify-center gap-2" disabled={insufficient || busy} onClick={submit}>
          {busy && <span className="spin-slow inline-block w-4 h-4 border-2 border-ink-900/40 border-t-ink-900 rounded-full" />}
          <IBolt width={15} height={15} /> Buy now · {formatEth(listing.priceEth)} ETH
        </button>
        <p className="text-center text-[11.5px] text-mist-700 mt-3 font-mono">ETH only · no fiat · Sepolia testnet</p>
      </div>
    </Modal>
  );
}

/* ---------------- flag / report ---------------- */
export function FlagModal({ tokenId, open, onClose }: { tokenId: number; open: boolean; onClose: () => void }) {
  const [reason, setReason] = useState("Provenance claim conflicts with published records");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    await flagListing(tokenId, detail.trim() ? reason + " — " + detail.trim() : reason);
    setBusy(false);
    setDetail("");
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} width="max-w-md">
      <div className="p-7">
        <div className="kicker mb-2">Community moderation</div>
        <h3 className="font-display text-xl text-mist-100 mb-2">Report token #{tokenId}</h3>
        <p className="text-[12.5px] text-mist-700 leading-relaxed mb-5">
          Reports go to the platform administrator. On-chain records are immutable — moderation delists the marketplace entry, never the registry record.
        </p>
        <label className="block font-mono text-[11px] uppercase tracking-wider text-mist-700 mb-1.5">Reason</label>
        <select className="field" value={reason} onChange={(e) => setReason(e.target.value)}>
          <option>Provenance claim conflicts with published records</option>
          <option>Suspected illicit export or ownership dispute</option>
          <option>Duplicate or plagiarized registration</option>
          <option>Misleading media or description</option>
          <option>Other</option>
        </select>
        <label className="block font-mono text-[11px] uppercase tracking-wider text-mist-700 mt-4 mb-1.5">Details (optional)</label>
        <textarea className="field min-h-[90px]" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Cite catalogues, inventories, database entries…" />
        <button className="btn-ghost w-full mt-5 py-2.5 text-sm border-oxide-500/50 text-oxide-300 hover:border-oxide-400 flex items-center justify-center gap-2" disabled={busy} onClick={submit}>
          {busy && <span className="spin-slow inline-block w-4 h-4 border-2 border-oxide-500/40 border-t-oxide-400 rounded-full" />}
          Submit report
        </button>
      </div>
    </Modal>
  );
}
