import type { LoaderFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";
import { getDesign } from "../features/appearance/design.server";
import type { RequestItem } from "../features/requests/requests.server";
import {
  findRequestByToken,
  markClicked,
} from "../features/requests/requests.server";

// /apps/blinc-reviews/write?t=<token>&p=<product id>&r=<rating>
// Opened from the star buttons in a review request email. Rendered as Liquid inside
// the store's theme, with the clicked rating preselected. Plain HTML form, no JS.

const ERRORS: Record<string, string> = {
  rating_required: "Choose a star rating.",
  name_required: "Enter your name.",
  body_required: "Write a few words about the product.",
  too_long: "One of your answers is too long.",
  already_reviewed: "You've already reviewed this product. Thank you!",
  rate_limited: "You've submitted several reviews recently. Try again later.",
  unavailable: "Something went wrong. Try again in a moment.",
};

/** Escapes HTML and Liquid delimiters, since the response is parsed as Liquid. */
function safe(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\{/g, "&#123;")
    .replace(/\}/g, "&#125;");
}

const PRODUCTS = `#graphql
  query WriteReviewProducts($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product { id title featuredMedia { preview { image { url(transform: { maxWidth: 240 }) } } } }
    }
  }`;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { liquid, session, admin } =
    await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const token = url.searchParams.get("t") ?? "";
  const reviewRequest = await findRequestByToken(token);

  if (
    !session ||
    !admin ||
    !reviewRequest ||
    reviewRequest.shop.domain !== session.shop
  ) {
    return liquid(`<div style="max-width:560px;margin:60px auto;padding:0 16px;">
      <h1>This review link isn't valid</h1>
      <p>It may have expired. You can still leave a review on the product page.</p></div>`);
  }
  await markClicked(token);

  const items = reviewRequest.items as unknown as RequestItem[];
  const current =
    items.find((item) =>
      item.productId.endsWith(`/${url.searchParams.get("p")}`),
    ) ?? items[0];
  const rating = Math.min(
    5,
    Math.max(0, Number(url.searchParams.get("r")) || 0),
  );
  const errorCode = url.searchParams.get("e");

  const [productsResponse, design] = await Promise.all([
    admin.graphql(PRODUCTS, {
      variables: { ids: items.map((i) => i.productId) },
    }),
    getDesign(admin),
  ]);
  const { data } = await productsResponse.json();
  const nodes: {
    id: string;
    title: string;
    featuredMedia?: { preview?: { image?: { url?: string } } };
  }[] = (data?.nodes ?? []).filter(Boolean);
  const product = nodes.find((n) => n.id === current.productId);
  const others = nodes.filter((n) => n.id !== current.productId);

  const star = design.branding.starColor;
  const primary = design.widget.buttonColor || design.branding.primaryColor;
  const radius = { sharp: "0", soft: "10px", round: "999px" }[
    design.branding.corners
  ];
  const numericId = current.productId.split("/").pop();
  const image = product?.featuredMedia?.preview?.image?.url;
  const writeLink = (id: string) =>
    `/apps/blinc-reviews/write?t=${encodeURIComponent(token)}&p=${id.split("/").pop()}`;

  const stars = [5, 4, 3, 2, 1]
    .map(
      (
        r,
      ) => `<input type="radio" id="br${r}" name="rating" value="${r}" ${r === rating ? "checked" : ""} required>
        <label for="br${r}" title="${r} out of 5">★</label>`,
    )
    .join("");

  return liquid(`
<style>
  .bw { max-width: 640px; margin: 48px auto; padding: 0 16px; }
  .bw-product { display: flex; gap: 16px; align-items: center; margin-bottom: 24px; }
  .bw-product img { width: 96px; height: 96px; object-fit: cover; border-radius: 10px; }
  .bw form { display: grid; gap: 16px; }
  .bw label.bw-field { display: grid; gap: 6px; }
  .bw input[type=text], .bw textarea { font: inherit; padding: 10px 12px; border: 1px solid rgb(0 0 0 / .25); border-radius: 8px; }
  .bw-stars { display: inline-flex; flex-direction: row-reverse; justify-content: flex-end; font-size: 36px; }
  .bw-stars input { position: absolute; opacity: 0; }
  .bw-stars label { cursor: pointer; color: rgb(0 0 0 / .2); padding: 0 2px; }
  .bw-stars input:checked ~ label, .bw-stars label:hover, .bw-stars label:hover ~ label { color: ${star}; }
  .bw-stars input:focus-visible + label { outline: 2px solid currentColor; border-radius: 4px; }
  .bw button { font: inherit; padding: 12px 22px; border: 0; border-radius: ${radius}; background: ${primary}; color: ${design.widget.buttonTextColor}; cursor: pointer; justify-self: start; }
  .bw-error { color: #b91c1c; }
  .bw-hp { position: absolute; left: -9999px; }
  .bw-others { margin-top: 32px; }
</style>
<div class="bw">
  <h1>Review your purchase</h1>
  <div class="bw-product">
    ${image ? `<img src="${safe(image)}" alt="">` : ""}
    <strong>${safe(product?.title ?? current.title)}</strong>
  </div>
  ${errorCode && ERRORS[errorCode] ? `<p class="bw-error" role="alert">${ERRORS[errorCode]}</p>` : ""}
  <form method="post" action="/apps/blinc-reviews/reviews" enctype="multipart/form-data">
    <input type="hidden" name="_format" value="html">
    <input type="hidden" name="request_token" value="${safe(token)}">
    <input type="hidden" name="product_id" value="${numericId}">
    <input type="hidden" name="started_at" value="${Date.now()}">
    <div class="bw-hp" aria-hidden="true"><label>Website <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
    <fieldset style="border:0;padding:0;margin:0;">
      <legend>Your rating</legend>
      <div class="bw-stars">${stars}</div>
    </fieldset>
    <label class="bw-field"><span>Name</span>
      <input type="text" name="name" maxlength="60" required value="${safe(reviewRequest.customerName ?? "")}"></label>
    <label class="bw-field"><span>Review title (optional)</span>
      <input type="text" name="title" maxlength="120"></label>
    <label class="bw-field"><span>Your review</span>
      <textarea name="body" rows="5" maxlength="5000" required></textarea></label>
    <label class="bw-field"><span>Add photos (optional, up to 5)</span>
      <input type="file" name="photos" accept="image/*" multiple></label>
    <button type="submit">Submit review</button>
  </form>
  ${
    others.length
      ? `<div class="bw-others"><p>Also in your order:</p><ul>${others
          .map(
            (o) => `<li><a href="${writeLink(o.id)}">${safe(o.title)}</a></li>`,
          )
          .join("")}</ul></div>`
      : ""
  }
</div>`);
};
