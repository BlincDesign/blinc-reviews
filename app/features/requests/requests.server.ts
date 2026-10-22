import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Prisma } from "@prisma/client";

import db from "../../db.server";
import { unauthenticated } from "../../shopify.server";
import { getDesign } from "../appearance/design.server";
import { renderRequestEmail, type EmailProduct } from "./email-template";
import { applyBrandingAccess, normalizeEmailSettings } from "./email-settings";
import { sendEmail } from "./mailer.server";
import { fireRequestDue } from "../flow/flow.server";
import {
  featuresForShop,
  planForShop,
  requestsSentThisMonth,
} from "../billing/billing.server";
import { PLANS } from "../billing/plans";

const DAY_MS = 24 * 60 * 60 * 1000;
// Requests stuck in SENDING longer than this (e.g. a crash mid-send) are retried.
const STALE_SENDING_MS = 15 * 60 * 1000;

export type RequestItem = {
  productId: string;
  variantId: string | null;
  title: string;
};

type OrderWebhookPayload = {
  id?: number;
  name?: string;
  email?: string | null;
  contact_email?: string | null;
  customer_locale?: string | null;
  customer?: {
    id?: number;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  line_items?: {
    product_id?: number | null;
    variant_id?: number | null;
    title?: string;
    gift_card?: boolean;
  }[];
};

export function newToken() {
  return randomBytes(24).toString("base64url");
}

/** orders/fulfilled → one scheduled request per order, products deduplicated. */
export async function scheduleFromOrder(
  domain: string,
  order: OrderWebhookPayload,
) {
  const email = (order.email || order.contact_email || "").trim().toLowerCase();
  if (!order.id || !email) return null;

  const shop = await db.shop.findUnique({
    where: { domain },
    select: { id: true, uninstalledAt: true, settings: true },
  });
  if (!shop || shop.uninstalledAt) return null;

  const suppressed = await db.emailSuppression.count({
    where: { shopId: shop.id, email },
  });
  if (suppressed > 0) return null;

  const seen = new Set<string>();
  const items: RequestItem[] = [];
  for (const line of order.line_items ?? []) {
    if (!line.product_id || line.gift_card) continue;
    const productId = `gid://shopify/Product/${line.product_id}`;
    if (seen.has(productId)) continue;
    seen.add(productId);
    items.push({
      productId,
      variantId: line.variant_id
        ? `gid://shopify/ProductVariant/${line.variant_id}`
        : null,
      title: line.title ?? "",
    });
  }
  if (items.length === 0) return null;

  const delayDays = shop.settings?.requestDelayDays ?? 7;
  const customerName = [order.customer?.first_name, order.customer?.last_name]
    .filter(Boolean)
    .join(" ");

  // Webhooks can be delivered more than once; the unique (shop, order) makes this idempotent.
  return db.reviewRequest.upsert({
    where: {
      shopId_orderId: {
        shopId: shop.id,
        orderId: `gid://shopify/Order/${order.id}`,
      },
    },
    update: {},
    create: {
      shopId: shop.id,
      orderId: `gid://shopify/Order/${order.id}`,
      orderName: order.name ?? null,
      customerId: order.customer?.id
        ? `gid://shopify/Customer/${order.customer.id}`
        : null,
      customerEmail: email,
      customerName: customerName || null,
      locale: order.customer_locale || null,
      items: items as unknown as Prisma.InputJsonValue,
      token: newToken(),
      channel: shop.settings?.requestChannel ?? "APP",
      scheduledAt: new Date(Date.now() + delayDays * DAY_MS),
    },
  });
}

/** Atomically claims due first-time sends. SKIP LOCKED keeps parallel workers apart. */
async function claimDueRequests(limit: number) {
  const rows = await db.$queryRaw<{ id: string }[]>`
    UPDATE "ReviewRequest" SET "status" = 'SENDING', "updatedAt" = now()
    WHERE "id" IN (
      SELECT "id" FROM "ReviewRequest"
      WHERE "status" = 'SCHEDULED' AND "scheduledAt" <= now()
      ORDER BY "scheduledAt" LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id"`;
  return rows.map((r) => r.id);
}

/** Claims due reminders by stamping reminderSentAt first, so each sends at most once. */
async function claimDueReminders(limit: number) {
  const rows = await db.$queryRaw<{ id: string }[]>`
    UPDATE "ReviewRequest" SET "reminderSentAt" = now(), "updatedAt" = now()
    WHERE "id" IN (
      SELECT "id" FROM "ReviewRequest"
      WHERE "status" = 'SENT' AND "reminderAt" <= now()
        AND "reminderSentAt" IS NULL AND "reviewedAt" IS NULL
      ORDER BY "reminderAt" LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id"`;
  return rows.map((r) => r.id);
}

async function recoverStaleSends() {
  await db.reviewRequest.updateMany({
    where: {
      status: "SENDING",
      updatedAt: { lt: new Date(Date.now() - STALE_SENDING_MS) },
    },
    data: { status: "SCHEDULED" },
  });
}

const EMAIL_CONTEXT = `#graphql
  query RequestEmailContext($ids: [ID!]!) {
    shop { name contactEmail primaryDomain { url } }
    currentAppInstallation { metafield(namespace: "blinc", key: "email") { jsonValue } }
    nodes(ids: $ids) {
      ... on Product { id title featuredMedia { preview { image { url(transform: { maxWidth: 176, maxHeight: 176 }) } } } }
    }
  }`;

function appUrl(path: string) {
  return `${(process.env.SHOPIFY_APP_URL || "").replace(/\/$/, "")}${path}`;
}

/** Builds the email for a request using live shop, product and design data. */
export async function buildRequestEmail(
  requestId: string,
  kind: "initial" | "reminder",
) {
  const request = await db.reviewRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: { shop: { include: { settings: true } } },
  });
  const items = request.items as unknown as RequestItem[];
  const { admin } = await unauthenticated.admin(request.shop.domain);

  const [contextResponse, design] = await Promise.all([
    admin.graphql(EMAIL_CONTEXT, {
      variables: { ids: items.map((i) => i.productId) },
    }),
    getDesign(admin),
  ]);
  const { data } = await contextResponse.json();
  const storeUrl: string =
    data?.shop?.primaryDomain?.url ?? `https://${request.shop.domain}`;
  const shopName: string = data?.shop?.name ?? request.shop.domain;

  // Skip products deleted since the order.
  const products: EmailProduct[] = (data?.nodes ?? [])
    .filter((node: { id?: string } | null) => node?.id)
    .map(
      (node: {
        id: string;
        title: string;
        featuredMedia?: { preview?: { image?: { url?: string } } };
      }) => ({
        productId: node.id.split("/").pop()!,
        title: node.title,
        imageUrl: node.featuredMedia?.preview?.image?.url ?? null,
      }),
    );

  const email = renderRequestEmail({
    kind,
    shopName,
    customerName: request.customerName,
    lang: request.locale,
    orderName: request.orderName,
    products,
    design,
    contactEmail:
      request.shop.settings?.replyToEmail || data?.shop?.contactEmail || null,
    settings: applyBrandingAccess(
      normalizeEmailSettings(
        data?.currentAppInstallation?.metafield?.jsonValue,
      ),
      (await featuresForShop(request.shopId)).emailBranding,
    ),
    writeUrl: (productId, rating) =>
      `${storeUrl}/apps/blinc-reviews/write?t=${request.token}&p=${productId}&r=${rating}`,
    openPixelUrl: appUrl(`/e/o/${request.token}`),
    unsubscribeUrl: appUrl(`/e/u/${request.token}`),
  });

  return { request, email, shopName, productCount: products.length };
}

async function deliver(requestId: string, kind: "initial" | "reminder") {
  const queued = await db.reviewRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: { shop: { include: { settings: true } } },
  });
  if (queued.channel === "FLOW") {
    if (!(await featuresForShop(queued.shopId)).flow) {
      throw new Error("Sending with Shopify Flow needs the Business plan.");
    }
    const suppressed = await db.emailSuppression.count({
      where: { shopId: queued.shopId, email: queued.customerEmail },
    });
    if (suppressed > 0) throw new Error("Customer unsubscribed");
    // The merchant's workflow sends the request; the link works on any store domain.
    await fireRequestDue({
      domain: queued.shop.domain,
      orderId: queued.orderId,
      reviewLink: `https://${queued.shop.domain}/apps/blinc-reviews/write?t=${queued.token}`,
      customerEmail: queued.customerEmail,
      customerName: queued.customerName,
      productTitles: (queued.items as unknown as RequestItem[]).map(
        (item) => item.title,
      ),
      reminder: kind === "reminder",
    });
    return queued.shop.settings;
  }

  const { request, email, shopName, productCount } = await buildRequestEmail(
    requestId,
    kind,
  );
  const settings = request.shop.settings;

  if (request.channel !== "APP") {
    throw new Error(`${request.channel} delivery isn't connected yet`);
  }
  if (productCount === 0)
    throw new Error("All products in this order were deleted");
  const suppressed = await db.emailSuppression.count({
    where: { shopId: request.shopId, email: request.customerEmail },
  });
  if (suppressed > 0) throw new Error("Customer unsubscribed");

  await sendEmail({
    to: request.customerEmail,
    fromName: settings?.senderName || shopName,
    replyTo: settings?.replyToEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
    unsubscribeUrl: appUrl(`/e/u/${request.token}`),
  });
  return settings;
}

async function sendInitial(id: string) {
  try {
    const { shopId } = await db.reviewRequest.findUniqueOrThrow({
      where: { id },
      select: { shopId: true },
    });
    const plan = PLANS[await planForShop(shopId)];
    if (
      (await requestsSentThisMonth(shopId)) >= plan.features.requestsPerMonth
    ) {
      // FAILED, so "Send now" works after an upgrade.
      throw new Error(
        `Monthly limit of ${plan.features.requestsPerMonth} review requests reached on the ${plan.name} plan. Upgrade in Settings > Plan to send more.`,
      );
    }
    const settings = await deliver(id, "initial");
    const now = new Date();
    await db.reviewRequest.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: now,
        error: null,
        reminderAt:
          settings?.reminderEnabled === false || !plan.features.reminders
            ? null
            : new Date(
                now.getTime() + (settings?.reminderDelayDays ?? 7) * DAY_MS,
              ),
      },
    });
  } catch (error) {
    await db.reviewRequest.update({
      where: { id },
      data: {
        status: "FAILED",
        error: String((error as Error).message ?? error).slice(0, 500),
      },
    });
  }
}

async function sendReminder(id: string) {
  try {
    const { shopId } = await db.reviewRequest.findUniqueOrThrow({
      where: { id },
      select: { shopId: true },
    });
    // Reminders scheduled before a downgrade are dropped.
    if (!(await featuresForShop(shopId)).reminders) return;
    await deliver(id, "reminder");
  } catch (error) {
    console.error(`[requests] reminder ${id} failed`, error);
  }
}

/** One worker pass: recover stuck sends, then process due requests and reminders. */
export async function processDueRequests(batch = 25) {
  await recoverStaleSends();
  for (const id of await claimDueRequests(batch)) await sendInitial(id);
  for (const id of await claimDueReminders(batch)) await sendReminder(id);
}

// ---- Admin actions ----

export async function listRequests(domain: string, take = 50) {
  const shop = { domain };
  const [requests, grouped, reviewed, opened] = await Promise.all([
    db.reviewRequest.findMany({
      where: { shop },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        orderName: true,
        customerName: true,
        customerEmail: true,
        status: true,
        scheduledAt: true,
        sentAt: true,
        openedAt: true,
        reviewedAt: true,
        error: true,
        items: true,
      },
    }),
    db.reviewRequest.groupBy({
      by: ["status"],
      where: { shop },
      _count: { _all: true },
    }),
    db.reviewRequest.count({ where: { shop, reviewedAt: { not: null } } }),
    db.reviewRequest.count({ where: { shop, openedAt: { not: null } } }),
  ]);
  const counts = Object.fromEntries(
    grouped.map((g) => [g.status, g._count._all]),
  );
  return { requests, counts, reviewed, opened };
}

/** Moves a scheduled or failed request to send on the next worker pass. */
export async function sendNow(domain: string, id: string) {
  const { count } = await db.reviewRequest.updateMany({
    where: { id, shop: { domain }, status: { in: ["SCHEDULED", "FAILED"] } },
    data: { status: "SCHEDULED", scheduledAt: new Date(), error: null },
  });
  if (count > 0) await processDueRequests(5);
  return count > 0;
}

export async function cancelRequest(domain: string, id: string) {
  const { count } = await db.reviewRequest.updateMany({
    where: { id, shop: { domain }, status: { in: ["SCHEDULED", "FAILED"] } },
    data: { status: "CANCELLED" },
  });
  return count > 0;
}

// ---- Customer-facing token actions ----

export async function findRequestByToken(token: string) {
  if (!token || token.length > 64) return null;
  return db.reviewRequest.findUnique({
    where: { token },
    include: { shop: true },
  });
}

export async function markOpened(token: string) {
  await db.reviewRequest.updateMany({
    where: { token, openedAt: null },
    data: { openedAt: new Date() },
  });
}

/** A click implies an open (image blocking often hides the pixel); keep the earliest times. */
export async function markClicked(token: string) {
  const now = new Date();
  await db.$transaction([
    db.reviewRequest.updateMany({
      where: { token, clickedAt: null },
      data: { clickedAt: now },
    }),
    db.reviewRequest.updateMany({
      where: { token, openedAt: null },
      data: { openedAt: now },
    }),
  ]);
}

// Emails without a request (e.g. reply notifications) unsubscribe with a signed
// token: base64url("shopId:email") + "." + HMAC. Request tokens never contain ".".
export function signToken(payload: string) {
  return createHmac("sha256", process.env.SHOPIFY_API_SECRET || "dev")
    .update(payload)
    .digest("base64url")
    .slice(0, 32);
}

export function unsubscribeToken(shopId: string, email: string) {
  const payload = Buffer.from(`${shopId}:${email.toLowerCase()}`).toString(
    "base64url",
  );
  return `${payload}.${signToken(payload)}`;
}

/** The shop and email an unsubscribe link is for, from either token kind. */
export async function resolveUnsubscribe(token: string) {
  if (!token || token.length > 400) return null;
  const [payload, signature] = token.split(".");
  if (signature === undefined) {
    const request = await findRequestByToken(token);
    return request
      ? {
          shopId: request.shopId,
          email: request.customerEmail,
          domain: request.shop.domain,
        }
      : null;
  }
  const expected = Buffer.from(signToken(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return null;
  }
  const decoded = Buffer.from(payload, "base64url").toString();
  const split = decoded.indexOf(":");
  const shop = await db.shop.findUnique({
    where: { id: decoded.slice(0, split) },
    select: { id: true, domain: true },
  });
  return shop
    ? { shopId: shop.id, email: decoded.slice(split + 1), domain: shop.domain }
    : null;
}

export async function unsubscribe(token: string) {
  const target = await resolveUnsubscribe(token);
  if (!target) return false;
  const { shopId, email } = target;
  await db.$transaction([
    db.emailSuppression.upsert({
      where: { shopId_email: { shopId, email } },
      update: {},
      create: { shopId, email },
    }),
    db.reviewRequest.updateMany({
      where: {
        shopId,
        customerEmail: email,
        status: { in: ["SCHEDULED", "FAILED"] },
      },
      data: { status: "CANCELLED" },
    }),
    db.reviewRequest.updateMany({
      where: {
        shopId,
        customerEmail: email,
        reminderSentAt: null,
      },
      data: { reminderAt: null },
    }),
  ]);
  return true;
}

const SAMPLE_PRODUCTS = `#graphql
  query TestRequestProducts {
    products(first: 2, query: "status:active", sortKey: UPDATED_AT, reverse: true) {
      nodes { id title }
    }
  }`;

/** "Send sample email": a real request for the store's latest products, sent now. */
export async function sendTestRequest(
  domain: string,
  to: string,
  kind: "initial" | "reminder" = "initial",
) {
  const shop = await db.shop.findUnique({
    where: { domain },
    select: { id: true },
  });
  if (!shop) throw new Error("Shop not found");

  const { admin } = await unauthenticated.admin(domain);
  const response = await admin.graphql(SAMPLE_PRODUCTS);
  const { data } = await response.json();
  const products: { id: string; title: string }[] = data?.products?.nodes ?? [];
  if (products.length === 0) throw new Error("Add an active product first");

  const request = await db.reviewRequest.create({
    data: {
      shopId: shop.id,
      orderId: `test-${newToken()}`,
      orderName: "#TEST",
      customerEmail: to.toLowerCase(),
      customerName: "Test Customer",
      items: products.map((p) => ({
        productId: p.id,
        variantId: null,
        title: p.title,
      })),
      token: newToken(),
      channel: "APP",
      status: "SENDING",
      scheduledAt: new Date(),
    },
  });
  try {
    await deliver(request.id, kind);
  } catch (error) {
    await db.reviewRequest.delete({ where: { id: request.id } });
    throw error;
  }
  // Samples never get a reminder.
  return db.reviewRequest.update({
    where: { id: request.id },
    data: { status: "SENT", sentAt: new Date(), reminderAt: null },
  });
}
