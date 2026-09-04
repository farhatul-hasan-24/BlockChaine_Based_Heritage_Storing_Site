import { useMemo, useState } from "react";
import { useChain } from "../lib/chain";
import { personaName } from "../lib/seed";
import { CATEGORIES } from "../lib/types";
import type { Listing } from "../lib/types";
import { countdown, cx, formatEth, shortAddr } from "../lib/format";
import { useRouter } from "../lib/router";
import { ArtifactImg, KindBadge, Reveal, requireChain, useNow } from "../components/ui";
import { BidModal, BuyModal } from "../components/actions";
import { IBolt, IClock, IGavel, ISearch } from "../components/icons";

type TypeFilter = "all" | "auction" | "buy";
type SortKey = "ending" | "newest" | "priceAsc" | "priceDesc";

function priceOf(l: Listing): number {
  const top = l.bids.reduce((m, b) => Math.max(m, b.amountEth), 0);
  return top > 0 ? top : l.priceEth;
}

export default function Marketplace() {
  const s = useChain();
  const now = useNow();
  const { route, go } = useRouter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>(route.filter ?? "all");
  const [type, setType] = useState<TypeFilter>("all");
  const [minP, setMinP] = useState("");
  const [maxP, setMaxP] = useState("");
  const [sort, setSort] = useState<SortKey>("ending");
  const [buyTarget, setBuyTarget] = useState<Listing | null>(null);
  const [bidTarget, setBidTarget] = useState<Listing | null>(null);

  const me = s.wallet?.address?.toLowerCase() ?? "";

  const items = useMemo(() => {
    const min = parseFloat(minP);
    const max = parseFloat(maxP);
    let list = s.listings
      .filter((l) => l.status === "active" && l.endsAt > now && !l.removedByAdmin)
      .map((l) => ({ l, a: s.artifacts.find((a) => a.tokenId === l.tokenId) }))
      .filter((x): x is { l: Listing; a: (typeof s.artifacts)[number] } => !!x.a);
    if (cat !== "all") list = list.filter((x) => x.a.meta.category === cat);
    if (type !== "all") list = list.filter((x) => x.l.kind === type);
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter((x) => (x.a.meta.title + " " + x.a.meta.description + " " + x.a.meta.era).toLowerCase().includes(t));
    }
    if (!isNaN(min)) list = list.filter((x) => priceOf(x.l) >= min);
    if (!isNaN(max)) list = list.filter((x) => priceOf(x.l) <= max);
    list.sort((x, y) => {
      if (sort === "ending") return x.l.endsAt - y.l.endsAt;
      if (sort === "newest") return y.l.createdAt - x.l.createdAt;
      if (sort === "priceAsc") return priceOf(x.l) - priceOf(y.l);
      return priceOf(y.l) - priceOf(x.l);
    });
    return list;
  }, [s.listings, s.artifacts, cat, type, q, minP, maxP, sort, now]);

  const tryBuy = (l: Listing) => { if (requireChain()) setBuyTarget(l); };
  const tryBid = (l: Listing) => { if (requireChain()) setBidTarget(l); };

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
        <div>
          <div className="kicker mb-3">Settlements are atomic · auctions auto-settle at close</div>
          <h1 className="font-display font-bold text-3xl md:text-[2.8rem] text-mist-100 leading-tight">The Marketplace</h1>
        </div>
        <div className="font-mono text-[12px] text-mist-700 tabular">
          {items.length} live lot{items.length === 1 ? "" : "s"} · ETH only · Sepolia
        </div>
      </div>

      {/* filter rail */}
      <div className="plate p-5 mb-10 grid lg:grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-end">
        <div>
          <label className="block font-mono text-[10.5px] uppercase tracking-[0.2em] text-mist-700 mb-1.5">Search the registry</label>
          <div className="relative">
            <ISearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-700" />
            <input className="field pl-9" placeholder="Title, era, description…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block font-mono text-[10.5px] uppercase tracking-[0.2em] text-mist-700 mb-1.5">Category</label>
          <select className="field min-w-[168px]" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-mono text-[10.5px] uppercase tracking-[0.2em] text-mist-700 mb-1.5">Price (ETH)</label>
          <div className="flex items-center gap-2">
            <input className="field w-20 font-mono tabular" placeholder="min" type="number" min="0" step="0.1" value={minP} onChange={(e) => setMinP(e.target.value)} />
            <span className="text-mist-700">–</span>
            <input className="field w-20 font-mono tabular" placeholder="max" type="number" min="0" step="0.1" value={maxP} onChange={(e) => setMaxP(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block font-mono text-[10.5px] uppercase tracking-[0.2em] text-mist-700 mb-1.5">Sort</label>
          <select className="field min-w-[150px]" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="ending">Ending soonest</option>
            <option value="newest">Recently listed</option>
            <option value="priceAsc">Price · low → high</option>
            <option value="priceDesc">Price · high → low</option>
          </select>
        </div>
        <div>
          <label className="block font-mono text-[10.5px] uppercase tracking-[0.2em] text-mist-700 mb-1.5">Listing type</label>
          <div className="flex border border-ink-600 divide-x divide-ink-600">
            {(["all", "auction", "buy"] as TypeFilter[]).map((t) => (
              <button key={t} onClick={() => setType(t)}
                className={cx("px-4 py-2.5 text-[12px] font-mono uppercase tracking-wider transition-colors",
                  type === t ? "bg-bronze-500/15 text-bronze-300" : "text-mist-500 hover:text-mist-200")}>
                {t === "buy" ? "instant" : t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* grid */}
      {items.length === 0 ? (
        <div className="plate p-16 text-center">
          <IGavel width={34} height={34} className="mx-auto text-mist-700 mb-4" />
          <p className="font-display text-lg text-mist-300 mb-1.5">No live lots match this query</p>
          <p className="text-[13.5px] text-mist-700">Listings expire automatically after 48 hours — check back after the next settlement window.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {items.map(({ l, a }, i) => {
            const msLeft = l.endsAt - now;
            const top = l.bids.reduce((m, b) => Math.max(m, b.amountEth), 0);
            const mine = me && l.seller.toLowerCase() === me;
            return (
              <Reveal key={l.tokenId} delay={(i % 3) * 90}>
                <article className="plate plate-hover group flex flex-col overflow-hidden h-full">
                  <button className="relative h-56 overflow-hidden text-left" onClick={() => go("artifact", a.tokenId)}>
                    <ArtifactImg src={a.media} alt={a.meta.title} className="w-full h-full object-cover img-fade" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-ink-950/20" />
                    <KindBadge kind={l.kind} className="absolute top-3.5 left-3.5 backdrop-blur-sm" />
                    <span className={cx("absolute top-3.5 right-3.5 flex items-center gap-1.5 px-2.5 py-1 font-mono text-[11px] tabular backdrop-blur-sm border",
                      msLeft < 3600_000 ? "text-oxide-300 border-oxide-500/40 bg-oxide-500/10" : "text-mist-200 border-ink-600 bg-ink-950/60")}>
                      <IClock width={12} height={12} /> {countdown(msLeft)}
                    </span>
                    <span className="absolute bottom-3 left-3.5 font-mono text-[10.5px] text-mist-500 uppercase tracking-wider">{a.meta.category}</span>
                  </button>
                  <div className="p-5 flex flex-col flex-1">
                    <button onClick={() => go("artifact", a.tokenId)} className="text-left">
                      <h3 className="font-display text-[17px] leading-snug text-mist-100 group-hover:text-bronze-300 transition-colors">{a.meta.title}</h3>
                      <div className="font-mono text-[11px] text-mist-700 mt-1">#{a.tokenId} · {a.meta.year} · by {personaName(l.seller)}</div>
                    </button>
                    <div className="mt-4 pt-4 ruled flex items-end justify-between gap-3 flex-1">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-mist-700">
                          {l.kind === "auction" ? (top > 0 ? `Top bid · ${l.bids.length} bid${l.bids.length > 1 ? "s" : ""}` : "Starting at") : "Fixed price"}
                        </div>
                        <div className="font-display text-[1.45rem] text-bronze-300 tabular leading-tight mt-0.5">
                          {formatEth(top > 0 ? top : l.priceEth)} <span className="text-[13px] text-mist-500 font-body">ETH</span>
                        </div>
                      </div>
                      {l.kind === "auction" ? (
                        <button
                          onClick={() => tryBid(l)}
                          disabled={!!mine}
                          title={mine ? "You are the seller" : "Place a bid"}
                          className="btn-ghost inline-flex items-center gap-2 px-4 py-2.5 text-[12.5px]"
                        >
                          <IGavel width={14} height={14} /> {mine ? "Your lot" : "Bid"}
                        </button>
                      ) : (
                        <button
                          onClick={() => tryBuy(l)}
                          disabled={!!mine}
                          title={mine ? "You are the seller" : "Buy instantly"}
                          className="btn-bronze inline-flex items-center gap-2 px-4 py-2.5 text-[12.5px]"
                        >
                          <IBolt width={14} height={14} /> {mine ? "Your lot" : "Buy now"}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      )}

      <p className="mt-10 text-center font-mono text-[11px] text-mist-700">
        Guests may browse freely · every bid and purchase is wallet-signed · sellers receive <span className="text-mist-500">{shortAddr(s.wallet?.address ?? "0x0")}</span>-style settlements only
      </p>

      <BuyModal listing={buyTarget} open={!!buyTarget} onClose={() => setBuyTarget(null)} />
      <BidModal listing={bidTarget} open={!!bidTarget} onClose={() => setBidTarget(null)} />
    </div>
  );
}
