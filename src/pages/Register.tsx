import { useEffect, useMemo, useRef, useState } from "react";
import { myAddress, registerArtifact, useChain } from "../lib/chain";
import { canonicalMeta, makeCid, sha256Buffer, sha256Hex, signPayload } from "../lib/crypto";
import { certificateHtml, downloadDoc } from "../lib/docs";
import { REGISTRY_GAS, CATEGORIES, MAX_LISTING_HOURS } from "../lib/types";
import type { ArtifactMeta, Category } from "../lib/types";
import { cx, fmtBytes, formatEth, shortAddr, shortHash } from "../lib/format";
import { useRouter } from "../lib/router";
import { ArtifactImg, Reveal, requestGate } from "../components/ui";
import { IArrow, ICheck, IDownload, IFox, IGoogle, ISeal, IShieldCheck } from "../components/icons";
import { toast } from "../lib/toast";

interface MediaPick {
  dataUrl: string;
  hash: string;
  size: number;
  name: string;
}

async function fileToMedia(file: File): Promise<MediaPick> {
  const buf = await file.arrayBuffer();
  const hash = await sha256Buffer(buf);
  const raw: string = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("read failed"));
    r.readAsDataURL(file);
  });
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("decode failed"));
      i.src = raw;
    });
    const maxW = 1100;
    const scale = Math.min(1, maxW / img.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL("image/jpeg", 0.85), hash, size: file.size, name: file.name };
  } catch {
    return { dataUrl: raw, hash, size: file.size, name: file.name };
  }
}

const STEPS = ["Media & scan", "Catalog details", "Review & sign", "Sealed"];

export default function Register() {
  const s = useChain();
  const { go } = useRouter();
  const [step, setStep] = useState(0);
  const [media, setMedia] = useState<MediaPick | null>(null);
  const [reading, setReading] = useState(false);
  const [meta, setMeta] = useState<ArtifactMeta>({
    title: "", description: "", category: "Ceramics", era: "", year: "", provenanceNotes: "",
  });
  const [mintedId, setMintedId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addr = myAddress();
  const gasEth = REGISTRY_GAS * s.gasGwei * 1e-9;

  const mediaOk = !!media;
  const metaOk = meta.title.trim().length >= 3 && meta.era.trim().length >= 2 && meta.year.trim().length >= 2 && meta.description.trim().length >= 20;

  const canonical = useMemo(() => (media ? canonicalMeta(meta, media.hash) : ""), [meta, media]);
  const [metaHashPreview, setMetaHashPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!media || step < 2) return;
    let live = true;
    sha256Hex(canonical).then((h) => live && setMetaHashPreview(h));
    return () => {
      live = false;
    };
  }, [canonical, media, step]);

  const pickFile = async (f: File | undefined | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast("Only image media is accepted (photograph, scan, RTI capture)", "err");
      return;
    }
    setReading(true);
    try {
      const m = await fileToMedia(f);
      setMedia(m);
      toast("Media hashed · SHA-256 commitment ready for IPFS pin", "ok");
    } catch {
      toast("Could not read that file", "err");
    } finally {
      setReading(false);
    }
  };

  const submit = async () => {
    if (!media) return;
    try {
      const id = await registerArtifact({ meta, media: media.dataUrl, mediaName: media.name, mediaSize: media.size, mediaHash: media.hash });
      setMintedId(id);
      setStep(3);
    } catch (e) {
      toast((e as Error).message, "err");
    }
  };

  const minted = mintedId ? s.artifacts.find((a) => a.tokenId === mintedId) : null;
  const cert = mintedId ? [...s.certificates].reverse().find((c) => c.tokenId === mintedId && c.holder === addr) : null;

  const readiness = [
    { ok: !!s.user, label: s.user ? "Google session · " + s.user.name : "Google session required", act: () => requestGate("google"), icon: <IGoogle width={14} height={14} /> },
    { ok: !!s.wallet, label: s.wallet ? "Wallet · " + shortAddr(s.wallet.address) : "Connect an EVM wallet", act: () => requestGate("wallet"), icon: <IFox width={14} height={14} /> },
    { ok: !!s.wallet && s.wallet.network === "sepolia", label: s.wallet ? (s.wallet.network === "sepolia" ? "Network · Sepolia testnet" : "Wrong network — switch to Sepolia") : "Network check pending", act: () => requestGate("wrongnet"), icon: <IShieldCheck width={14} height={14} /> },
  ];
  const readyAll = readiness.every((r) => r.ok);

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-8 py-12 md:py-16">
      <div className="kicker mb-3">ArtifactRegistry.mint · guided flow</div>
      <h1 className="font-display font-bold text-3xl md:text-[2.6rem] text-mist-100 leading-tight mb-3">Register an artifact</h1>
      <p className="text-[14.5px] text-mist-400 max-w-2xl leading-relaxed mb-10">
        Four steps, one signature. Your media is hashed and pinned; only the commitment lands on-chain. Designed for museum staff — no private key ever touches this site.
      </p>

      {/* stepper */}
      <div className="flex items-center gap-0 mb-12">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-3">
              <span className={cx("w-9 h-9 grid place-items-center border font-mono text-[12px] transition-all duration-500",
                i < step ? "border-patina-500 text-patina-300 bg-patina-500/10" : i === step ? "border-bronze-400 text-bronze-300 bg-bronze-500/10" : "border-ink-600 text-mist-700")}>
                {i < step ? <ICheck width={14} height={14} /> : i + 1}
              </span>
              <span className={cx("hidden sm:block text-[12.5px] whitespace-nowrap", i === step ? "text-mist-100" : "text-mist-700")}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <span className={cx("flex-1 h-px mx-4 transition-colors duration-500", i < step ? "bg-patina-500/50" : "bg-ink-600")} />}
          </div>
        ))}
      </div>

      {/* STEP 1 — media */}
      {step === 0 && (
        <Reveal className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            <h2 className="font-display text-xl text-mist-100 mb-3">Photograph or scan of the artifact</h2>
            <p className="text-[13.5px] text-mist-400 leading-relaxed mb-6">
              The file is hashed in your browser (SHA-256) and pinned to IPFS. The chain stores only the hash — anyone, forever, can re-verify your media against the record.
            </p>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-ink-600 hover:border-bronze-500 transition-colors p-10 text-center cursor-pointer group"
            >
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
              {reading ? (
                <span className="inline-flex items-center gap-3 text-mist-400 text-sm"><span className="spin-slow inline-block w-5 h-5 border-2 border-bronze-500/40 border-t-bronze-300 rounded-full" /> Hashing media…</span>
              ) : (
                <>
                  <ISeal width={30} height={30} className="mx-auto text-mist-700 group-hover:text-bronze-400 transition-colors mb-4" />
                  <p className="text-sm text-mist-300 mb-1">Drop an image here, or click to browse</p>
                  <p className="font-mono text-[11px] text-mist-700">JPG · PNG · TIFF · WEBP — up to 25 MB</p>
                </>
              )}
            </div>
            <div className="mt-8 flex justify-end">
              <button className="btn-bronze inline-flex items-center gap-2 px-6 py-3 text-sm" disabled={!mediaOk} onClick={() => setStep(1)}>
                Continue <IArrow width={15} height={15} />
              </button>
            </div>
          </div>
          <div>
            {media ? (
              <div className="plate overflow-hidden">
                <div className="h-72 overflow-hidden"><ArtifactImg src={media.dataUrl} alt={media.name} className="w-full h-full object-cover" /></div>
                <div className="p-5 font-mono text-[11.5px] space-y-2">
                  <div className="flex justify-between gap-4"><span className="text-mist-700">FILE</span><span className="text-mist-300 truncate">{media.name}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-mist-700">SIZE</span><span className="text-mist-300 tabular">{fmtBytes(media.size)}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-mist-700">SHA-256</span><span className="text-patina-300 truncate">{media.hash}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-mist-700">IPFS CID</span><span className="text-lapis-300 truncate">{makeCid(media.hash)}</span></div>
                </div>
              </div>
            ) : (
              <div className="plate p-8 h-full min-h-[280px] grid place-items-center">
                <p className="text-center text-[13px] text-mist-700 max-w-[240px] leading-relaxed">
                  A preview with the content commitment appears here the moment a file is read.
                </p>
              </div>
            )}
          </div>
        </Reveal>
      )}

      {/* STEP 2 — metadata */}
      {step === 1 && (
        <Reveal>
          <div className="grid md:grid-cols-[1fr_320px] gap-8 items-start">
            <div className="space-y-5">
              <h2 className="font-display text-xl text-mist-100">Catalog details</h2>
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-mist-700 mb-1.5">Title *</label>
                  <input className="field" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} placeholder="e.g. Attic Red-Figure Amphora" />
                </div>
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-mist-700 mb-1.5">Category *</label>
                  <select className="field" value={meta.category} onChange={(e) => setMeta({ ...meta, category: e.target.value as Category })}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-mist-700 mb-1.5">Year / dating *</label>
                  <input className="field" value={meta.year} onChange={(e) => setMeta({ ...meta, year: e.target.value })} placeholder="c. 480 BCE" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-mist-700 mb-1.5">Era / culture *</label>
                  <input className="field" value={meta.era} onChange={(e) => setMeta({ ...meta, era: e.target.value })} placeholder="Classical Greek" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-mist-700 mb-1.5">Description * <span className="normal-case tracking-normal">({meta.description.trim().length}/20 min)</span></label>
                  <textarea className="field min-h-[110px]" value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} placeholder="Materials, condition, dimensions, iconography…" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-mist-700 mb-1.5">Provenance notes</label>
                  <textarea className="field min-h-[90px]" value={meta.provenanceNotes} onChange={(e) => setMeta({ ...meta, provenanceNotes: e.target.value })} placeholder="Prior collections, excavations, export documentation, publications…" />
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <button className="btn-ghost px-6 py-3 text-sm" onClick={() => setStep(0)}>Back</button>
                <button className="btn-bronze inline-flex items-center gap-2 px-6 py-3 text-sm" disabled={!metaOk} onClick={() => setStep(2)}>
                  Continue <IArrow width={15} height={15} />
                </button>
              </div>
            </div>
            {media && (
              <div className="plate overflow-hidden hidden md:block">
                <div className="h-56 overflow-hidden"><ArtifactImg src={media.dataUrl} alt={media.name} className="w-full h-full object-cover" /></div>
                <div className="p-4 font-mono text-[11px] text-mist-700">
                  <div className="text-mist-300 font-body text-[13px] mb-1">{meta.title || "Untitled artifact"}</div>
                  {meta.category} · {meta.year || "—"}
                </div>
              </div>
            )}
          </div>
        </Reveal>
      )}

      {/* STEP 3 — review & sign */}
      {step === 2 && media && (
        <Reveal className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            <h2 className="font-display text-xl text-mist-100 mb-4">Review the on-chain commitment</h2>
            <div className="plate p-5 font-mono text-[11.5px] leading-relaxed">
              <div className="text-mist-700 uppercase tracking-[0.2em] text-[10px] mb-3">canonical metadata · hashed with SHA-256</div>
              <pre className="text-patina-300/90 whitespace-pre-wrap break-all">{canonical}</pre>
            </div>
            <div className="plate p-5 mt-4 font-mono text-[12px] space-y-2.5">
              <div className="flex justify-between gap-4"><span className="text-mist-700">METADATA HASH</span><span className="text-mist-300 truncate">{metaHashPreview ?? "computing…"}</span></div>
              <div className="flex justify-between gap-4"><span className="text-mist-700">MEDIA CID</span><span className="text-lapis-300 truncate">{makeCid(media.hash)}</span></div>
              <div className="flex justify-between gap-4"><span className="text-mist-700">REGISTRANT</span><span className="text-mist-300">{addr ? shortAddr(addr) : "no wallet"}</span></div>
              <div className="flex justify-between gap-4"><span className="text-mist-700">GAS DISCLOSURE</span><span className="text-bronze-300 tabular">≈ {formatEth(gasEth, 6)} ETH · Sepolia</span></div>
            </div>
            <p className="text-[12.5px] text-mist-700 leading-relaxed mt-4">
              The registration timestamp and your address as <strong className="text-mist-400">Original Owner</strong> become immutable the moment this transaction confirms. ARCA authenticates the record, not the physical object.
            </p>
          </div>
          <div>
            <div className="plate p-5 mb-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-mist-700 mb-3.5">Pre-flight checks</div>
              <div className="space-y-2.5">
                {readiness.map((r) => (
                  <div key={r.label} className="flex items-center gap-3">
                    <span className={cx("w-7 h-7 grid place-items-center border", r.ok ? "border-patina-500 text-patina-300" : "border-ink-600 text-mist-700")}>
                      {r.ok ? <ICheck width={13} height={13} /> : r.icon}
                    </span>
                    <span className={cx("text-[13px] flex-1", r.ok ? "text-mist-300" : "text-mist-500")}>{r.label}</span>
                    {!r.ok && <button onClick={r.act} className="btn-ghost px-3 py-1.5 text-[11.5px]">Fix</button>}
                  </div>
                ))}
              </div>
            </div>
            <button className="btn-bronze w-full py-3.5 text-sm inline-flex items-center justify-center gap-2" disabled={!readyAll || !!s.pending} onClick={submit}>
              <IFox width={16} height={16} /> Sign & register on-chain
            </button>
            <div className="flex justify-between mt-4">
              <button className="btn-ghost px-5 py-2.5 text-[13px]" onClick={() => setStep(1)}>Back</button>
              <span className="self-center font-mono text-[11px] text-mist-700">writes unlock only with wallet on Sepolia</span>
            </div>
          </div>
        </Reveal>
      )}

      {/* STEP 4 — sealed */}
      {step === 3 && minted && (
        <Reveal className="max-w-2xl mx-auto text-center py-6">
          <span className="stamp-in inline-flex w-20 h-20 items-center justify-center border-2 border-patina-500 text-patina-300 mb-7" style={{ borderRadius: "50%" }}>
            <ICheck width={34} height={34} />
          </span>
          <h2 className="font-display font-bold text-3xl text-mist-100 mb-3">Token #{minted.tokenId} is sealed</h2>
          <p className="text-[14.5px] text-mist-400 leading-relaxed max-w-lg mx-auto mb-8">
            “{minted.meta.title}” now carries an immutable registration: metadata hash, media commitment, timestamp and you as Original Owner. A signed ownership certificate has been issued to your wallet.
          </p>
          <div className="plate p-5 font-mono text-[12px] text-left space-y-2.5 mb-8">
            <div className="flex justify-between gap-4"><span className="text-mist-700">TOKEN</span><span className="text-mist-200">#{minted.tokenId} · block #{minted.registeredBlock.toLocaleString()}</span></div>
            <div className="flex justify-between gap-4"><span className="text-mist-700">METADATA</span><span className="text-patina-300 truncate">{shortHash(minted.metadataHash)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-mist-700">TX</span><span className="text-bronze-300 truncate">{shortHash(minted.provenance[0].txHash)}</span></div>
            {cert && <div className="flex justify-between gap-4"><span className="text-mist-700">SIGNATURE</span><span className="text-lapis-300 truncate">{shortHash(cert.signature)}</span></div>}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {cert && (
              <button className="btn-bronze inline-flex items-center gap-2 px-6 py-3 text-sm" onClick={() => downloadDoc(cert.id + ".html", certificateHtml(cert))}>
                <IDownload width={15} height={15} /> Ownership certificate
              </button>
            )}
            <button className="btn-ghost inline-flex items-center gap-2 px-6 py-3 text-sm" onClick={() => go("artifact", minted.tokenId)}>View public record</button>
            <button className="btn-ghost inline-flex items-center gap-2 px-6 py-3 text-sm" onClick={() => go("dashboard")}>Open my vault</button>
          </div>
          <p className="mt-8 font-mono text-[11px] text-mist-700">Listings cap at {MAX_LISTING_HOURS}h · you can list this artifact from your vault at any time</p>
        </Reveal>
      )}
    </div>
  );
}
