export type Role = "user" | "institution" | "admin";

export interface GoogleUser {
  uid: string;
  name: string;
  email: string;
  role: Role;
  org?: string;
}

export type Network = "sepolia" | "mainnet";

export interface WalletInfo {
  address: string;
  label: string;
  network: Network;
}

export const CATEGORIES = [
  "Ceramics",
  "Manuscripts",
  "Metalwork",
  "Numismatics",
  "Textiles",
  "Scientific Instruments",
  "Jade & Stone",
  "Epigraphy",
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface ArtifactMeta {
  title: string;
  description: string;
  category: Category;
  era: string;
  year: string;
  provenanceNotes: string;
}

export interface ProvEntry {
  kind: "mint" | "transfer";
  from: string | null;
  to: string;
  txHash: string;
  block: number;
  ts: number;
  priceEth?: number;
  note?: string;
}

export interface Artifact {
  tokenId: number;
  metadataHash: string;
  metaCid: string;
  mediaCid: string;
  media: string;
  mediaName: string;
  mediaSize: number;
  mediaHash: string;
  meta: ArtifactMeta;
  owner: string;
  originalOwner: string;
  registeredAt: number;
  registeredBlock: number;
  provenance: ProvEntry[];
  verified: boolean;
}

export interface Bid {
  bidder: string;
  amountEth: number;
  txHash: string;
  ts: number;
}

export type ListingStatus = "active" | "sold" | "expired";

export interface Listing {
  tokenId: number;
  seller: string;
  kind: "buy" | "auction";
  priceEth: number; // buy price OR auction starting price
  endsAt: number;
  createdAt: number;
  status: ListingStatus;
  bids: Bid[];
  result?: { winner: string; amountEth: number; txHash: string; ts: number };
  flags: { reason: string; by: string; ts: number }[];
  removedByAdmin?: boolean;
}

export interface Tx {
  hash: string;
  kind: "mint" | "list" | "bid" | "buy" | "settle" | "refund";
  from: string;
  to: string | null;
  valueEth: number;
  gasEth: number;
  block: number;
  ts: number;
  artifactId: number | null;
  label: string;
}

export interface Invoice {
  id: string;
  kind: "sale" | "purchase" | "refund" | "registration";
  artifactId: number;
  tokenId: number;
  title: string;
  priceEth: number;
  counterparty: string;
  owner: string; // recipient of this document copy
  txHash: string;
  ts: number;
  gasEth: number;
  network: Network;
}

export interface Certificate {
  id: string;
  tokenId: number;
  artifactId: number;
  title: string;
  category: string;
  era: string;
  holder: string;
  originalOwner: string;
  issuedAt: number;
  signature: string;
  metadataHash: string;
  mediaHash: string;
  mediaCid: string;
  network: Network;
}

export interface PendingTx {
  label: string;
  step: 0 | 1 | 2 | 3; // confirm | signing | pending | done
  confirmations: number;
  txHash: string;
  artifactId?: number;
  kind: Tx["kind"];
}

export interface AppState {
  v: number;
  booted: boolean;
  block: number;
  gasGwei: number;
  wallet: WalletInfo | null;
  user: GoogleUser | null;
  artifacts: Artifact[];
  listings: Listing[];
  txs: Tx[];
  invoices: Invoice[];
  certificates: Certificate[];
  balances: Record<string, number>;
  fauceted: string[];
  pending: PendingTx | null;
}

export const CONTRACTS = {
  registry: "0x5FbD2554199B3a42aFfB7A6c9b3e21E8C0f7a1C4",
  marketplace: "0x9A676e781A523b5d0C0e43731313A708CB75b9E2",
  registryAbi: "ArtifactRegistry.sol · mint(bytes32 metaHash, string mediaCid)",
  marketplaceAbi: "Marketplace.sol · listInstant(uint256 id, uint256 price) · listAuction(uint256 id, uint256 start, uint48 dur)",
};

export const MAX_LISTING_HOURS = 48;
export const MIN_BID_INCREMENT = 0.05;
export const REGISTRY_GAS = 96_000;
export const LIST_GAS = 62_000;
export const BID_GAS = 48_000;
export const BUY_GAS = 84_000;
export const FAUCET_AMOUNT = 12.5;
