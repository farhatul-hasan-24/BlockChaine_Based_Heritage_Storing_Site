import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { readiness } from "../lib/chain";
import { onToast, type ToastMsg } from "../lib/toast";
import { cx } from "../lib/format";
import { IAlert, IBolt, ICheck, IGavel, IX } from "./icons";

/* ---------------- global gate bus ---------------- */
export type GateEvent = "wallet" | "google" | "wrongnet";
const bus = new Set<(e: GateEvent) => void>();
export function requestGate(e: GateEvent) {
  bus.forEach((l) => l(e));
}
export function onGate(fn: (e: GateEvent) => void): () => void {
  bus.add(fn);
  return () => bus.delete(fn);
}
/** returns true when the caller may proceed with a chain write */
export function requireChain(): boolean {
  const r = readiness();
  if (r.ok) return true;
  if (r.missing === "user") requestGate("google");
  else if (r.missing === "wallet") requestGate("wallet");
  else requestGate("wrongnet");
  return false;
}

/* ---------------- time / count hooks ---------------- */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useCountUp(target: number, duration = 1400): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

/* ---------------- scroll reveal ---------------- */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as never}
      className={cx("rv", inView && "in", className)}
      style={{ transitionDelay: delay + "ms" } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

/* ---------------- modal ---------------- */
export function Modal({
  open,
  onClose,
  children,
  width = "max-w-lg",
  locked = false,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: string;
  locked?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !locked) onClose();
    };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [open, onClose, locked]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm fade-in" onClick={() => !locked && onClose()} />
      <div className={cx("relative w-full plate modal-in max-h-[92vh] overflow-y-auto tx-progress", width)}>
        {!locked && (
          <button
            onClick={onClose}
            className="absolute right-3.5 top-3.5 z-10 text-mist-500 hover:text-bronze-300 transition-colors"
            aria-label="Close"
          >
            <IX width={20} height={20} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

/* ---------------- toasts ---------------- */
export function ToastHost() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(
    () =>
      onToast((t) => {
        setItems((cur) => [...cur.slice(-3), t]);
        window.setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== t.id)), 5200);
      }),
    []
  );
  const color = { ok: "border-patina-500/60 text-patina-300", warn: "border-bronze-500/60 text-bronze-300", err: "border-oxide-500/60 text-oxide-300", info: "border-lapis-500/60 text-lapis-300" };
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 w-[min(92vw,380px)]">
      {items.map((t) => (
        <div key={t.id} className={cx("plate row-enter flex items-start gap-3 px-4 py-3 text-sm border-l-2", color[t.kind])}>
          <span className="mt-0.5 shrink-0">
            {t.kind === "ok" ? <ICheck width={15} height={15} /> : t.kind === "err" || t.kind === "warn" ? <IAlert width={15} height={15} /> : <IBolt width={15} height={15} />}
          </span>
          <span className="text-mist-200 leading-snug">{t.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- badges ---------------- */
export function KindBadge({ kind, className }: { kind: "buy" | "auction"; className?: string }) {
  return kind === "auction" ? (
    <span className={cx("inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono tracking-wider uppercase bg-bronze-500/15 text-bronze-300 border border-bronze-500/40", className)}>
      <IGavel width={12} height={12} /> Auction
    </span>
  ) : (
    <span className={cx("inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono tracking-wider uppercase bg-lapis-500/15 text-lapis-300 border border-lapis-500/40", className)}>
      <IBolt width={12} height={12} /> Instant buy
    </span>
  );
}

export function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-patina-500/15 text-patina-300 border-patina-500/40",
    sold: "bg-bronze-500/15 text-bronze-300 border-bronze-500/40",
    expired: "bg-mist-700/15 text-mist-500 border-mist-700/40",
  };
  return (
    <span className={cx("inline-flex items-center px-2.5 py-1 text-[11px] font-mono tracking-wider uppercase border", map[status] ?? map.expired)}>
      {status}
    </span>
  );
}

/* ---------------- image with graceful fallback ---------------- */
const FALLBACK =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><rect width='400' height='300' fill='#122238'/><path d='M200 90l40 96h-18.4l-7.2-17.6h-28.8L178.4 186H160z m0 32l-9.6 24h19.2z' fill='#3a5675'/><text x='200' y='230' text-anchor='middle' font-family='monospace' font-size='13' fill='#5d7390'>media pending re-pin</text></svg>`
  );

export function ArtifactImg({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={(e) => {
        const el = e.currentTarget;
        if (el.src !== FALLBACK) el.src = FALLBACK;
      }}
    />
  );
}

/* ---------------- misc ---------------- */
export function SectionTitle({ kicker, title, right }: { kicker: string; title: string; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-6 mb-8">
      <div>
        <div className="kicker mb-3">{kicker}</div>
        <h2 className="font-display text-2xl md:text-[2rem] leading-tight text-mist-100 font-semibold">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function HashChip({ label, value, className }: { label: string; value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={cx("group/chip flex items-center gap-2 font-mono text-[11.5px] text-mist-500 hover:text-bronze-300 transition-colors", className)}
      onClick={() => {
        navigator.clipboard?.writeText(value).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      title={value}
    >
      <span className="uppercase tracking-wider text-mist-700">{label}</span>
      <span className="truncate max-w-[180px]">{value}</span>
      <span className="text-patina-400 opacity-0 group-hover/chip:opacity-100 transition-opacity">{copied ? "copied" : "copy"}</span>
    </button>
  );
}
