import { timingSafeEqual } from "node:crypto";

import db from "../../db.server";
import { unauthenticated } from "../../shopify.server";
import { getDesign } from "../appearance/design.server";
import {
  applyBrandingAccess,
  normalizeEmailSettings,
  type EmailSettings,
} from "./email-settings";
import { featuresForShop } from "../billing/billing.server";
import {
  renderAlertEmail,
  renderConfirmEmail,
  renderReplyEmail,
} from "./email-template";
import { sendEmail } from "./mailer.server";
import { signToken, unsubscribeToken } from "./requests.server";

// Post-review notifications: emails to a reviewer about their own review
// (reply notification, review confirmation).

const REVIEW_CONTEXT = `#graphql
  query ReviewEmailContext($id: ID!) {
    shop { name contactEmail }
    currentAppInstallation { metafield(namespace: "blinc", key: "email") { jsonValue } }
    product(id: $id) { title }
  }`;

function appUrl(path: string) {
  return `${(process.env.SHOPIFY_APP_URL || "").replace(/\/$/, "")}${path}`;
}

type ReviewEmailTarget = {
  domain: string;
  shopId: string;
  to: string;
  productId: string;
  reviewerName: string | null;
  rating: number;
  reviewTitle: string | null;
  reviewBody: string | null;
  senderName: string | null;
  replyToEmail: string | null;
  /** Review language (from the storefront locale). */
  lang?: string | null;
};

type Rendered = { subject: string; html: string; text: string };
type RenderContext = {
  shopName: string;
  productTitle: string;
  settings: EmailSettings;
  common: {
    shopName: string;
    design: Awaited<ReturnType<typeof getDesign>>;
    settings: EmailSettings;
    contactEmail: string | null;
    unsubscribeUrl: string;
    lang?: string | null;
  };
};

/** Loads shop, product and template, then sends what `render` returns (null skips). */
async function sendAboutReview(
  target: ReviewEmailTarget,
  render: (context: RenderContext) => Rendered | null,
) {
  const { admin } = await unauthenticated.admin(target.domain);
  const [response, design] = await Promise.all([
    admin.graphql(REVIEW_CONTEXT, { variables: { id: target.productId } }),
    getDesign(admin),
  ]);
  const { data } = await response.json();
  const settings = applyBrandingAccess(
    normalizeEmailSettings(data?.currentAppInstallation?.metafield?.jsonValue),
    (await featuresForShop(target.shopId)).emailBranding,
  );
  const shopName: string = data?.shop?.name ?? target.domain;
  const unsubscribeUrl = appUrl(
    `/e/u/${unsubscribeToken(target.shopId, target.to)}`,
  );
  const email = render({
    shopName,
    productTitle: data?.product?.title ?? "your product",
    settings,
    common: {
      shopName,
      design,
      settings,
      contactEmail: target.replyToEmail || data?.shop?.contactEmail || null,
      unsubscribeUrl,
      lang: target.lang,
    },
  });
  if (!email) return false;

  await sendEmail({
    to: target.to,
    fromName: target.senderName || shopName,
    replyTo: target.replyToEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
    unsubscribeUrl,
  });
  return true;
}

async function loadReview(reviewId: string) {
  const review = await db.review.findUnique({
    where: { id: reviewId },
    include: { shop: { include: { settings: true } } },
  });
  if (!review?.authorEmail) return null;
  const email = review.authorEmail.toLowerCase();
  const suppressed = await db.emailSuppression.count({
    where: { shopId: review.shopId, email },
  });
  if (suppressed > 0) return null;
  const target: ReviewEmailTarget = {
    domain: review.shop.domain,
    shopId: review.shopId,
    to: email,
    productId: review.productId,
    reviewerName: review.authorName,
    rating: review.rating,
    reviewTitle: review.title,
    reviewBody: review.body,
    senderName: review.shop.settings?.senderName ?? null,
    replyToEmail: review.shop.settings?.replyToEmail ?? null,
    lang: review.language,
  };
  return { review, target };
}

async function sampleTarget(domain: string, to: string) {
  const shop = await db.shop.findUnique({
    where: { domain },
    include: { settings: true },
  });
  if (!shop) throw new Error("Shop not found");
  const { admin } = await unauthenticated.admin(domain);
  const response = await admin.graphql(SAMPLE_PRODUCT);
  const { data } = await response.json();
  const productId = data?.products?.nodes?.[0]?.id;
  if (!productId) throw new Error("Add a product first");
  return {
    domain,
    shopId: shop.id,
    to: to.toLowerCase(),
    productId,
    reviewerName: "Alex Morgan",
    rating: 5,
    reviewTitle: "Love it",
    reviewBody: "Great quality and fast shipping. Would buy again.",
    senderName: shop.settings?.senderName ?? null,
    replyToEmail: shop.settings?.replyToEmail ?? null,
  } satisfies ReviewEmailTarget;
}

const SAMPLE_PRODUCT = `#graphql
  query ReviewSampleProduct {
    products(first: 1, sortKey: UPDATED_AT, reverse: true) { nodes { id } }
  }`;

// ---- Reply notification ----

/** Emails the reviewer their review's new reply. Skips reviews without an email and unsubscribed customers. */
export async function notifyReply(reviewId: string) {
  const loaded = await loadReview(reviewId);
  const reply = loaded?.review.merchantReply;
  if (!loaded || !reply) return;
  await sendAboutReview(loaded.target, ({ settings, productTitle, common }) =>
    settings.reply.enabled
      ? renderReplyEmail({ ...common, ...loaded.target, productTitle, reply })
      : null,
  );
}

/** "Send sample email" for the reply notification, with example review text. */
export async function sendReplySample(domain: string, to: string) {
  const target = await sampleTarget(domain, to);
  await sendAboutReview(target, ({ productTitle, common }) =>
    renderReplyEmail({
      ...common,
      ...target,
      productTitle,
      reply: "Thank you so much, Alex! We're glad you love it.",
    }),
  );
}

// ---- Review confirmation ----

// Signed with a purpose prefix, so an unsubscribe token can't confirm a review.
export function confirmToken(reviewId: string) {
  return `${reviewId}.${signToken(`confirm:${reviewId}`)}`;
}

function readConfirmToken(token: string) {
  const [reviewId, signature] = token.split(".");
  if (!reviewId || !signature || reviewId.length > 64) return null;
  const expected = Buffer.from(signToken(`confirm:${reviewId}`));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given)
    ? reviewId
    : null;
}

/** Asks a web reviewer to confirm the review is theirs. Returns whether it was sent. */
export async function sendReviewConfirmation(reviewId: string) {
  const loaded = await loadReview(reviewId);
  if (!loaded || loaded.review.verification !== "UNVERIFIED") return false;
  const confirmUrl = appUrl(`/e/c/${confirmToken(reviewId)}`);
  return sendAboutReview(loaded.target, ({ settings, productTitle, common }) =>
    settings.confirm.enabled
      ? renderConfirmEmail({
          ...common,
          ...loaded.target,
          productTitle,
          confirmUrl,
        })
      : null,
  );
}

export async function sendConfirmSample(domain: string, to: string) {
  const target = await sampleTarget(domain, to);
  await sendAboutReview(target, ({ productTitle, common }) =>
    renderConfirmEmail({
      ...common,
      ...target,
      productTitle,
      confirmUrl: appUrl("/e/c/sample"),
    }),
  );
}

/** The review a confirmation link is for, without changing anything (GET is prefetched). */
export async function findConfirmable(token: string) {
  const reviewId = readConfirmToken(token);
  if (!reviewId) return null;
  return db.review.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      verification: true,
      shop: { select: { domain: true } },
    },
  });
}

/** Marks the reviewer verified. Verified buyers stay verified buyers. */
export async function confirmReview(token: string) {
  const reviewId = readConfirmToken(token);
  if (!reviewId) return false;
  await db.review.updateMany({
    where: { id: reviewId, verification: "UNVERIFIED" },
    data: { verification: "VERIFIED_REVIEWER" },
  });
  return true;
}

// ---- Merchant alerts ----

const ALERT_CONTEXT = `#graphql
  query ReviewAlertContext($id: ID!) {
    shop { name email }
    product(id: $id) { title }
  }`;

/** Emails the merchant about a new review, per the alert setting in Settings. */
export async function notifyMerchant(reviewId: string) {
  const review = await db.review.findUnique({
    where: { id: reviewId },
    include: { shop: { include: { settings: true } } },
  });
  if (!review || review.status === "HIDDEN") return;
  const mode = review.shop.settings?.alertMode ?? "PENDING";
  const wanted =
    mode === "ALL" ||
    (mode === "PENDING" && review.status === "PENDING") ||
    (mode === "NEGATIVE" && review.rating <= 3);
  if (!wanted) return;

  const { admin } = await unauthenticated.admin(review.shop.domain);
  const response = await admin.graphql(ALERT_CONTEXT, {
    variables: { id: review.productId },
  });
  const { data } = await response.json();
  const to = review.shop.settings?.alertEmail || data?.shop?.email;
  if (!to) return;

  const store = review.shop.domain.replace(".myshopify.com", "");
  const status = review.status === "PUBLISHED" ? "PUBLISHED" : "PENDING";
  const email = renderAlertEmail({
    shopName: data?.shop?.name ?? review.shop.domain,
    productTitle: data?.product?.title ?? "A product",
    reviewerName: review.authorName,
    reviewerEmail: review.authorEmail,
    rating: review.rating,
    reviewTitle: review.title,
    reviewBody: review.body,
    status,
    flags: review.tags.filter((tag) =>
      ["profanity", "blocked word", "contact info"].includes(tag),
    ),
    adminUrl: `https://admin.shopify.com/store/${store}/apps/${process.env.SHOPIFY_API_KEY}/app/reviews${status === "PENDING" ? "?status=PENDING" : ""}`,
  });
  await sendEmail({
    to,
    fromName: "Blinc Reviews",
    subject: email.subject,
    html: email.html,
    text: email.text,
    // No unsubscribe link: merchants switch alerts off in Settings.
  });
}
