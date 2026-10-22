import db from "../../db.server";
import { deleteReviewFiles, deleteShopFiles } from "../media/photos.server";
import { isStorageConfigured } from "../media/storage.server";
import { syncProductRating } from "../reviews/ratings.server";
import { syncProductQuestions } from "../questions/questions.server";
import { unauthenticated } from "../../shopify.server";

type CustomerPayload = {
  customer?: { id?: number | string; email?: string | null };
};

const insensitive = (value: string) => ({
  equals: value,
  mode: "insensitive" as const,
});

/** Match on customer GID and/or email. Empty when the payload identifies no one. */
function customerFilters(payload: CustomerPayload) {
  const id = payload.customer?.id;
  const gid = id === undefined ? null : `gid://shopify/Customer/${id}`;
  const email = payload.customer?.email || null;

  return {
    reviews: [
      ...(gid ? [{ customerId: gid }] : []),
      ...(email ? [{ authorEmail: insensitive(email) }] : []),
    ],
    requests: [
      ...(gid ? [{ customerId: gid }] : []),
      ...(email ? [{ customerEmail: insensitive(email) }] : []),
    ],
  };
}

/**
 * customers/data_request: the merchant must supply this customer's data on request.
 * We log what we hold so it can be exported to the merchant.
 */
export async function handleCustomerDataRequest(
  domain: string,
  payload: CustomerPayload,
) {
  const { reviews } = customerFilters(payload);
  if (reviews.length === 0) return;

  const email = payload.customer?.email;
  const [reviewCount, questionCount] = await Promise.all([
    db.review.count({ where: { shop: { domain }, OR: reviews } }),
    email
      ? db.question.count({
          where: { shop: { domain }, askerEmail: insensitive(email) },
        })
      : 0,
  ]);
  console.info(
    `[privacy] data request for ${domain}: ${reviewCount} review(s), ${questionCount} question(s) on file`,
  );
}

/** customers/redact: remove personal data but keep the review content and rating. */
export async function redactCustomer(domain: string, payload: CustomerPayload) {
  const { reviews, requests } = customerFilters(payload);
  if (reviews.length === 0) return;
  await redactQuestions(domain, payload.customer?.email);

  // Photos can show the customer, so they're removed along with name and email.
  const theirReviews = await db.review.findMany({
    where: { shop: { domain }, OR: reviews },
    select: {
      id: true,
      shopId: true,
      productId: true,
      media: { select: { id: true } },
    },
  });
  await deleteReviewFiles(theirReviews.map((r) => r.id));

  await db.$transaction([
    db.reviewMedia.deleteMany({
      where: { review: { shop: { domain }, OR: reviews } },
    }),
    db.review.updateMany({
      where: { shop: { domain }, OR: reviews },
      data: { authorName: "Anonymous", authorEmail: null, customerId: null },
    }),
    db.reviewRequest.deleteMany({ where: { shop: { domain }, OR: requests } }),
  ]);

  // Refresh product photo strips that showed the removed photos.
  const withPhotos = theirReviews.filter((r) => r.media.length > 0);
  if (withPhotos.length > 0) {
    const { admin } = await unauthenticated.admin(domain);
    for (const productId of new Set(withPhotos.map((r) => r.productId))) {
      await syncProductRating(admin, withPhotos[0].shopId, productId).catch(
        (error) => console.error("[privacy] photo strip refresh failed", error),
      );
    }
  }
}

/** shop/redact: sent 48 hours after uninstall. Deletes everything we hold for the shop. */
export async function redactShop(domain: string) {
  const shop = await db.shop.findUnique({
    where: { domain },
    select: { id: true },
  });
  if (shop && isStorageConfigured()) await deleteShopFiles(shop.id);
  await db.$transaction([
    db.shop.deleteMany({ where: { domain } }),
    db.session.deleteMany({ where: { shop: domain } }),
  ]);
}

/** Q&A: keep the public question and answer, drop who asked. */
async function redactQuestions(
  domain: string,
  email: string | null | undefined,
) {
  if (!email) return;
  const where = { shop: { domain }, askerEmail: insensitive(email) };
  const theirs = await db.question.findMany({
    where,
    select: { shopId: true, productId: true, status: true },
  });
  if (theirs.length === 0) return;
  await db.question.updateMany({
    where,
    data: { askerName: "Anonymous", askerEmail: "" },
  });
  const published = theirs.filter((q) => q.status === "PUBLISHED");
  if (published.length === 0) return;
  const { admin } = await unauthenticated.admin(domain);
  for (const productId of new Set(published.map((q) => q.productId))) {
    await syncProductQuestions(admin, published[0].shopId, productId).catch(
      (error) => console.error("[privacy] questions refresh failed", error),
    );
  }
}
