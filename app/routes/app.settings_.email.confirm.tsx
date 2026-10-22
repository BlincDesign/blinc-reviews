import { useMemo, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import {
  emailEditorAction,
  loadEmailEditor,
} from "../features/requests/email-settings.server";
import {
  COPY_LIMITS,
  REVIEW_VARIABLES,
} from "../features/requests/email-settings";
import { renderConfirmEmail } from "../features/requests/email-template";
import {
  EmailEditorLayout,
  useEmailForm,
} from "../features/requests/EmailEditor";

export const loader = ({ request }: LoaderFunctionArgs) =>
  loadEmailEditor(request);
export const action = ({ request }: ActionFunctionArgs) =>
  emailEditorAction(request);

export default function ConfirmEmail() {
  const {
    settings: saved,
    design,
    shopName,
    contactEmail,
    products,
    dryRun,
  } = useLoaderData<typeof loader>();
  const { settings, live, formProps } = useEmailForm(saved, {
    checkboxes: ["confirm.enabled"],
  });
  const [lang, setLang] = useState("en");
  const copy = saved.confirm;

  const email = useMemo(
    () =>
      renderConfirmEmail({
        shopName,
        lang,
        design,
        settings,
        contactEmail: contactEmail ?? "support@example.com",
        unsubscribeUrl: "#",
        reviewerName: "Alex Morgan",
        productTitle: products[0]?.title ?? "Example product",
        rating: 5,
        reviewTitle: "Love it",
        reviewBody: "Great quality and fast shipping. Would buy again.",
        confirmUrl: "#",
      }),
    [shopName, design, settings, contactEmail, products, lang],
  );

  const form = (
    <form {...formProps}>
      <s-stack gap="base">
        <s-section heading="Review confirmation email">
          <s-stack gap="base">
            <s-checkbox
              {...live}
              name="confirm.enabled"
              label="Ask web reviewers to confirm their email"
              details="Sent after a review from your store's website when no order with that product is found for the email. Confirmed reviewers are marked verified."
              defaultChecked={copy.enabled}
            />
            <s-text color="subdued">
              Reviews from review request emails, and reviews from customers
              whose order is found, are verified buyers and skip this email.
            </s-text>
          </s-stack>
        </s-section>

        <s-section heading="Template">
          <s-stack gap="base">
            <s-text color="subdued">
              Personalize with {REVIEW_VARIABLES.join(", ")}. The review is
              added automatically.
            </s-text>
            <s-text-field
              {...live}
              name="confirm.subject"
              label="Email subject"
              maxLength={COPY_LIMITS.subject}
              defaultValue={copy.subject}
            />
            <s-text-field
              {...live}
              name="confirm.preheader"
              label="Preheader text"
              details="Shown after the subject line in the inbox."
              maxLength={COPY_LIMITS.preheader}
              defaultValue={copy.preheader}
            />
            <s-text-field
              {...live}
              name="confirm.heading"
              label="Email title"
              maxLength={COPY_LIMITS.heading}
              defaultValue={copy.heading}
            />
            <s-text-area
              {...live}
              name="confirm.body"
              label="Email content"
              details="Shown above the customer's review."
              rows={6}
              maxLength={COPY_LIMITS.body}
              defaultValue={copy.body}
            />
            <s-text-field
              {...live}
              name="confirm.button"
              label="Button text"
              maxLength={COPY_LIMITS.button}
              defaultValue={copy.button}
            />
          </s-stack>
        </s-section>
      </s-stack>
    </form>
  );

  return (
    <EmailEditorLayout
      heading="Review confirmation email"
      form={form}
      dryRun={dryRun}
      preview={{
        lang,
        onLang: setLang,
        subject: email.subject,
        html: email.html,
        sampleKind: "confirm",
      }}
    />
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
