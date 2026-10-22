import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";

import { authenticate } from "../shopify.server";
import {
  planSelectionUrl,
  requestsSentThisMonth,
  resolvePlan,
} from "../features/billing/billing.server";
import { PLANS, type PlanId } from "../features/billing/plans";
import { ensureShop } from "../features/shops/shops.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const [status, shop] = await Promise.all([
    resolvePlan(admin, session.shop),
    ensureShop(session.shop),
  ]);
  return {
    plan: (status.plan ?? "free") as PlanId,
    trialEndsAt: status.trialEndsAt,
    cancelAtEndOfCycle: status.cancelAtEndOfCycle,
    billingEnabled: status.billingEnabled,
    used: await requestsSentThisMonth(shop.id),
    selectionUrl: planSelectionUrl(session.shop),
  };
};

const CSS = `
.bp-usage { height: 8px; border-radius: 999px; background: #ebebeb; overflow: hidden; }
.bp-usage > span { display: block; height: 100%; background: #303030; border-radius: inherit; }
.bp-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.bp-card { padding: 18px; border-radius: 12px; background: #fff; box-shadow: 0 0 0 1px rgba(26,26,26,.12); display: flex; flex-direction: column; gap: 10px; }
.bp-action { margin-top: auto; padding-top: 6px; }
@media (max-width: 900px) { .bp-grid { grid-template-columns: 1fr; } }
.bp-card[data-current="true"] { box-shadow: 0 0 0 2px #303030; }
.bp-price { margin: 0; font-size: 20px; font-weight: 700; color: #303030; }
.bp-list { margin: 0; padding-inline-start: 18px; display: grid; gap: 6px; font-size: 13px; color: #303030; }`;

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export default function PlanSettings() {
  const {
    plan,
    trialEndsAt,
    cancelAtEndOfCycle,
    billingEnabled,
    used,
    selectionUrl,
  } = useLoaderData<typeof loader>();
  const current = PLANS[plan];
  const limit = current.features.requestsPerMonth;
  const unlimited = !Number.isFinite(limit);
  const percent = unlimited ? 0 : Math.min(100, (used / limit) * 100);

  return (
    <s-stack gap="base">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {billingEnabled ? null : (
        <s-banner tone="info" heading="Billing isn't connected yet">
          Plans come from Shopify App Pricing in the Partner Dashboard. Until
          it&apos;s set up, this store uses the {current.name} plan for testing.
        </s-banner>
      )}

      <s-section heading="Your plan">
        <s-stack gap="base">
          <s-stack direction="inline" gap="small-200" alignItems="center">
            <s-text type="strong">{current.name}</s-text>
            <s-badge tone="success">Active</s-badge>
            {trialEndsAt && new Date(trialEndsAt) > new Date() ? (
              <s-badge tone="info">
                {`Trial ends ${dateFormat.format(new Date(trialEndsAt))}`}
              </s-badge>
            ) : null}
            {cancelAtEndOfCycle ? (
              <s-badge tone="warning">Ends this billing cycle</s-badge>
            ) : null}
          </s-stack>
          <s-stack gap="small-200">
            <s-text>
              {unlimited
                ? `${used} review requests sent this month (unlimited)`
                : `${used} of ${limit} review requests sent this month`}
            </s-text>
            {unlimited ? null : (
              <div className="bp-usage" aria-hidden>
                <span style={{ width: `${percent}%` }} />
              </div>
            )}
          </s-stack>
          {billingEnabled ? (
            <s-stack direction="inline">
              <s-button variant="primary" href={selectionUrl} target="_top">
                Change plan
              </s-button>
            </s-stack>
          ) : null}
        </s-stack>
      </s-section>

      <s-section heading="Plans">
        <s-stack gap="base">
          <div className="bp-grid">
            {Object.values(PLANS).map((p) => (
              <div className="bp-card" key={p.id} data-current={p.id === plan}>
                <s-stack direction="inline" gap="small-200" alignItems="center">
                  <s-text type="strong">{p.name}</s-text>
                  {p.id === plan ? <s-badge>Current plan</s-badge> : null}
                </s-stack>
                <p className="bp-price">{p.price}</p>
                <ul className="bp-list">
                  {p.highlights.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <div className="bp-action">
                  {p.id === plan ? (
                    <s-button disabled>Current plan</s-button>
                  ) : billingEnabled ? (
                    // Plan changes happen on Shopify's hosted page (outside the iframe).
                    <s-button
                      variant={p.id === "free" ? "secondary" : "primary"}
                      href={selectionUrl}
                      target="_top"
                    >
                      {`Choose ${p.name}`}
                    </s-button>
                  ) : (
                    <s-button disabled>{`Choose ${p.name}`}</s-button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <s-text color="subdued">
            Paid plans include a 14-day free trial. Billing is handled by
            Shopify and appears on your Shopify invoice.
          </s-text>
        </s-stack>
      </s-section>
    </s-stack>
  );
}
