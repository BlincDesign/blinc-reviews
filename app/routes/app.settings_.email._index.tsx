import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getEmailSettings } from "../features/requests/email-settings.server";
import { getSettings } from "../features/settings/settings.server";
import { SettingsShell } from "../features/settings/SettingsShell";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const [{ settings }, shopSettings] = await Promise.all([
    getEmailSettings(admin),
    getSettings(session.shop),
  ]);
  return {
    channel: shopSettings.requestChannel,
    reminderEnabled: shopSettings.reminderEnabled,
    replyEnabled: settings.reply.enabled,
    confirmEnabled: settings.confirm.enabled,
  };
};

const CHANNEL_NAMES = { KLAVIYO: "Klaviyo", FLOW: "Shopify Flow" } as const;

function Row({
  title,
  badge,
  description,
  href,
}: {
  title: string;
  badge: { tone?: "success"; label: string };
  description: string;
  href?: string;
}) {
  return (
    <s-box border="base" borderRadius="base" padding="base">
      <s-stack
        direction="inline"
        justifyContent="space-between"
        alignItems="center"
        gap="base"
      >
        <s-stack gap="small-200">
          <s-stack direction="inline" gap="small-200" alignItems="center">
            <s-text type="strong">{title}</s-text>
            <s-badge tone={badge.tone}>{badge.label}</s-badge>
          </s-stack>
          <s-text color="subdued">{description}</s-text>
        </s-stack>
        {href ? <s-button href={href}>Edit</s-button> : null}
      </s-stack>
    </s-box>
  );
}

export default function EmailTemplates() {
  const { channel, reminderEnabled, replyEnabled, confirmEnabled } =
    useLoaderData<typeof loader>();
  const on = { tone: "success" as const, label: "On" };
  const off = { label: "Off" };

  return (
    <SettingsShell
      heading="Email templates"
      actions={
        <>
          <s-button slot="secondary-actions" href="/app/settings/email/sender">
            Edit sender settings
          </s-button>
          <s-button slot="secondary-actions" href="/app/settings/email/styling">
            Edit template styling
          </s-button>
        </>
      }
    >
      <s-stack gap="base">
        <s-section heading="Review request and reminder emails">
          <s-stack gap="base">
            <s-paragraph>
              Sent after an order is fulfilled. Timing and the reminder are set
              in <s-link href="/app/settings">Settings</s-link>.
            </s-paragraph>
            <Row
              title="Review request email"
              badge={
                channel === "APP"
                  ? on
                  : { label: `Sent by ${CHANNEL_NAMES[channel]}` }
              }
              description={
                reminderEnabled
                  ? "Initial request and one reminder."
                  : "Initial request only. Reminders are off."
              }
              href="/app/settings/email/request"
            />
          </s-stack>
        </s-section>

        <s-section heading="Post-review notifications">
          <s-stack gap="base">
            <Row
              title="Review confirmation"
              badge={confirmEnabled ? on : off}
              description="Send web visitors a confirmation email when they leave a review."
              href="/app/settings/email/confirm"
            />
            <Row
              title="Reply notification"
              badge={replyEnabled ? on : off}
              description="Notify reviewer by email when you reply to their review."
              href="/app/settings/email/reply"
            />
          </s-stack>
        </s-section>
      </s-stack>
    </SettingsShell>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
