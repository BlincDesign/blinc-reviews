import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";

import { authenticate } from "../shopify.server";
import {
  getLanguageSettings,
  saveLanguageSettings,
} from "../features/i18n/language-settings.server";
import { LANGUAGES } from "../features/i18n/i18n";
import { SettingsForm } from "../features/settings/SettingsForm";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const { settings, storeLanguages, primaryLocale } =
    await getLanguageSettings(admin);
  return { settings, storeLanguages, primaryLocale };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const form = await request.formData();
  try {
    await saveLanguageSettings(admin, {
      defaultLanguage: form.get("defaultLanguage"),
      customerLanguageEmails: form.get("customerLanguageEmails") !== null,
      dateFormat: form.get("dateFormat"),
    });
    return { saved: true, errors: {} };
  } catch (error) {
    console.error("[language] save failed", error);
    return { saved: false, errors: {} };
  }
};

const names =
  typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "language" })
    : null;
const languageName = (code: string) => names?.of(code) ?? code;

const DATE_LABELS = {
  auto: "Automatic: the usual format of each language",
  mdy: "10/23/2026 (MM/DD/YYYY)",
  dmy: "23/10/2026 (DD/MM/YYYY)",
  ymd: "2026-10-23 (YYYY-MM-DD)",
  long: "Oct 23, 2026",
} as const;

export default function LanguageSettings() {
  const { settings, storeLanguages, primaryLocale } =
    useLoaderData<typeof loader>();

  return (
    <SettingsForm
      heading="Language"
      description="Blinc Reviews is translated into 19 languages. The widget follows each visitor's store language automatically."
    >
      {() => (
        <>
          <s-stack gap="small-200">
            <s-text type="strong">Your store&apos;s published languages</s-text>
            {storeLanguages.length === 0 ? (
              <s-text color="subdued">
                No published languages found. Add them in Shopify under Settings
                &gt; Languages.
              </s-text>
            ) : (
              <s-stack direction="inline" gap="small-200">
                {storeLanguages.map((l) => (
                  <s-badge
                    key={l.locale}
                    tone={l.supported ? "success" : "warning"}
                  >
                    {`${l.name}${l.primary ? " (primary)" : ""}${l.supported ? "" : " · shown in English"}`}
                  </s-badge>
                ))}
              </s-stack>
            )}
          </s-stack>

          <s-select
            name="defaultLanguage"
            label="Default language"
            details="Used for emails when we don't know a customer's language, and when per-customer languages are off."
          >
            <s-option
              value="auto"
              defaultSelected={settings.defaultLanguage === "auto"}
            >
              {`Automatic: store's primary language (${languageName(primaryLocale)})`}
            </s-option>
            {LANGUAGES.map((code) => (
              <s-option
                key={code}
                value={code}
                defaultSelected={settings.defaultLanguage === code}
              >
                {languageName(code)}
              </s-option>
            ))}
          </s-select>

          <s-checkbox
            name="customerLanguageEmails"
            label="Send emails in each customer's language"
            details="Review requests, reminders, confirmations, replies and answers use the language the customer shopped or wrote in. Text you edited in Email templates is always sent as written."
            defaultChecked={settings.customerLanguageEmails}
          />

          <s-select
            name="dateFormat"
            label="Date format"
            details="How review and question dates appear in the widget."
          >
            {Object.entries(DATE_LABELS).map(([value, label]) => (
              <s-option
                key={value}
                value={value}
                defaultSelected={settings.dateFormat === value}
              >
                {label}
              </s-option>
            ))}
          </s-select>
        </>
      )}
    </SettingsForm>
  );
}
