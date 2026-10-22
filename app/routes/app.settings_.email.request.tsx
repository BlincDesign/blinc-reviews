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
  REQUEST_VARIABLES,
  type RequestCopy,
} from "../features/requests/email-settings";
import { renderRequestEmail } from "../features/requests/email-template";
import {
  EmailEditorLayout,
  useEmailForm,
} from "../features/requests/EmailEditor";

export const loader = ({ request }: LoaderFunctionArgs) =>
  loadEmailEditor(request);
export const action = ({ request }: ActionFunctionArgs) =>
  emailEditorAction(request);

type Kind = "initial" | "reminder";
type Live = { onInput: () => void; onChange: () => void };

const TABS = [
  { id: "initial", label: "Initial request" },
  { id: "reminder", label: "Reminder" },
];

function CopyFields({
  kind,
  copy,
  live,
}: {
  kind: Kind;
  copy: RequestCopy;
  live: Live;
}) {
  return (
    <s-stack gap="base">
      <s-text-field
        {...live}
        name={`${kind}.subject`}
        label="Email subject"
        maxLength={COPY_LIMITS.subject}
        defaultValue={copy.subject}
      />
      <s-text-field
        {...live}
        name={`${kind}.preheader`}
        label="Preheader text"
        details="Shown after the subject line in the inbox."
        maxLength={COPY_LIMITS.preheader}
        defaultValue={copy.preheader}
      />
      <s-text-field
        {...live}
        name={`${kind}.heading`}
        label="Email title"
        maxLength={COPY_LIMITS.heading}
        defaultValue={copy.heading}
      />
      <s-text-area
        {...live}
        name={`${kind}.body`}
        label="Email content"
        rows={7}
        maxLength={COPY_LIMITS.body}
        defaultValue={copy.body}
      />
      <s-text-field
        {...live}
        name={`${kind}.button`}
        label="Button text"
        details="Shown instead of the stars when stars are turned off."
        maxLength={COPY_LIMITS.button}
        defaultValue={copy.button}
      />
    </s-stack>
  );
}

export default function RequestEmail() {
  const {
    settings: saved,
    design,
    shopName,
    contactEmail,
    products,
    requestsOn,
    dryRun,
  } = useLoaderData<typeof loader>();
  const { settings, live, formProps } = useEmailForm(saved, {
    checkboxes: ["showStars", "showHelpText"],
  });
  const [kind, setKind] = useState<Kind>("initial");

  const email = useMemo(
    () =>
      renderRequestEmail({
        kind,
        shopName,
        customerName: "Alex Morgan",
        orderName: "#1042",
        products,
        design,
        settings,
        contactEmail: contactEmail ?? "support@example.com",
        writeUrl: () => "#",
        openPixelUrl: "data:,",
        unsubscribeUrl: "#",
      }),
    [kind, shopName, products, design, settings, contactEmail],
  );

  const form = (
    <form {...formProps}>
      <s-stack gap="base">
        <s-section>
          <s-stack gap="small-200">
            <s-stack direction="inline" gap="small-200" alignItems="center">
              <s-text type="strong">Email template</s-text>
              <s-badge tone={requestsOn ? "success" : undefined}>
                {requestsOn ? "On" : "Off"}
              </s-badge>
            </s-stack>
            <s-text color="subdued">
              {requestsOn
                ? "Sent after fulfillment. Change timing in "
                : "Requests are sent by another channel. Change it in "}
              <s-link href="/app/settings">Settings</s-link>. Logo and colors
              are in{" "}
              <s-link href="/app/settings/email/styling">
                template styling
              </s-link>
              .
            </s-text>
          </s-stack>
        </s-section>

        <s-section heading="Write a review settings">
          <s-stack gap="base">
            <s-checkbox
              {...live}
              name="showStars"
              label="Show clickable rating stars"
              details="Customers tap a rating and land on the review form with it selected."
              defaultChecked={saved.showStars}
            />
            <s-checkbox
              {...live}
              name="showHelpText"
              label="Show stars help text"
              defaultChecked={saved.showHelpText}
            />
          </s-stack>
        </s-section>

        <s-section
          heading={
            kind === "initial"
              ? "Initial request template"
              : "Reminder template"
          }
        >
          <s-stack gap="base">
            <s-text color="subdued">
              Personalize with {REQUEST_VARIABLES.join(", ")}.
            </s-text>
            {/* Both stay in the form, so switching tabs never loses text. */}
            <div hidden={kind !== "initial"}>
              <CopyFields kind="initial" copy={saved.initial} live={live} />
            </div>
            <div hidden={kind !== "reminder"}>
              <CopyFields kind="reminder" copy={saved.reminder} live={live} />
            </div>
          </s-stack>
        </s-section>
      </s-stack>
    </form>
  );

  return (
    <EmailEditorLayout
      heading="Review request email"
      form={form}
      dryRun={dryRun}
      preview={{
        tabs: TABS,
        tab: kind,
        onTab: (id) => setKind(id as Kind),
        subject: email.subject,
        html: email.html,
        sampleKind: kind,
      }}
    />
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
