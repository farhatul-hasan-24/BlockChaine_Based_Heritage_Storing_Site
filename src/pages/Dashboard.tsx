import { useMemo, useState } from "react";
import { myAddress, myBalance, useChain } from "../lib/chain";
import { personaName } from "../lib/seed";
import { certificateHtml, downloadDoc, invoiceHtml } from "../lib/docs";
import type { Certificate, Invoice } from "../lib/types";
import { countdown, cx, fmtDateTime, formatEth, initials, shortAddr } from "../lib/format";
import { useRouter } from "../lib/router";
import { ArtifactImg, KindBadge, Modal, Reveal, requestGate, requireChain, StatusChip, useNow } from "../components/ui";
import { ListingModal } from "../components/actions";
import { IArrow, IDownload, IEye, IFox, IGoogle, IMuseum, ISeal, IShieldCheck, IWallet } from "../components/icons";

type Tab = "artifacts" | "listings" | "bids" | "documents";

export default function Dashboard() {
  const s = useChain();
  const now = useNow();
  const { go } = useRouter();
  const [tab, setTab] = useState<Tab>("artifacts");
  const [listTarget, setListTarget] = useState<number | null>(null);
  const [doc, setDoc] = useState<{ title: string; html: string; file: string } | null>(null);

  const me = myAddress() ?? "";
  const meLc = me.toLowerCase();

  const owned = useMemo(() => s.artifacts.filter((a) => a.owner.toLowerCase() === meLc), [s.artifacts, meLc]);
  const myListings = useMemo(() => s.listings.filter((l) => l.seller.toLowerCase() === meLc).sort((a, b) => b.createdAt - a.createdAt), [s.listings, meLc]);
  const myBids = useMemo(
    () =>
      s.listings
        .filter((l) => l.bids.some((b) => b.bidder.toLowerCase() === meLc))
        .map((l) => {
          const mine = l.bids.filter((b) => b.bidder.toLowerCase() === meLc).reduce((m, b) => Math.max(m, b.amountEth), 0);
          const top = l.bids.reduce((m, b) => Math.max(m, b.amountEth), 0);
          const active = l.status === "active" && l.endsAt > now;
          const status = active
            ? mine >= top
              ? "leading"
              : "outbid"
            : l.status === "sold" && l.result?.winner.toLowerCase() === meLc
              ? "won"
              : l.status === "sold"
                ? "refunded"
                : "returned";
          return { l, mine, top, status, active };
        }),
    [s.listings, meLc, now]
  );
  const myCerts = useMemo(() => s.certificates.filter((c) => c.holder.toLowerCase() === meLc).sort((a, b) => b.issuedAt - a.issuedAt), [s.certificates, meLc]);
  const myInvoices = useMemo(() => s.invoices.filter((i) => i.owner.toLowerCase() === meLc).sort((a, b) => b.ts - a.ts), [s.invoices, meLc]);

  const tabs: { id: Tab; label: string; n: number }[] = [
    { id: "artifacts", label: "Artifacts", n: owned.length },
    { id: "listings", label: "Listings", n: myListings.length },
    { id: "bids", label: "Bids", n: myBids.length },
    { id: "documents", label: "Documents", n: myCerts.length + myInvoices.length },
  ];

  if (!s.user || !me) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-24 text-center">
        <ISeal width={38} height={38} className="mx-auto text-bronze-500 mb-6" />
        <h1 className="font-display font-bold text-3xl text-mist-100 mb-3">Your vault needs a key</h1>
        <p className="text-[14.5px] text-mist-400 leading-relaxed max-w-md mx-auto mb-8">
          The vault pairs a Google session (identity & documents) with an EVM wallet (on-chain custody). Connect both to see artifacts, bids and signed documents.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button className="btn-bronze inline-flex items-center gap-2 px-6 py-3 text-sm" onClick={() => requestGate("google")}>
            <IGoogle width={15} height={15} /> Sign in with Google
          </button>
          <button className="btn-ghost inline-flex items-center gap-2 px-6 py-3 text-sm" onClick={() => requestGate("wallet")}>
            <IFox width={15} height={15} className="text-bronze-400" /> Connect wallet
          </button>
        </div>
      </div>
    );
  }

  const statusChip = (st: string) => {
    const cls: Record<string, string> = {
      leading: "border-patina-500/50 text-patina-300 bg-patina-500/10",
      outbid: "border-oxide-500/50 text-oxide-300 bg-oxide-500/10",
      won: "border-bronze-500/50 text-bronze-300 bg-bronze-500/10",
      refunded: "border-ink-600 text-mist-500 bg-ink-800",
      returned: "border-ink-600 text-mist-500 bg-ink-800",
    };
    return <span className={cx("inline-block px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-wider border", cls[st])}>{st}</span>;
  };

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-12 md:py-16">
      <div className="kicker mb-3">Dual-auth vault · session + custody</div>
      <h1 className="font-display font-bold text-3xl md:text-[2.6rem] text-mist-100 leading-tight mb-10">My Vault</h1>

      {/* identity strip */}
      <div className="grid md:grid-cols-3 gap-4 mb-12">
        <div className="plate p-5 flex items-center gap-4">
          <span className={cx("w-12 h-12 grid place-items-center font-semibold", s.user.role === "institution" ? "bg-lapis-500/15 text-lapis-300" : "bg-bronze-500/15 text-bronze-300")}>
            {s.user.role === "institution" ? <IMuseum width={20} height={20} /> : initials(s.user.name)}
          </span>
          <div className="min-w-0">
            <div className="text-[14px] text-mist-200 truncate">{s.user.name}</div>
            <div className="font-mono text-[11px] text-mist-700 truncate">{s.user.email}</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-patina-300 mt-1">{s.user.role === "user" ? "Registered collector" : s.user.role === "institution" ? "Institution" : "Administrator"}</div>
          </div>
        </div>
        <div className="plate p-5 flex items-center gap-4">
          <span className="w-12 h-12 grid place-items-center bg-patina-500/10 text-patina-300"><IWallet width={20} height={20} /></span>
          <div className="min-w-0">
            <div className="font-mono text-[13px] text-mist-200">{shortAddr(me)}</div>
            <div className="font-mono text-[11px] text-mist-700 mt-0.5">{personaName(me)}</div>
            <div className="font-mono text-[12px] text-patina-300 tabular mt-1">{formatEth(myBalance(), 5)} SepoliaETH</div>
          </div>
        </div>
        <div className="plate p-5 flex items-center gap-4">
          <span className="w-12 h-12 grid place-items-center bg-bronze-500/10 text-bronze-300"><IShieldCheck width={20} height={20} /></span>
          <div>
            <div className="text-[14px] text-mist-200">Sepolia testnet</div>
            <div className="text-[12px] text-mist-700 mt-0.5">All settlements are test ETH · mainnet after audit</div>
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className="flex gap-1 border-b border-ink-700 mb-8 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cx("px-5 py-3 text-[13.5px] whitespace-nowrap border-b-2 -mb-px transition-colors", tab === t.id ? "border-bronze-400 text-bronze-300" : "border-transparent text-mist-500 hover:text-mist-200")}>
            {t.label} <span className="font-mono text-[11px] text-mist-700 ml-1 tabular">{t.n}</span>
          </button>
        ))}
      </div>

      {/* ARTIFACTS */}
      {tab === "artifacts" && (
        owned.length === 0 ? (
          <Empty text="No artifacts under your custody yet." cta="Register an artifact" onCta={() => go("register")} />
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {owned.map((a, i) => {
              const active = s.listings.find((l) => l.tokenId === a.tokenId && l.status === "active" && l.endsAt > now);
              return (
                <Reveal key={a.tokenId} delay={(i % 3) * 80}>
                  <article className="plate plate-hover group overflow-hidden h-full flex flex-col">
                    <button className="relative h-48 overflow-hidden" onClick={() => go("artifact", a.tokenId)}>
                      <ArtifactImg src={a.media} alt={a.meta.title} className="w-full h-full object-cover img-fade" />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 to-transparent" />
                      <span className="absolute bottom-3 left-3.5 font-mono text-[10.5px] uppercase tracking-wider text-mist-300">#{a.tokenId} · {a.meta.category}</span>
                      {a.owner.toLowerCase() === a.originalOwner.toLowerCase() && (
                        <span className="absolute top-3 right-3 bg-ink-950/80 backdrop-blur px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider text-bronze-300 border border-bronze-500/40">original owner</span>
                      )}
                    </button>
                    <div className="p-5 flex flex-col flex-1">
                      <button onClick={() => go("artifact", a.tokenId)} className="text-left font-display text-[16px] leading-snug text-mist-100 group-hover:text-bronze-300 transition-colors">{a.meta.title}</button>
                      <div className="font-mono text-[11px] text-mist-700 mt-1">{a.meta.year} · {a.provenance.length - 1} transfer{(a.provenance.length - 1) === 1 ? "" : "s"} on record</div>
                      <div className="flex-1" />
                      <div className="mt-4 pt-4 ruled flex items-center justify-between gap-3">
                        {active ? (
                          <>
                            <KindBadge kind={active.kind} />
                            <span className="font-mono text-[12px] text-patina-300 tabular">{countdown(active.endsAt - now)}</span>
                          </>
                        ) : (
                          <>
                            <span className="font-mono text-[11px] text-mist-700 uppercase tracking-wider">off-market</span>
                            <button className="btn-bronze inline-flex items-center gap-2 px-4 py-2 text-[12.5px]" onClick={() => requireChain() && setListTarget(a.tokenId)}>
                              List <IArrow width={13} height={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        )
      )}

      {/* LISTINGS */}
      {tab === "listings" && (
        myListings.length === 0 ? (
          <Empty text="You have not opened any market windows." cta="Choose an artifact to list" onCta={() => setTab("artifacts")} />
        ) : (
          <div className="space-y-3">
            {myListings.map((l) => {
              const a = s.artifacts.find((x) => x.tokenId === l.tokenId);
              const active = l.status === "active" && l.endsAt > now;
              return (
                <div key={l.createdAt} className="plate plate-hover p-4 flex flex-wrap items-center gap-4">
                  <button className="w-20 h-16 overflow-hidden shrink-0" onClick={() => a && go("artifact", a.tokenId)}>
                    {a && <ArtifactImg src={a.media} alt={a.meta.title} className="w-full h-full object-cover img-fade" />}
                  </button>
                  <div className="flex-1 min-w-[200px]">
                    <button className="font-display text-[15px] text-mist-100 hover:text-bronze-300 transition-colors" onClick={() => a && go("artifact", a.tokenId)}>{a?.meta.title ?? "Token #" + l.tokenId}</button>
                    <div className="font-mono text-[11px] text-mist-700 mt-1">
                      opened {fmtDateTime(l.createdAt)} · window {Math.round((l.endsAt - l.createdAt) / 3600_000)}h · {l.bids.length} bid{l.bids.length === 1 ? "" : "s"}
                      {l.result && <span className="text-bronze-300"> · sold {formatEth(l.result.amountEth)} ETH to {personaName(l.result.winner)}</span>}
                    </div>
                  </div>
                  <KindBadge kind={l.kind} />
                  <span className="font-display text-lg text-bronze-300 tabular">{formatEth(l.kind === "auction" ? Math.max(l.priceEth, ...l.bids.map((b) => b.amountEth), 0) : l.priceEth)} <span className="text-[12px] text-mist-500 font-body">ETH</span></span>
                  {active ? <span className="font-mono text-[12px] text-patina-300 tabular w-24 text-right">{countdown(l.endsAt - now)}</span> : <StatusChip status={l.status} />}
                </div>
              );
            })}
            <p className="font-mono text-[11px] text-mist-700 pt-2">Windows cannot be extended or cancelled early — the {`48h`} cap is contractual. Expired lots may be re-listed.</p>
          </div>
        )
      )}

      {/* BIDS */}
      {tab === "bids" && (
        myBids.length === 0 ? (
          <Empty text="No bids in escrow." cta="Find an auction" onCta={() => go("market")} />
        ) : (
          <div className="space-y-3">
            {myBids.map(({ l, mine, top, status, active }) => {
              const a = s.artifacts.find((x) => x.tokenId === l.tokenId);
              return (
                <div key={l.tokenId + "-" + l.createdAt} className="plate plate-hover p-4 flex flex-wrap items-center gap-4">
                  <button className="w-20 h-16 overflow-hidden shrink-0" onClick={() => a && go("artifact", a.tokenId)}>
                    {a && <ArtifactImg src={a.media} alt={a.meta.title} className="w-full h-full object-cover img-fade" />}
                  </button>
                  <div className="flex-1 min-w-[200px]">
                    <button className="font-display text-[15px] text-mist-100 hover:text-bronze-300 transition-colors" onClick={() => a && go("artifact", a.tokenId)}>{a?.meta.title}</button>
                    <div className="font-mono text-[11px] text-mist-700 mt-1">
                      your escrow {formatEth(mine)} ETH · current top {formatEth(top)} ETH
                      {status === "refunded" || status === "returned" ? " · returned to balance at settlement" : ""}
                    </div>
                  </div>
                  {statusChip(status)}
                  {active ? <span className="font-mono text-[12px] text-patina-300 tabular">{countdown(l.endsAt - now)}</span> : <StatusChip status={l.status} />}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* DOCUMENTS */}
      {tab === "documents" && (
        myCerts.length + myInvoices.length === 0 ? (
          <Empty text="Certificates and invoices appear here after registration and settlement." cta="Browse the marketplace" onCta={() => go("market")} />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {myCerts.map((c: Certificate) => (
              <DocRow key={c.id} tag="certificate" title={c.title} sub={`Token #${c.tokenId} · issued ${fmtDateTime(c.issuedAt)} · ${shortAddr(c.holder)}`}
                onView={() => setDoc({ title: c.id, html: certificateHtml(c), file: c.id + ".html" })}
                onDl={() => downloadDoc(c.id + ".html", certificateHtml(c))} />
            ))}
            {myInvoices.map((inv: Invoice) => (
              <DocRow key={inv.id} tag={inv.kind} title={inv.title} sub={`${formatEth(inv.priceEth)} ETH · ${fmtDateTime(inv.ts)} · ${inv.kind === "sale" ? "from " + personaName(inv.counterparty) : inv.kind === "refund" ? "escrow refund" : "to " + personaName(inv.counterparty)}`}
                onView={() => setDoc({ title: inv.id, html: invoiceHtml(inv), file: inv.id + ".html" })}
                onDl={() => downloadDoc(inv.id + ".html", invoiceHtml(inv))} />
            ))}
          </div>
        )
      )}

      <ListingModal tokenId={listTarget ?? 0} open={listTarget !== null} onClose={() => setListTarget(null)} />

      <Modal open={!!doc} onClose={() => setDoc(null)} width="max-w-3xl">
        {doc && (
          <div>
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-ink-700">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-mist-700">{doc.file}</div>
                <div className="font-display text-[15px] text-mist-100">{doc.title}</div>
              </div>
              <button className="btn-bronze inline-flex items-center gap-2 px-4 py-2 text-[12.5px]" onClick={() => downloadDoc(doc.file, doc.html)}>
                <IDownload width={14} height={14} /> Download
              </button>
            </div>
            <iframe title={doc.title} srcDoc={doc.html} className="w-full h-[68vh] bg-[#e9e4d8]" />
          </div>
        )}
      </Modal>
    </div>
  );
}

function Empty({ text, cta, onCta }: { text: string; cta: string; onCta: () => void }) {
  return (
    <div className="plate p-14 text-center">
      <p className="text-[14px] text-mist-500 mb-5">{text}</p>
      <button className="btn-ghost inline-flex items-center gap-2 px-5 py-2.5 text-[13px]" onClick={onCta}>
        {cta} <IArrow width={14} height={14} />
      </button>
    </div>
  );
}

function DocRow({ tag, title, sub, onView, onDl }: { tag: string; title: string; sub: string; onView: () => void; onDl: () => void }) {
  return (
    <div className="plate plate-hover p-4.5 p-5 flex items-center gap-4">
      <span className={cx("w-10 h-10 grid place-items-center shrink-0 border font-mono text-[9px] uppercase", tag === "certificate" ? "border-bronze-500/50 text-bronze-300" : "border-lapis-500/50 text-lapis-300")}>
        <IEye width={16} height={16} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] text-mist-200 truncate">{title}</div>
        <div className="font-mono text-[11px] text-mist-700 mt-0.5 truncate">{tag.toUpperCase()} · {sub}</div>
      </div>
      <button className="btn-ghost px-3 py-2" onClick={onView} title="Preview"><IEye width={15} height={15} /></button>
      <button className="btn-bronze px-3 py-2" onClick={onDl} title="Download"><IDownload width={15} height={15} /></button>
    </div>
  );
}
