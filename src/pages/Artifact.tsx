import { useState } from "react";
import { useChain, verifyArtifact } from "../lib/chain";
import { personaName } from "../lib/seed";
import { CONTRACTS } from "../lib/types";
import { certificateHtml, downloadDoc } from "../lib/docs";
import { countdown, cx, fmtBytes, fmtDateTime, formatEth, shortAddr, shortHash, timeAgo } from "../lib/format";
import { useRouter } from "../lib/router";
import { ArtifactImg, HashChip, KindBadge, Reveal, requireChain, StatusChip, useNow } from "../components/ui";
import { BidModal, BuyModal, FlagModal, ListingModal } from "../components/actions";
import { IBolt, IClock, IGavel, ISeal, IShieldCheck, IShield, IFlag, IDownload, IChain } from "../components/icons";

export default function ArtifactPage() {
  const s = useChain();
  const { route, go } = useRouter();
  const now = useNow();
  const [verifying, setVerifying] = useState(false);
  const [bidOpen, setBidOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  const a = s.artifacts.find((x) => x.tokenId === route.id);
  if (!a) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-32 text-center">
        <p className="font-display text-2xl text-mist-300 mb-3">No record for that token</p>
        <button className="btn-ghost px-6 py-3 text-sm" onClick={() => go("market")}>Back to marketplace</button>
      </div>
    );
  }

  const me = s.wallet?.address ?? "";
  const isOwner = !!me && a.owner.toLowerCase() === me.toLowerCase();
  const listing = s.listings.find((l) => l.tokenId === a.tokenId && l.status === "active" && l.endsAt > now && !l.removedByAdmin);
  const history = s.listings.filter((l) => l.tokenId === a.tokenId && l.status !== "active");
  const top = listing ? listing.bids.reduce((m, b) => Math.max(m, b.amountEth), 0) : 0;
  const msLeft = listing ? listing.endsAt - now : 0;
  const myCert = [...s.certificates].reverse().find((c) => c.tokenId === a.tokenId && me && c.holder.toLowerCase() === me.toLowerCase());

  const runVerify = async () => {
    setVerifying(true);
    await verifyArtifact(a.tokenId);
    setVerifying(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-12 md:py-16">
      <button onClick={() => go("market")} className="font-mono text-[11.5px] uppercase tracking-[0.2em] text-mist-700 hover:text-bronze-300 transition-colors mb-8 inline-block">
        ← Marketplace
      </button>

      <div className="grid lg:grid-cols-12 gap-10">
        {/* media */}
        <div className="lg:col-span-6">
          <Reveal>
            <div className="plate overflow-hidden group">
              <div className="relative aspect-[4/3] overflow-hidden">
                <ArtifactImg src={a.media} alt={a.meta.title} className="w-full h-full object-cover img-fade" />
                <span className="absolute top-4 left-4 bg-ink-950/80 backdrop-blur px-2.5 py-1 font-mono text-[10.5px] tracking-wider text-mist-300 border border-ink-600">
                  {a.mediaName}
                </span>
              </div>
              <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                <HashChip label="media sha-256" value={a.mediaHash} />
                <span className="font-mono text-[11px] text-mist-700">{fmtBytes(a.mediaSize)} · pinned to IPFS</span>
              </div>
            </div>
          </Reveal>
        </div>

        {/* identity + commerce */}
        <div className="lg:col-span-6">
          <Reveal delay={100}>
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-bronze-400">Token #{a.tokenId}</span>
              {a.verified ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-patina-300 border border-patina-500/40 bg-patina-500/10 px-2.5 py-1"><IShieldCheck width={12} height={12} /> record verified</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-mist-500 border border-ink-600 px-2.5 py-1"><IShield width={12} height={12} /> unverified</span>
              )}
              {history.map((h) => <StatusChip key={h.createdAt} status={h.status} />)}
            </div>
            <h1 className="font-display font-bold text-3xl md:text-[2.4rem] leading-tight text-mist-100">{a.meta.title}</h1>
            <div className="font-mono text-[12px] text-mist-500 mt-2.5">{a.meta.category} · {a.meta.era} · {a.meta.year}</div>
            <p className="text-[14.5px] leading-relaxed text-mist-400 mt-5">{a.meta.description}</p>

            {/* ownership */}
            <div className="grid sm:grid-cols-2 gap-3 mt-7">
              <div className="plate p-4 border-l-2 border-l-bronze-500">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-mist-700 mb-2"><ISeal width={13} height={13} className="text-bronze-400" /> Original owner · immutable</div>
                <div className="text-[14px] text-mist-200">{personaName(a.originalOwner)}</div>
                <div className="font-mono text-[11px] text-mist-700 mt-1">{shortAddr(a.originalOwner)}</div>
              </div>
              <div className="plate p-4 border-l-2 border-l-patina-500">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-mist-700 mb-2"><IChain width={13} height={13} className="text-patina-400" /> Current owner</div>
                <div className="text-[14px] text-mist-200">{personaName(a.owner)} {isOwner && <span className="text-patina-300">· you</span>}</div>
                <div className="font-mono text-[11px] text-mist-700 mt-1">{shortAddr(a.owner)}</div>
              </div>
            </div>

            {/* commerce panel */}
            {listing ? (
              <div className="plate p-6 mt-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <KindBadge kind={listing.kind} />
                  <span className={cx("flex items-center gap-1.5 font-mono text-[12.5px] tabular", msLeft < 3600_000 ? "text-oxide-400" : "text-patina-300")}>
                    <IClock width={14} height={14} /> {countdown(msLeft)} remaining
                  </span>
                </div>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-mist-700">
                      {listing.kind === "auction" ? (top > 0 ? `Current bid · ${listing.bids.length} bids` : "Starting price") : "Fixed price"}
                    </div>
                    <div className="font-display text-4xl text-bronze-300 tabular mt-1">{formatEth(listing.kind === "auction" && top > 0 ? top : listing.priceEth)}<span className="text-base text-mist-500 font-body ml-1.5">ETH</span></div>
                  </div>
                  {listing.kind === "auction" ? (
                    <button
                      className="btn-bronze inline-flex items-center gap-2 px-6 py-3 text-sm"
                      disabled={isOwner}
                      title={isOwner ? "This is your own auction" : "Bid via your wallet"}
                      onClick={() => requireChain() && setBidOpen(true)}
                    >
                      <IGavel width={15} height={15} /> {isOwner ? "Your auction" : "Place bid"}
                    </button>
                  ) : (
                    <button
                      className="btn-bronze inline-flex items-center gap-2 px-6 py-3 text-sm"
                      disabled={isOwner}
                      title={isOwner ? "This is your own listing" : "Atomic instant purchase"}
                      onClick={() => requireChain() && setBuyOpen(true)}
                    >
                      <IBolt width={15} height={15} /> {isOwner ? "Your lot" : "Buy now"}
                    </button>
                  )}
                </div>
                <div className="mt-5 ruled pt-4">
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-mist-700 mb-3">Bid history · escrowed</div>
                  {listing.bids.length === 0 ? (
                    <p className="text-[13px] text-mist-700">No bids yet — the auction settles automatically at close; with no bids it simply expires.</p>
                  ) : (
                    <div className="space-y-2">
                      {[...listing.bids].sort((x, y) => y.amountEth - x.amountEth).map((b, i) => (
                        <div key={b.txHash} className="flex items-center gap-3 font-mono text-[12px]">
                          <span className={cx("w-5 h-5 grid place-items-center border text-[10px]", i === 0 ? "border-bronze-500 text-bronze-300" : "border-ink-600 text-mist-700")}>{i + 1}</span>
                          <span className="text-mist-300">{personaName(b.bidder)} · {shortAddr(b.bidder)}</span>
                          <span className="flex-1" />
                          <span className={cx("tabular", i === 0 ? "text-bronze-300" : "text-mist-500")}>{formatEth(b.amountEth)} ETH</span>
                          <span className="text-mist-700 hidden sm:inline">{timeAgo(b.ts)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[11.5px] text-mist-700 mt-3">Losing bids refund automatically at settlement · hard cap {Math.round((listing.endsAt - listing.createdAt) / 3600_000)}h · no extensions</p>
                </div>
              </div>
            ) : (
              <div className="plate p-6 mt-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-[14px] text-mist-300">Not currently listed</div>
                  <div className="text-[12px] text-mist-700 mt-0.5">
                    {history.length > 0 ? "Previous windows closed — re-listing opens a fresh ≤48h window." : "The owner has not opened a market window."}
                  </div>
                </div>
                {isOwner ? (
                  <button className="btn-bronze inline-flex items-center gap-2 px-5 py-2.5 text-sm" onClick={() => requireChain() && setListOpen(true)}>
                    <IGavel width={15} height={15} /> List this artifact
                  </button>
                ) : (
                  <span className="font-mono text-[11px] text-mist-700 uppercase tracking-wider">off-market</span>
                )}
              </div>
            )}

            {isOwner && myCert && (
              <button className="btn-ghost inline-flex items-center gap-2 px-5 py-2.5 text-[13px] mt-4" onClick={() => downloadDoc(myCert.id + ".html", certificateHtml(myCert))}>
                <IDownload width={14} height={14} /> Download ownership certificate
              </button>
            )}

            <button className="inline-flex items-center gap-2 text-[12.5px] text-mist-700 hover:text-oxide-300 transition-colors mt-4 ml-5" onClick={() => setFlagOpen(true)}>
              <IFlag width={13} height={13} /> Report this listing
            </button>
          </Reveal>
        </div>
      </div>

      {/* provenance chain */}
      <section className="mt-16 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7">
          <Reveal>
            <div className="kicker mb-3">Append-only · queryable on-chain</div>
            <h2 className="font-display text-2xl text-mist-100 mb-7">Chain of custody</h2>
            <div className="relative pl-1">
              {a.provenance.map((p, i) => (
                <div key={p.txHash} className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <span className={cx("w-10 h-10 grid place-items-center border shrink-0", p.kind === "mint" ? "border-bronze-500 text-bronze-300 bg-bronze-500/10" : "border-patina-500 text-patina-300 bg-patina-500/10")}>
                      {p.kind === "mint" ? <ISeal width={17} height={17} /> : <IChain width={17} height={17} />}
                    </span>
                    {i < a.provenance.length - 1 && <span className="w-px flex-1 bg-gradient-to-b from-ink-500 to-ink-700 my-1" />}
                  </div>
                  <div className="pb-8 flex-1 plate plate-hover p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-display text-[15.5px] text-mist-100">
                        {p.kind === "mint" ? "Registered · Original Owner anchored" : "Ownership transferred"}
                      </span>
                      <span className="font-mono text-[11px] text-mist-700 tabular">{fmtDateTime(p.ts)} · block #{p.block.toLocaleString()}</span>
                    </div>
                    <div className="text-[13.5px] text-mist-400 mt-1.5">
                      {p.kind === "mint" ? (
                        <>Minted to <strong className="text-mist-200">{personaName(p.to)}</strong> — this address can never be overwritten.</>
                      ) : (
                        <><strong className="text-mist-200">{personaName(p.from ?? "")}</strong> → <strong className="text-mist-200">{personaName(p.to)}</strong>{p.priceEth ? <span className="font-mono text-bronze-300 tabular"> · {formatEth(p.priceEth)} ETH</span> : null}</>
                      )}
                      {p.note && <span className="text-mist-700"> · {p.note}</span>}
                    </div>
                    <div className="mt-3"><HashChip label="tx" value={p.txHash} /></div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* on-chain record */}
        <div className="lg:col-span-5">
          <Reveal delay={120}>
            <div className="plate p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <IShieldCheck width={17} height={17} className="text-patina-400" />
                <h3 className="font-display text-lg text-mist-100">On-chain record</h3>
              </div>
              <div className="font-mono text-[12px] space-y-3">
                <div className="flex justify-between gap-4"><span className="text-mist-700">REGISTRY</span><span className="text-mist-300">{shortAddr(CONTRACTS.registry)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-mist-700">MARKETPLACE</span><span className="text-mist-300">{shortAddr(CONTRACTS.marketplace)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-mist-700">TOKEN ID</span><span className="text-mist-200">#{a.tokenId}</span></div>
                <div className="flex justify-between gap-4"><span className="text-mist-700">REGISTERED</span><span className="text-mist-300 tabular">block #{a.registeredBlock.toLocaleString()}</span></div>
                <div className="ruled pt-3 flex flex-col gap-1"><span className="text-mist-700">METADATA HASH</span><span className="text-patina-300 break-all text-[11px]">{a.metadataHash}</span></div>
                <div className="flex flex-col gap-1"><span className="text-mist-700">META CID</span><span className="text-lapis-300 break-all text-[11px]">{a.metaCid}</span></div>
                <div className="flex flex-col gap-1"><span className="text-mist-700">MEDIA CID</span><span className="text-lapis-300 break-all text-[11px]">{a.mediaCid}</span></div>
              </div>
              <button className="btn-ghost w-full mt-6 py-2.5 text-[13px] inline-flex items-center justify-center gap-2" disabled={verifying} onClick={runVerify}>
                {verifying ? <span className="spin-slow inline-block w-4 h-4 border-2 border-bronze-500/40 border-t-bronze-300 rounded-full" /> : <IShieldCheck width={15} height={15} />}
                {verifying ? "Recomputing hash…" : "Independently verify this record"}
              </button>
              <p className="text-[11.5px] text-mist-700 leading-relaxed mt-3">
                Verification recomputes the SHA-256 of the canonical metadata JSON in your browser and compares it with the on-chain commitment. No server is trusted.
              </p>
            </div>

            {a.meta.provenanceNotes && (
              <div className="plate p-6 mt-5 border-l-2 border-l-lapis-500">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-mist-700 mb-2.5">Curatorial provenance notes</div>
                <p className="text-[13.5px] leading-relaxed text-mist-300">{a.meta.provenanceNotes}</p>
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {listing && <BidModal listing={listing} open={bidOpen} onClose={() => setBidOpen(false)} />}
      {listing && <BuyModal listing={listing} open={buyOpen} onClose={() => setBuyOpen(false)} />}
      <FlagModal tokenId={a.tokenId} open={flagOpen} onClose={() => setFlagOpen(false)} />
      <ListingModal tokenId={a.tokenId} open={listOpen} onClose={() => setListOpen(false)} />
    </div>
  );
}
