import type { LoaderFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";
import { emailStrings } from "../features/i18n/i18n";
import { storefrontStrings } from "../features/i18n/storefront.server";

// /apps/blinc-reviews/thanks?s=published|pending|question|error&l=<language> - shown after an
// email-link review, in the language of the review page.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { liquid } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const state = url.searchParams.get("s");
  const lang = url.searchParams.get("l");
  const strings = storefrontStrings(lang);
  const { form } = strings;
  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\{/g, "&#123;");

  return liquid(`<div style="max-width:560px;margin:60px auto;padding:0 16px;text-align:center;">
    <h1>${escape(state === "error" ? strings.errors.generic : form.thanks)}</h1>
    <p>${escape(
      state === "question"
        ? strings.qa.thanks
        : state === "published"
          ? form.published
          : state === "error"
            ? ""
            : form.pending,
    )}</p>
    <p><a href="/">${escape(emailStrings(lang).page.continueShopping)}</a></p>
  </div>`);
};
