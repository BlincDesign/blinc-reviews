import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import type { QuestionStatus } from "@prisma/client";

import db from "../../db.server";
import { isBlockedEmail } from "../reviews/moderation";
import {
  notifyAnswer,
  notifyMerchantQuestion,
} from "../requests/notifications.server";

// Product Q&A. Customers ask on the product page (app proxy); the merchant answers
// in the admin. Answered, published questions are written to the product's
// blinc.questions metafield so the widget renders them in Liquid (no JS).

export const QUESTION_LIMITS = {
  name: 60,
  email: 254,
  body: 1000,
  answer: 2000,
};
const STOREFRONT_LIMIT = 20;
const MIN_FILL_MS = 3000;
const MAX_PER_EMAIL_PER_HOUR = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type QuestionSubmitResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string>; message?: string };

function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

const PRODUCT_EXISTS = `#graphql
  query QuestionProduct($id: ID!) { product(id: $id) { id } }`;

/** A storefront question. Bots get a silent success and nothing is saved. */
export async function submitQuestion({
  admin,
  domain,
  form,
}: {
  admin: AdminApiContext;
  domain: string;
  form: FormData;
}): Promise<QuestionSubmitResult> {
  const startedAt = Number(text(form, "started_at"));
  if (
    text(form, "website") ||
    !startedAt ||
    Date.now() - startedAt < MIN_FILL_MS
  ) {
    return { ok: true };
  }

  const numericId = text(form, "product_id");
  const productId = /^\d+$/.test(numericId)
    ? `gid://shopify/Product/${numericId}`
    : null;
  const name = text(form, "name");
  const email = text(form, "email").toLowerCase();
  const body = text(form, "question");

  const errors: Record<string, string> = {};
  if (!name || name.length > QUESTION_LIMITS.name)
    errors.name = "name_required";
  if (!EMAIL_PATTERN.test(email) || email.length > QUESTION_LIMITS.email)
    errors.email = "email_invalid";
  if (!body) errors.question = "question_required";
  else if (body.length > QUESTION_LIMITS.body) errors.question = "too_long";
  if (!productId || Object.keys(errors).length > 0)
    return { ok: false, errors };

  const [shop, recent, product] = await Promise.all([
    db.shop.findUnique({
      where: { domain },
      select: { id: true, settings: { select: { blockedEmails: true } } },
    }),
    db.question.count({
      where: {
        shop: { domain },
        askerEmail: email,
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
  if (recent >= MAX_PER_EMAIL_PER_HOUR)
    return { ok: false, errors: {}, message: "rate_limited" };

  // Blocked senders: saved hidden for the record, no merchant alert.
  const blocked = isBlockedEmail(email, shop.settings?.blockedEmails ?? []);
  const question = await db.question.create({
    data: {
      shopId: shop.id,
      productId,
      askerName: name,
      askerEmail: email,
      body,
      status: blocked ? "HIDDEN" : "PENDING",
      language: text(form, "language").slice(0, 10) || null,
    },
  });
  if (!blocked) {
    notifyMerchantQuestion(question.id).catch((error) =>
      console.error("[questions] merchant alert failed", error),
    );
  }
  return { ok: true };
}

// ---- Admin ----

export const QUESTION_FILTERS = [
  "PENDING",
  "PUBLISHED",
  "HIDDEN",
  "ALL",
] as const;
export type QuestionFilter = (typeof QUESTION_FILTERS)[number];

export async function listQuestions(domain: string, filter: QuestionFilter) {
  const where = {
    shop: { domain },
    ...(filter === "ALL" ? {} : { status: filter as QuestionStatus }),
  };
  const [questions, grouped] = await Promise.all([
    db.question.findMany({
      where,
      orderBy: { createdAt: filter === "PENDING" ? "asc" : "desc" },
      take: 100,
    }),
    db.question.groupBy({
      by: ["status"],
      where: { shop: { domain } },
      _count: { _all: true },
    }),
  ]);
  const counts = Object.fromEntries(
    grouped.map((g) => [g.status, g._count._all]),
  ) as Partial<Record<QuestionStatus, number>>;
  return { questions, counts };
}

/** Saves the answer and publishes the question; emails the asker on a new or changed answer. */
export async function answerQuestion(
  admin: AdminApiContext,
  domain: string,
  id: string,
  text: string,
) {
  const answer = text.trim().slice(0, QUESTION_LIMITS.answer);
  if (!answer) return { ok: false as const, message: "Write an answer first." };
  const existing = await db.question.findFirst({
    where: { id, shop: { domain } },
    select: { answer: true, productId: true, shopId: true },
  });
  if (!existing) return { ok: false as const, message: "Question not found." };

  await db.question.update({
    where: { id },
    data: { answer, answeredAt: new Date(), status: "PUBLISHED" },
  });
  await syncProductQuestions(admin, existing.shopId, existing.productId);
  if (answer !== existing.answer) {
    notifyAnswer(id).catch((error) =>
      console.error("[questions] answer email failed", error),
    );
  }
  return { ok: true as const, message: "Answer published" };
}

export type QuestionIntent = "publish" | "hide" | "delete";

export async function moderateQuestions(
  admin: AdminApiContext,
  domain: string,
  ids: string[],
  intent: QuestionIntent,
) {
  const targets = await db.question.findMany({
    where: { id: { in: ids }, shop: { domain } },
    select: { id: true, shopId: true, productId: true, answer: true },
  });
  if (targets.length === 0) return 0;
  const where = { id: { in: targets.map((t) => t.id) } };
  if (intent === "delete") {
    await db.question.deleteMany({ where });
  } else if (intent === "hide") {
    await db.question.updateMany({ where, data: { status: "HIDDEN" } });
  } else {
    // Only answered questions can be shown on the storefront.
    await db.question.updateMany({
      where: { ...where, answer: { not: null } },
      data: { status: "PUBLISHED" },
    });
  }
  const products = [...new Set(targets.map((t) => t.productId))];
  await Promise.allSettled(
    products.map((productId) =>
      syncProductQuestions(admin, targets[0].shopId, productId),
    ),
  );
  return targets.length;
}

// ---- Storefront metafield ----

const SET_QUESTIONS = `#graphql
  mutation SetQuestions($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) { userErrors { field message } }
  }`;

const DELETE_QUESTIONS = `#graphql
  mutation DeleteQuestions($metafields: [MetafieldIdentifierInput!]!) {
    metafieldsDelete(metafields: $metafields) { userErrors { field message } }
  }`;

/** Display name variants, like reviews: [full, "First L.", "F. L."]. */
function nameVariants(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return ["", "", ""];
  const [first, ...rest] = parts;
  return [
    parts.join(" "),
    rest.length ? `${first} ${rest.at(-1)![0].toUpperCase()}.` : first,
    parts.map((p) => `${p[0].toUpperCase()}.`).join(" "),
  ];
}

/**
 * Writes blinc.questions = { c: published count, q: latest answered questions }
 * for the product, or deletes it when there are none.
 */
export async function syncProductQuestions(
  admin: AdminApiContext,
  shopId: string,
  productId: string,
) {
  const where = { shopId, productId, status: "PUBLISHED" as const };
  const [count, rows] = await Promise.all([
    db.question.count({ where }),
    db.question.findMany({
      where,
      orderBy: { answeredAt: "desc" },
      take: STOREFRONT_LIMIT,
      select: {
        id: true,
        askerName: true,
        body: true,
        answer: true,
        createdAt: true,
      },
    }),
  ]);

  if (count === 0) {
    const response = await admin.graphql(DELETE_QUESTIONS, {
      variables: {
        metafields: [
          { ownerId: productId, namespace: "blinc", key: "questions" },
        ],
      },
    });
    await response.json();
    return;
  }
  const value = {
    c: count,
    q: rows.map((r) => ({
      i: r.id,
      n: nameVariants(r.askerName),
      q: r.body,
      a: r.answer,
      d: r.createdAt.toISOString().slice(0, 10),
    })),
  };
  const response = await admin.graphql(SET_QUESTIONS, {
    variables: {
      metafields: [
        {
          ownerId: productId,
          namespace: "blinc",
          key: "questions",
          type: "json",
          value: JSON.stringify(value),
        },
      ],
    },
  });
  const { data } = await response.json();
  const errors = data?.metafieldsSet?.userErrors ?? [];
  if (errors.length)
    throw new Error(`questions sync: ${JSON.stringify(errors)}`);
}

/** Customer data request / redact helpers (GDPR webhooks). */
export function deleteQuestionsByEmail(shopId: string, email: string) {
  return db.question.deleteMany({
    where: { shopId, askerEmail: email.toLowerCase() },
  });
}
