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

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  logoUrl: "",
  logoWidth: 120,
  accentColor: "",
  backgroundColor: "#e5e5e5",
  showStars: true,
  showHelpText: true,
  showImages: true,
  showContact: true,
  signOff: "Thanks! — The {shop_name} team",
  footer: "",
  initial: {
    subject: "{first_name}, how was your order {order_name}?",
    preheader: "We'd love your feedback on your recent order",
    heading: "Let us know what you think",
    body: "Hi {first_name},\n\nWe hope you're enjoying your order from {shop_name}. If you have any thoughts on your purchase, we'd love to hear them. Your feedback helps us and future shoppers. It only takes a minute!",
    button: "Write a review",
  },
  reminder: {
    subject: "{first_name}, just a quick reminder",
    preheader: "We'd appreciate your feedback on your recent order",
    heading: "A quick review helps us and other shoppers",
    body: "Hi {first_name},\n\nJust checking in to see how things are going with your purchase from {shop_name}. If you'd like to share your thoughts, we'd love your review. It helps others and only takes a minute!",
    button: "Write a review",
  },
  reply: {
    enabled: true,
    subject: "{first_name}, your review just got a reply",
    preheader: "{shop_name} replied to your recent review.",
    heading: "Your review got a reply!",
    body: "Hi {first_name},\n\nThanks for leaving a review for {product_title}. Your review:",
    replyLabel: "Here's the reply from {shop_name}:",
  },
  confirm: {
    enabled: true,
    subject: "{first_name}, please confirm your review",
    preheader: "Confirm it was you who wrote the review.",
    heading: "Please confirm your review",
    body: "Hi {first_name},\n\nThanks for submitting your review for {product_title}. To help keep our reviews authentic and useful for other shoppers, please confirm that it was you who wrote it.\n\nYour review:",
    button: "Confirm my review",
  },
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

/** Replaces {variables}; {first_name} falls back to "there". Tidies gaps left by empty ones. */
export function fillVariables(
  template: string,
  values: Record<string, string | null | undefined>,
) {
  return template
    .replace(/\{(\w+)\}/g, (match, name: string) =>
      name in values
        ? values[name] || (name === "first_name" ? "there" : "")
        : match,
    )
    .replace(/ +([.,!?])/g, "$1")
    .replace(/ {2,}/g, " ");
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
