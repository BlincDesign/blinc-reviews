import type { AlertMode, RequestChannel } from "@prisma/client";

import db from "../../db.server";
import { ensureShop } from "../shops/shops.server";
import { parseList } from "../reviews/moderation";
import { REQUEST_DELAY_MAX, REQUEST_DELAY_MIN } from "./settings";

// Mirrors the RequestChannel enum. A type-only import keeps Vite from resolving
// named exports of the CommonJS Prisma client at runtime.
export const REQUEST_CHANNELS = [
  "APP",
  "KLAVIYO",
  "FLOW",
] as const satisfies readonly RequestChannel[];

export const ALERT_MODES = [
  "OFF",
  "PENDING",
  "NEGATIVE",
  "ALL",
] as const satisfies readonly AlertMode[];

export const AUTO_PUBLISH_OPTIONS = [0, 1, 3, 4, 5] as const;

export type SettingsInput = {
  autoPublishMinRating: number;
  requestDelayDays: number;
  requestChannel: RequestChannel;
  reminderEnabled: boolean;
  reminderDelayDays: number;
  holdProfanity: boolean;
  holdContactInfo: boolean;
  blockedWords: string[];
  blockedEmails: string[];
  alertMode: AlertMode;
  alertEmail: string | null;
  flowEnabled: boolean;
};

export type SettingsErrors = Partial<Record<keyof SettingsInput, string>>;

/** Each settings page saves only its own section. */
export type SettingsSection = "publishing" | "scheduling" | "notifications";

export async function getSettings(domain: string) {
  const shop = await ensureShop(domain);
  return db.shopSettings.upsert({
    where: { shopId: shop.id },
    create: { shopId: shop.id },
    update: {},
  });
}

export async function updateSettings(
  domain: string,
  input: Partial<SettingsInput>,
) {
  const shop = await ensureShop(domain);
  return db.shopSettings.upsert({
    where: { shopId: shop.id },
    create: { shopId: shop.id, ...input },
    update: input,
  });
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// A full email, or "@domain.com" for a whole domain.
const BLOCKED_EMAIL_PATTERN = /^(@[^\s@]+\.[^\s@]+|[^\s@]+@[^\s@]+\.[^\s@]+)$/;

function optionalText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text === "" ? null : text;
}

function days(value: FormDataEntryValue | null) {
  const number = Number(value);
  return Number.isInteger(number) &&
    number >= REQUEST_DELAY_MIN &&
    number <= REQUEST_DELAY_MAX
    ? number
    : null;
}

const DAYS_ERROR = `Enter a whole number from ${REQUEST_DELAY_MIN} to ${REQUEST_DELAY_MAX}.`;

export function parseSettingsForm(
  formData: FormData,
  section: SettingsSection,
):
  | { ok: true; data: Partial<SettingsInput> }
  | { ok: false; errors: SettingsErrors } {
  const errors: SettingsErrors = {};
  let data: Partial<SettingsInput> = {};

  if (section === "publishing") {
    const autoPublishMinRating = Number(formData.get("autoPublishMinRating"));
    if (
      !(AUTO_PUBLISH_OPTIONS as readonly number[]).includes(
        autoPublishMinRating,
      )
    ) {
      errors.autoPublishMinRating = "Choose an auto-publish option.";
    }
    const blockedEmails = parseList(
      String(formData.get("blockedEmails") ?? ""),
    );
    if (blockedEmails.some((entry) => !BLOCKED_EMAIL_PATTERN.test(entry))) {
      errors.blockedEmails =
        "Use full emails or domains starting with @, one per line.";
    }
    data = {
      autoPublishMinRating,
      holdProfanity: formData.get("holdProfanity") !== null,
      holdContactInfo: formData.get("holdContactInfo") !== null,
      blockedWords: parseList(String(formData.get("blockedWords") ?? "")),
      blockedEmails,
    };
  }

  if (section === "scheduling") {
    const channel = String(formData.get("requestChannel"));
    if (!(REQUEST_CHANNELS as readonly string[]).includes(channel)) {
      errors.requestChannel = "Choose how review requests are sent.";
    }
    // Listed so merchants know it is coming; requests would fail until it is built.
    if (channel === "KLAVIYO") {
      errors.requestChannel =
        "Klaviyo isn't available yet. Use Shopify Flow to send with Klaviyo for now.";
    }
    const requestDelayDays = days(formData.get("requestDelayDays"));
    if (requestDelayDays === null) errors.requestDelayDays = DAYS_ERROR;
    const reminderDelayDays = days(formData.get("reminderDelayDays"));
    if (reminderDelayDays === null) errors.reminderDelayDays = DAYS_ERROR;
    data = {
      requestChannel: channel as RequestChannel,
      requestDelayDays: requestDelayDays ?? undefined,
      reminderEnabled: formData.get("reminderEnabled") !== null,
      reminderDelayDays: reminderDelayDays ?? undefined,
    };
  }

  if (section === "notifications") {
    const alertMode = String(formData.get("alertMode"));
    if (!(ALERT_MODES as readonly string[]).includes(alertMode)) {
      errors.alertMode = "Choose when to get review alerts.";
    }
    const alertEmail = optionalText(formData.get("alertEmail"));
    if (alertEmail && !EMAIL_PATTERN.test(alertEmail)) {
      errors.alertEmail = "Enter a valid email address.";
    }
    data = { alertMode: alertMode as AlertMode, alertEmail };
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data };
}

export type SenderInput = {
  senderName: string | null;
  replyToEmail: string | null;
};

/** Sender name and reply-to email, edited on the email sender settings page. */
export function parseSenderForm(
  formData: FormData,
):
  | { ok: true; data: SenderInput }
  | { ok: false; errors: Partial<Record<keyof SenderInput, string>> } {
  const errors: Partial<Record<keyof SenderInput, string>> = {};
  const senderName = optionalText(formData.get("senderName"));
  if (senderName && senderName.length > 80) {
    errors.senderName = "Use 80 characters or fewer.";
  }
  const replyToEmail = optionalText(formData.get("replyToEmail"));
  if (replyToEmail && !EMAIL_PATTERN.test(replyToEmail)) {
    errors.replyToEmail = "Enter a valid email address.";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { senderName, replyToEmail } };
}

export async function updateSender(domain: string, input: SenderInput) {
  const shop = await ensureShop(domain);
  return db.shopSettings.upsert({
    where: { shopId: shop.id },
    create: { shopId: shop.id, ...input },
    update: input,
  });
}
