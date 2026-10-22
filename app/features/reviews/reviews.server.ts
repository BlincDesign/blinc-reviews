import type { Prisma, ReviewStatus } from "@prisma/client";
import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";

import db from "../../db.server";
import { notifyReply } from "../requests/notifications.server";
import { fireReviewTriggers } from "../flow/flow.server";
import { syncProductRating } from "./ratings.server";
import { deleteReviewFiles } from "../media/photos.server";
import {
  EDIT_LIMITS,
  normalizeTags,
  PAGE_SIZE,
  REPLY_MAX_LENGTH,
  type ModerationIntent,
  type ReviewFilters,
  type StatusFilter,
} from "./reviews";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Everything except status, so the status tabs can show counts for the current filters. */
function filterWhere(
  domain: string,
  f: ReviewFilters,
): Prisma.ReviewWhereInput {
  return {
    shop: { domain },
    ...(f.rating ? { rating: f.rating } : {}),
    ...(f.source ? { source: f.source } : {}),
    ...(f.verified === "verified"
      ? { verification: "VERIFIED_BUYER" as const }
      : {}),
    ...(f.verified === "unverified"
      ? { verification: { not: "VERIFIED_BUYER" as const } }
      : {}),
    ...(f.sinceDays
      ? { submittedAt: { gte: new Date(Date.now() - f.sinceDays * DAY_MS) } }
      : {}),
    ...(f.q
      ? {
          OR: [
            { title: { contains: f.q, mode: "insensitive" as const } },
            { body: { contains: f.q, mode: "insensitive" as const } },
            { authorName: { contains: f.q, mode: "insensitive" as const } },
            { authorEmail: { contains: f.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(f.tag ? { tags: { has: f.tag } } : {}),
  };
}

const ORDER: Record<
  ReviewFilters["sort"],
  Prisma.ReviewOrderByWithRelationInput[]
> = {
  newest: [{ pinned: "desc" }, { submittedAt: "desc" }, { id: "desc" }],
  oldest: [{ submittedAt: "asc" }, { id: "asc" }],
  highest: [{ rating: "desc" }, { submittedAt: "desc" }, { id: "desc" }],
  lowest: [{ rating: "asc" }, { submittedAt: "desc" }, { id: "desc" }],
};

export async function listReviews(domain: string, filters: ReviewFilters) {
  const base = filterWhere(domain, filters);
  // Like Judge.me, "All" leaves out archived reviews; they have their own tab.
  const where: Prisma.ReviewWhereInput =
    filters.status === "ALL"
      ? { ...base, status: { not: "ARCHIVED" } }
      : filters.status === "HIDDEN"
        ? { ...base, status: { in: ["HIDDEN", "REJECTED"] } }
        : { ...base, status: filters.status };

  const [rows, grouped] = await Promise.all([
    db.review.findMany({
      where,
      orderBy: ORDER[filters.sort],
      // Admin list: page numbers keep Previous/Next simple; review counts per shop are modest.
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE + 1,
      select: {
        id: true,
        productId: true,
        authorName: true,
        authorEmail: true,
        rating: true,
        title: true,
        body: true,
        status: true,
        verification: true,
        source: true,
        pinned: true,
        favorite: true,
        tags: true,
        merchantReply: true,
        submittedAt: true,
        publishedAt: true,
        editedAt: true,
        orderId: true,
        customerId: true,
        language: true,
        media: {
          select: { id: true, storageKey: true },
          orderBy: { position: "asc" },
        },
      },
    }),
    db.review.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
  ]);

  const counts: Record<StatusFilter, number> = {
    ALL: 0,
    PENDING: 0,
    PUBLISHED: 0,
    HIDDEN: 0,
    ARCHIVED: 0,
  };
  for (const g of grouped) {
    const key = g.status === "REJECTED" ? "HIDDEN" : g.status;
    counts[key] += g._count._all;
    if (g.status !== "ARCHIVED") counts.ALL += g._count._all;
  }

  const hasNextPage = rows.length > PAGE_SIZE;
  return {
    reviews: hasNextPage ? rows.slice(0, PAGE_SIZE) : rows,
    counts,
    hasNextPage,
    hasPreviousPage: filters.page > 1,
  };
}

export async function hasAnyReviews(domain: string) {
  return (await db.review.count({ where: { shop: { domain } } })) > 0;
}

const PRODUCT_TITLES = `#graphql
  query ReviewProducts($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product { id title }
    }
  }`;

/** One Admin API call per page to label reviews with product titles. */
export async function getProductTitles(
  admin: AdminApiContext,
  productIds: string[],
) {
  const ids = [...new Set(productIds)];
  if (ids.length === 0) return {};

  const titles: Record<string, string> = {};
  // nodes() accepts at most 250 ids per call.
  for (let i = 0; i < ids.length; i += 250) {
    const response = await admin.graphql(PRODUCT_TITLES, {
      variables: { ids: ids.slice(i, i + 250) },
    });
    const { data } = await response.json();
    for (const node of data?.nodes ?? []) {
      if (node?.id && node.title) titles[node.id] = node.title;
    }
  }
  return titles;
}

const STATUS_FOR: Partial<Record<ModerationIntent, ReviewStatus>> = {
  publish: "PUBLISHED",
  pending: "PENDING",
  hide: "HIDDEN",
  reject: "HIDDEN",
  archive: "ARCHIVED",
  // We don't keep the pre-archive status, so restored reviews go back to moderation.
  unarchive: "PENDING",
};

/**
 * Applies a moderation action, then re-syncs star ratings for every product whose
 * published reviews may have changed. Returns products whose rating sync failed.
 */
export async function moderateReviews(
  admin: AdminApiContext,
  domain: string,
  ids: string[],
  intent: ModerationIntent,
) {
  const targets = await db.review.findMany({
    where: { id: { in: ids }, shop: { domain } },
    select: { id: true, shopId: true, productId: true, status: true },
  });
  if (targets.length === 0)
    return { updated: 0, failedProducts: [] as string[] };

  const where = { id: { in: targets.map((t) => t.id) } };
  const status = STATUS_FOR[intent];

  if (status) {
    await db.review.updateMany({
      where,
      data: { status, publishedAt: status === "PUBLISHED" ? new Date() : null },
    });
    if (status === "PUBLISHED") {
      const newlyPublished = targets
        .filter((t) => t.status !== "PUBLISHED")
        .map((t) => t.id);
      // Background: Flow never slows down or fails a moderation action.
      fireReviewTriggers(newlyPublished, "published", admin).catch((error) =>
        console.error("[reviews] flow triggers failed", error),
      );
    }
  } else if (intent === "pin" || intent === "unpin") {
    // Falls through to the sync: pin order changes the server-rendered first page.
    await db.review.updateMany({ where, data: { pinned: intent === "pin" } });
  } else if (intent === "favorite" || intent === "unfavorite") {
    await db.review.updateMany({
      where,
      data: { favorite: intent === "favorite" },
    });
    return { updated: targets.length, failedProducts: [] as string[] };
  } else if (intent === "delete") {
    await deleteReviewFiles(targets.map((t) => t.id));
    await db.review.deleteMany({ where });
  }

  const shopId = targets[0].shopId;
  const productIds = [...new Set(targets.map((t) => t.productId))];
  const results = await Promise.allSettled(
    productIds.map((productId) => syncProductRating(admin, shopId, productId)),
  );
  const failedProducts = productIds.filter(
    (_, i) => results[i].status === "rejected",
  );
  for (const r of results) {
    if (r.status === "rejected")
      console.error("[reviews] rating sync failed", r.reason);
  }

  return { updated: targets.length, failedProducts };
}

/**
 * Re-syncs a product's storefront metafields after a published review's text, reply
 * or pin changed. Unpublished reviews aren't on the storefront, so they're skipped.
 */
export async function resyncReview(
  admin: AdminApiContext,
  domain: string,
  id: string,
) {
  const review = await db.review.findFirst({
    where: { id, shop: { domain }, status: "PUBLISHED" },
    select: { shopId: true, productId: true },
  });
  if (!review) return;
  await syncProductRating(admin, review.shopId, review.productId).catch(
    (error) => console.error("[reviews] rating sync failed", error),
  );
}

/** Saves or clears (empty text) the public merchant reply; emails the reviewer when it's new or changed. */
export async function saveReply(domain: string, id: string, text: string) {
  const reply = text.trim().slice(0, REPLY_MAX_LENGTH);
  const existing = await db.review.findFirst({
    where: { id, shop: { domain } },
    select: { merchantReply: true },
  });
  if (!existing) return false;
  await db.review.update({
    where: { id },
    data: reply
      ? { merchantReply: reply, merchantRepliedAt: new Date() }
      : { merchantReply: null, merchantRepliedAt: null },
  });
  if (reply && reply !== existing.merchantReply) {
    // Don't hold up the admin on email delivery.
    notifyReply(id).catch((error) =>
      console.error("[reviews] reply notification failed", error),
    );
  }
  return true;
}

const EXPORT_LIMIT = 10000;

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  // Quote everything; prefix formula-like cells so spreadsheets don't execute them.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

const PRODUCT_HANDLES = `#graphql
  query ExportProducts($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product { id handle }
    }
  }`;

async function getProductHandles(admin: AdminApiContext, productIds: string[]) {
  const ids = [...new Set(productIds)];
  const handles: Record<string, string> = {};
  for (let i = 0; i < ids.length; i += 250) {
    const response = await admin.graphql(PRODUCT_HANDLES, {
      variables: { ids: ids.slice(i, i + 250) },
    });
    const { data } = await response.json();
    for (const node of data?.nodes ?? []) {
      if (node?.id && node.handle) handles[node.id] = node.handle;
    }
  }
  return handles;
}

// Judge.me's import "curated" values: ok = Published, not-yet = Pending, spam = Hidden.
const CURATED: Record<ReviewStatus, string> = {
  PUBLISHED: "ok",
  PENDING: "not-yet",
  HIDDEN: "spam",
  REJECTED: "spam",
  ARCHIVED: "spam",
};

/** dd/mm/yyyy, the date format Judge.me's import template uses. */
function dmy(date: Date | null) {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

export const EXPORT_COLUMNS = [
  "title",
  "body",
  "rating",
  "review_date",
  "reviewer_name",
  "reviewer_email",
  "product_id",
  "product_handle",
  "reply",
  "reply_date",
  "picture_urls",
  "curated",
  "verified_buyer",
] as const;

/**
 * CSV of reviews matching the current filters, in Judge.me's import template format
 * (plus verified_buyer), so files move between review apps without losing names,
 * dates, replies or moderation state.
 */
export async function exportReviewsCsv(
  admin: AdminApiContext,
  domain: string,
  filters: ReviewFilters,
) {
  const base = filterWhere(domain, filters);
  const rows = await db.review.findMany({
    where:
      filters.status === "ALL"
        ? { ...base, status: { not: "ARCHIVED" } }
        : { ...base, status: filters.status },
    orderBy: ORDER[filters.sort],
    take: EXPORT_LIMIT,
  });
  const handles = await getProductHandles(
    admin,
    rows.map((r) => r.productId),
  );

  const lines = rows.map((r) =>
    [
      r.title,
      r.body,
      r.rating,
      dmy(r.submittedAt),
      r.authorName,
      r.authorEmail,
      r.productId.split("/").pop(),
      handles[r.productId] ?? "",
      r.merchantReply,
      dmy(r.merchantRepliedAt),
      "",
      CURATED[r.status],
      r.verification === "VERIFIED_BUYER" ? "yes" : "no",
    ]
      .map(csvCell)
      .join(","),
  );
  return [EXPORT_COLUMNS.join(","), ...lines].join("\r\n");
}

/** Saves the tag dialog: merchant tags plus the feature (favorite) and pin flags. */
export async function saveTags(
  domain: string,
  id: string,
  input: { tags: string; favorite: boolean; pinned: boolean },
) {
  const { count } = await db.review.updateMany({
    where: { id, shop: { domain } },
    data: {
      tags: normalizeTags(input.tags),
      favorite: input.favorite,
      pinned: input.pinned,
    },
  });
  return count > 0;
}

/**
 * Fixes typos in the text or reviewer name. The star rating can't be changed: editing
 * what a customer said misleads shoppers (FTC consumer review rule), so edits are
 * limited and every edited review is marked with editedAt.
 */
export async function editReview(
  domain: string,
  id: string,
  input: { authorName: string; title: string; body: string },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const authorName = input.authorName.trim();
  const title = input.title.trim();
  const body = input.body.trim();
  if (!authorName || authorName.length > EDIT_LIMITS.name) {
    return {
      ok: false,
      message: "Enter a reviewer name (60 characters or fewer).",
    };
  }
  if (title.length > EDIT_LIMITS.title) {
    return { ok: false, message: "Use 120 characters or fewer for the title." };
  }
  if (!body || body.length > EDIT_LIMITS.body) {
    return { ok: false, message: "The review text can't be empty." };
  }
  const { count } = await db.review.updateMany({
    where: { id, shop: { domain } },
    data: { authorName, title: title || null, body, editedAt: new Date() },
  });
  return count > 0 ? { ok: true } : { ok: false, message: "Review not found." };
}

/** Distinct tags in use, for the tag filter. */
export async function listTags(domain: string) {
  const rows = await db.$queryRaw<{ tag: string }[]>`
    SELECT DISTINCT unnest(r."tags") AS tag
    FROM "Review" r JOIN "Shop" s ON s."id" = r."shopId"
    WHERE s."domain" = ${domain}
    ORDER BY tag
    LIMIT 200`;
  return rows.map((r) => r.tag);
}
