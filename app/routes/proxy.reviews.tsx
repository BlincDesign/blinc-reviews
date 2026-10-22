import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

import { authenticate } from "../shopify.server";
import {
  listPublishedReviews,
  parseListOptions,
  productGid,
  submitReview,
} from "../features/reviews/storefront.server";

// Storefront requests arrive through the app proxy (/apps/blinc-reviews/reviews).
// authenticate.public.appProxy verifies Shopify's signature on every request.

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const productId = productGid(url.searchParams.get("product_id"));

  if (!session || !productId) {
    return Response.json({ reviews: [], nextCursor: null }, { status: 400 });
  }

  const page = await listPublishedReviews(
    session.shop,
    productId,
    url.searchParams.get("cursor"),
    parseListOptions(url.searchParams),
  );
  return Response.json(page, {
    headers: { "Cache-Control": "public, max-age=60" },
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.public.appProxy(request);
  if (!session || !admin) {
    return Response.json(
      { ok: false, errors: {}, message: "unavailable" },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const customer = url.searchParams.get("logged_in_customer_id");
  const form = await request.formData();
  const result = await submitReview({
    admin,
    domain: session.shop,
    form,
    customerId: customer ? `gid://shopify/Customer/${customer}` : null,
  });

  // The email-link review page posts a plain HTML form: answer with a redirect.
  if (form.get("_format") === "html") {
    if (result.ok) {
      return redirect(
        `/apps/blinc-reviews/thanks?s=${result.published ? "published" : "pending"}`,
      );
    }
    const code =
      result.message ?? Object.values(result.errors)[0] ?? "unavailable";
    const back = new URLSearchParams({
      t: String(form.get("request_token") ?? ""),
      p: String(form.get("product_id") ?? ""),
      r: String(form.get("rating") ?? ""),
      e: code,
    });
    return redirect(`/apps/blinc-reviews/write?${back}`);
  }

  return Response.json(result, { status: result.ok ? 200 : 422 });
};
