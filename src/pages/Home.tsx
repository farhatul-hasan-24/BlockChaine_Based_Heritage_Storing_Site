import { useChain } from "../lib/chain";
import { personaName as personaNameOf } from "../lib/seed";
import { CATEGORIES, CONTRACTS, MAX_LISTING_HOURS } from "../lib/types";
import { cx, formatEth, shortHash, timeAgo } from "../lib/format";
import { useRouter } from "../lib/router";
import { ArtifactImg, Reveal, SectionTitle, useCountUp, useNow } from "../components/ui";
import { IArrow, IBolt, IGavel, IKeystone, IScroll, ISeal, IShieldCheck, IChain } from "../components/icons";

const kindColor: Record<string, string> = {
  mint: "text-patina-300 border-patina-500/40 bg-patina-500/10",
  list: "text-lapis-300 border-lapis-500/40 bg-lapis-500/10",
  bid: "text-bronze-300 border-bronze-500/40 bg-bronze-500/10",
  buy: "text-bronze-300 border-bronze-500/40 bg-bronze-500/10",
  settle: "text-patina-300 border-patina-500/40 bg-patina-500/10",
  refund: "text-mist-400 border-ink-600 bg-ink-800",
};

function Stat({ value, label, live }: { value: number; label: string; live?: boolean }) {
  const v = useCountUp(value);
  return (
    <div>
      <div className="font-display text-3xl md:text-4xl text-mist-100 tabular font-semibold">
        {live ? value.toLocaleString() : Math.round(v).toLocaleString()}
      </div>
      <div className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-mist-700 mt-1.5">{label}</div>
    </div>
  );
}

export default function Home() {
  const s = useChain();
  const now = useNow();
  const { go } = useRouter();

  const liveListings = s.listings.filter((l) => l.status === "active" && l.endsAt > now && !l.removedByAdmin);
  const transfers = s.artifacts.reduce((n, a) => n + a.provenance.filter((p) => p.kind === "transfer").length, 0);
  const featured = s.artifacts.find((a) => a.tokenId === 1003) ?? s.artifacts[0];
  const recentTxs = [...s.txs].sort((a, b) => b.ts - a.ts).slice(0, 7);

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-8">
      {/* ============ opening: the ledger itself ============ */}
      <section className="grid lg:grid-cols-12 gap-10 lg:gap-14 pt-14 md:pt-20 pb-16">
        <div className="lg:col-span-7">
          <div className="kicker flex items-center gap-3 mb-6">
            <span className="pulse-dot" />
            ArtifactRegistry · live on Sepolia · block <span className="text-mist-400 tabular">#{s.block.toLocaleString()}</span>
          </div>
          <h1 className="font-display font-bold text-[2.6rem] leading-[1.06] md:text-[3.9rem] text-mist-100">
            <span className="mask-line"><span>Every artifact,</span></span>
            <span className="mask-line"><span style={{ animationDelay: "0.12s" }}>an <em className="not-italic text-bronze-300">unbroken</em></span></span>
            <span className="mask-line"><span style={{ animationDelay: "0.24s" }}>chain of custody.</span></span>
          </h1>
          <p className="mt-7 max-w-xl text-[15.5px] leading-relaxed text-mist-400">
            Museums, collectors and private owners register cultural artifacts on Ethereum — metadata sealed by hash,
            media pinned to IPFS, ownership append-only. The <strong className="text-mist-200">Original Owner never changes</strong>;
            the Current Owner moves only by signed settlement. Trade by instant buy or auctions capped at{" "}
            <strong className="text-mist-200">{MAX_LISTING_HOURS} hours</strong>.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <button onClick={() => go("register")} className="btn-bronze inline-flex items-center gap-2.5 px-6 py-3.5 text-sm tracking-wide">
              <ISeal width={16} height={16} /> Register an artifact
            </button>
            <button onClick={() => go("market")} className="btn-ghost inline-flex items-center gap-2.5 px-6 py-3.5 text-sm tracking-wide">
              Browse marketplace <IArrow width={15} height={15} />
            </button>
          </div>
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-8 ruled pt-8">
            <Stat value={s.artifacts.length} label="Artifacts sealed" />
            <Stat value={transfers} label="Transfers recorded" />
            <Stat value={liveListings.length} label="Live listings" />
            <Stat value={s.block} label="Block height" live />
          </div>
        </div>

        {/* featured record */}
        <div className="lg:col-span-5">
          <Reveal delay={150}>
            {featured && (
              <article className="plate plate-hover group relative overflow-hidden">
                <div className="relative h-64 overflow-hidden">
                  <ArtifactImg src={featured.media} alt={featured.meta.title} className="w-full h-full object-cover img-fade" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/20 to-transparent" />
                  <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 bg-ink-950/80 backdrop-blur px-2.5 py-1 font-mono text-[10.5px] tracking-wider text-patina-300 border border-patina-500/30">
                    <IShieldCheck width={12} height={12} /> TOKEN #{featured.tokenId} · VERIFIED
                  </span>
                </div>
                <div className="p-6">
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bronze-400 mb-2">Latest provenance spotlight</div>
                  <h3 className="font-display text-xl text-mist-100 leading-snug">{featured.meta.title}</h3>
                  <div className="mt-4 space-y-0">
                    {featured.provenance.slice(0, 3).map((p, i) => (
                      <div key={p.txHash} className="flex gap-3.5">
                        <div className="flex flex-col items-center">
                          <span className={cx("w-2.5 h-2.5 rounded-full mt-1.5", p.kind === "mint" ? "bg-bronze-400" : "bg-patina-400")} />
                          {i < Math.min(featured.provenance.length, 3) - 1 && <span className="w-px flex-1 bg-ink-600" />}
                        </div>
                        <div className="pb-4">
                          <div className="text-[12.5px] text-mist-300">
                            {p.kind === "mint" ? "Minted · original owner" : "Transferred"}{" "}
                            <span className="text-mist-500">→ {personaNameOf(p.to)}</span>
                            {p.priceEth ? <span className="font-mono text-bronze-300 tabular"> · {formatEth(p.priceEth)} ETH</span> : null}
                          </div>
                          <div className="font-mono text-[10.5px] text-mist-700 mt-0.5">block #{p.block.toLocaleString()} · {timeAgo(p.ts)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => go("artifact", featured.tokenId)} className="mt-2 inline-flex items-center gap-2 text-[13px] text-bronze-300 hover:text-bronze-200 transition-colors">
                    Inspect the full record <IArrow width={14} height={14} />
                  </button>
                </div>
              </article>
            )}
          </Reveal>
        </div>
      </section>

      {/* ============ live ledger feed ============ */}
      <section className="pb-20">
        <SectionTitle kicker="Append-only · indexed from contract events" title="Live from the ledger" right={
          <span className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-mist-700"><span className="pulse-dot" /> STREAMING</span>
        } />
        <div className="plate overflow-hidden">
          <div className="hidden md:grid grid-cols-[110px_110px_1fr_200px_90px] gap-4 px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-mist-700 border-b border-ink-700">
            <span>Block</span><span>Event</span><span>Record</span><span>Tx hash</span><span className="text-right">Age</span>
          </div>
          {recentTxs.map((tx) => (
            <div key={tx.hash} className="row-enter grid md:grid-cols-[110px_110px_1fr_200px_90px] grid-cols-2 gap-x-4 gap-y-1 px-6 py-3.5 items-center border-b border-ink-800 last:border-0 hover:bg-ink-800/50 transition-colors group/row">
              <span className="font-mono text-[12px] text-mist-500 tabular">#{tx.block.toLocaleString()}</span>
              <span><span className={cx("inline-block px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border", kindColor[tx.kind] ?? kindColor.bid)}>{tx.kind}</span></span>
              <button className="text-left text-[13.5px] text-mist-200 hover:text-bronze-300 transition-colors truncate" onClick={() => tx.artifactId && go("artifact", tx.artifactId)}>
                {tx.label}
              </button>
              <span className="font-mono text-[11.5px] text-mist-700 group-hover/row:text-lapis-300 transition-colors truncate">{shortHash(tx.hash)}</span>
              <span className="font-mono text-[11px] text-mist-700 md:text-right tabular">{timeAgo(tx.ts)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ============ protocol rows ============ */}
      <section className="pb-20">
        <SectionTitle kicker="Two contracts, one source of truth" title="How the record is kept" />
        <div className="space-y-4">
          {[
            {
              n: "01", icon: <IScroll width={20} height={20} />, t: "Register — seal the record",
              d: "Upload media and catalog metadata. ARCA pins media to IPFS, hashes the canonical metadata JSON, and calls the registry. The mint writes metadata hash, registrant and an immutable timestamp — minting a token that is the artifact's legal-tech identity.",
              call: CONTRACTS.registryAbi,
            },
            {
              n: "02", icon: <IGavel width={20} height={20} />, t: "Trade — instant or auction, never longer than 48h",
              d: "The owner lists at a fixed price or opens an auction with a starting bid. Every listing carries a hard " + MAX_LISTING_HOURS + "-hour window enforced on-chain; extensions are impossible — an unsold lot expires and must be re-listed.",
              call: CONTRACTS.marketplaceAbi,
            },
            {
              n: "03", icon: <IChain width={20} height={20} />, t: "Settle — atomic transfer, automatic refunds",
              d: "An instant buy swaps funds and ownership in one transaction. Auctions settle themselves at close: the highest bidder becomes Current Owner, the seller is paid, and every losing bid is refunded by the contract — no claims, no waiting.",
              call: "Marketplace.sol · settle(uint256 id) · refund(uint256 id, address bidder)",
            },
          ].map((row, i) => (
            <Reveal key={row.n} delay={i * 120}>
              <div className="plate plate-hover grid md:grid-cols-[90px_56px_1fr] gap-5 md:gap-8 p-7 md:p-8 items-start">
                <span className="font-display text-4xl md:text-5xl font-bold text-ink-600 leading-none select-none">{row.n}</span>
                <span className="text-bronze-400 mt-1.5 hidden md:block">{row.icon}</span>
                <div>
                  <h3 className="font-display text-lg md:text-xl text-mist-100 mb-2.5">{row.t}</h3>
                  <p className="text-[14px] leading-relaxed text-mist-400 max-w-3xl">{row.d}</p>
                  <div className="mt-4 inline-block font-mono text-[11.5px] text-patina-300/90 bg-ink-950/60 border border-ink-700 px-3 py-1.5">{row.call}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ category index ============ */}
      <section className="pb-20">
        <SectionTitle kicker="Browse the registry" title="Collections by category" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CATEGORIES.map((c, i) => {
            const count = s.artifacts.filter((a) => a.meta.category === c).length;
            return (
              <Reveal key={c} delay={i * 60}>
                <button onClick={() => go("market", undefined, c)} className="w-full plate plate-hover p-5 text-left group flex items-center justify-between">
                  <span>
                    <span className="block text-[14.5px] text-mist-200 group-hover:text-bronze-300 transition-colors">{c}</span>
                    <span className="block font-mono text-[11px] text-mist-700 mt-1 tabular">{count} record{count === 1 ? "" : "s"}</span>
                  </span>
                  <IArrow width={16} height={16} className="text-mist-700 group-hover:text-bronze-300 group-hover:translate-x-1 transition-all" />
                </button>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ============ authenticity disclosure ============ */}
      <Reveal>
        <section className="mb-24 plate border-l-2 border-l-bronze-500 p-7 md:p-9 flex flex-col md:flex-row gap-6 items-start">
          <span className="w-12 h-12 shrink-0 grid place-items-center bg-bronze-500/10 text-bronze-400"><IKeystone width={26} height={26} /></span>
          <div>
            <h3 className="font-display text-lg text-mist-100 mb-2">What ARCA does — and does not — authenticate</h3>
            <p className="text-[14px] leading-relaxed text-mist-400 max-w-4xl">
              The ledger guarantees the <strong className="text-mist-200">integrity of the record</strong>: the metadata hash, the media
              commitment and the full ownership chain are independently verifiable by anyone, forever. It does{" "}
              <strong className="text-oxide-300">not</strong> attest to the physical genuineness of the artifact itself. Always pair the
              on-chain record with independent scholarly or scientific authentication.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 font-mono text-[10.5px] uppercase tracking-wider text-mist-700">
              <span className="border border-ink-600 px-2.5 py-1">No fiat · ETH only</span>
              <span className="border border-ink-600 px-2.5 py-1">No custody · shipping · insurance</span>
              <span className="border border-ink-600 px-2.5 py-1">Wallet required for every write</span>
              <span className="border border-ink-600 px-2.5 py-1">Audit before mainnet</span>
            </div>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
