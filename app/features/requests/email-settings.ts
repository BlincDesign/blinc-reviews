import { WESTERN } from "../i18n/email-strings";

// Email template settings. Shared by the editors (client) and the senders (server).
// Stored as JSON in an app-installation metafield (blinc.email).

export type RequestCopy = {
  subject: string;
  /** Inbox preview text shown after the subject. */
  preheader: string;
  heading: string;
  body: string;
  /** Shown instead of the stars when they're turned off. */
  button: string;
};

export type ReplyCopy = {
  enabled: boolean;
  subject: string;
  preheader: string;
  heading: string;
  body: string;
  replyLabel: string;
};

export type ConfirmCopy = {
  enabled: boolean;
  subject: string;
  preheader: string;
  heading: string;
  body: string;
  button: string;
};

export type EmailSettings = {
  /** https image URL (e.g. from Content > Files). Empty: the store name as text. */
  logoUrl: string;
  logoWidth: number;
  /** Empty: the reviews widget button color. */
  accentColor: string;
  backgroundColor: string;
  showStars: boolean;
  showHelpText: boolean;
  showImages: boolean;
  /** "If there were issues… reach out to us" line linking to the reply-to email. */
  showContact: boolean;
  signOff: string;
  /** Extra line above the unsubscribe link (e.g. the store's address). */
  footer: string;
  initial: RequestCopy;
  reminder: RequestCopy;
  reply: ReplyCopy;
  confirm: ConfirmCopy;
};

export type EmailKind = "initial" | "reminder" | "reply" | "confirm";

export const REQUEST_VARIABLES = [
  "{first_name}",
  "{shop_name}",
  "{order_name}",
];
/** Variables for emails about a review (reply notification, confirmation). */
export const REVIEW_VARIABLES = [
  "{first_name}",
  "{shop_name}",
  "{product_title}",
];
export const LOGO_WIDTH_MIN = 60;
export const LOGO_WIDTH_MAX = 240;
export const COPY_LIMITS = {
  subject: 150,
  preheader: 150,
  heading: 120,
  body: 1500,
  button: 40,
  replyLabel: 120,
  signOff: 120,
  footer: 300,
};

// The English strings are the defaults; customers in other languages get the
// translated default for any text the merchant hasn't changed (i18n.ts).
const EN = WESTERN.en;

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  logoUrl: "",
  logoWidth: 120,
  accentColor: "",
  backgroundColor: "#e5e5e5",
  showStars: true,
  showHelpText: true,
  showImages: true,
  showContact: true,
  signOff: EN.signOff,
  footer: "",
  initial: { ...EN.initial },
  reminder: { ...EN.reminder },
  reply: { enabled: true, ...EN.reply },
  confirm: { enabled: true, ...EN.confirm },
};

const HEX = /^#[0-9a-f]{6}$/i;
// Only https images: email clients block or warn on anything else.
const IMAGE_URL = /^https:\/\/[^\s"'<>]+$/i;

type Raw = Record<string, unknown>;
const asRecord = (value: unknown) =>
  (value && typeof value === "object" ? value : {}) as Raw;

function text(value: unknown, max: number, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().slice(0, max);
  return trimmed || fallback;
}

function bool(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function requestCopy(value: unknown, fallback: RequestCopy): RequestCopy {
  const raw = asRecord(value);
  return {
    subject: text(raw.subject, COPY_LIMITS.subject, fallback.subject),
    preheader: text(raw.preheader, COPY_LIMITS.preheader, fallback.preheader),
    heading: text(raw.heading, COPY_LIMITS.heading, fallback.heading),
    body: text(raw.body, COPY_LIMITS.body, fallback.body),
    button: text(raw.button, COPY_LIMITS.button, fallback.button),
  };
}

function replyCopy(value: unknown, fallback: ReplyCopy): ReplyCopy {
  const raw = asRecord(value);
  return {
    enabled: bool(raw.enabled, fallback.enabled),
    subject: text(raw.subject, COPY_LIMITS.subject, fallback.subject),
    preheader: text(raw.preheader, COPY_LIMITS.preheader, fallback.preheader),
    heading: text(raw.heading, COPY_LIMITS.heading, fallback.heading),
    body: text(raw.body, COPY_LIMITS.body, fallback.body),
    replyLabel: text(
      raw.replyLabel,
      COPY_LIMITS.replyLabel,
      fallback.replyLabel,
    ),
  };
}

function confirmCopy(value: unknown, fallback: ConfirmCopy): ConfirmCopy {
  const raw = asRecord(value);
  return {
    enabled: bool(raw.enabled, fallback.enabled),
    subject: text(raw.subject, COPY_LIMITS.subject, fallback.subject),
    preheader: text(raw.preheader, COPY_LIMITS.preheader, fallback.preheader),
    heading: text(raw.heading, COPY_LIMITS.heading, fallback.heading),
    body: text(raw.body, COPY_LIMITS.body, fallback.body),
    button: text(raw.button, COPY_LIMITS.button, fallback.button),
  };
}

/** Fills gaps with defaults and drops anything invalid. Safe for untrusted input. */
export function normalizeEmailSettings(input: unknown): EmailSettings {
  const raw = asRecord(input);
  const D = DEFAULT_EMAIL_SETTINGS;
  const width = Number(raw.logoWidth);
  const logoUrl = typeof raw.logoUrl === "string" ? raw.logoUrl.trim() : "";
  const color = (value: unknown, fallback: string) =>
    typeof value === "string" && HEX.test(value.trim())
      ? value.trim().toLowerCase()
      : fallback;

  return {
    logoUrl: IMAGE_URL.test(logoUrl) && logoUrl.length <= 500 ? logoUrl : "",
    logoWidth:
      Number.isInteger(width) &&
      width >= LOGO_WIDTH_MIN &&
      width <= LOGO_WIDTH_MAX
        ? width
        : D.logoWidth,
    accentColor: color(raw.accentColor, ""),
    backgroundColor: color(raw.backgroundColor, D.backgroundColor),
    showStars: bool(raw.showStars, D.showStars),
    showHelpText: bool(raw.showHelpText, D.showHelpText),
    showImages: bool(raw.showImages, D.showImages),
    showContact: bool(raw.showContact, D.showContact),
    // Empty is allowed: no sign-off line.
    signOff:
      typeof raw.signOff === "string"
        ? raw.signOff.trim().slice(0, COPY_LIMITS.signOff)
        : D.signOff,
    footer:
      typeof raw.footer === "string"
        ? raw.footer.trim().slice(0, COPY_LIMITS.footer)
        : "",
    initial: requestCopy(raw.initial, D.initial),
    reminder: requestCopy(raw.reminder, D.reminder),
    reply: replyCopy(raw.reply, D.reply),
    confirm: confirmCopy(raw.confirm, D.confirm),
  };
}

/**
 * Replaces {variables}. Without a first name, a leading "{first_name}, " (subject
 * style) is dropped and other uses get `friend` ("there"; "" in many languages).
 * Tidies only the gaps left by empty values ("Hi ," → "Hi,", "Olá, !" → "Olá!"),
 * so spacing a language needs (French " ?") is kept.
 */
export function fillVariables(
  template: string,
  values: Record<string, string | null | undefined>,
  friend = "there",
) {
  const GAP = "\u0000";
  let text = template;
  const unnamed = "first_name" in values && !values.first_name;
  const leading = /^\{first_name\}\s*[,，、]\s*/;
  const dropLeading = unnamed && leading.test(text);
  if (dropLeading) text = text.replace(leading, "");
  text = text
    .replace(/\{(\w+)\}/g, (match, name: string) =>
      name in values
        ? values[name] || (name === "first_name" ? friend : "") || GAP
        : match,
    )
    // An empty value before punctuation takes its space and a comma with it.
    .replace(/[,，]?[  ]*\u0000(?=[.,!?:])/g, "")
    .replace(/ ?\u0000 ?/g, " ")
    .replace(/ {2,}/g, " ");
  // "¿qué tal…" → "¿Qué tal…": capitalize the first letter, after any opening mark.
  return dropLeading ? text.replace(/\p{L}/u, (c) => c.toUpperCase()) : text;
}

/** Email branding (logo and colors) is a paid feature: Free sends the defaults. */
export function applyBrandingAccess(
  settings: EmailSettings,
  allowed: boolean,
): EmailSettings {
  if (allowed) return settings;
  const D = DEFAULT_EMAIL_SETTINGS;
  return {
    ...settings,
    logoUrl: D.logoUrl,
    logoWidth: D.logoWidth,
    accentColor: D.accentColor,
    backgroundColor: D.backgroundColor,
  };
}
