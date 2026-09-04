import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  width: 18,
  height: 18,
  ...p,
});

export const IKeystone = (p: P) => (
  <svg viewBox="0 0 32 32" fill="none" width={22} height={22} {...p}>
    <path d="M16 4l10 24h-5.2l-2-5H13.2l-2 5H6L16 4z" fill="currentColor" opacity="0.9" />
    <path d="M16 12.5l-2.6 6.5h5.2L16 12.5z" fill="#0b1421" />
  </svg>
);
export const IGavel = (p: P) => (
  <svg {...base(p)}>
    <path d="M13.2 5.6l5.2 5.2M9.4 9.4l5.2 5.2M11.3 3.7l3.8 3.8-2.6 2.6-3.8-3.8zM7.5 7.5l3.8 3.8-2.6 2.6-3.8-3.8z" />
    <path d="M12.6 12.6L4 21.2M13 21h8" />
  </svg>
);
export const IBolt = (p: P) => (
  <svg {...base(p)}><path d="M13 2L4.5 13.5H11L9.5 22 19 9.5h-6.5L13 2z" /></svg>
);
export const IShield = (p: P) => (
  <svg {...base(p)}><path d="M12 3l7 2.6v5.1c0 4.6-3 8.6-7 10.3-4-1.7-7-5.7-7-10.3V5.6L12 3z" /></svg>
);
export const IShieldCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3l7 2.6v5.1c0 4.6-3 8.6-7 10.3-4-1.7-7-5.7-7-10.3V5.6L12 3z" />
    <path d="M8.8 12l2.3 2.3 4.1-4.6" />
  </svg>
);
export const IGas = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 21V6a2 2 0 012-2h6a2 2 0 012 2v15M3 21h12M5 8h8" />
    <path d="M14 10h2.5a1.5 1.5 0 011.5 1.5V18a1.5 1.5 0 003 0v-6l-2.5-2.5" />
  </svg>
);
export const IBlock = (p: P) => (
  <svg {...base(p)}><path d="M12 2.5l8 4.5v10l-8 4.5L4 17V7l8-4.5zM4 7l8 4.5L20 7M12 11.5V21.5" /></svg>
);
export const IClock = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2.2" /></svg>
);
export const ISearch = (p: P) => (
  <svg {...base(p)}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M20.5 20.5l-5.2-5.2" /></svg>
);
export const IDownload = (p: P) => (
  <svg {...base(p)}><path d="M12 3.5v11M7.5 10.5l4.5 4.5 4.5-4.5M4 20h16" /></svg>
);
export const ICopy = (p: P) => (
  <svg {...base(p)}><rect x="9" y="9" width="11" height="11" rx="1.5" /><path d="M5 15H4.5A1.5 1.5 0 013 13.5v-9A1.5 1.5 0 014.5 3h9A1.5 1.5 0 0115 4.5V5" /></svg>
);
export const ICheck = (p: P) => (
  <svg {...base(p)}><path d="M4.5 12.5l5 5L19.5 6.5" /></svg>
);
export const IX = (p: P) => (
  <svg {...base(p)}><path d="M5.5 5.5l13 13M18.5 5.5l-13 13" /></svg>
);
export const IFlag = (p: P) => (
  <svg {...base(p)}><path d="M5 21V4M5 4c2.5-1.6 5-1.6 7.5 0S17.5 5.6 20 4v9c-2.5 1.6-5 1.6-7.5 0S7.5 11.4 5 13" /></svg>
);
export const IWallet = (p: P) => (
  <svg {...base(p)}>
    <path d="M3.5 7.5A2.5 2.5 0 016 5h11.5A2.5 2.5 0 0120 7.5v9a2.5 2.5 0 01-2.5 2.5H6a2.5 2.5 0 01-2.5-2.5v-9z" />
    <path d="M15 12h5v3h-5a1.5 1.5 0 010-3z" />
  </svg>
);
export const IUser = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c1.3-3.2 4-4.8 7.5-4.8s6.2 1.6 7.5 4.8" /></svg>
);
export const IMuseum = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 9.5L12 4l9 5.5M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3.5 20.5h17M3.5 17.5h17" />
  </svg>
);
export const IArrow = (p: P) => (
  <svg {...base(p)}><path d="M4 12h15M13.5 6l6 6-6 6" /></svg>
);
export const IChain = (p: P) => (
  <svg {...base(p)}>
    <path d="M9.5 14.5l5-5" />
    <path d="M11 6.8l1.8-1.8a3.8 3.8 0 015.4 5.4L16.4 12.2M13 17.2l-1.8 1.8a3.8 3.8 0 01-5.4-5.4l1.8-1.8" />
  </svg>
);
export const IAlert = (p: P) => (
  <svg {...base(p)}><path d="M12 3.5l9.5 16.5h-19L12 3.5zM12 10v4.2M12 17.4v.2" /></svg>
);
export const IScroll = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 4h11.5A2.5 2.5 0 0120 6.5V18M6 4a2 2 0 00-2 2v1h4M6 4h11.5M18 18a2 2 0 004 0v0a2 2 0 00-2-2h-4M18 18a2 2 0 01-2 2H6.5A2.5 2.5 0 014 17.5V7M9 9h7M9 12.5h7" />
  </svg>
);
export const ISeal = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="10" r="6" />
    <circle cx="12" cy="10" r="2.6" />
    <path d="M8.5 15L7 21l5-2.4L17 21l-1.5-6" />
  </svg>
);
export const IEye = (p: P) => (
  <svg {...base(p)}>
    <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
);
export const ILayers = (p: P) => (
  <svg {...base(p)}><path d="M12 3l9 4.8-9 4.8-9-4.8L12 3zM4 12.5l8 4.3 8-4.3M4 16.7l8 4.3 8-4.3" /></svg>
);
export const IFox = (p: P) => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" {...p}>
    <path d="M12 3.5c4.7 0 8.5 3.6 8.5 8.2 0 4.9-4 8.8-8.5 8.8s-8.5-3.9-8.5-8.8c0-4.6 3.8-8.2 8.5-8.2z" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="9" cy="11.5" r="1.15" fill="currentColor" />
    <circle cx="15" cy="11.5" r="1.15" fill="currentColor" />
    <path d="M10.5 15.5c.9.7 2.1.7 3 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
export const IGoogle = (p: P) => (
  <svg viewBox="0 0 24 24" width={18} height={18} {...p}>
    <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.6l3.1-3.1C17.4 2.1 14.9 1 12 1 7.7 1 4 3.4 2.2 7l3.6 2.8C6.7 7.1 9.1 5.4 12 5.4z" />
    <path fill="#4285F4" d="M22.6 12.2c0-.9-.1-1.6-.2-2.3H12v4.4h6c-.3 1.4-1.1 2.6-2.3 3.4l3.5 2.7c2.1-2 3.4-4.9 3.4-8.2z" />
    <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 010-4.4L2.2 7a11 11 0 000 10l3.6-2.8z" />
    <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.3-1.7-6.2-4.4L2.2 17C4 20.6 7.7 23 12 23z" />
  </svg>
);
