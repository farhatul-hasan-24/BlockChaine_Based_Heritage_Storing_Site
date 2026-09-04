export type ToastKind = "ok" | "warn" | "err" | "info";
export interface ToastMsg {
  id: number;
  kind: ToastKind;
  text: string;
}

let seq = 1;
const listeners = new Set<(t: ToastMsg) => void>();

export function toast(text: string, kind: ToastKind = "info") {
  const msg = { id: seq++, kind, text };
  listeners.forEach((l) => l(msg));
}

export function onToast(fn: (t: ToastMsg) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
