import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";

import db from "../../db.server";
import { unauthenticated } from "../../shopify.server";
import { featuresForShop } from "../billing/billing.server";

// Shopify Flow triggers (extensions/flow-*). Flow requires every field defined in a
// trigger's TOML, keys verbatim. Reference fields take the numeric resource id.

const TRIGGER = `#graphql
  mutation FlowTrigger($handle: String!, $payload: JSON!) {
    flowTriggerReceive(handle: $handle, payload: $payload) {
      userErrors { field message }
    }
  }`;

const numericId = (gid: string) => Number(gid.split("/").pop());

const SOURCE_NAMES = {
  WEB: "website",
  EMAIL: "email request",
  IMPORT: "import",
} as const;

async function fire(
  admin: AdminApiContext,
  handle: string,
  payload: Record<string, unknown>,
) {
  const response = await admin.graphql(TRIGGER, {
    variables: { handle, payload },
  });
  const { data } = await response.json();
  const errors = data?.flowTriggerReceive?.userErrors ?? [];
  if (errors.length > 0) {
    throw new Error(`Flow ${handle}: ${JSON.stringify(errors)}`);
  }
}

function adminLink(domain: string) {
  const store = domain.replace(".myshopify.com", "");
  return `https://admin.shopify.com/store/${store}/apps/${process.env.SHOPIFY_API_KEY}/app/reviews`;
}

export type ReviewEvent = "submitted" | "published";

/**
 * Fires the review triggers for one review. "submitted" also fires the customer
 * trigger when the customer is known, and "published" when it went live at once.
 * Failures are logged: Flow must never break a submit or a moderation action.
 */
export async function fireReviewTriggers(
  reviewIds: string[],
  event: ReviewEvent,
  admin?: AdminApiContext,
) {
  if (reviewIds.length === 0) return;
  const reviews = await db.review.findMany({
    where: { id: { in: reviewIds } },
    include: {
      shop: {
        select: { domain: true, settings: { select: { flowEnabled: true } } },
      },
    },
  });
  // Off in Settings > Integrations: no trigger calls at all.
  if (reviews.length === 0 || reviews[0].shop.settings?.flowEnabled === false)
    return;
  if (!(await featuresForShop(reviews[0].shopId)).flow) return;
  const client =
    admin ?? (await unauthenticated.admin(reviews[0].shop.domain)).admin;

  for (const review of reviews) {
    // "Reviewer email" is an email field: Flow rejects an empty one.
    if (!review.authorEmail) continue;
    const fields = {
      product_id: numericId(review.productId),
      "Review ID": review.id,
      Rating: review.rating,
      "Review title": review.title ?? "",
      "Review body": (review.body ?? "").slice(0, 5000),
      "Reviewer name": review.authorName,
      "Reviewer email": review.authorEmail,
      "Review status": review.status.toLowerCase(),
      "Verified buyer": review.verification === "VERIFIED_BUYER",
      "Review source": SOURCE_NAMES[review.source],
      "Admin link": adminLink(review.shop.domain),
    };
    const handles =
      event === "published"
        ? ["review-published"]
        : [
            "review-submitted",
            ...(review.status === "PUBLISHED" ? ["review-published"] : []),
          ];
    const jobs = handles.map((handle) => fire(client, handle, fields));
    if (event === "submitted" && review.customerId) {
      jobs.push(
        fire(client, "customer-review-submitted", {
          customer_id: numericId(review.customerId),
          ...fields,
        }),
      );
    }
    const results = await Promise.allSettled(jobs);
    for (const result of results) {
      if (result.status === "rejected")
        console.error("[flow] trigger failed", result.reason);
    }
  }
}

/** "Review request due": the merchant's workflow sends the request instead of the app. */
export async function fireRequestDue(input: {
  domain: string;
  orderId: string;
  reviewLink: string;
  customerEmail: string;
  customerName: string | null;
  productTitles: string[];
  reminder: boolean;
}) {
  const { admin } = await unauthenticated.admin(input.domain);
  await fire(admin, "review-request-due", {
    order_id: numericId(input.orderId),
    "Review link": input.reviewLink,
    "Customer email": input.customerEmail,
    "Customer name": input.customerName ?? "",
    "Product titles": input.productTitles.join(", ").slice(0, 1000),
    Reminder: input.reminder,
  });
}

/** "Question asked" (Q&A). Same gates as the review triggers: Flow on, Business plan. */
export async function fireQuestionAsked(questionId: string) {
  const question = await db.question.findUnique({
    where: { id: questionId },
    include: {
      shop: {
        select: { domain: true, settings: { select: { flowEnabled: true } } },
      },
    },
  });
  if (!question || question.shop.settings?.flowEnabled === false) return;
  if (!(await featuresForShop(question.shopId)).flow) return;

  const { admin } = await unauthenticated.admin(question.shop.domain);
  const store = question.shop.domain.replace(".myshopify.com", "");
  await fire(admin, "question-asked", {
    product_id: numericId(question.productId),
    "Question ID": question.id,
    Question: question.body.slice(0, 1000),
    "Asker name": question.askerName,
    "Asker email": question.askerEmail,
    "Admin link": `https://admin.shopify.com/store/${store}/apps/${process.env.SHOPIFY_API_KEY}/app/questions`,
  });
}
