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
    autoPublishMinRating: settings.autoPublishMinRating,
    holdProfanity: settings.holdProfanity,
    holdContactInfo: settings.holdContactInfo,
    blockedWords: settings.blockedWords.join("\n"),
    blockedEmails: settings.blockedEmails.join("\n"),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const result = parseSettingsForm(await request.formData(), "publishing");
  if (!result.ok) return { saved: false, errors: result.errors };
  await updateSettings(session.shop, result.data);
  return { saved: true, errors: {} };
};

const AUTO_PUBLISH_LABELS: Record<number, string> = {
  0: "Moderate every review",
  5: "5-star reviews only",
  4: "4 stars and up",
  3: "3 stars and up",
  1: "Publish all reviews",
};

export default function PublishingSettings() {
  const settings = useLoaderData<typeof loader>();

  return (
    <SettingsForm
      heading="Publishing and moderation"
      description="Decide which reviews go live automatically and which wait for your approval."
    >
      {(errors) => (
        <>
          <s-select
            name="autoPublishMinRating"
            label="Auto-publish reviews"
            details="Reviews below this rating wait in the moderation queue."
            error={errors.autoPublishMinRating}
          >
            {Object.entries(AUTO_PUBLISH_LABELS).map(([value, label]) => (
              <s-option
                key={value}
                value={value}
                defaultSelected={
                  Number(value) === settings.autoPublishMinRating
                }
              >
                {label}
              </s-option>
            ))}
          </s-select>
          <s-checkbox
            name="holdProfanity"
            label="Hold reviews with profanity"
            details="They wait for your approval instead of publishing automatically."
            defaultChecked={settings.holdProfanity}
          />
          <s-checkbox
            name="holdContactInfo"
            label="Hold reviews with links, emails or phone numbers"
            details="Stops spam and keeps customers' contact details off your store."
            defaultChecked={settings.holdContactInfo}
          />
          <s-text-area
            name="blockedWords"
            label="Blocked words"
            details="One per line or comma separated, any language. Reviews containing them wait for your approval."
            rows={3}
            defaultValue={settings.blockedWords}
            error={errors.blockedWords}
          />
          <s-text-area
            name="blockedEmails"
            label="Blocked emails and domains"
            details="For example spam@example.com or @example.com. Their reviews are saved as hidden."
            rows={3}
            defaultValue={settings.blockedEmails}
            error={errors.blockedEmails}
          />
        </>
      )}
    </SettingsForm>
  );
}
