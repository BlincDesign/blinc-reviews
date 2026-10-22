import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";

import db from "../../db.server";
import { thumbKey } from "../media/photos.server";
import { formatName, PER_PAGE_MAX } from "../appearance/design";

const PHOTO_STRIP_SIZE = 12;

/**
 * First page of published reviews, in storefront order, for the blinc.reviews
 * metafield: the block renders it server-side (crawlers, AI assistants, no fetch on
 * load) and builds review JSON-LD from it. `n` holds the name in every format so a
 * format change in Appearance needs no re-sync; the full name is never printed unless
 * the merchant picks "full".
 */
async function firstPage(where: {
  shopId: string;
  productId: string;
  status: "PUBLISHED";
}) {
  const rows = await db.review.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { submittedAt: "desc" }, { id: "desc" }],
    take: PER_PAGE_MAX,
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
      media: { orderBy: { position: "asc" }, select: { storageKey: true } },
    },
  });
  return rows.map((r) => ({
    i: r.id,
    n: [
      formatName(r.authorName, "full"),
      formatName(r.authorName, "first_initial"),
      formatName(r.authorName, "initials"),
    ],
    r: r.rating,
    t: r.title ?? "",
    b: r.body,
    d: r.submittedAt.toISOString(),
    v: r.verification === "VERIFIED_BUYER",
    s: r.source,
    rp: r.merchantReply ?? "",
    p: r.media.map((m) => ({ f: m.storageKey, t: thumbKey(m.storageKey) })),
  }));
}

const SET_RATING = `#graphql
  mutation SetProductRating($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      userErrors { field message }
    }
  }`;

const DELETE_RATING = `#graphql
  mutation DeleteProductRating($metafields: [MetafieldIdentifierInput!]!) {
    metafieldsDelete(metafields: $metafields) {
      userErrors { field message }
    }
  }`;

/**
 * Writes the standard reviews.rating and reviews.rating_count product metafields
 * from published reviews. Themes and Google rich results read these directly.
 * Also writes blinc.breakdown ([1★ count, …, 5★ count]) for the breakdown bars and
 * blinc.photos (latest published photos) for the photo strip, so both render in Liquid.
 */
export async function syncProductRating(
  admin: AdminApiContext,
  shopId: string,
  productId: string,
) {
  const where = { shopId, productId, status: "PUBLISHED" as const };
  const [{ _avg, _count }, perRating, photoRows, reviews] = await Promise.all([
    db.review.aggregate({
      where,
      _avg: { rating: true },
      _count: { _all: true },
    }),
    db.review.groupBy({ by: ["rating"], where, _count: { _all: true } }),
    db.reviewMedia.findMany({
      where: { review: where },
      orderBy: [{ review: { submittedAt: "desc" } }, { position: "asc" }],
      take: PHOTO_STRIP_SIZE,
      select: { storageKey: true, reviewId: true },
    }),
    firstPage(where),
  ]);
  const photos = photoRows.map((p) => ({
    f: p.storageKey,
    t: thumbKey(p.storageKey),
    r: p.reviewId,
  }));
  const breakdown = [1, 2, 3, 4, 5].map(
    (stars) => perRating.find((r) => r.rating === stars)?._count._all ?? 0,
  );

  const count = _count._all;
  const response =
    count > 0
      ? await admin.graphql(SET_RATING, {
          variables: {
            metafields: [
              {
                ownerId: productId,
                namespace: "reviews",
                key: "rating",
                type: "rating",
                value: JSON.stringify({
                  value: (_avg.rating ?? 0).toFixed(1),
                  scale_min: "1.0",
                  scale_max: "5.0",
                }),
              },
              {
                ownerId: productId,
                namespace: "reviews",
                key: "rating_count",
                type: "number_integer",
                value: String(count),
              },
              {
                ownerId: productId,
                namespace: "blinc",
                key: "breakdown",
                type: "json",
                value: JSON.stringify(breakdown),
              },
              {
                ownerId: productId,
                namespace: "blinc",
                key: "photos",
                type: "json",
                value: JSON.stringify(photos),
              },
              {
                ownerId: productId,
                namespace: "blinc",
                key: "reviews",
                type: "json",
                value: JSON.stringify(reviews),
              },
            ],
          },
        })
      : await admin.graphql(DELETE_RATING, {
          variables: {
            metafields: [
              { ownerId: productId, namespace: "reviews", key: "rating" },
              { ownerId: productId, namespace: "reviews", key: "rating_count" },
              { ownerId: productId, namespace: "blinc", key: "breakdown" },
              { ownerId: productId, namespace: "blinc", key: "photos" },
              { ownerId: productId, namespace: "blinc", key: "reviews" },
            ],
          },
        });

  const { data } = await response.json();
  const userErrors =
    data?.metafieldsSet?.userErrors ?? data?.metafieldsDelete?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(
      `Rating sync failed for ${productId}: ${JSON.stringify(userErrors)}`,
    );
  }
  return { count };
}
