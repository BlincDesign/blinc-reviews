import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";

import db from "../../db.server";
import type { RangeDays } from "./dashboard";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Percent change from the previous period; null when there's nothing to compare. */
function change(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

async function periodMetrics(domain: string, from: Date, to: Date) {
  const shop = { domain };
  const submittedAt = { gte: from, lt: to };
  const [reviews, average, verified, replied, requestsSent] = await Promise.all(
    [
      db.review.count({ where: { shop, submittedAt } }),
      db.review.aggregate({
        where: { shop, submittedAt, status: "PUBLISHED" },
        _avg: { rating: true },
      }),
      db.review.count({
        where: { shop, submittedAt, verification: "VERIFIED_BUYER" },
      }),
      db.review.count({
        where: { shop, submittedAt, merchantReply: { not: null } },
      }),
      db.reviewRequest.count({
        where: { shop, sentAt: { gte: from, lt: to } },
      }),
    ],
  );
  return {
    reviews,
    averageRating: average._avg.rating ?? 0,
    verifiedRate: reviews ? Math.round((verified * 100) / reviews) : 0,
    replyRate: reviews ? Math.round((replied * 100) / reviews) : 0,
    requestsSent,
  };
}

export async function getDashboard(domain: string, rangeDays: RangeDays) {
  const now = new Date();
  const from = new Date(now.getTime() - rangeDays * DAY_MS);
  const previousFrom = new Date(from.getTime() - rangeDays * DAY_MS);

  const [
    current,
    previous,
    pendingCount,
    publishedCount,
    recent,
    top,
    settings,
  ] = await Promise.all([
    periodMetrics(domain, from, now),
    periodMetrics(domain, previousFrom, from),
    db.review.count({ where: { shop: { domain }, status: "PENDING" } }),
    db.review.count({ where: { shop: { domain }, status: "PUBLISHED" } }),
    db.review.findMany({
      where: { shop: { domain } },
      orderBy: { submittedAt: "desc" },
      take: 5,
      select: {
        id: true,
        productId: true,
        authorName: true,
        rating: true,
        title: true,
        body: true,
        status: true,
        submittedAt: true,
      },
    }),
    db.review.groupBy({
      by: ["productId"],
      where: { shop: { domain }, status: "PUBLISHED" },
      _count: { _all: true },
      _avg: { rating: true },
      orderBy: { _count: { productId: "desc" } },
      take: 5,
    }),
    db.shopSettings.findFirst({
      where: { shop: { domain } },
      select: { requestChannel: true },
    }),
  ]);

  const metric = (key: keyof typeof current) => ({
    value: current[key],
    change: change(current[key], previous[key]),
  });

  return {
    metrics: {
      reviews: metric("reviews"),
      averageRating: metric("averageRating"),
      requestsSent: metric("requestsSent"),
      verifiedRate: metric("verifiedRate"),
      replyRate: metric("replyRate"),
    },
    pendingCount,
    publishedCount,
    requestChannel: settings?.requestChannel ?? "APP",
    recent: recent.map((r) => ({
      ...r,
      submittedAt: r.submittedAt.toISOString(),
    })),
    top: top.map((t) => ({
      productId: t.productId,
      count: t._count._all,
      average: t._avg.rating ?? 0,
    })),
  };
}

const PRODUCT_CARDS = `#graphql
  query DashboardProducts($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        title
        featuredMedia { preview { image { url(transform: { maxWidth: 80, maxHeight: 80 }) } } }
      }
    }
  }`;

/** Titles and thumbnails for products shown on the dashboard, in one call. */
export async function getProductCards(
  admin: AdminApiContext,
  productIds: string[],
) {
  const ids = [...new Set(productIds)];
  if (ids.length === 0) return {};
  const response = await admin.graphql(PRODUCT_CARDS, { variables: { ids } });
  const { data } = await response.json();
  const cards: Record<string, { title: string; image: string | null }> = {};
  for (const node of data?.nodes ?? []) {
    if (node?.id) {
      cards[node.id] = {
        title: node.title,
        image: node.featuredMedia?.preview?.image?.url ?? null,
      };
    }
  }
  return cards;
}
