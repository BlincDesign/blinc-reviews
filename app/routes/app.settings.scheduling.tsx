import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";

import { authenticate } from "../shopify.server";
import {
  getSettings,
  parseSettingsForm,
  updateSettings,
} from "../features/settings/settings.server";
import {
  REQUEST_DELAY_MAX,
  REQUEST_DELAY_MIN,
} from "../features/settings/settings";
import { SettingsForm } from "../features/settings/SettingsForm";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const settings = await getSettings(session.shop);
  return {
    requestChannel: settings.requestChannel,
    requestDelayDays: settings.requestDelayDays,
    reminderEnabled: settings.reminderEnabled,
    reminderDelayDays: settings.reminderDelayDays,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const result = parseSettingsForm(await request.formData(), "scheduling");
  if (!result.ok) return { saved: false, errors: result.errors };
  await updateSettings(session.shop, result.data);
  return { saved: true, errors: {} };
};

const CHANNEL_LABELS = {
  APP: "Blinc Reviews emails",
  FLOW: "Shopify Flow",
  KLAVIYO: "Klaviyo (coming soon)",
} as const;

export default function SchedulingSettings() {
  const settings = useLoaderData<typeof loader>();

  return (
    <SettingsForm
      heading="Request scheduling"
      description="When and how customers are asked to review their order."
    >
      {(errors) => (
        <>
          <s-select
            name="requestChannel"
            label="Send review requests with"
            details="Shopify Flow: build a workflow with the Review request due trigger and send it with any app."
            error={errors.requestChannel}
          >
            {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
              <s-option
                key={value}
                value={value}
                defaultSelected={value === settings.requestChannel}
              >
                {label}
              </s-option>
            ))}
          </s-select>
          <s-number-field
            name="requestDelayDays"
            label="Days after fulfillment"
            min={REQUEST_DELAY_MIN}
            max={REQUEST_DELAY_MAX}
            step={1}
            defaultValue={String(settings.requestDelayDays)}
            error={errors.requestDelayDays}
          />
          <s-checkbox
            name="reminderEnabled"
            label="Send one reminder if there's no review"
            defaultChecked={settings.reminderEnabled}
          />
          <s-number-field
            name="reminderDelayDays"
            label="Days after the first request"
            min={REQUEST_DELAY_MIN}
            max={REQUEST_DELAY_MAX}
            step={1}
            defaultValue={String(settings.reminderDelayDays)}
            error={errors.reminderDelayDays}
          />
          <s-paragraph>
            Edit the email text, sender name and reply-to address in{" "}
            <s-link href="/app/settings/email">Email templates</s-link>.
          </s-paragraph>
        </>
      )}
    </SettingsForm>
  );
}
