import type { LoaderFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";

// /apps/blinc-reviews/thanks?s=published|pending - shown after an email-link review.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { liquid } = await authenticate.public.appProxy(request);
  const published = new URL(request.url).searchParams.get("s") === "published";

  return liquid(`<div style="max-width:560px;margin:60px auto;padding:0 16px;text-align:center;">
    <h1>Thank you for your review!</h1>
    <p>${published ? "Your review is now live." : "Your review will appear once it's approved."}</p>
    <p><a href="/">Continue shopping</a></p>
  </div>`);
};
