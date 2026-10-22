import type { ReviewStatus } from "@prisma/client";

import type { CsvTable } from "./csv.server";
import type { ImportSourceId } from "./sources";

// Column names seen across review apps' exports. Headers are compared after
// lowercasing and removing spaces, dashes and underscores.
const ALIASES = {
  rating: [
    "rating",
    "reviewscore",
    "score",
    "stars",
    "starrating",
    "reviewrating",
    "productrating",
  ],
  body: [
    "body",
    "review",
    "reviewbody",
    "reviewcontent",
    "content",
    "text",
    "comment",
    "reviewtext",
    "message",
    "description",
  ],
  title: ["title", "reviewtitle", "headline", "subject", "summary"],
  name: [
    "reviewername",
    "author",
    "authorname",
    "name",
    "displayname",
    "nickname",
    "customername",
    "fullname",
    "reviewer",
    "username",
  ],
  email: [
    "revieweremail",
    "email",
    "authoremail",
    "customeremail",
    "useremail",
  ],
  date: [
    "reviewdate",
    "date",
    "createdat",
    "created",
    "submittedat",
    "publishedat",
    "datecreated",
    "reviewcreateddate",
    "creationdate",
  ],
  productId: [
    "productid",
    "shopifyproductid",
    "productshopifyid",
    "productexternalid",
    "itemid",
  ],
  handle: ["producthandle", "handle", "productslug"],
  productUrl: ["producturl", "url", "productlink"],
  status: [
    "curated",
    "status",
    "published",
    "state",
    "reviewstatus",
    "approved",
  ],
  reply: [
    "reply",
    "merchantreply",
    "publicreply",
    "storereply",
    "commentreply",
    "replycontent",
  ],
  replyDate: ["replydate", "repliedat", "merchantrepliedat"],
} as const;

export type Field = keyof typeof ALIASES;
export type Mapping = Partial<Record<Field, string>>;

const normalizeHeader = (header: string) =>
  header.toLowerCase().replace(/[\s_\-.]/g, "");

/** Picks the first header matching each field's aliases (alias order = priority). */
export function detectMapping(headers: string[]): Mapping {
  const normalized = headers.map(normalizeHeader);
  const mapping: Mapping = {};
  const used = new Set<number>();
  for (const [field, aliases] of Object.entries(ALIASES) as [
    Field,
    readonly string[],
  ][]) {
    for (const alias of aliases) {
      const index = normalized.findIndex((h, i) => h === alias && !used.has(i));
      if (index !== -1) {
        mapping[field] = headers[index];
        used.add(index);
        break;
      }
    }
  }
  return mapping;
}

export type ImportRow = {
  line: number;
  rating: number;
  body: string;
  title: string | null;
  authorName: string;
  authorEmail: string | null;
  submittedAt: Date | null;
  productId: string | null; // numeric Shopify id
  handle: string | null;
  fileStatus: ReviewStatus | null;
  reply: string | null;
  replyAt: Date | null;
};

const LIMITS = { name: 60, title: 120, body: 5000, reply: 2000 };

/** Ratings may be "5", "4.0", "4,5", or out of 10/100; clamp to 1-5 whole stars. */
function parseRating(raw: string) {
  const value = Number(raw.replace(",", ".").trim());
  if (!Number.isFinite(value) || value <= 0) return null;
  const outOfFive = value > 10 ? value / 20 : value > 5 ? value / 2 : value;
  return Math.min(5, Math.max(1, Math.round(outOfFive)));
}

/**
 * Dates: ISO and timestamps parse directly. "a/b/yyyy" is day/month for Judge.me, our template
 * and our own export (dd/mm/yyyy); otherwise a value over 12 decides, defaulting to day/month.
 */
function parseDate(raw: string, source: ImportSourceId): Date | null {
  const value = raw.trim();
  if (!value) return null;
  const slash = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (slash) {
    const [a, b, year] = [Number(slash[1]), Number(slash[2]), Number(slash[3])];
    const dayFirst =
      source === "judgeme" ||
      source === "spreadsheet" ||
      source === "blinc" ||
      a > 12 ||
      b <= 12;
    const [day, month] = dayFirst ? [a, b] : [b, a];
    const date = new Date(Date.UTC(year, month - 1, day, 12));
    return Number.isNaN(date.getTime()) || month > 12 ? null : date;
  }
  if (/^\d{10,13}$/.test(value)) {
    const ms = value.length === 10 ? Number(value) * 1000 : Number(value);
    return new Date(ms);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseStatus(raw: string): ReviewStatus | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  if (
    [
      "ok",
      "published",
      "approved",
      "true",
      "yes",
      "1",
      "active",
      "live",
    ].includes(value)
  )
    return "PUBLISHED";
  if (
    [
      "not-yet",
      "pending",
      "unpublished",
      "draft",
      "to curate",
      "awaiting",
    ].includes(value)
  )
    return "PENDING";
  if (
    ["spam", "hidden", "rejected", "false", "no", "0", "archived"].includes(
      value,
    )
  )
    return "HIDDEN";
  return null;
}

// Review apps fill anonymous reviews with a shared fake address (Judge.me exports
// "support+anonymous@judge.me"). Treat those as "no email", otherwise every anonymous
// review would look like the same customer.
const PLACEHOLDER_DOMAINS = [
  "judge.me",
  "loox.io",
  "yotpo.com",
  "okendo.io",
  "stamped.io",
  "example.com",
];

function realEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const [local, domain] = email.split("@");
  if (/anonymous|no-?reply|unknown|placeholder/.test(local)) return null;
  if (PLACEHOLDER_DOMAINS.includes(domain)) return null;
  return email;
}

function handleFromUrl(url: string) {
  const match = url.match(/\/products\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]).toLowerCase() : null;
}

export type RowResult =
  { ok: true; row: ImportRow } | { ok: false; line: number; error: string };

export function readRows(
  table: CsvTable,
  mapping: Mapping,
  source: ImportSourceId,
): RowResult[] {
  const column = (field: Field) =>
    mapping[field] === undefined ? -1 : table.headers.indexOf(mapping[field]!);
  const indexes = Object.fromEntries(
    (Object.keys(ALIASES) as Field[]).map((field) => [field, column(field)]),
  ) as Record<Field, number>;
  const cell = (row: string[], field: Field) =>
    indexes[field] === -1 ? "" : (row[indexes[field]] ?? "").trim();

  return table.rows.map((row, i): RowResult => {
    const line = i + 2; // header is line 1
    const rating = parseRating(cell(row, "rating"));
    const body = cell(row, "body").slice(0, LIMITS.body);
    if (!rating) return { ok: false, line, error: "Missing or invalid rating" };
    if (!body) return { ok: false, line, error: "Missing review text" };

    const productIdRaw = cell(row, "productId").replace(
      /^gid:\/\/shopify\/Product\//,
      "",
    );
    return {
      ok: true,
      row: {
        line,
        rating,
        body,
        title: cell(row, "title").slice(0, LIMITS.title) || null,
        authorName: cell(row, "name").slice(0, LIMITS.name) || "Anonymous",
        authorEmail: realEmail(cell(row, "email")),
        submittedAt: parseDate(cell(row, "date"), source),
        productId: /^\d+$/.test(productIdRaw) ? productIdRaw : null,
        handle:
          cell(row, "handle").toLowerCase() ||
          handleFromUrl(cell(row, "productUrl")),
        fileStatus: parseStatus(cell(row, "status")),
        reply: cell(row, "reply").slice(0, LIMITS.reply) || null,
        replyAt: parseDate(cell(row, "replyDate"), source),
      },
    };
  });
}
