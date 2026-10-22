// Moderation filters for new reviews. Pure, shared by the storefront submit and
// the settings page (list parsing).

export type ModerationRules = {
  holdProfanity: boolean;
  holdContactInfo: boolean;
  blockedWords: string[];
  blockedEmails: string[];
};

// Common English profanity. Merchants add their own (any language) as blocked words.
const PROFANITY = new Set([
  "anal",
  "anus",
  "arse",
  "arsehole",
  "asshole",
  "bastard",
  "bitch",
  "bitches",
  "blowjob",
  "bollocks",
  "boner",
  "bullshit",
  "clit",
  "cock",
  "cocks",
  "crap",
  "cunt",
  "cunts",
  "dick",
  "dickhead",
  "dildo",
  "dyke",
  "fag",
  "faggot",
  "fuck",
  "fucked",
  "fucker",
  "fuckers",
  "fucking",
  "fucks",
  "goddamn",
  "jerkoff",
  "jizz",
  "motherfucker",
  "motherfucking",
  "nigga",
  "nigger",
  "penis",
  "piss",
  "pissed",
  "porn",
  "prick",
  "pussy",
  "retard",
  "retarded",
  "scumbag",
  "shit",
  "shits",
  "shitty",
  "slut",
  "sluts",
  "twat",
  "vagina",
  "wank",
  "wanker",
  "whore",
]);

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
};

const URL =
  /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|io|co|shop|store|info|biz|xyz|ru|cn|me|link|site|online)\b/i;
const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
// 9+ digits with common separators, e.g. +1 (555) 123-4567.
const PHONE = /(?:\+?\d[\s().-]*){9,}/;

function words(text: string) {
  return text
    .toLowerCase()
    .replace(/[013457@$]/g, (c) => LEET[c] ?? c)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** Comma or newline separated input to a clean, lowercase, deduplicated list. */
export function parseList(input: string, max = 200) {
  return [
    ...new Set(
      input
        .split(/[\n,]/)
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item && item.length <= 100),
    ),
  ].slice(0, max);
}

/**
 * Reasons to hold a review for moderation, as review tags. Empty = no reason.
 * Blocked words match whole words or phrases, case-insensitive.
 */
export function moderationFlags(text: string, rules: ModerationRules) {
  const flags: string[] = [];
  const tokens = words(text);
  const joined = ` ${tokens.join(" ")} `;

  if (rules.holdProfanity && tokens.some((w) => PROFANITY.has(w))) {
    flags.push("profanity");
  }
  if (
    rules.blockedWords.some((entry) => {
      const phrase = words(entry).join(" ");
      return phrase && joined.includes(` ${phrase} `);
    })
  ) {
    flags.push("blocked word");
  }
  if (
    rules.holdContactInfo &&
    (URL.test(text) || EMAIL.test(text) || PHONE.test(text))
  ) {
    flags.push("contact info");
  }
  return flags;
}

/** Exact email or "@domain.com" entry (subdomains included). */
export function isBlockedEmail(email: string, blocked: string[]) {
  const address = email.toLowerCase();
  const domain = address.split("@")[1] ?? "";
  return blocked.some((entry) =>
    entry.startsWith("@")
      ? domain === entry.slice(1) || domain.endsWith(`.${entry.slice(1)}`)
      : address === entry,
  );
}
