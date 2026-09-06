import { adminResolve, useChain } from "../lib/chain";
import { personaName } from "../lib/seed";
import { countdown, cx, fmtDateTime, formatEth, shortAddr, timeAgo } from "../lib/format";
import { useRouter } from "../lib/router";
import { ArtifactImg, KindBadge, Reveal, StatusChip, useNow } from "../components/ui";
import { IAlert, ICheck, IFlag, IShieldCheck, IX } from "../components/icons";

export default function Admin() {
  const s = useChain();
  const now = useNow();
  const { go } = useRouter();

  if (!s.user || s.user.role !== "admin") {
    return (
      <div className="max-w-3xl mx-auto px-5 py-28 text-center">
        <IShieldCheck width={36} height={36} className="mx-auto text-mist-700 mb-6" />
        <h1 className="font-display text-2xl text-mist-300 mb-3">Administrator access only</h1>
        <p className="text-[14px] text-mist-700 leading-relaxed max-w-md mx-auto">
          Moderation, dispute flags and platform health are restricted to the platform administrator role. Sign in with the Ledger Admin account to continue.
        </p>
      </div>
    );
  }

  const flagged = s.listings.filter((l) => l.flags.length > 0);
  const active = s.listings.filter((l) => l.status === "active" && l.endsAt > now);
  const settled = s.listings.filter((l) => l.status === "sold").length;
  const removed = s.listings.filter((l) => l.removedByAdmin).length;

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-12 md:py-16">
      <div className="kicker mb-3">Ledger Admin · moderation does not touch on-chain records</div>
      <h1 className="font-display font-bold text-3xl md:text-[2.6rem] text-mist-100 leading-tight mb-10">Platform console</h1>

      {/* health strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
        {[
          { v: flagged.length, l: "Open flags", tone: flagged.length ? "text-oxide-400" : "text-patina-300" },
          { v: active.length, l: "Active listings", tone: "text-mist-100" },
          { v: settled, l: "Settled sales", tone: "text-bronze-300" },
          { v: removed, l: "Removed by admin", tone: "text-mist-400" },
          { v: s.block, l: "Indexer head · lag 0", tone: "text-patina-300", live: true },
        ].map((x, i) => (
          <Reveal key={x.l} delay={i * 60}>
            <div className="plate p-5">
              <div className={cx("font-display text-2xl tabular font-semibold", x.tone)}>{x.live ? x.v.toLocaleString() : x.v}</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-mist-700 mt-1.5">{x.l}</div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* flag queue */}
      <section className="mb-14">
        <div className="flex items-center gap-3 mb-6">
          <IFlag width={18} height={18} className="text-oxide-400" />
          <h2 className="font-display text-xl text-mist-100">Dispute & flag queue</h2>
          <span className="font-mono text-[11px] text-mist-700">({flagged.length} open)</span>
        </div>
        {flagged.length === 0 ? (
          <div className="plate p-8 flex items-center gap-4">
            <span className="w-10 h-10 grid place-items-center border border-patina-500/50 text-patina-300"><ICheck width={16} height={16} /></span>
            <p className="text-[13.5px] text-mist-500">Queue clear — no listings currently carry community reports.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {flagged.map((l) => {
              const a = s.artifacts.find((x) => x.tokenId === l.tokenId);
              return (
                <div key={l.tokenId} className="plate border-l-2 border-l-oxide-500 p-5">
                  <div className="flex flex-wrap gap-5 items-start">
                    <button className="w-24 h-[72px] overflow-hidden shrink-0" onClick={() => go("artifact", l.tokenId)}>
                      {a && <ArtifactImg src={a.media} alt={a.meta.title} className="w-full h-full object-cover img-fade" />}
                    </button>
                    <div className="flex-1 min-w-[240px]">
                      <button className="font-display text-[16px] text-mist-100 hover:text-bronze-300 transition-colors" onClick={() => go("artifact", l.tokenId)}>{a?.meta.title}</button>
                      <div className="font-mono text-[11px] text-mist-700 mt-0.5">#{l.tokenId} · seller {personaName(l.seller)} · {shortAddr(l.seller)}</div>
                      {l.flags.map((f, i) => (
                        <div key={i} className="mt-3 flex items-start gap-2.5">
                          <IAlert width={14} height={14} className="text-oxide-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[13px] text-mist-300 leading-snug">{f.reason}</p>
                            <p className="font-mono text-[10.5px] text-mist-700 mt-1">reported by {shortAddr(f.by)} · {timeAgo(f.ts)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2 w-full sm:w-44">
                      <button className="btn-ghost inline-flex items-center justify-center gap-2 px-3 py-2 text-[12.5px] border-patina-500/50 text-patina-300" onClick={() => adminResolve(l.tokenId, "clear")}>
                        <ICheck width={13} height={13} /> Dismiss flags
                      </button>
                      <button className="btn-ghost inline-flex items-center justify-center gap-2 px-3 py-2 text-[12.5px] border-oxide-500/50 text-oxide-300" onClick={() => adminResolve(l.tokenId, "remove")}>
                        <IX width={13} height={13} /> Delist from market
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* all listings */}
      <section>
        <h2 className="font-display text-xl text-mist-100 mb-6">All marketplace windows</h2>
        <div className="plate overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-mist-700 border-b border-ink-700">
            <span>Lot</span><span>Type</span><span>Status</span><span>Price / top bid</span><span className="text-right">Window</span>
          </div>
          {s.listings.map((l) => {
            const a = s.artifacts.find((x) => x.tokenId === l.tokenId);
            const top = l.bids.reduce((m, b) => Math.max(m, b.amountEth), 0);
            const isActive = l.status === "active" && l.endsAt > now;
            return (
              <div key={l.tokenId + "" + l.createdAt} className={cx("grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr] grid-cols-2 gap-x-4 gap-y-1 px-6 py-3.5 items-center border-b border-ink-800 last:border-0", l.removedByAdmin && "opacity-50")}>
                <button className="text-left text-[13.5px] text-mist-200 hover:text-bronze-300 transition-colors truncate" onClick={() => go("artifact", l.tokenId)}>
                  {a?.meta.title} <span className="font-mono text-[10.5px] text-mist-700">#{l.tokenId}</span>
                </button>
                <span><KindBadge kind={l.kind} /></span>
                <span>{l.removedByAdmin ? <span className="font-mono text-[10.5px] uppercase tracking-wider text-oxide-400 border border-oxide-500/40 px-2 py-1">removed</span> : <StatusChip status={isActive ? "active" : l.status} />}</span>
                <span className="font-mono text-[12.5px] text-bronze-300 tabular">{formatEth(l.kind === "auction" ? Math.max(l.priceEth, top) : l.priceEth)} ETH</span>
                <span className="font-mono text-[11.5px] text-mist-700 md:text-right tabular">
                  {isActive ? countdown(l.endsAt - now) : fmtDateTime(l.endsAt)}
                </span>
              </div>
            );
          })}
        </div>
        <p className="font-mono text-[11px] text-mist-700 mt-4 leading-relaxed">
          Delisting removes the marketplace entry only. The ArtifactRegistry record, token and provenance remain permanently on-chain — the platform authenticates records, not objects.
        </p>
      </section>
    </div>
  );
}
