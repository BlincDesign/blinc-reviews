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
import { renderReplyEmail } from "../features/requests/email-template";
import {
  EmailEditorLayout,
  useEmailForm,
} from "../features/requests/EmailEditor";

export const loader = ({ request }: LoaderFunctionArgs) =>
  loadEmailEditor(request);
export const action = ({ request }: ActionFunctionArgs) =>
  emailEditorAction(request);

export default function ReplyEmail() {
  const {
    settings: saved,
    design,
    shopName,
    contactEmail,
    products,
    dryRun,
  } = useLoaderData<typeof loader>();
  const { settings, live, formProps } = useEmailForm(saved, {
    checkboxes: ["reply.enabled"],
  });
  const [lang, setLang] = useState("en");
  const copy = saved.reply;

  const email = useMemo(
    () =>
      renderReplyEmail({
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
        reply: "Thank you so much, Alex! We're glad you love it.",
      }),
    [shopName, design, settings, contactEmail, products, lang],
  );

  const form = (
    <form {...formProps}>
      <s-stack gap="base">
        <s-section heading="Reply notification email">
          <s-checkbox
            {...live}
            name="reply.enabled"
            label="Notify reviewer about new replies"
            details="Sent when you add or change a reply on a review that has an email address."
            defaultChecked={copy.enabled}
          />
        </s-section>

        <s-section heading="Template">
          <s-stack gap="base">
            <s-text color="subdued">
              Personalize with {REVIEW_VARIABLES.join(", ")}. The review and
              your reply are added automatically.
            </s-text>
            <s-text-field
              {...live}
              name="reply.subject"
              label="Email subject"
              maxLength={COPY_LIMITS.subject}
              defaultValue={copy.subject}
            />
            <s-text-field
              {...live}
              name="reply.preheader"
              label="Preheader text"
              details="Shown after the subject line in the inbox."
              maxLength={COPY_LIMITS.preheader}
              defaultValue={copy.preheader}
            />
            <s-text-field
              {...live}
              name="reply.heading"
              label="Email title"
              maxLength={COPY_LIMITS.heading}
              defaultValue={copy.heading}
            />
            <s-text-area
              {...live}
              name="reply.body"
              label="Email content"
              details="Shown above the customer's review."
              rows={5}
              maxLength={COPY_LIMITS.body}
              defaultValue={copy.body}
            />
            <s-text-field
              {...live}
              name="reply.replyLabel"
              label="Reply label"
              details="Shown above your reply."
              maxLength={COPY_LIMITS.replyLabel}
              defaultValue={copy.replyLabel}
            />
          </s-stack>
        </s-section>
      </s-stack>
    </form>
  );

  return (
    <EmailEditorLayout
      heading="Reply notification email"
      form={form}
      dryRun={dryRun}
      preview={{
        lang,
        onLang: setLang,
        subject: email.subject,
        html: email.html,
        sampleKind: "reply",
      }}
    />
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
