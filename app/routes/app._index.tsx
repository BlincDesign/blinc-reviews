import { useEffect, useState, type ReactNode } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate, useRevalidator } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import db from "../db.server";
import {
  getDashboard,
  getProductCards,
} from "../features/dashboard/stats.server";
import { parseRange, RANGES } from "../features/dashboard/dashboard";
import {
  getThemeSetupStatus,
  themeEditorLinks,
} from "../features/setup/theme.server";
import { isDryRun } from "../features/requests/mailer.server";
import { hasSavedEmailSettings } from "../features/requests/email-settings.server";
import { resolvePlan } from "../features/billing/billing.server";
import { PLANS } from "../features/billing/plans";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const range = parseRange(new URL(request.url).searchParams.get("range"));

  const shop = { domain: session.shop };
  const [dashboard, theme, requestCount, emailSaved, imports, plan] =
    await Promise.all([
      getDashboard(session.shop, range),
      getThemeSetupStatus(admin).catch((error) => {
        console.error("[home] theme status failed", error);
        return null;
      }),
      db.reviewRequest.count({ where: { shop } }),
      hasSavedEmailSettings(admin).catch(() => false),
      db.importJob.count({ where: { shop, status: "COMPLETE" } }),
      resolvePlan(admin, session.shop),
    ]);
  const products = await getProductCards(admin, [
    ...dashboard.top.map((t) => t.productId),
    ...dashboard.recent.map((r) => r.productId),
  ]);

  return {
    range,
    dashboard,
    products,
    theme,
    hasRequests: requestCount > 0,
    emailSaved,
    hasImported: imports > 0,
    planName: PLANS[plan.plan ?? "free"].name,
    dryRun: isDryRun(),
    links: themeEditorLinks(session.shop, process.env.SHOPIFY_API_KEY || ""),
  };
};

// Layout helpers the Polaris components don't cover (two-up and five-up grids).
const HOME_CSS = `
.bh-header { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.bh-header__brand { display: flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 700; }
.bh-header__actions { margin-inline-start: auto; }
.bh-metric__value { font-size: 24px; font-weight: 700; line-height: 1.2; }
.bh-range { inline-size: 170px; }
.bh-metrics { display: grid; gap: 12px; grid-template-columns: repeat(5, minmax(0, 1fr)); }
.bh-status { display: grid; gap: 12px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.bh-two { display: grid; gap: 16px; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: stretch; }
.bh-promo { display: grid; grid-template-columns: 1fr 220px; min-height: 172px; }
.bh-promo__art { display: flex; align-items: center; justify-content: center; border-radius: 0 12px 12px 0; overflow: hidden; }
.bh-empty { display: grid; justify-items: center; gap: 12px; padding: 40px 16px; text-align: center; }
@media (max-width: 1000px) { .bh-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 760px) {
  .bh-status, .bh-two { grid-template-columns: 1fr; }
  .bh-promo { grid-template-columns: 1fr; }
  .bh-promo__art { display: none; }
}`;

// The Blinc "B" with a review star: same artwork as the App Store icon.
function Logo() {
  return (
    <svg width="36" height="36" viewBox="-40 -24 500 530" aria-hidden="true">
      <path
        fill="#111111"
        d="M346.5,179.82c.08-2.14.12-4.32.12-6.51,0-46.29-18.02-89.82-50.76-122.55S219.61,0,173.31,0c-24.18,0-47.57,4.88-69.53,14.51-21.21,9.3-40.09,22.57-56.11,39.42-.91.95-1.83,1.94-2.74,2.95C15.96,88.81,0,130.16,0,173.31v320.47h295.16c-.97-1.25-1.92-2.52-2.83-3.82-.39-.53-.76-1.06-1.11-1.59-1.45-2.15-2.79-4.33-3.96-6.49-7.03-12.81-10.75-27.34-10.75-42.01v-.55c.01-1.49.06-2.99.14-4.47H58.93V173.31c0-63.08,51.32-114.39,114.39-114.39,55.61,0,102.35,39.36,112.4,93-13.19-3.16-26.77-4.76-40.47-4.76h-6.53v58.91h6.53c14.37,0,28.37,2.63,41.6,7.8,14.05,5.48,26.7,13.59,37.61,24.1,22.68,21.75,35.17,51.05,35.17,82.49,0,8.34-.91,16.68-2.7,24.78l-1.73,7.82c2.82-.28,5.66-.42,8.52-.42,14.92,0,29.65,3.83,42.59,11.07,2.02,1.14,4.03,2.37,6,3.69l1.89-8.25c2.88-12.63,4.35-25.65,4.35-38.71,0-55.79-26.87-108.09-72.05-140.65Z"
      />
      <path
        fill="#FECE08"
        transform="translate(364.5 443) scale(0.74)"
        d="M0,-92 L21.6,-29.8 87.5,-28.4 35,11.3 54.1,74.4 0,37 -54.1,74.4 -35,11.3 -87.5,-28.4 -21.6,-29.8 Z"
      />
    </svg>
  );
}

function ConvertArt() {
  return (
    <svg viewBox="0 0 220 172" width="220" height="172" aria-hidden="true">
      <rect width="220" height="172" fill="#eef2ff" />
      <rect x="22" y="26" width="120" height="74" rx="10" fill="#fff" />
      <rect x="34" y="40" width="60" height="7" rx="3.5" fill="#c7d2fe" />
      <text x="34" y="70" fontSize="16" fill="#f59e0b">
        ★★★★★
      </text>
      <rect x="34" y="80" width="90" height="6" rx="3" fill="#e0e7ff" />
      <rect x="92" y="78" width="108" height="70" rx="10" fill="#4f46e5" />
      <text x="104" y="104" fontSize="14" fill="#fbbf24">
        ★★★★★
      </text>
      <rect x="104" y="114" width="80" height="6" rx="3" fill="#a5b4fc" />
      <rect x="104" y="126" width="56" height="6" rx="3" fill="#a5b4fc" />
    </svg>
  );
}

function CollectArt() {
  return (
    <svg viewBox="0 0 220 172" width="220" height="172" aria-hidden="true">
      <rect width="220" height="172" fill="#ecfdf5" />
      <rect x="30" y="34" width="128" height="96" rx="10" fill="#fff" />
      <path
        d="M30 44l64 42 64-42"
        stroke="#a7f3d0"
        strokeWidth="6"
        fill="none"
      />
      <circle cx="160" cy="44" r="24" fill="#059669" />
      <text x="146" y="51" fontSize="20" fill="#fff">
        ★
      </text>
      <rect x="120" y="112" width="80" height="34" rx="17" fill="#0f766e" />
      <text x="134" y="134" fontSize="13" fill="#fff">
        ★★★★★
      </text>
    </svg>
  );
}

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span
      role="img"
      aria-label={`${rating.toFixed(1)} out of 5`}
      style={{ color: "#f59e0b" }}
    >
      {"★".repeat(rounded)}
      <span style={{ color: "#d1d5db" }}>{"★".repeat(5 - rounded)}</span>
    </span>
  );
}

type Task = {
  done: boolean;
  title: string;
  description: string;
  action: { label: string; href: string; external?: boolean };
};

function SetupGuide({ tasks }: { tasks: Task[] }) {
  const completed = tasks.filter((t) => t.done).length;
  const firstOpen = tasks.findIndex((t) => !t.done);
  const [expanded, setExpanded] = useState(true);
  const [active, setActive] = useState(firstOpen);

  if (completed === tasks.length) return null;

  return (
    <s-section>
      <s-stack gap="base">
        <s-stack
          direction="inline"
          justifyContent="space-between"
          alignItems="center"
        >
          <s-stack direction="inline" gap="small-200" alignItems="center">
            <s-icon type="wand" />
            <s-text>
              {completed} of {tasks.length} tasks complete
            </s-text>
          </s-stack>
          <s-button
            variant="tertiary"
            icon={expanded ? "chevron-up" : "chevron-down"}
            accessibilityLabel={
              expanded ? "Collapse setup guide" : "Expand setup guide"
            }
            onClick={() => setExpanded(!expanded)}
          />
        </s-stack>
        {expanded ? (
          <>
            <s-stack gap="small-200">
              <s-heading>Setup guide</s-heading>
              <s-paragraph>
                Complete these steps to start collecting and showing reviews.
              </s-paragraph>
            </s-stack>
            <s-divider />
            <s-stack gap="small-200">
              {tasks.map((task, index) => {
                const open = index === active && !task.done;
                return (
                  <s-box
                    key={task.title}
                    padding="small"
                    borderRadius="base"
                    background={open ? "subdued" : "transparent"}
                  >
                    <s-stack gap="small-200">
                      <s-clickable onClick={() => setActive(index)}>
                        <s-stack
                          direction="inline"
                          gap="small-200"
                          alignItems="center"
                        >
                          <s-icon
                            type={
                              task.done
                                ? "check-circle-filled"
                                : "circle-dashed"
                            }
                            tone={task.done ? "success" : "auto"}
                          />
                          <s-text type={open ? "strong" : "generic"}>
                            {task.title}
                          </s-text>
                        </s-stack>
                      </s-clickable>
                      {open ? (
                        <s-box paddingInlineStart="large-200">
                          <s-stack gap="small-200">
                            <s-text>{task.description}</s-text>
                            <s-box>
                              <s-button
                                variant="primary"
                                href={task.action.href}
                                target={
                                  task.action.external ? "_blank" : undefined
                                }
                              >
                                {task.action.label}
                              </s-button>
                            </s-box>
                          </s-stack>
                        </s-box>
                      ) : null}
                    </s-stack>
                  </s-box>
                );
              })}
            </s-stack>
          </>
        ) : null}
      </s-stack>
    </s-section>
  );
}

function Metric({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: number | null;
}) {
  const trend =
    change === null
      ? "New"
      : change === 0
        ? "— 0%"
        : `${change > 0 ? "↑" : "↓"} ${Math.abs(change)}%`;
  return (
    <s-box border="base" borderRadius="base" padding="base">
      <s-stack gap="small-200">
        <s-text color="subdued">{label}</s-text>
        <s-stack direction="inline" gap="small-200" alignItems="center">
          <span className="bh-metric__value">{value}</span>
          <s-text color="subdued">{trend}</s-text>
        </s-stack>
      </s-stack>
    </s-box>
  );
}

function StatusCard({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <s-box border="base" borderRadius="base" padding="base">
      <s-stack direction="inline" gap="base" alignItems="center">
        <s-text type="strong">{label}</s-text>
        {children}
      </s-stack>
    </s-box>
  );
}

function PromoCard({
  title,
  text,
  primary,
  secondary,
  art,
}: {
  title: string;
  text: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  art: ReactNode;
}) {
  return (
    <s-section padding="none">
      <div className="bh-promo">
        <s-box padding="base">
          <s-stack gap="base">
            <s-heading>{title}</s-heading>
            <s-paragraph>{text}</s-paragraph>
            <s-stack direction="inline" gap="small-200">
              <s-button href={primary.href}>{primary.label}</s-button>
              <s-button href={secondary.href}>{secondary.label}</s-button>
            </s-stack>
          </s-stack>
        </s-box>
        <div className="bh-promo__art">{art}</div>
      </div>
    </s-section>
  );
}

function EmptyState({
  icon,
  text,
  action,
}: {
  icon: "product" | "star";
  text: string;
  action: { label: string; href: string };
}) {
  return (
    <div className="bh-empty">
      <s-icon type={icon} />
      <s-text color="subdued">{text}</s-text>
      <s-button href={action.href}>{action.label}</s-button>
    </div>
  );
}

const STATUS_TONE = {
  PENDING: "warning",
  PUBLISHED: "success",
  HIDDEN: "neutral",
  REJECTED: "critical",
  ARCHIVED: "neutral",
} as const;

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
function timeAgo(iso: string) {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, "hour");
  return relative.format(Math.round(hours / 24), "day");
}

export default function Index() {
  const {
    range,
    dashboard,
    products,
    theme,
    hasRequests,
    emailSaved,
    hasImported,
    planName,
    dryRun,
    links,
  } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { metrics } = dashboard;

  // Merchants add blocks in another tab; refresh when they come back.
  useEffect(() => {
    const onFocus = () => {
      if (revalidator.state === "idle") revalidator.revalidate();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [revalidator]);

  const tasks: Task[] = [
    {
      done: Boolean(theme?.starRating),
      title: "Show star ratings on product pages",
      description:
        "Adds stars and the review count under the product title. Click Save in the theme editor.",
      action: {
        label: "Add star rating",
        href: links.starRating,
        external: true,
      },
    },
    {
      done: Boolean(theme?.reviewsSection),
      title: "Add the reviews section",
      description:
        "Shows reviews, the rating breakdown and a Write a review button on product pages.",
      action: {
        label: "Add reviews section",
        href: links.reviewsSection,
        external: true,
      },
    },
    {
      done: Boolean(theme?.cardStars),
      title: "Show star ratings on collection pages",
      description:
        'Many themes (Dawn, Horizon and others) have a "Product rating" setting on product cards that shows Blinc ratings in the theme\'s style. For our star design on every card, turn on the Blinc Reviews app embed and click Save.',
      action: {
        label: "Turn on collection stars",
        href: links.cardStars,
        external: true,
      },
    },
    {
      done: emailSaved,
      title: "Customize your review request email",
      description:
        "Add your logo, colors and wording. Customers see this email a few days after their order is fulfilled.",
      action: { label: "Edit email", href: "/app/settings/email/request" },
    },
    {
      done: hasRequests,
      title: "Send a test review request",
      description:
        "See the email your customers get after their order is fulfilled.",
      action: { label: "Go to requests", href: "/app/requests" },
    },
    {
      // Optional: done once reviews are imported or the store already has reviews.
      done:
        hasImported || dashboard.publishedCount + dashboard.pendingCount > 0,
      title: "Import existing reviews (optional)",
      description:
        "Moving from Judge.me, Loox, Okendo, Yotpo or another app? Bring your reviews with you in a few clicks.",
      action: { label: "Import reviews", href: "/app/settings/import" },
    },
  ];

  const widgetsInstalled =
    Number(Boolean(theme?.starRating)) +
    Number(Boolean(theme?.reviewsSection)) +
    Number(Boolean(theme?.cardStars));
  const requestStatus =
    dashboard.requestChannel !== "APP"
      ? { tone: "warning" as const, label: "Not connected" }
      : dryRun
        ? { tone: "info" as const, label: "Test mode" }
        : { tone: "success" as const, label: "Requests enabled" };

  return (
    <s-page>
      <style dangerouslySetInnerHTML={{ __html: HOME_CSS }} />
      <s-stack gap="base">
        <div className="bh-header">
          <span className="bh-header__brand">
            <Logo /> Blinc Reviews
          </span>
          <s-link href="/app/settings/plan">
            <s-badge tone="info">{`${planName} plan`}</s-badge>
          </s-link>
          <span className="bh-header__actions">
            <s-button
              href="mailto:hello@blinc.design?subject=Blinc%20Reviews%20feedback"
              target="_blank"
            >
              Request a feature
            </s-button>
          </span>
        </div>

        <SetupGuide tasks={tasks} />

        <s-section>
          <s-stack gap="base">
            <s-stack
              direction="inline"
              justifyContent="space-between"
              alignItems="center"
              gap="base"
            >
              <s-heading>Welcome to Blinc Reviews</s-heading>
              <s-stack direction="inline" gap="small-200" alignItems="center">
                <div className="bh-range">
                  <s-select
                    label="Date range"
                    labelAccessibilityVisibility="exclusive"
                    onChange={(event) =>
                      navigate(`?range=${event.currentTarget.value}`)
                    }
                  >
                    {RANGES.map((days) => (
                      <s-option
                        key={days}
                        value={String(days)}
                        defaultSelected={days === range}
                      >
                        Last {days} days
                      </s-option>
                    ))}
                  </s-select>
                </div>
                <s-button href="/app/reviews">View reviews</s-button>
              </s-stack>
            </s-stack>

            <div className="bh-metrics">
              <Metric
                label="Reviews"
                value={String(metrics.reviews.value)}
                change={metrics.reviews.change}
              />
              <Metric
                label="Average rating"
                value={
                  metrics.averageRating.value
                    ? metrics.averageRating.value.toFixed(1)
                    : "0"
                }
                change={metrics.averageRating.change}
              />
              <Metric
                label="Requests sent"
                value={String(metrics.requestsSent.value)}
                change={metrics.requestsSent.change}
              />
              <Metric
                label="Verified buyers"
                value={`${metrics.verifiedRate.value}%`}
                change={metrics.verifiedRate.change}
              />
              <Metric
                label="Reply rate"
                value={`${metrics.replyRate.value}%`}
                change={metrics.replyRate.change}
              />
            </div>

            <s-text type="strong">Status</s-text>
            <div className="bh-status">
              <StatusCard label="Moderation">
                {dashboard.pendingCount > 0 ? (
                  <s-badge tone="warning">
                    {dashboard.pendingCount} to review
                  </s-badge>
                ) : (
                  <s-badge tone="success">You&apos;re all caught up!</s-badge>
                )}
              </StatusCard>
              <StatusCard label="Widgets">
                {widgetsInstalled === 3 ? (
                  <s-badge tone="success">Installed</s-badge>
                ) : widgetsInstalled > 0 ? (
                  <s-badge tone="warning">Partly installed</s-badge>
                ) : (
                  <s-badge tone="warning">Not installed</s-badge>
                )}
              </StatusCard>
              <StatusCard label="Requests">
                <s-badge tone={requestStatus.tone}>
                  {requestStatus.label}
                </s-badge>
              </StatusCard>
            </div>
          </s-stack>
        </s-section>

        <PromoCard
          title="Are your reviews helping shoppers buy?"
          text="Match your reviews to your brand with star shapes, colors and layouts, and show a rating breakdown that builds trust where it matters."
          primary={{ label: "Customize widgets", href: "/app/appearance" }}
          secondary={{ label: "Moderate reviews", href: "/app/reviews" }}
          art={<ConvertArt />}
        />
        <PromoCard
          title="Want more reviews? Ask at the right moment."
          text="Send a branded email after each order is fulfilled, with one-tap star ratings and a reminder for customers who haven't reviewed yet."
          primary={{ label: "Set up requests", href: "/app/requests" }}
          secondary={{ label: "Request settings", href: "/app/settings" }}
          art={<CollectArt />}
        />

        <div className="bh-two">
          <s-section heading="Top products">
            {dashboard.top.length === 0 ? (
              <EmptyState
                icon="product"
                text="Your most reviewed products will show here."
                action={{ label: "View all reviews", href: "/app/reviews" }}
              />
            ) : (
              <s-stack gap="base">
                {dashboard.top.map((item) => {
                  const product = products[item.productId];
                  return (
                    <s-stack
                      key={item.productId}
                      direction="inline"
                      gap="base"
                      alignItems="center"
                    >
                      <s-thumbnail
                        src={product?.image ?? undefined}
                        alt={product?.title ?? "Product"}
                        size="small"
                      />
                      <s-stack gap="small-300">
                        <s-text type="strong">
                          {product?.title ?? "Deleted product"}
                        </s-text>
                        <s-text color="subdued">
                          <Stars rating={item.average} />{" "}
                          {item.average.toFixed(1)} · {item.count} review
                          {item.count === 1 ? "" : "s"}
                        </s-text>
                      </s-stack>
                    </s-stack>
                  );
                })}
              </s-stack>
            )}
          </s-section>

          <s-section heading="Recent activity">
            {dashboard.recent.length === 0 ? (
              <EmptyState
                icon="star"
                text="New reviews will show here as customers submit them."
                action={{ label: "Request reviews", href: "/app/requests" }}
              />
            ) : (
              <s-stack gap="base">
                {dashboard.recent.map((review) => (
                  <s-stack
                    key={review.id}
                    direction="inline"
                    gap="base"
                    justifyContent="space-between"
                  >
                    <s-stack gap="small-300">
                      <s-text type="strong">
                        <Stars rating={review.rating} />{" "}
                        {review.title || review.authorName}
                      </s-text>
                      <s-text color="subdued">
                        {review.authorName} ·{" "}
                        {products[review.productId]?.title ?? "Product"} ·{" "}
                        {timeAgo(review.submittedAt)}
                      </s-text>
                    </s-stack>
                    <s-badge tone={STATUS_TONE[review.status]}>
                      {review.status.toLowerCase()}
                    </s-badge>
                  </s-stack>
                ))}
                <s-link href="/app/reviews">View all reviews</s-link>
              </s-stack>
            )}
          </s-section>
        </div>
      </s-stack>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
