import { addressFromEmail, canonicalMeta, makeCid, randomHex, sha256Hex, signPayload, txHash } from "./crypto";
import type {
  Artifact,
  AppState,
  Certificate,
  GoogleUser,
  Invoice,
  Listing,
  Tx,
} from "./types";
import { CONTRACTS } from "./types";

export const IMG = {
  mirror: "https://image.qwenlm.ai/generated-images/41441792-bcba-4dff-9562-a7b28a66488c/_result.png",
  manuscript: "https://image.qwenlm.ai/generated-images/d709d762-24a7-4be7-904d-202806cf1190/_result.png",
  amphora: "https://image.qwenlm.ai/generated-images/9a18e892-d729-4d33-a9f4-ec52c9890868/_result.png",
  jade: "https://image.qwenlm.ai/generated-images/bd3f7f20-da80-4811-b570-d0907c4313a1/_result.png",
  aureus: "https://image.qwenlm.ai/generated-images/fddc80e5-f7e0-4edb-8fd2-fedaab608820/_result.png",
  astrolabe: "https://image.qwenlm.ai/generated-images/cb11e1b5-1807-4f2d-9a6f-5edb98232089/_result.png",
  tablet: "https://image.qwenlm.ai/generated-images/b16ffc66-e569-4231-b3b5-870353e3407f/_result.png",
  silk: "https://image.qwenlm.ai/generated-images/66f205a1-f72e-4edb-9a48-50cdbb32d237/_result.png",
};

export const DEMO_GOOGLE_USERS: GoogleUser[] = [
  { uid: "g-amara", name: "Dr. Amara Osei", email: "amara.osei@heritage.org", role: "user", org: "Private Collection · Accra" },
  { uid: "g-meridian", name: "Meridian Museum", email: "curator@meridianmuseum.org", role: "institution", org: "Meridian Museum of Antiquities" },
  { uid: "g-admin", name: "Ledger Admin", email: "admin@arca.network", role: "admin", org: "ARCA Foundation" },
];

export const PERSONAS = {
  elena: "0xe41a7B90cD2f1E7C6a3F8D5b9A2C4e6F8013B5d7",
  akira: "0x7c2F88A1bD4E6f0935AaC7d1E9b3F24C6085D1eA",
  halcyon: "0x3B6cD91F4aE805bC27FfA6D0E19c48B5d2A70F3E",
};

export const ADDR = {
  amara: addressFromEmail("amara.osei@heritage.org"),
  meridian: addressFromEmail("curator@meridianmuseum.org"),
  admin: addressFromEmail("admin@arca.network"),
  ...PERSONAS,
};

export function personaName(addr: string): string {
  const a = addr.toLowerCase();
  if (a === ADDR.amara.toLowerCase()) return "Dr. Amara Osei";
  if (a === ADDR.meridian.toLowerCase()) return "Meridian Museum";
  if (a === ADDR.admin.toLowerCase()) return "Ledger Admin";
  if (a === ADDR.elena.toLowerCase()) return "Elena Vásquez";
  if (a === ADDR.akira.toLowerCase()) return "Akira Tanaka";
  if (a === ADDR.halcyon.toLowerCase()) return "The Halcyon Trust";
  return "External wallet";
}

const H = 3600_000;
const D = 24 * H;

interface SeedSpec {
  media: string;
  mediaName: string;
  mediaSize: number;
  title: string;
  category: Artifact["meta"]["category"];
  era: string;
  year: string;
  description: string;
  provenanceNotes: string;
  originalOwner: string;
  owner: string;
  mintDaysAgo: number;
  transfer?: { to: string; daysAgo: number; priceEth: number };
}

const SPECS: SeedSpec[] = [
  {
    media: IMG.aureus, mediaName: "aureus-hadrian-obverse.tif", mediaSize: 4_812_330,
    title: "Aureus of Hadrian, Laureate", category: "Numismatics", era: "Roman Imperial", year: "AD 125–128",
    description: "Gold aureus struck at the Rome mint, obverse laureate bust of Hadrian, reverse Jupiter seated holding Victory. Exceptional lustre with light cabinet wear.",
    provenanceNotes: "Acquired at a Geneva numismatic auction in 1987; export documentation on file. Single private collection since.",
    originalOwner: ADDR.amara, owner: ADDR.amara, mintDaysAgo: 64,
  },
  {
    media: IMG.mirror, mediaName: "corinthian-mirror-scan.png", mediaSize: 8_204_117,
    title: "Corinthian Bronze Mirror", category: "Metalwork", era: "Archaic Greek", year: "c. 520 BCE",
    description: "Cast bronze mirror disc with incised concentric meander border and a palmette handle. Deep green patina consistent with burial context.",
    provenanceNotes: "Ex-collection of a Basel antiquarian (1962–2004); thermoluminescence report accompanies the lot.",
    originalOwner: ADDR.halcyon, owner: ADDR.elena, mintDaysAgo: 412,
    transfer: { to: ADDR.elena, daysAgo: 143, priceEth: 3.1 },
  },
  {
    media: IMG.amphora, mediaName: "amphora-rti-capture.tif", mediaSize: 12_902_544,
    title: "Attic Red-Figure Amphora", category: "Ceramics", era: "Classical Greek", year: "c. 480 BCE",
    description: "Two-handled amphora attributed to the Berlin Painter circle; obverse depicts an armed warrior departing, reverse a draped youth with staff.",
    provenanceNotes: "Documented in a 1911 estate inventory; deaccessioned by the museum board in 2024 with full publication record.",
    originalOwner: ADDR.meridian, owner: ADDR.elena, mintDaysAgo: 388,
    transfer: { to: ADDR.elena, daysAgo: 118, priceEth: 4.2 },
  },
  {
    media: IMG.manuscript, mediaName: "hours-leaf-f12r.jpg", mediaSize: 6_114_802,
    title: "Book of Hours Leaf, Flanders", category: "Manuscripts", era: "Late Medieval", year: "c. 1460",
    description: "Vellum leaf with Hours of the Virgin, burnished gold and lapis border inhabited by acanthus; a miniature of the Annunciation in fine grisaille.",
    provenanceNotes: "From a dismembered Flemish book of hours; sibling leaves traced in two university collections.",
    originalOwner: ADDR.meridian, owner: ADDR.meridian, mintDaysAgo: 201,
  },
  {
    media: IMG.jade, mediaName: "jade-dragon-pendant-uv.tif", mediaSize: 5_318_990,
    title: "Jade Dragon Pendant", category: "Jade & Stone", era: "Tang Dynasty", year: "8th century",
    description: "Translucent celadon nephrite pendant carved in openwork with a striding dragon, cloud-scroll reverse. Surface polish of great age.",
    provenanceNotes: "Inherited within the same family since the 1940s; pre-1970 export stamp photographed and archived.",
    originalOwner: ADDR.akira, owner: ADDR.akira, mintDaysAgo: 156,
  },
  {
    media: IMG.astrolabe, mediaName: "astrolabe-mater-detail.jpg", mediaSize: 7_005_431,
    title: "Planispheric Astrolabe, al-Andalus", category: "Scientific Instruments", era: "Islamic Golden Age", year: "c. 1060",
    description: "Engraved brass astrolabe with openwork rete for 29 stars, kufic signature on the throne, latitude plates for Córdoba and Toledo.",
    provenanceNotes: "Recorded in a Madrid collection by 1889; inscription corpus published in 1974.",
    originalOwner: ADDR.halcyon, owner: ADDR.halcyon, mintDaysAgo: 97,
  },
  {
    media: IMG.tablet, mediaName: "uruk-tablet-both-faces.tif", mediaSize: 9_441_076,
    title: "Cuneiform Ration Tablet, Uruk", category: "Epigraphy", era: "Early Dynastic", year: "c. 2900 BCE",
    description: "Proto-literate administrative tablet recording barley rations; 14 lines of pictographic signs with numerical notations, edges worn.",
    provenanceNotes: "Published tablet from a documented early-20th-century excavation share; museum accession number retained.",
    originalOwner: ADDR.meridian, owner: ADDR.meridian, mintDaysAgo: 320,
  },
  {
    media: IMG.silk, mediaName: "kaftan-fragment-multispectral.png", mediaSize: 10_227_664,
    title: "Ottoman Silk Kaftan Fragment", category: "Textiles", era: "Ottoman Court", year: "c. 1580",
    description: "Crimson kemha brocade with gold-thread tulips and saz leaves; selvedge intact on one edge, consistent with Bursa court weaving.",
    provenanceNotes: "Removed from a ceremonial kaftan before 1900; accompanied by dye-analysis report (madder + lac).",
    originalOwner: ADDR.halcyon, owner: ADDR.amara, mintDaysAgo: 233,
    transfer: { to: ADDR.amara, daysAgo: 29, priceEth: 2.1 },
  },
];

function mkTxsHash() {
  return txHash();
}

export async function buildSeed(): Promise<Pick<AppState, "artifacts" | "listings" | "txs" | "invoices" | "certificates" | "balances" | "fauceted" | "block" | "gasGwei">> {
  const now = Date.now();
  const artifacts: Artifact[] = [];
  const txs: Tx[] = [];
  const certificates: Certificate[] = [];
  const invoices: Invoice[] = [];

  for (let i = 0; i < SPECS.length; i++) {
    const s = SPECS[i];
    const tokenId = 1001 + i;
    const mediaHash = randomHex(32);
    const meta = { title: s.title, description: s.description, category: s.category, era: s.era, year: s.year, provenanceNotes: s.provenanceNotes };
    const metadataHash = await sha256Hex(canonicalMeta(meta, mediaHash));
    const mintTs = now - s.mintDaysAgo * D;
    const mintBlock = 6_300_000 + i * 17_431;
    const mintHash = mkTxsHash();
    const provenance: Artifact["provenance"] = [
      { kind: "mint", from: null, to: s.originalOwner, txHash: mintHash, block: mintBlock, ts: mintTs, note: "Registered on-chain · original owner" },
    ];
    let owner = s.originalOwner;
    let lastTs = mintTs;
    let holderSince = mintTs;

    txs.push({
      hash: mintHash, kind: "mint", from: s.originalOwner, to: CONTRACTS.registry, valueEth: 0,
      gasEth: 0.0021, block: mintBlock, ts: mintTs, artifactId: tokenId, label: "Registry mint · " + s.title,
    });

    if (s.transfer) {
      const tHash = mkTxsHash();
      const tTs = now - s.transfer.daysAgo * D;
      const tBlock = mintBlock + 900_000 + i * 431;
      provenance.push({
        kind: "transfer", from: s.originalOwner, to: s.transfer.to, txHash: tHash,
        block: tBlock, ts: tTs, priceEth: s.transfer.priceEth, note: "Marketplace settlement",
      });
      owner = s.transfer.to;
      lastTs = tTs;
      holderSince = tTs;
      txs.push({
        hash: tHash, kind: "buy", from: s.transfer.to, to: s.originalOwner, valueEth: s.transfer.priceEth,
        gasEth: 0.0018, block: tBlock, ts: tTs, artifactId: tokenId, label: "Ownership transfer · " + s.title,
      });
      invoices.push(
        {
          id: "INV-" + tokenId + "-1", kind: "purchase", artifactId: tokenId, tokenId, title: s.title,
          priceEth: s.transfer.priceEth, counterparty: s.originalOwner, owner: s.transfer.to, txHash: tHash,
          ts: tTs, gasEth: 0.0018, network: "sepolia",
        },
        {
          id: "INV-" + tokenId + "-2", kind: "sale", artifactId: tokenId, tokenId, title: s.title,
          priceEth: s.transfer.priceEth, counterparty: s.transfer.to, owner: s.originalOwner, txHash: tHash,
          ts: tTs, gasEth: 0.0004, network: "sepolia",
        }
      );
    }

    const certPayload = JSON.stringify({ tokenId, holder: owner, metadataHash, mediaHash, issuedAt: holderSince });
    const signature = await signPayload(certPayload, CONTRACTS.registry);
    certificates.push({
      id: "CERT-" + tokenId + "-" + Math.floor(holderSince / 1000),
      tokenId, artifactId: tokenId, title: s.title, category: s.category, era: s.era,
      holder: owner, originalOwner: s.originalOwner, issuedAt: holderSince, signature,
      metadataHash, mediaHash, mediaCid: makeCid(mediaHash), network: "sepolia",
    });

    artifacts.push({
      tokenId, metadataHash, metaCid: makeCid(metadataHash), mediaCid: makeCid(mediaHash),
      media: s.media, mediaName: s.mediaName, mediaSize: s.mediaSize, mediaHash, meta,
      owner, originalOwner: s.originalOwner, registeredAt: mintTs, registeredBlock: mintBlock,
      provenance, verified: true,
    });
    void lastTs;
  }

  const byTitle = (t: string) => artifacts.find((a) => a.meta.title === t)!;
  const mkListing = (
    title: string, kind: Listing["kind"], priceEth: number, endsInH: number,
    bids: { bidder: string; amountEth: number; hAgo: number }[]
  ): Listing => {
    const a = byTitle(title);
    const createdAt = now - (endsInH * H - 6 * H); // created 6h after list window opened… simpler: createdAt = endsAt - window
    const endsAt = now + endsInH * H;
    const lHash = mkTxsHash();
    txs.push({
      hash: lHash, kind: "list", from: a.owner, to: CONTRACTS.marketplace, valueEth: 0,
      gasEth: 0.0014, block: 6_470_000 + endsInH * 911, ts: createdAt, artifactId: a.tokenId,
      label: (kind === "buy" ? "Instant listing · " : "Auction opened · ") + title,
    });
    const bidObjs = bids.map((b, bi) => ({
      bidder: b.bidder, amountEth: b.amountEth, ts: now - b.hAgo * H, txHash: mkTxsHash(),
    })).sort((x, y) => x.ts - y.ts);
    void bidObjs[0];
    return {
      tokenId: a.tokenId, seller: a.owner, kind, priceEth, endsAt, createdAt,
      status: "active", bids: bids.map((b) => ({ bidder: b.bidder, amountEth: b.amountEth, ts: now - b.hAgo * H, txHash: mkTxsHash() })),
      flags: [],
    };
  };

  const listings: Listing[] = [
    mkListing("Corinthian Bronze Mirror", "auction", 2.2, 2.6, [
      { bidder: ADDR.akira, amountEth: 2.2, hAgo: 4.2 },
      { bidder: ADDR.halcyon, amountEth: 2.45, hAgo: 1.1 },
    ]),
    mkListing("Planispheric Astrolabe, al-Andalus", "auction", 3.6, 9, [
      { bidder: ADDR.elena, amountEth: 3.6, hAgo: 7 },
      { bidder: ADDR.akira, amountEth: 3.8, hAgo: 2.4 },
    ]),
    mkListing("Attic Red-Figure Amphora", "auction", 4.8, 26, [
      { bidder: ADDR.akira, amountEth: 5.0, hAgo: 9 },
    ]),
    mkListing("Aureus of Hadrian, Laureate", "buy", 1.8, 20, []),
    mkListing("Jade Dragon Pendant", "buy", 2.9, 14, []),
    mkListing("Book of Hours Leaf, Flanders", "buy", 3.4, 31, []),
  ];

  // seed one resolved dispute for the admin queue
  listings[2].flags.push({ reason: "Seller provenance note conflicts with the 1911 inventory record.", by: ADDR.akira, ts: now - 5 * H });

  const balances: Record<string, number> = {
    [ADDR.amara]: 12.5,
    [ADDR.meridian]: 25,
    [ADDR.admin]: 10,
    [ADDR.elena]: 6.2, // 3.6 in auction escrow
    [ADDR.akira]: 4.2, // 11.0 in auction escrow
    [ADDR.halcyon]: 37.55, // 2.45 in auction escrow
  };

  return {
    artifacts, listings, txs, invoices, certificates, balances,
    fauceted: Object.values(ADDR), block: 6_482_117, gasGwei: 14.2,
  };
}
