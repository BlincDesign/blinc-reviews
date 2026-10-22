import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";

import { authenticate } from "../shopify.server";
import {
  getSettings,
  parseSettingsForm,
  updateSettings,
} from "../features/settings/settings.server";
import { SettingsForm } from "../features/settings/SettingsForm";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const settings = await getSettings(session.shop);
  return {
    alertMode: settings.alertMode,
    alertEmail: settings.alertEmail ?? "",
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const result = parseSettingsForm(await request.formData(), "notifications");
  if (!result.ok) return { saved: false, errors: result.errors };
  await updateSettings(session.shop, result.data);
  return { saved: true, errors: {} };
};

const ALERT_LABELS = {
  PENDING: "Reviews waiting for my approval",
  NEGATIVE: "Negative reviews (1 to 3 stars)",
  ALL: "Every new review",
  OFF: "Don't send alerts",
} as const;

export default function NotificationSettings() {
  const settings = useLoaderData<typeof loader>();

  return (
    <SettingsForm
      heading="Admin notifications"
      description="Emails to you about new reviews, with a link to approve them."
    >
      {(errors) => (
        <>
          <s-select
            name="alertMode"
            label="Email me about"
            error={errors.alertMode}
          >
            {Object.entries(ALERT_LABELS).map(([value, label]) => (
              <s-option
                key={value}
                value={value}
                defaultSelected={value === settings.alertMode}
              >
                {label}
              </s-option>
            ))}
          </s-select>
          <s-email-field
            name="alertEmail"
            label="Send alerts to"
            details="Leave empty to use your store email."
            defaultValue={settings.alertEmail}
            error={errors.alertEmail}
          />
        </>
      )}
    </SettingsForm>
  );
}
