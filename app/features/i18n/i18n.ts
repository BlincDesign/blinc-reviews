import type { EmailSettings } from "../requests/email-settings";
import { WESTERN, type EmailStrings } from "./email-strings";
import { MORE } from "./email-strings-more";

// Languages for customer emails and app-rendered storefront pages. Matches the
// theme extension's locale files.

export const EMAIL_STRINGS: Record<string, EmailStrings> = {
  ...WESTERN,
  ...MORE,
};
export const LANGUAGES = Object.keys(EMAIL_STRINGS);

/** Shopify locale ("fr", "fr-CA", "pt-BR", "zh-Hant", "no") to a supported language. */
export function resolveLang(locale: string | null | undefined): string {
  if (!locale) return "en";
  const value = locale.replace("_", "-");
  const exact = LANGUAGES.find((l) => l.toLowerCase() === value.toLowerCase());
  if (exact) return exact;
  const base = value.split("-")[0].toLowerCase();
  if (base === "pt") return /br/i.test(value) ? "pt-BR" : "pt-PT";
  if (base === "zh") return /tw|hk|mo|hant/i.test(value) ? "zh-TW" : "zh-CN";
  if (base === "no" || base === "nn") return "nb";
  return EMAIL_STRINGS[base] ? base : "en";
}

export function emailStrings(lang: string | null | undefined): EmailStrings {
  return EMAIL_STRINGS[resolveLang(lang)] ?? EMAIL_STRINGS.en;
}

/**
 * Text the merchant left at the English default is sent in the customer's
 * language; anything they wrote themselves is sent exactly as written.
 */
export function localizeSettings(
  settings: EmailSettings,
  lang: string | null | undefined,
): EmailSettings {
  const target = emailStrings(lang);
  const en = EMAIL_STRINGS.en;
  if (target === en) return settings;
  const pick = <T extends Record<string, unknown>>(
    current: T,
    english: Partial<T>,
    translated: Partial<T>,
  ): T => {
    const out = { ...current };
    for (const key of Object.keys(english) as (keyof T)[]) {
      if (current[key] === english[key] && translated[key] !== undefined) {
        out[key] = translated[key] as T[keyof T];
      }
    }
    return out;
  };
  return {
    ...settings,
    signOff:
      settings.signOff === en.signOff ? target.signOff : settings.signOff,
    initial: pick(settings.initial, en.initial, target.initial),
    reminder: pick(settings.reminder, en.reminder, target.reminder),
    reply: pick(settings.reply, en.reply, target.reply),
    confirm: pick(settings.confirm, en.confirm, target.confirm),
  };
}
