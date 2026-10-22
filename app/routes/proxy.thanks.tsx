import type { LoaderFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";
import { emailStrings } from "../features/i18n/i18n";
import { storefrontStrings } from "../features/i18n/storefront.server";

// /apps/blinc-reviews/thanks?s=published|pending&l=<language> - shown after an
// email-link review, in the language of the review page.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { liquid } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const published = url.searchParams.get("s") === "published";
  const lang = url.searchParams.get("l");
  const form = storefrontStrings(lang).form;
  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\{/g, "&#123;");

  return liquid(`<div style="max-width:560px;margin:60px auto;padding:0 16px;text-align:center;">
    <h1>${escape(form.thanks)}</h1>
    <p>${escape(published ? form.published : form.pending)}</p>
    <p><a href="/">${escape(emailStrings(lang).page.continueShopping)}</a></p>
  </div>`);
};
