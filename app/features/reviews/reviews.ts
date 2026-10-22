// Shared by the reviews page (client) and reviews.server.ts.
export const PAGE_SIZE = 25;
export const REPLY_MAX_LENGTH = 2000;
export const MAX_TAGS = 10;
/** Offered in the tag dialog even before a store has used them. */
export const SUGGESTED_TAGS = [
  "needs follow-up",
  "product feedback",
  "selected for marketing",
  "selected for widget display",
] as const;
export const TAG_MAX_LENGTH = 30;
export const EDIT_LIMITS = { name: 60, title: 120, body: 5000 } as const;

/** "Shipping, UGC ,shipping" → ["shipping", "ugc"] */
export function normalizeTags(input: string) {
  const tags = input
    .split(",")
    .map((tag) => tag.trim().toLowerCase().slice(0, TAG_MAX_LENGTH))
    .filter(Boolean);
  return [...new Set(tags)].slice(0, MAX_TAGS);
}

// Shoppers only see Published. Hidden covers spam/abuse/anything not live;
// Archive is housekeeping. ("Rejected" was merged into Hidden.)
export const STATUS_FILTERS = [
  "ALL",
  "PENDING",
  "PUBLISHED",
  "HIDDEN",
  "ARCHIVED",
] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export const MODERATION_INTENTS = [
  "publish",
  "pending",
  "hide",
  "reject",
  "pin",
  "unpin",
  "archive",
  "unarchive",
  "favorite",
  "unfavorite",
  "delete",
] as const;
export type ModerationIntent = (typeof MODERATION_INTENTS)[number];

export const SOURCES = ["WEB", "EMAIL", "IMPORT"] as const;
export const SORTS = ["newest", "oldest", "highest", "lowest"] as const;
export const DATE_RANGES = [7, 30, 90, 365] as const;

export type ReviewFilters = {
  status: StatusFilter;
  rating: number | null;
  source: (typeof SOURCES)[number] | null;
  verified: "verified" | "unverified" | null;
  sinceDays: (typeof DATE_RANGES)[number] | null;
  q: string;
  tag: string | null;
  sort: (typeof SORTS)[number];
  page: number;
};

function oneOf<T extends string | number>(
  value: unknown,
  options: readonly T[],
): T | null {
  return options.includes(value as T) ? (value as T) : null;
}

export function parseStatusFilter(value: string | null): StatusFilter {
  return oneOf(value, STATUS_FILTERS) ?? "ALL";
}

export function parseFilters(params: URLSearchParams): ReviewFilters {
  const page = Number(params.get("page"));
  return {
    status: parseStatusFilter(params.get("status")),
    rating: oneOf(Number(params.get("rating")), [1, 2, 3, 4, 5]),
    source: oneOf(params.get("source"), SOURCES),
    verified: oneOf(params.get("verified"), [
      "verified",
      "unverified",
    ] as const),
    sinceDays: oneOf(Number(params.get("since")), DATE_RANGES),
    q: (params.get("q") ?? "").trim().slice(0, 100),
    tag: normalizeTags(params.get("tag") ?? "")[0] ?? null,
    sort: oneOf(params.get("sort"), SORTS) ?? "newest",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function isModerationIntent(value: unknown): value is ModerationIntent {
  return (MODERATION_INTENTS as readonly unknown[]).includes(value);
}
