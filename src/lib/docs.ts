import { personaName } from "./seed";
import { fmtDateTime, formatEth, shortAddr, shortHash } from "./format";
import type { Certificate, Invoice } from "./types";

function docShell(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Outfit:wght@300;400;500;600&family=Spline+Sans+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  body{margin:0;background:#e9e4d8;font-family:'Outfit',sans-serif;color:#1c2733;padding:48px 24px}
  .sheet{max-width:760px;margin:0 auto;background:#fbf8f0;border:1px solid #c9b98d;box-shadow:0 24px 60px rgba(28,39,51,.18);padding:56px 64px;position:relative}
  .sheet::before{content:"";position:absolute;inset:14px;border:1px solid #d9c9a0;pointer-events:none}
  .mono{font-family:'Spline Sans Mono',monospace;font-size:12.5px;word-break:break-all}
  .display{font-family:'Cinzel',serif}
  .rule{height:2px;background:linear-gradient(90deg,#9a7130,#c08f3f 40%,transparent);margin:22px 0}
  .row{display:flex;justify-content:space-between;gap:24px;padding:9px 0;border-bottom:1px dotted #c9b98d}
  .lbl{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#7a6a45;padding-top:2px}
  .val{font-weight:500;text-align:right}
  .seal{position:absolute;right:52px;bottom:56px;width:118px;height:118px;border:3px double #9a7130;border-radius:50%;display:flex;align-items:center;justify-content:center;transform:rotate(-10deg);color:#9a7130;text-align:center;font-family:'Cinzel',serif;font-size:12px;letter-spacing:.2em;line-height:1.7;opacity:.85}
  @media print{body{background:#fff;padding:0}.sheet{box-shadow:none;border:none}}
</style></head><body><div class="sheet">${body}
<div class="seal">ARCA<br>REGISTRY<br>·&nbsp;VERIFIED&nbsp;·</div>
</div></body></html>`;
}

export function certificateHtml(c: Certificate): string {
  const body = `
  <div style="text-align:center">
    <div style="font-size:11px;letter-spacing:.34em;color:#9a7130" class="display">ARCA · HERITAGE LEDGER</div>
    <h1 class="display" style="font-size:34px;margin:14px 0 2px;color:#22303f">Certificate of On-Chain Ownership</h1>
    <div class="mono" style="color:#7a6a45">${c.id}</div>
  </div>
  <div class="rule"></div>
  <p style="font-size:15.5px;line-height:1.75;color:#33404f">
    This certifies that the wallet <span class="mono" style="background:#efe8d6;padding:2px 6px">${c.holder}</span>
    is recorded on the <strong>${c.network === "sepolia" ? "Sepolia testnet" : "Ethereum mainnet"}</strong> as the
    <strong>current owner</strong> of the cultural artifact described below. The original registrant
    <span class="mono" style="background:#efe8d6;padding:2px 6px">${c.originalOwner}</span> is permanently
    anchored on-chain and is unaffected by any subsequent transfer.
  </p>
  <div style="margin:26px 0">
    <div class="row"><span class="lbl">Artifact</span><span class="val display" style="font-size:17px">${c.title}</span></div>
    <div class="row"><span class="lbl">Category · Era</span><span class="val">${c.category} · ${c.era}</span></div>
    <div class="row"><span class="lbl">Token ID</span><span class="val mono">#${c.tokenId}</span></div>
    <div class="row"><span class="lbl">Metadata hash (SHA-256)</span><span class="val mono">${c.metadataHash}</span></div>
    <div class="row"><span class="lbl">Media hash (SHA-256)</span><span class="val mono">${c.mediaHash}</span></div>
    <div class="row"><span class="lbl">IPFS media CID</span><span class="val mono">${c.mediaCid}</span></div>
    <div class="row"><span class="lbl">Issued</span><span class="val">${fmtDateTime(c.issuedAt)}</span></div>
  </div>
  <div class="row" style="border-bottom:none"><span class="lbl">Registry signature</span><span class="val mono" style="max-width:420px">${c.signature}</span></div>
  <p style="font-size:12px;color:#7a6a45;line-height:1.7;margin-top:26px">
    ARCA authenticates the integrity of the on-chain record and its media commitment. It does not attest to the
    physical genuineness of the artifact. Independently verify this certificate by recomputing the metadata hash
    from the canonical JSON of the artifact record.
  </p>`;
  return docShell("ARCA Ownership Certificate · " + c.id, body);
}

export function invoiceHtml(inv: Invoice): string {
  const kindLabel: Record<Invoice["kind"], string> = {
    sale: "Sale Invoice", purchase: "Purchase Invoice", refund: "Auction Refund Notice", registration: "Registration Receipt",
  };
  const body = `
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <div style="font-size:11px;letter-spacing:.34em;color:#9a7130" class="display">ARCA · HERITAGE LEDGER</div>
      <h1 class="display" style="font-size:28px;margin:10px 0 2px;color:#22303f">${kindLabel[inv.kind]}</h1>
      <div class="mono" style="color:#7a6a45">${inv.id}</div>
    </div>
    <div style="text-align:right" class="mono">${fmtDateTime(inv.ts)}<br>${inv.network.toUpperCase()}</div>
  </div>
  <div class="rule"></div>
  <div style="margin:22px 0">
    <div class="row"><span class="lbl">Artifact</span><span class="val display" style="font-size:17px">${inv.title}</span></div>
    <div class="row"><span class="lbl">Token ID</span><span class="val mono">#${inv.tokenId}</span></div>
    <div class="row"><span class="lbl">${inv.kind === "sale" ? "Buyer" : inv.kind === "refund" ? "Escrow returned to" : "Seller"}</span><span class="val mono">${shortAddr(inv.kind === "sale" ? inv.counterparty : inv.kind === "refund" ? inv.owner : inv.counterparty)} · ${personaName(inv.kind === "sale" ? inv.counterparty : inv.kind === "refund" ? inv.owner : inv.counterparty)}</span></div>
    <div class="row"><span class="lbl">${inv.kind === "sale" ? "Seller" : "Buyer"}</span><span class="val mono">${shortAddr(inv.kind === "sale" ? inv.owner : inv.counterparty)} · ${personaName(inv.kind === "sale" ? inv.owner : inv.counterparty)}</span></div>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:baseline;background:#efe8d6;padding:18px 22px">
    <span class="lbl">${inv.kind === "refund" ? "Refunded amount" : "Settlement amount"}</span>
    <span class="display" style="font-size:26px;color:#22303f">${formatEth(inv.priceEth)} ETH</span>
  </div>
  <div style="margin-top:22px">
    <div class="row"><span class="lbl">Transaction hash</span><span class="val mono">${inv.txHash}</span></div>
    <div class="row"><span class="lbl">Network fee</span><span class="val mono">${inv.gasEth.toFixed(6)} ETH</span></div>
    <div class="row" style="border-bottom:none"><span class="lbl">Settlement</span><span class="val">Atomic on-chain transfer · ${inv.network === "sepolia" ? "Sepolia testnet" : "Ethereum mainnet"}</span></div>
  </div>
  <p style="font-size:12px;color:#7a6a45;line-height:1.7;margin-top:26px">
    Generated automatically by the ARCA indexer from on-chain events. Trace this document to its public transaction
    hash. ARCA settles in ETH only — no fiat is processed on the platform.
  </p>`;
  return docShell("ARCA Invoice · " + inv.id, body);
}

export function downloadDoc(filename: string, html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export { shortHash };
