import { useEffect } from "react";
import { boot, useChain } from "./lib/chain";
import { CONTRACTS } from "./lib/types";
import { RouterProvider, useRouter } from "./lib/router";
import { GlobalOverlays, Header } from "./components/TopBar";
import Home from "./pages/Home";
import Marketplace from "./pages/Marketplace";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import ArtifactPage from "./pages/Artifact";
import { IKeystone } from "./components/icons";
import { shortAddr } from "./lib/format";

function Splash() {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center">
        <IKeystone width={52} height={52} className="mx-auto text-bronze-400 animate-pulse" />
        <div className="font-display font-bold tracking-[0.2em] text-mist-100 text-xl mt-5">ARCA</div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.3em] text-mist-700 mt-2">Syncing ledger · indexing events…</div>
        <div className="mt-6 w-44 h-px mx-auto bg-ink-600 relative overflow-hidden">
          <span className="absolute inset-y-0 left-0 w-1/2 bg-bronze-400 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function Footer() {
  const s = useChain();
  return (
    <footer className="border-t border-ink-700/70 mt-10">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-14 grid md:grid-cols-[1.3fr_1fr_1fr] gap-10">
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <IKeystone width={22} height={22} className="text-bronze-400" />
            <span className="font-display font-bold tracking-[0.14em] text-mist-100">ARCA</span>
            <span className="font-mono text-[9px] tracking-[0.3em] text-mist-700 mt-1">HERITAGE LEDGER</span>
          </div>
          <p className="text-[13px] leading-relaxed text-mist-500 max-w-sm">
            On-chain provenance infrastructure for cultural heritage. Registry records are immutable and independently
            verifiable; marketplace windows are time-boxed, atomic and self-settling.
          </p>
          <p className="text-[12px] leading-relaxed text-mist-700 max-w-sm mt-4">
            ARCA authenticates the <em>record</em>, never the physical artifact. No fiat, no custody, no shipping —
            ETH on Sepolia only in this deployment.
          </p>
        </div>
        <div>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-mist-700 mb-4">Contracts · Sepolia</div>
          <div className="space-y-3 font-mono text-[12px]">
            <div>
              <div className="text-mist-500 mb-0.5">ArtifactRegistry</div>
              <div className="text-lapis-300">{shortAddr(CONTRACTS.registry)}</div>
            </div>
            <div>
              <div className="text-mist-500 mb-0.5">Marketplace</div>
              <div className="text-lapis-300">{shortAddr(CONTRACTS.marketplace)}</div>
            </div>
            <div>
              <div className="text-mist-500 mb-0.5">Indexer head</div>
              <div className="text-patina-300 tabular">block #{s.block.toLocaleString()} · lag 0</div>
            </div>
          </div>
        </div>
        <div>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-mist-700 mb-4">Assurances</div>
          <ul className="space-y-2.5 text-[13px] text-mist-500">
            <li className="flex gap-2.5"><span className="text-bronze-400">·</span> Private keys never leave your wallet</li>
            <li className="flex gap-2.5"><span className="text-bronze-400">·</span> Original Owner is immutable on-chain</li>
            <li className="flex gap-2.5"><span className="text-bronze-400">·</span> Auctions ≤ 48h · automatic settlement & refunds</li>
            <li className="flex gap-2.5"><span className="text-bronze-400">·</span> Gas disclosed before every signature</li>
            <li className="flex gap-2.5"><span className="text-bronze-400">·</span> Mainnet only after independent audit</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-800">
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-12 flex items-center justify-between font-mono text-[10.5px] text-mist-700">
          <span>© 2026 ARCA Foundation · cultural heritage registry</span>
          <span className="flex items-center gap-2"><span className="pulse-dot" /> SEPOLIA · TEST ENVIRONMENT</span>
        </div>
      </div>
    </footer>
  );
}

function Shell() {
  const s = useChain();
  const { route } = useRouter();
  useEffect(() => {
    void boot();
  }, []);

  if (!s.booted) return <Splash />;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {route.page === "home" && <Home />}
        {route.page === "market" && <Marketplace />}
        {route.page === "register" && <Register />}
        {route.page === "dashboard" && <Dashboard />}
        {route.page === "admin" && <Admin />}
        {route.page === "artifact" && <ArtifactPage />}
      </main>
      <Footer />
      <GlobalOverlays />
    </div>
  );
}

export default function App() {
  return (
    <>
      <div className="arca-bg" aria-hidden />
      <div className="arca-noise" aria-hidden />
      <RouterProvider>
        <Shell />
      </RouterProvider>
    </>
  );
}
