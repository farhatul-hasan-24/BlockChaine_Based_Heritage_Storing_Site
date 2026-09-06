import { useEffect, useState } from "react";
import {
  connectWallet, disconnectWallet, myBalance, signIn, signOut, switchNetwork, useChain,
} from "../lib/chain";
import { DEMO_GOOGLE_USERS } from "../lib/seed";
import { cx, formatEth, initials, shortAddr } from "../lib/format";
import { useRouter } from "../lib/router";
import { CONTRACTS, FAUCET_AMOUNT } from "../lib/types";
import type { GoogleUser } from "../lib/types";
import { Modal, onGate, requestGate, ToastHost } from "./ui";
import {
  IAlert, ICheck, IFox, IGoogle, IKeystone, IMuseum, ISeal, IUser, IWallet, IX,
} from "./icons";

/* ================= network status strip ================= */
export function NetStrip() {
  const s = useChain();
  const wrongNet = s.wallet && s.wallet.network !== "sepolia";
  return (
    <div className="border-b border-ink-700/60 bg-ink-950/70 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-5 md:px-8 h-9 flex items-center gap-4 md:gap-6 font-mono text-[11px] tracking-wide">
        <span className="flex items-center gap-2">
          <span className="pulse-dot" />
          <span className="text-patina-300">SEPOLIA TESTNET</span>
        </span>
        <span className="hidden sm:flex items-center gap-2 text-mist-500">
          BLOCK <span key={s.block} className="block-flash text-mist-300 tabular">#{s.block.toLocaleString()}</span>
        </span>
        <span className="hidden md:inline text-mist-700">GAS <span className="text-mist-400 tabular">{s.gasGwei.toFixed(1)} gwei</span></span>
        <span className="flex-1" />
        {wrongNet && (
          <button onClick={() => requestGate("wrongnet")} className="flex items-center gap-1.5 text-oxide-400 hover:text-oxide-300 transition-colors">
            <IAlert width={12} height={12} /> WALLET ON MAINNET — SWITCH REQUIRED
          </button>
        )}
        {s.wallet ? (
          <button onClick={() => requestGate("wallet")} className="flex items-center gap-2 text-mist-300 hover:text-bronze-300 transition-colors">
            <IFox width={13} height={13} className="text-bronze-400" />
            {shortAddr(s.wallet.address)}
            <span className="text-patina-300 tabular">{formatEth(myBalance())} ETH</span>
          </button>
        ) : (
          <button onClick={() => requestGate("wallet")} className="flex items-center gap-1.5 text-mist-400 hover:text-bronze-300 transition-colors">
            <IWallet width={13} height={13} /> CONNECT WALLET
          </button>
        )}
        <span className="hidden sm:block w-px h-4 bg-ink-600" />
        {s.user ? (
          <button onClick={() => requestGate("google")} className="hidden sm:flex items-center gap-1.5 text-mist-300 hover:text-bronze-300 transition-colors">
            <IGoogle width={12} height={12} /> {s.user.name.split(" ")[0].toUpperCase()}
          </button>
        ) : (
          <button onClick={() => requestGate("google")} className="hidden sm:flex items-center gap-1.5 text-mist-400 hover:text-bronze-300 transition-colors">
            <IUser width={13} height={13} /> SIGN IN
          </button>
        )}
      </div>
    </div>
  );
}

/* ================= header / nav ================= */
export function Header() {
  const s = useChain();
  const { route, go } = useRouter();
  const nav = [
    { id: "home" as const, label: "Registry" },
    { id: "market" as const, label: "Marketplace" },
    { id: "register" as const, label: "Register" },
    { id: "dashboard" as const, label: "My Vault" },
    ...(s.user?.role === "admin" ? [{ id: "admin" as const, label: "Admin" }] : []),
  ];
  return (
    <header className="sticky top-0 z-[70] bg-ink-900/85 backdrop-blur-md border-b border-ink-700/60">
      <NetStrip />
      <div className="max-w-7xl mx-auto px-5 md:px-8 h-[64px] flex items-center gap-6">
        <button onClick={() => go("home")} className="flex items-center gap-3 group">
          <IKeystone className="text-bronze-400 transition-transform duration-300 group-hover:-translate-y-0.5" width={26} height={26} />
          <span className="text-left leading-none">
            <span className="font-display font-bold text-[1.35rem] tracking-[0.14em] text-mist-100">ARCA</span>
            <span className="block font-mono text-[9px] tracking-[0.3em] text-mist-500 mt-1">HERITAGE LEDGER</span>
          </span>
        </button>
        <nav className="hidden md:flex items-center gap-7 ml-6">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => go(n.id)}
              className={cx(
                "chisel-underline text-[13.5px] tracking-wide transition-colors py-1",
                route.page === n.id ? "active text-bronze-300" : "text-mist-400 hover:text-mist-100"
              )}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <span className="flex-1" />
        <button
          onClick={() => go("register")}
          className="btn-bronze hidden sm:inline-flex items-center gap-2 px-4 py-2 text-[13px] tracking-wide"
        >
          <ISeal width={15} height={15} /> Register artifact
        </button>
      </div>
      {/* mobile nav */}
      <nav className="md:hidden flex items-center gap-5 px-5 pb-3 overflow-x-auto">
        {nav.map((n) => (
          <button
            key={n.id}
            onClick={() => go(n.id)}
            className={cx("whitespace-nowrap text-[13px]", route.page === n.id ? "text-bronze-300" : "text-mist-400")}
          >
            {n.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

/* ================= wallet modal ================= */
function WalletModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useChain();
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} width="max-w-md">
      <div className="p-7">
        <div className="flex items-center gap-3 mb-1">
          <IFox width={26} height={26} className="text-bronze-400" />
          <h3 className="font-display text-xl text-mist-100">EVM Wallet</h3>
        </div>
        <p className="text-[13px] text-mist-500 mb-6">
          MetaMask-compatible connection. Private keys never leave your wallet — ARCA never sees or stores them.
        </p>
        {!s.wallet ? (
          <button
            className="btn-bronze w-full py-3 text-sm flex items-center justify-center gap-2"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await connectWallet();
              setBusy(false);
              onClose();
            }}
          >
            {busy ? <span className="spin-slow inline-block w-4 h-4 border-2 border-ink-900/40 border-t-ink-900 rounded-full" /> : <IWallet width={16} height={16} />}
            {busy ? "Requesting wallet…" : "Connect MetaMask"}
          </button>
        ) : (
          <div className="space-y-4">
            <div className="plate p-4">
              <div className="font-mono text-[11px] text-mist-700 uppercase tracking-wider mb-1.5">Connected address</div>
              <div className="font-mono text-[13px] text-mist-200 break-all">{s.wallet.address}</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-[11px] text-mist-700 uppercase tracking-wider">Balance</span>
                <span className="font-mono text-patina-300 tabular">{formatEth(myBalance(), 5)} SepoliaETH</span>
              </div>
            </div>
            <div>
              <div className="font-mono text-[11px] text-mist-700 uppercase tracking-wider mb-2">Network</div>
              <div className="grid grid-cols-2 gap-2">
                {(["sepolia", "mainnet"] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => switchNetwork(n)}
                    className={cx(
                      "px-3 py-2.5 text-[13px] border transition-all",
                      s.wallet!.network === n
                        ? n === "sepolia"
                          ? "border-patina-500 text-patina-300 bg-patina-500/10"
                          : "border-oxide-500 text-oxide-300 bg-oxide-500/10"
                        : "border-ink-600 text-mist-500 hover:border-ink-500"
                    )}
                  >
                    {n === "sepolia" ? "Sepolia · dev" : "Mainnet · prod"}
                  </button>
                ))}
              </div>
              <p className="text-[12px] text-mist-700 mt-2 leading-relaxed">
                This deployment targets Sepolia. Switching to mainnet disables all write actions until you return.
              </p>
            </div>
            <button onClick={() => { disconnectWallet(); onClose(); }} className="btn-ghost w-full py-2.5 text-[13px]">
              Disconnect
            </button>
          </div>
        )}
        {!s.wallet && (
          <p className="text-[12px] text-mist-700 mt-4 leading-relaxed">
            First connection on a fresh address receives {FAUCET_AMOUNT} SepoliaETH from the test faucet. No fiat on-ramp — ETH only.
          </p>
        )}
      </div>
    </Modal>
  );
}

/* ================= google modal ================= */
function GoogleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useChain();
  const [custom, setCustom] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const roleTag: Record<string, string> = { user: "Collector", institution: "Institution", admin: "Administrator" };
  const pick = (u: GoogleUser) => {
    signIn(u);
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} width="max-w-md">
      <div className="p-7">
        <div className="flex items-center gap-3 mb-1">
          <IGoogle width={22} height={22} />
          <h3 className="font-display text-xl text-mist-100">Sign in with Google</h3>
        </div>
        <p className="text-[13px] text-mist-500 mb-6">Platform access for profiles, documents and notifications. Blockchain actions still require your wallet.</p>

        {s.user && (
          <div className="plate p-4 mb-5 flex items-center gap-3">
            <span className="w-9 h-9 grid place-items-center bg-patina-500/15 text-patina-300 font-semibold text-sm">{initials(s.user.name)}</span>
            <span className="flex-1">
              <span className="block text-sm text-mist-200">{s.user.name}</span>
              <span className="block font-mono text-[11px] text-mist-700">{s.user.email}</span>
            </span>
            <button onClick={() => { signOut(); onClose(); }} className="btn-ghost px-3 py-1.5 text-xs">Sign out</button>
          </div>
        )}

        <div className="space-y-2">
          {DEMO_GOOGLE_USERS.map((u) => (
            <button
              key={u.uid}
              onClick={() => pick(u)}
              className={cx("w-full plate plate-hover p-3.5 flex items-center gap-3.5 text-left", s.user?.uid === u.uid && "border-patina-500/50")}
            >
              <span className={cx("w-10 h-10 grid place-items-center font-semibold text-sm", u.role === "admin" ? "bg-oxide-500/15 text-oxide-300" : u.role === "institution" ? "bg-lapis-500/15 text-lapis-300" : "bg-bronze-500/15 text-bronze-300")}>
                {u.role === "institution" ? <IMuseum width={18} height={18} /> : initials(u.name)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm text-mist-200 truncate">{u.name}</span>
                <span className="block font-mono text-[11px] text-mist-700 truncate">{u.email}</span>
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-mist-500 border border-ink-600 px-2 py-1">{roleTag[u.role]}</span>
            </button>
          ))}
        </div>

        <div className="ruled mt-6 pt-5">
          {!custom ? (
            <button onClick={() => setCustom(true)} className="btn-ghost w-full py-2.5 text-[13px]">Use another account</button>
          ) : (
            <div className="space-y-3">
              <input className="field" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="field" placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button
                className="btn-bronze w-full py-2.5 text-sm"
                disabled={name.trim().length < 2 || !email.includes("@")}
                onClick={() => pick({ uid: "g-" + email, name: name.trim(), email: email.trim(), role: "user", org: "Independent" })}
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ================= wrong network modal ================= */
function WrongNetModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} width="max-w-md">
      <div className="p-7">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-10 h-10 grid place-items-center bg-oxide-500/15 text-oxide-400"><IAlert width={20} height={20} /></span>
          <h3 className="font-display text-xl text-mist-100">Wrong network</h3>
        </div>
        <p className="text-sm text-mist-400 leading-relaxed mb-2">
          Your wallet is pointed at <strong className="text-oxide-300">Ethereum mainnet</strong>. This ARCA deployment settles on the{" "}
          <strong className="text-patina-300">Sepolia testnet</strong>, so registering, bidding and buying are paused.
        </p>
        <p className="text-[12.5px] text-mist-700 leading-relaxed mb-6">
          Equivalent to <span className="font-mono">wallet_switchEthereumChain(0xaa36a7)</span> — no keys are touched.
        </p>
        <button
          className="btn-bronze w-full py-3 text-sm flex items-center justify-center gap-2"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await switchNetwork("sepolia");
            setBusy(false);
            onClose();
          }}
        >
          {busy ? <span className="spin-slow inline-block w-4 h-4 border-2 border-ink-900/40 border-t-ink-900 rounded-full" /> : <ICheck width={15} height={15} />}
          Switch wallet to Sepolia
        </button>
        <button onClick={onClose} className="w-full mt-3 text-[12.5px] text-mist-700 hover:text-mist-400 transition-colors py-1.5">
          Keep browsing without transacting
        </button>
      </div>
    </Modal>
  );
}

/* ================= transaction overlay ================= */
export function TxOverlay() {
  const s = useChain();
  const p = s.pending;
  const steps = ["Confirm in wallet", "Signing transaction", "Awaiting confirmations", "Confirmed on-chain"];
  const callOf: Record<string, string> = {
    mint: "ArtifactRegistry.mint(metaHash, mediaCid)",
    list: "Marketplace.createListing(id, kind, price, endsAt)",
    bid: "Marketplace.placeBid(id) · value locked in escrow",
    buy: "Marketplace.buyNow(id) · atomic transfer",
    settle: "Marketplace.settle(id)",
    refund: "Marketplace.refund(id, bidder)",
  };
  return (
    <Modal open={!!p} onClose={() => {}} locked width="max-w-md">
      {p && (
        <div className="p-7">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-mist-700 mb-2">Broadcasting · Sepolia</div>
          <h3 className="font-display text-lg text-mist-100 mb-5">{p.label}</h3>

          <div className="space-y-4 mb-6">
            {steps.map((label, i) => {
              const done = p.step > i;
              const active = p.step === i;
              return (
                <div key={label} className="flex items-center gap-3.5">
                  <span
                    className={cx(
                      "w-7 h-7 shrink-0 grid place-items-center border font-mono text-[11px] transition-all duration-500",
                      done ? "border-patina-500 text-patina-300 bg-patina-500/10" : active ? "border-bronze-400 text-bronze-300" : "border-ink-600 text-mist-700"
                    )}
                  >
                    {done ? <ICheck width={13} height={13} /> : active && i === 0 ? <IFox width={14} height={14} className="animate-pulse" /> : active ? <span className="spin-slow inline-block w-3 h-3 border border-bronze-300/40 border-t-bronze-300 rounded-full" /> : i + 1}
                  </span>
                  <span className={cx("text-[13.5px]", done ? "text-mist-300" : active ? "text-mist-100" : "text-mist-700")}>
                    {label}
                    {active && i === 2 && <span className="ml-2 font-mono text-patina-300 tabular">{p.confirmations}/2</span>}
                  </span>
                  {active && (
                    <span className="flex-1 h-px bg-ink-600 relative overflow-hidden">
                      <span className="absolute inset-y-0 left-0 w-1/3 bg-bronze-400 animate-pulse" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="plate p-4 font-mono text-[11.5px] space-y-2">
            <div className="flex justify-between gap-4"><span className="text-mist-700">CALL</span><span className="text-mist-300 text-right">{callOf[p.kind] ?? p.kind}</span></div>
            <div className="flex justify-between gap-4"><span className="text-mist-700">TX</span><span className="text-bronze-300 truncate max-w-[240px]">{p.txHash}</span></div>
            <div className="flex justify-between gap-4"><span className="text-mist-700">GAS</span><span className="text-mist-300 tabular">{s.gasGwei.toFixed(1)} gwei · est. fee disclosed before signing</span></div>
          </div>

          {p.step === 3 && (
            <div className="mt-6 flex items-center justify-center">
              <span className="stamp-in inline-flex items-center gap-2 border-2 border-patina-500 text-patina-300 px-5 py-2 font-mono text-[12px] tracking-[0.25em] uppercase">
                <ICheck width={14} height={14} /> Sealed on-chain
              </span>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ================= global overlays host ================= */
export function GlobalOverlays() {
  const [which, setWhich] = useState<null | "wallet" | "google" | "wrongnet">(null);
  useEffect(
    () =>
      onGate((e) => setWhich(e)),
    []
  );
  return (
    <>
      <WalletModal open={which === "wallet"} onClose={() => setWhich(null)} />
      <GoogleModal open={which === "google"} onClose={() => setWhich(null)} />
      <WrongNetModal open={which === "wrongnet"} onClose={() => setWhich(null)} />
      <TxOverlay />
      <ToastHost />
    </>
  );
}

export { CONTRACTS };
