// Plans and what each one unlocks. Prices and trials live in the Partner Dashboard
// (Shopify App Pricing); keep the plan handles there containing "pro" / "business".
// Shared by the server (enforcement) and the Plan page.

export type PlanId = "free" | "pro" | "business";

export type PlanFeatures = {
  /** First-time review request emails per calendar month. */
  requestsPerMonth: number;
  /** Reminder email when there's no review. */
  reminders: boolean;
  /** Logo, colors, sign-off and footer in customer emails. */
  emailBranding: boolean;
  /** Shopify Flow triggers. */
  flow: boolean;
};

export type Plan = {
  id: PlanId;
  name: string;
  /** Display only; the charge comes from the Partner Dashboard plan. */
  price: string;
  features: PlanFeatures;
  highlights: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    price: "$0",
    features: {
      requestsPerMonth: 50,
      reminders: false,
      emailBranding: false,
      flow: false,
    },
    highlights: [
      "Unlimited reviews and photo reviews",
      "50 review requests a month",
      "Star ratings on product and collection pages",
      "Google rich snippets",
      "Import from other review apps",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: "$15/month",
    features: {
      requestsPerMonth: 1000,
      reminders: true,
      emailBranding: true,
      flow: false,
    },
    highlights: [
      "Everything in Free",
      "1,000 review requests a month",
      "Reminder emails",
      "Your logo and colors in emails",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    price: "$49/month",
    features: {
      requestsPerMonth: Number.POSITIVE_INFINITY,
      reminders: true,
      emailBranding: true,
      flow: true,
    },
    highlights: [
      "Everything in Pro",
      "Unlimited review requests",
      "Shopify Flow triggers",
      "Priority support",
    ],
  },
};

/** Maps a Shopify App Pricing plan/item handle to our plan. */
export function planFromHandle(handle: string | null | undefined): PlanId {
  const value = (handle ?? "").toLowerCase();
  if (value.includes("business")) return "business";
  if (value.includes("pro")) return "pro";
  return "free";
}

export function isPlanId(value: string): value is PlanId {
  return value === "free" || value === "pro" || value === "business";
}
