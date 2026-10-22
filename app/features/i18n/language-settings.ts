import { LANGUAGES, resolveLang } from "./i18n";

// Language settings (Settings > Language). Stored as JSON in the blinc.language
// app-installation metafield: the widget's Liquid reads dateFormat, the email
// senders read the rest.

export const DATE_FORMATS = ["auto", "mdy", "dmy", "ymd", "long"] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export type LanguageSettings = {
  /** "auto" = the store's primary language. Used when a customer's language is unknown. */
  defaultLanguage: string;
  /** Send each customer's emails in the language they used on the store. */
  customerLanguageEmails: boolean;
  dateFormat: DateFormat;
};

export const DEFAULT_LANGUAGE_SETTINGS: LanguageSettings = {
  defaultLanguage: "auto",
  customerLanguageEmails: true,
  dateFormat: "auto",
};

export function normalizeLanguageSettings(input: unknown): LanguageSettings {
  const raw = (input && typeof input === "object" ? input : {}) as Record<
    string,
    unknown
  >;
  const D = DEFAULT_LANGUAGE_SETTINGS;
  const lang =
    typeof raw.defaultLanguage === "string" ? raw.defaultLanguage : "";
  return {
    defaultLanguage:
      lang === "auto" || LANGUAGES.includes(lang) ? lang : D.defaultLanguage,
    customerLanguageEmails:
      typeof raw.customerLanguageEmails === "boolean"
        ? raw.customerLanguageEmails
        : D.customerLanguageEmails,
    dateFormat: (DATE_FORMATS as readonly string[]).includes(
      String(raw.dateFormat),
    )
      ? (raw.dateFormat as DateFormat)
      : D.dateFormat,
  };
}

/**
 * The language a customer email goes out in: theirs (when that's on and known),
 * otherwise the default language, otherwise the store's primary language.
 */
export function emailLanguage(
  settings: LanguageSettings,
  customerLocale: string | null | undefined,
  primaryLocale: string | null | undefined,
) {
  if (settings.customerLanguageEmails && customerLocale)
    return resolveLang(customerLocale);
  if (settings.defaultLanguage !== "auto") return settings.defaultLanguage;
  return resolveLang(primaryLocale);
}
