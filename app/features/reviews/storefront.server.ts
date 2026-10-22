import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import type { Prisma } from "@prisma/client";

import db from "../../db.server";
import { syncProductRating } from "./ratings.server";
import {
  notifyMerchant,
  sendReviewConfirmation,
} from "../requests/notifications.server";
import { isBlockedEmail, moderationFlags } from "./moderation";
import { fireReviewTriggers } from "../flow/flow.server";
import { attachPhotos, thumbKey } from "../media/photos.server";
import { isStorageConfigured } from "../media/storage.server";
import {
  formatName,
  NAME_FORMATS,
  PER_PAGE_MAX,
  PER_PAGE_MIN,
  SORTS,
  type NameFormat,
  type Sort,
} from "../appearance/design";

export const STOREFRONT_PAGE_SIZE = 10;

/** Display options the theme block passes as query params (from the merchant's design). */
export function parseListOptions(params: URLSearchParams) {
  const perPage = Number(params.get("per_page"));
  const nameFormat = params.get("name_format");
  const rating = Number(params.get("rating"));
  const page = Number(params.get("page"));
  return {
    sort: (SORTS as readonly string[]).includes(params.get("sort") ?? "")
      ? (params.get("sort") as Sort)
      : "recent",
    rating:
      Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
    // Page numbers (pagination "pages"); otherwise the cursor continues the list.
    page: Number.isInteger(page) && page >= 1 && page <= 1000 ? page : null,
    reviewId: /^[a-z0-9]{20,32}$/.test(params.get("review_id") ?? "")
      ? params.get("review_id")
      : null,
    perPage:
      Number.isInteger(perPage) &&
      perPage >= PER_PAGE_MIN &&
      perPage <= PER_PAGE_MAX
        ? perPage
        : STOREFRONT_PAGE_SIZE,
    nameFormat: (NAME_FORMATS as readonly string[]).includes(nameFormat ?? "")
      ? (nameFormat as NameFormat)
      : "first_initial",
  };
}

const LIMITS = { name: 60, email: 254, title: 120, body: 5000 } as const;
// Submissions faster than this after the form renders are almost always bots.
const MIN_FILL_MS = 3000;
const MAX_PER_EMAIL_PER_HOUR = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function productGid(id: string | null) {
  return id && /^\d+$/.test(id) ? `gid://shopify/Product/${id}` : null;
}

// Pinned reviews stay on top in every order; id breaks ties so cursors are stable.
const ORDER: Record<Sort, Prisma.ReviewOrderByWithRelationInput[]> = {
  recent: [{ pinned: "desc" }, { submittedAt: "desc" }, { id: "desc" }],
  highest: [
    { pinned: "desc" },
    { rating: "desc" },
    { submittedAt: "desc" },
    { id: "desc" },
  ],
  lowest: [
    { pinned: "desc" },
    { rating: "asc" },
    { submittedAt: "desc" },
    { id: "desc" },
  ],
  photos: [
    { pinned: "desc" },
    { media: { _count: "desc" } },
    { submittedAt: "desc" },
    { id: "desc" },
  ],
  photos_only: [{ pinned: "desc" }, { submittedAt: "desc" }, { id: "desc" }],
};

export async function listPublishedReviews(
  domain: string,
  productId: string,
  cursor: string | null,
  {
    perPage,
    nameFormat,
    sort,
    rating,
    page: pageNumber,
    reviewId,
  }: ReturnType<typeof parseListOptions>,
) {
  const where: Prisma.ReviewWhereInput = {
    shop: { domain },
    productId,
    status: "PUBLISHED",
    ...(rating ? { rating } : {}),
    ...(sort === "photos_only" ? { media: { some: {} } } : {}),
    ...(reviewId ? { id: reviewId } : {}),
  };
  const position: { skip?: number; cursor?: { id: string } } = pageNumber
    ? { skip: (pageNumber - 1) * perPage }
    : cursor
      ? { cursor: { id: cursor }, skip: 1 }
      : {};
  const [rows, total] = await Promise.all([
    db.review.findMany({
      where,
      orderBy: ORDER[sort],
      take: perPage + 1,
      ...position,
      select: {
        id: true,
        authorName: true,
        rating: true,
        title: true,
        body: true,
        verification: true,
        source: true,
        merchantReply: true,
        submittedAt: true,
        media: {
          orderBy: { position: "asc" },
          select: { storageKey: true },
        },
      },
    }),
    db.review.count({ where }),
  ]);

  const hasMore = rows.length > perPage;
  const page = hasMore ? rows.slice(0, perPage) : rows;
  return {
    reviews: page.map((r) => ({
      id: r.id,
      author: formatName(r.authorName, nameFormat),
      rating: r.rating,
      title: r.title,
      body: r.body,
      verified: r.verification === "VERIFIED_BUYER",
      source: r.source,
      reply: r.merchantReply,
      date: r.submittedAt.toISOString(),
      // Photo keys; the storefront builds /apps/blinc-reviews/m/<key> URLs.
      photos: r.media.map((m) => ({
        f: m.storageKey,
        t: thumbKey(m.storageKey),
      })),
    })),
    nextCursor: hasMore ? page.at(-1)!.id : null,
    total,
  };
}

type SubmissionErrors = Partial<
  Record<"rating" | "name" | "email" | "title" | "body", string>
>;

export type SubmissionResult =
  | { ok: true; published: boolean; count?: number }
  | { ok: false; errors: SubmissionErrors; message?: string };

function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

const PRODUCT_EXISTS = `#graphql
  query ReviewedProduct($id: ID!) { product(id: $id) { id } }`;

export async function submitReview({
  admin,
  domain,
  form,
  customerId,
}: {
  admin: AdminApiContext;
  domain: string;
  form: FormData;
  customerId: string | null;
}): Promise<SubmissionResult> {
  // Honeypot or instant submit: report success so bots learn nothing, save nothing.
  const startedAt = Number(text(form, "started_at"));
  if (
    text(form, "website") ||
    !startedAt ||
    Date.now() - startedAt < MIN_FILL_MS
  ) {
    return { ok: true, published: false };
  }

  const productId = productGid(text(form, "product_id"));
  const rating = Number(text(form, "rating"));

  // Reviews from a review request email: the order proves the purchase, so the
  // email and customer come from the request, not the form.
  const token = text(form, "request_token");
  const request = token
    ? await db.reviewRequest.findUnique({
        where: { token },
        select: {
          id: true,
          orderId: true,
          customerId: true,
          customerEmail: true,
          customerName: true,
          items: true,
          shop: { select: { domain: true } },
        },
      })
    : null;
  const verified =
    request &&
    request.shop.domain === domain &&
    (request.items as { productId: string }[]).some(
      (item) => item.productId === productId,
    )
      ? request
      : null;

  // "Post as anonymous": the review is public under "Anonymous"; the email stays private.
  const name =
    form.get("anonymous") === "1"
      ? "Anonymous"
      : text(form, "name") || verified?.customerName || "";
  const email = verified
    ? verified.customerEmail
    : text(form, "email").toLowerCase();
  const title = text(form, "title");
  const body = text(form, "body");

  const errors: SubmissionErrors = {};
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    errors.rating = "rating_required";
  if (!name || name.length > LIMITS.name) errors.name = "name_required";
  if (!EMAIL_PATTERN.test(email) || email.length > LIMITS.email)
    errors.email = "email_invalid";
  if (title.length > LIMITS.title) errors.title = "too_long";
  if (!body || body.length > LIMITS.body) errors.body = "body_required";
  if (!productId || Object.keys(errors).length > 0)
    return { ok: false, errors };

  // Independent checks run together: one round trip instead of four.
  const [shop, duplicate, recent, product] = await Promise.all([
    db.shop.findUnique({
      where: { domain },
      select: {
        id: true,
        settings: {
          select: {
            autoPublishMinRating: true,
            holdProfanity: true,
            holdContactInfo: true,
            blockedWords: true,
            blockedEmails: true,
          },
        },
      },
    }),
    db.review.count({
      where: { shop: { domain }, productId, authorEmail: email },
    }),
    db.review.count({
      where: {
        shop: { domain },
        authorEmail: email,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    }),
    admin
      .graphql(PRODUCT_EXISTS, { variables: { id: productId } })
      .then((response) => response.json())
      .then(({ data }) => data?.product ?? null),
  ]);
  if (!shop || !product)
    return { ok: false, errors: {}, message: "unavailable" };
  if (duplicate > 0)
    return { ok: false, errors: {}, message: "already_reviewed" };
  if (recent >= MAX_PER_EMAIL_PER_HOUR)
    return { ok: false, errors: {}, message: "rate_limited" };

  // Blocked emails are saved hidden (kept for the record, never shown); flagged
  // text waits for moderation whatever the auto-publish rule says.
  const rules = {
    holdProfanity: shop.settings?.holdProfanity ?? true,
    holdContactInfo: shop.settings?.holdContactInfo ?? true,
    blockedWords: shop.settings?.blockedWords ?? [],
    blockedEmails: shop.settings?.blockedEmails ?? [],
  };
  const blocked = isBlockedEmail(email, rules.blockedEmails);
  const flags = blocked
    ? ["blocked email"]
    : moderationFlags(`${title}\n${body}`, rules);
  const minRating = shop.settings?.autoPublishMinRating ?? 0;
  const published = flags.length === 0 && minRating > 0 && rating >= minRating;
  const language = text(form, "language").slice(0, 2).toLowerCase() || null;

  const review = await db.review.create({
    data: {
      shopId: shop.id,
      productId,
      customerId: verified?.customerId ?? customerId,
      orderId: verified?.orderId ?? null,
      verification: verified ? "VERIFIED_BUYER" : "UNVERIFIED",
      authorName: name,
      authorEmail: email,
      rating,
      title: title || null,
      body,
      language,
      source: verified ? "EMAIL" : "WEB",
      status: published ? "PUBLISHED" : blocked ? "HIDDEN" : "PENDING",
      publishedAt: published ? new Date() : null,
      tags: flags,
    },
  });

  // The review is saved: answer the shopper now. Photos, the request update and the
  // storefront metafields follow on the server (the widget polls for the new totals),
  // so a slow upload never makes the app proxy time out.
  const photos = form
    .getAll("photos")
    .filter((value): value is File => value instanceof File);
  void finishSubmission({
    admin,
    shopId: shop.id,
    reviewId: review.id,
    productId,
    photos,
    requestId: verified?.id ?? null,
    published,
    blocked,
    email,
    customerId: verified ? null : customerId,
  });

  // New published review count, so the widget knows when the storefront has caught up.
  const count = published
    ? await db.review.count({
        where: { shopId: shop.id, productId, status: "PUBLISHED" },
      })
    : undefined;

  return { ok: true, published, count };
}

/** Slow follow-up work after a review is saved. Failures are logged, never thrown. */
async function finishSubmission({
  admin,
  shopId,
  reviewId,
  productId,
  photos,
  requestId,
  published,
  blocked,
  email,
  customerId,
}: {
  admin: AdminApiContext;
  shopId: string;
  reviewId: string;
  productId: string;
  photos: File[];
  requestId: string | null;
  published: boolean;
  blocked: boolean;
  email: string;
  customerId: string | null;
}) {
  let needsConfirmation = false;
  try {
    // Photos are optional; a bad or failed upload never loses the review itself.
    if (photos.length > 0) {
      if (isStorageConfigured()) await attachPhotos(shopId, reviewId, photos);
      else console.warn("[photos] storage not configured; photos dropped");
    }
    if (requestId) {
      await db.reviewRequest.update({
        where: { id: requestId },
        data: { reviewedAt: new Date() },
      });
    }
    // Web reviews: an order with this product makes it a verified buyer review;
    // otherwise the reviewer is asked to confirm their email.
    if (!requestId && !blocked) {
      const orderId = await findPurchase(admin, productId, email, customerId);
      if (orderId) {
        await db.review.update({
          where: { id: reviewId },
          data: { verification: "VERIFIED_BUYER", orderId },
        });
      } else {
        needsConfirmation = true;
      }
    }
    // The review is saved; on failure the next moderation action re-syncs the rating.
    if (published) await syncProductRating(admin, shopId, productId);
  } catch (error) {
    console.error("[storefront] post-submit work failed", error);
  }

  // Flow and emails last, so they never hold up the storefront update.
  if (blocked) return;
  await fireReviewTriggers([reviewId], "submitted", admin).catch((error) =>
    console.error("[storefront] flow triggers failed", error),
  );
  if (needsConfirmation) {
    await sendReviewConfirmation(reviewId).catch((error) =>
      console.error("[storefront] confirmation email failed", error),
    );
  }
  await notifyMerchant(reviewId).catch((error) =>
    console.error("[storefront] merchant alert failed", error),
  );
}

const CUSTOMER_ORDERS = `#graphql
  query ReviewerOrders($query: String!) {
    orders(first: 20, query: $query, sortKey: CREATED_AT, reverse: true) {
      nodes { id lineItems(first: 100) { nodes { product { id } } } }
    }
  }`;

/**
 * The newest order by this email (or logged-in customer) that contains the product.
 * Without read_all_orders, Shopify only searches the last 60 days.
 */
async function findPurchase(
  admin: AdminApiContext,
  productId: string,
  email: string,
  customerId: string | null,
) {
  const terms = [`email:"${email.replace(/["\\]/g, "")}"`];
  if (customerId) terms.push(`customer_id:${customerId.split("/").pop()}`);
  const response = await admin.graphql(CUSTOMER_ORDERS, {
    variables: { query: terms.join(" OR ") },
  });
  const { data } = await response.json();
  type Order = {
    id: string;
    lineItems: { nodes: { product: { id: string } | null }[] };
  };
  const order = (data?.orders?.nodes ?? []).find((o: Order) =>
    o.lineItems.nodes.some((item) => item.product?.id === productId),
  ) as Order | undefined;
  return order?.id ?? null;
}
