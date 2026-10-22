// Widget design settings. Shared by the Appearance editor (client) and design.server.ts.
// Stored as JSON in an app-installation metafield (blinc.design) that theme blocks
// read in Liquid, so storefront styling needs no JavaScript.

export const STAR_SHAPES = ["star", "heart", "circle", "diamond"] as const;
export const CORNER_STYLES = ["sharp", "soft", "round"] as const;
export const SIZES = ["small", "medium", "large"] as const;
export const NAME_FORMATS = ["full", "first_initial", "initials"] as const;
export const BADGE_MODES = ["stars_text", "stars_only"] as const;
export const LAYOUTS = ["standard", "cards", "align", "carousel"] as const;
export const HEADER_THEMES = ["minimal", "standard", "sidebar"] as const;
export const RATING_STYLES = ["compact", "minimal", "bold"] as const;
export const SORTS = ["recent", "highest", "lowest", "photos", "photos_only"] as const;
export const PAGINATIONS = ["load_more", "pages"] as const;
export const IMAGE_STYLES = ["thumbnails", "highlight"] as const;
export const TEXT_LENGTHS = ["short", "medium", "long", "full"] as const;
export const VERIFIED_STYLES = ["badge", "text", "icon"] as const;
export const CAROUSEL_SPEED_MAX = 60;
export const CUSTOM_CSS_MAX = 2000;

export type StarShape = (typeof STAR_SHAPES)[number];
export type CornerStyle = (typeof CORNER_STYLES)[number];
export type Size = (typeof SIZES)[number];
export type NameFormat = (typeof NAME_FORMATS)[number];
export type BadgeMode = (typeof BADGE_MODES)[number];
export type Layout = (typeof LAYOUTS)[number];
export type HeaderTheme = (typeof HEADER_THEMES)[number];
export type RatingStyle = (typeof RATING_STYLES)[number];
export type Sort = (typeof SORTS)[number];
export type Pagination = (typeof PAGINATIONS)[number];
export type ImageStyle = (typeof IMAGE_STYLES)[number];
export type TextLength = (typeof TEXT_LENGTHS)[number];
export type VerifiedStyle = (typeof VERIFIED_STYLES)[number];

export type Design = {
  branding: {
    primaryColor: string;
    starColor: string;
    starShape: StarShape;
    corners: CornerStyle;
  };
  widget: {
    // Empty strings fall back to the store's language file / theme defaults.
    title: string;
    showTitle: boolean;
    noReviewsText: string;
    writeButtonText: string;
    replyAuthor: string;
    buttonColor: string;
    buttonTextColor: string;
    textColor: string;
    mutedTextColor: string;
    starSize: Size;
    textSize: Size;
    layout: Layout;
    showAvatar: boolean;
    perPage: number;
    // Widget header
    headerTheme: HeaderTheme;
    headerSize: Size;
    ratingStyle: RatingStyle;
    showMedia: boolean;
    showSortFilter: boolean;
    defaultSort: Sort;
    // Reviews section
    pagination: Pagination;
    carouselSpeed: number;
    imageStyle: ImageStyle;
    titleSize: Size;
    bodySize: Size;
    textLength: TextLength;
    verifiedStyle: VerifiedStyle;
    // Advanced
    customCss: string;
    nameFormat: NameFormat;
    showDate: boolean;
    showSource: boolean;
    showPolicy: boolean;
    policyText: string;
    showBreakdown: boolean;
    hideWhenEmpty: boolean;
  };
  badge: {
    mode: BadgeMode;
    textTemplate: string;
    starColor: string;
    starSize: Size;
    hideWhenEmpty: boolean;
  };
};

export const DEFAULT_DESIGN: Design = {
  branding: {
    primaryColor: "#111827",
    starColor: "#f59e0b",
    starShape: "star",
    corners: "soft",
  },
  widget: {
    title: "",
    showTitle: true,
    noReviewsText: "",
    writeButtonText: "",
    replyAuthor: "",
    buttonColor: "",
    buttonTextColor: "#ffffff",
    textColor: "",
    mutedTextColor: "",
    starSize: "medium",
    textSize: "medium",
    layout: "standard",
    showAvatar: true,
    perPage: 10,
    headerTheme: "standard",
    headerSize: "medium",
    ratingStyle: "compact",
    showMedia: true,
    showSortFilter: true,
    defaultSort: "recent",
    pagination: "load_more",
    carouselSpeed: 5,
    imageStyle: "thumbnails",
    titleSize: "medium",
    bodySize: "medium",
    textLength: "medium",
    verifiedStyle: "badge",
    customCss: "",
    nameFormat: "first_initial",
    showDate: true,
    showSource: true,
    showPolicy: true,
    policyText: "",
    showBreakdown: true,
    hideWhenEmpty: false,
  },
  badge: {
    mode: "stars_text",
    textTemplate: "",
    starColor: "",
    starSize: "medium",
    hideWhenEmpty: true,
  },
};

export const PER_PAGE_MIN = 3;
export const PER_PAGE_MAX = 20;

const HEX = /^#[0-9a-f]{6}$/i;

function color(value: unknown, fallback: string, optional = false) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (optional && trimmed === "") return "";
  return HEX.test(trimmed) ? trimmed.toLowerCase() : fallback;
}

function oneOf<T extends string>(
  value: unknown,
  options: readonly T[],
  fallback: T,
): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function bool(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function integer(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

/**
 * Merchant CSS is printed inside a <style> tag on the storefront. "<" is never needed
 * in CSS and is the only way out of that tag, so it is removed.
 */
function css(value: unknown) {
  return typeof value === "string"
    ? value.replace(/</g, "").trim().slice(0, CUSTOM_CSS_MAX)
    : "";
}

/** Fills gaps with defaults and drops anything invalid. Safe for untrusted input. */
export function normalizeDesign(input: unknown): Design {
  type Raw = Record<string, unknown>;
  const asObject = (value: unknown): Raw =>
    value && typeof value === "object" ? (value as Raw) : {};
  const raw = asObject(input);
  const b = asObject(raw.branding);
  const w = asObject(raw.widget);
  const g = asObject(raw.badge);
  const D = DEFAULT_DESIGN;
  const perPage = Number(w.perPage);

  return {
    branding: {
      primaryColor: color(b.primaryColor, D.branding.primaryColor),
      starColor: color(b.starColor, D.branding.starColor),
      starShape: oneOf(b.starShape, STAR_SHAPES, D.branding.starShape),
      corners: oneOf(b.corners, CORNER_STYLES, D.branding.corners),
    },
    widget: {
      title: text(w.title, 80),
      showTitle: bool(w.showTitle, D.widget.showTitle),
      noReviewsText: text(w.noReviewsText, 160),
      writeButtonText: text(w.writeButtonText, 40),
      replyAuthor: text(w.replyAuthor, 60),
      buttonColor: color(w.buttonColor, "", true),
      buttonTextColor: color(w.buttonTextColor, D.widget.buttonTextColor),
      textColor: color(w.textColor, "", true),
      mutedTextColor: color(w.mutedTextColor, "", true),
      starSize: oneOf(w.starSize, SIZES, D.widget.starSize),
      textSize: oneOf(w.textSize, SIZES, D.widget.textSize),
      layout: oneOf(w.layout, LAYOUTS, D.widget.layout),
      showAvatar: bool(w.showAvatar, D.widget.showAvatar),
      headerTheme: oneOf(w.headerTheme, HEADER_THEMES, D.widget.headerTheme),
      headerSize: oneOf(w.headerSize, SIZES, D.widget.headerSize),
      ratingStyle: oneOf(w.ratingStyle, RATING_STYLES, D.widget.ratingStyle),
      showMedia: bool(w.showMedia, D.widget.showMedia),
      showSortFilter: bool(w.showSortFilter, D.widget.showSortFilter),
      defaultSort: oneOf(w.defaultSort, SORTS, D.widget.defaultSort),
      pagination: oneOf(w.pagination, PAGINATIONS, D.widget.pagination),
      carouselSpeed: integer(w.carouselSpeed, 0, CAROUSEL_SPEED_MAX, D.widget.carouselSpeed),
      imageStyle: oneOf(w.imageStyle, IMAGE_STYLES, D.widget.imageStyle),
      titleSize: oneOf(w.titleSize, SIZES, D.widget.titleSize),
      bodySize: oneOf(w.bodySize, SIZES, D.widget.bodySize),
      textLength: oneOf(w.textLength, TEXT_LENGTHS, D.widget.textLength),
      verifiedStyle: oneOf(w.verifiedStyle, VERIFIED_STYLES, D.widget.verifiedStyle),
      customCss: css(w.customCss),
      perPage:
        Number.isInteger(perPage) &&
        perPage >= PER_PAGE_MIN &&
        perPage <= PER_PAGE_MAX
          ? perPage
          : D.widget.perPage,
      nameFormat: oneOf(w.nameFormat, NAME_FORMATS, D.widget.nameFormat),
      showDate: bool(w.showDate, D.widget.showDate),
      showSource: bool(w.showSource, D.widget.showSource),
      showPolicy: bool(w.showPolicy, D.widget.showPolicy),
      policyText: text(w.policyText, 800),
      showBreakdown: bool(w.showBreakdown, D.widget.showBreakdown),
      hideWhenEmpty: bool(w.hideWhenEmpty, D.widget.hideWhenEmpty),
    },
    badge: {
      mode: oneOf(g.mode, BADGE_MODES, D.badge.mode),
      textTemplate: text(g.textTemplate, 60),
      starColor: color(g.starColor, "", true),
      starSize: oneOf(g.starSize, SIZES, D.badge.starSize),
      hideWhenEmpty: bool(g.hideWhenEmpty, D.badge.hideWhenEmpty),
    },
  };
}

/** Same rules as the storefront: "Sarah Kim" → full / "Sarah K." / "S. K." */
export function formatName(name: string, format: NameFormat) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (format === "full") return parts.join(" ");
  if (format === "initials")
    return parts.map((p) => `${p[0].toUpperCase()}.`).join(" ");
  const [first, ...rest] = parts;
  return rest.length ? `${first} ${rest.at(-1)![0].toUpperCase()}.` : first;
}

/** Root classes of the reviews widget; blocks/reviews.liquid builds the same list. */
export function widgetClasses(w: Design["widget"]) {
  return [
    "blinc-reviews",
    `blinc-layout-${w.layout}`,
    `blinc-header-${w.headerTheme}`,
    `blinc-rating-style-${w.ratingStyle}`,
    `blinc-heading-${w.headerSize}`,
    `blinc-images-${w.imageStyle}`,
    `blinc-title-${w.titleSize}`,
    `blinc-body-${w.bodySize}`,
    `blinc-clamp-${w.textLength}`,
    `blinc-verified-${w.verifiedStyle}`,
    w.showAvatar ? "" : "blinc-no-avatar",
  ]
    .filter(Boolean)
    .join(" ");
}
