import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";

import db from "../../db.server";
import {
  isPlanId,
  PLANS,
  planFromHandle,
  type PlanFeatures,
  type PlanId,
} from "./plans";

// Shopify App Pricing: plans, prices and trials are set up in the Partner Dashboard;
// Shopify hosts the plan selection page and creates the subscription. We read the
// merchant's plan from the Partner API (activeSubscription).
//
// Env: SHOPIFY_PARTNER_ORG_ID, SHOPIFY_PARTNER_API_ACCESS_TOKEN, SHOPIFY_APP_GID
// (gid://shopify/App/123), SHOPIFY_APP_HANDLE. Without them billing is off and every
// shop gets BILLING_DEV_PLAN (default business), so development is never blocked.

const PARTNER_API_VERSION = "2026-07";
// Shopify recommends caching only confirmed subscriptions, briefly.
const CACHE_MS = 5 * 60 * 1000;

const ACTIVE_SUBSCRIPTION = `
  query ActiveSubscription($appId: ID!, $shopId: ID!) {
    activeSubscription(appId: $appId, shopId: $shopId) {
      trialEndsAt
      cancelAtEndOfCycle
      items { handle }
    }
  }`;

type Subscription = {
  trialEndsAt: string | null;
  cancelAtEndOfCycle: boolean;
  items: { handle: string }[];
};

export type PlanStatus = {
  /** null: no subscription yet (send the merchant to the plan selection page). */
  plan: PlanId | null;
  trialEndsAt: string | null;
  cancelAtEndOfCycle: boolean;
  billingEnabled: boolean;
};

const cache = new Map<string, { status: PlanStatus; expires: number }>();
const shopGids = new Map<string, string>();

export function isBillingConfigured() {
  return Boolean(
    process.env.SHOPIFY_PARTNER_ORG_ID &&
    process.env.SHOPIFY_PARTNER_API_ACCESS_TOKEN &&
    process.env.SHOPIFY_APP_GID,
  );
}

function devPlan(): PlanId {
  const value = process.env.BILLING_DEV_PLAN ?? "";
  return isPlanId(value) ? value : "business";
}

export function planSelectionUrl(domain: string) {
  const store = domain.replace(".myshopify.com", "");
  const handle = process.env.SHOPIFY_APP_HANDLE || "blinc-reviews";
  return `https://admin.shopify.com/store/${store}/charges/${handle}/pricing_plans`;
}

async function shopGid(admin: AdminApiContext, domain: string) {
  const known = shopGids.get(domain);
  if (known) return known;
  const response = await admin.graphql(`#graphql
    query ShopGid { shop { id } }`);
  const { data } = await response.json();
  const id: string = data.shop.id;
  shopGids.set(domain, id);
  return id;
}

async function fetchActiveSubscription(
  shopId: string,
): Promise<Subscription | null> {
  const response = await fetch(
    `https://partners.shopify.com/${process.env.SHOPIFY_PARTNER_ORG_ID}/api/${PARTNER_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": process.env.SHOPIFY_PARTNER_API_ACCESS_TOKEN!,
      },
      body: JSON.stringify({
        query: ACTIVE_SUBSCRIPTION,
        variables: { appId: process.env.SHOPIFY_APP_GID, shopId },
      }),
    },
  );
  const { data, errors } = await response.json();
  // Throttling or failure must never look like "no subscription".
  if (!response.ok || errors) {
    throw new Error(
      `Partner API failed: ${JSON.stringify(errors ?? response.status)}`,
    );
  }
  return data.activeSubscription;
}

/**
 * The shop's plan, from the Partner API (cached 5 minutes once confirmed).
 * `force` skips the cache, e.g. on the welcome link right after a plan change.
 * If the Partner API fails, the last known plan is used instead of blocking.
 */
export async function resolvePlan(
  admin: AdminApiContext,
  domain: string,
  { force = false } = {},
): Promise<PlanStatus> {
  if (!isBillingConfigured()) {
    return {
      plan: devPlan(),
      trialEndsAt: null,
      cancelAtEndOfCycle: false,
      billingEnabled: false,
    };
  }
  const cached = cache.get(domain);
  if (!force && cached && cached.expires > Date.now()) return cached.status;

  try {
    const subscription = await fetchActiveSubscription(
      await shopGid(admin, domain),
    );
    if (!subscription) {
      cache.delete(domain);
      return {
        plan: null,
        trialEndsAt: null,
        cancelAtEndOfCycle: false,
        billingEnabled: true,
      };
    }
    // The highest plan among the subscription's items wins.
    const ids = subscription.items.map((item) => planFromHandle(item.handle));
    const plan: PlanId = ids.includes("business")
      ? "business"
      : ids.includes("pro")
        ? "pro"
        : "free";
    const status: PlanStatus = {
      plan,
      trialEndsAt: subscription.trialEndsAt,
      cancelAtEndOfCycle: subscription.cancelAtEndOfCycle,
      billingEnabled: true,
    };
    cache.set(domain, { status, expires: Date.now() + CACHE_MS });
    // The worker has no admin session: it reads the last confirmed plan here.
    await db.shop.updateMany({
      where: { domain },
      data: { plan, planCheckedAt: new Date() },
    });
    return status;
  } catch (error) {
    console.error("[billing] plan check failed; using last known plan", error);
    const shop = await db.shop.findUnique({
      where: { domain },
      select: { plan: true },
    });
    return {
      plan: shop && isPlanId(shop.plan) ? shop.plan : "free",
      trialEndsAt: null,
      cancelAtEndOfCycle: false,
      billingEnabled: true,
    };
  }
}

/** Plan for background work (worker, storefront): the last confirmed plan. */
export async function planForShop(shopId: string): Promise<PlanId> {
  if (!isBillingConfigured()) return devPlan();
  const shop = await db.shop.findUnique({
    where: { id: shopId },
    select: { plan: true },
  });
  return shop && isPlanId(shop.plan) ? shop.plan : "free";
}

export async function featuresForShop(shopId: string): Promise<PlanFeatures> {
  return PLANS[await planForShop(shopId)].features;
}

function monthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** First-time requests sent this calendar month (UTC). Sample emails don't count. */
export function requestsSentThisMonth(shopId: string) {
  return db.reviewRequest.count({
    where: {
      shopId,
      sentAt: { gte: monthStart() },
      NOT: { orderId: { startsWith: "test-" } },
    },
  });
}
