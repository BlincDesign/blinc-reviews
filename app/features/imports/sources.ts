// Shared by the import page (client) and the import server code.
// Logos live in public/import-logos/ (use each company's official assets). The
// monogram and color are the fallback when a logo file is missing.

export const IMPORT_SOURCES = [
  {
    id: "judgeme",
    name: "Judge.me",
    logo: "/import-logos/judge_me_2025.png",
    mark: "J",
    color: "#108474",
    export: "In Judge.me, go to Reviews → Export and download the CSV.",
  },
  {
    id: "loox",
    name: "Loox",
    logo: "/import-logos/loox.png",
    mark: "Lx",
    color: "#000000",
    export: "In Loox, go to Reviews → Export reviews and download the CSV.",
  },
  {
    id: "yotpo",
    name: "Yotpo",
    logo: "/import-logos/yotpo.png",
    mark: "Yo",
    color: "#1851e8",
    export:
      "In Yotpo, go to Reviews → Moderation → Export and download the CSV.",
  },
  {
    id: "okendo",
    name: "Okendo",
    logo: "/import-logos/okendo.png",
    mark: "Ok",
    color: "#0b2d2a",
    export: "In Okendo, go to Reviews → Export and download the CSV.",
  },
  {
    id: "stamped",
    name: "Stamped",
    logo: "/import-logos/stamped_io.png",
    mark: "St",
    color: "#f2a900",
    export: "In Stamped, go to Reviews → Export and download the CSV.",
  },
  {
    id: "reviewsio",
    name: "Reviews.io",
    logo: "/import-logos/reviews_io.png",
    mark: "Ri",
    color: "#12263f",
    export:
      "In Reviews.io, go to Product reviews → Export and download the CSV.",
  },
  {
    id: "air",
    name: "Air Reviews",
    logo: "/import-logos/air_reviews.png",
    mark: "Ai",
    color: "#1e2a5a",
    export:
      "In Air Reviews, go to Manage reviews → Export and download the CSV.",
  },
  {
    id: "klaviyo",
    name: "Klaviyo Reviews",
    logo: "/import-logos/klaviyo_reviews.png",
    mark: "K",
    color: "#232426",
    export: "In Klaviyo, go to Reviews → Export reviews and download the CSV.",
  },
  {
    id: "areviews",
    name: "Areviews",
    logo: "/import-logos/areviews.png",
    mark: "Ar",
    color: "#6b6b8a",
    export: "In Areviews, go to Reviews → Export and download the CSV.",
  },
  {
    id: "shopify",
    name: "Shopify Product Reviews (old app)",
    logo: "/import-logos/shopify.png",
    mark: "S",
    color: "#5e8e3e",
    export:
      "Use the CSV you exported from Shopify's discontinued Product Reviews app.",
  },
  {
    id: "other",
    name: "Another app",
    logo: null,
    mark: "+",
    color: "#6b7280",
    export: "Export your reviews as a CSV from your current app.",
  },
  {
    id: "blinc",
    name: "Another store using Blinc Reviews",
    logo: "/import-logos/shopify.png",
    mark: "B",
    color: "#4f46e5",
    export:
      "In your other store, open Blinc Reviews → Reviews → Export CSV. Products are matched by handle, so use the same handles in both stores.",
  },
  {
    id: "spreadsheet",
    name: "Spreadsheet",
    logo: "/import-logos/spreadsheet.png",
    mark: "≡",
    color: "#0f9d58",
    export: "Download our template, add your reviews, and save it as CSV.",
  },
] as const;

export type ImportSourceId = (typeof IMPORT_SOURCES)[number]["id"];

export const STATUS_MODES = [
  { id: "file", label: "Use the status in the file (Published if not set)" },
  { id: "publish", label: "Publish all imported reviews" },
  { id: "pending", label: "Import all as Pending for review" },
] as const;

export type StatusMode = (typeof STATUS_MODES)[number]["id"];

export const ENCODINGS = [
  { id: "auto", label: "Detect automatically" },
  { id: "utf-8", label: "Unicode (UTF-8)" },
  { id: "windows-1252", label: "Western (Windows-1252, older Excel)" },
] as const;

export type EncodingId = (typeof ENCODINGS)[number]["id"];

export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;
