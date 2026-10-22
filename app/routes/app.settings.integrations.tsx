import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import {
  getSettings,
  updateSettings,
} from "../features/settings/settings.server";
import { featuresForShop } from "../features/billing/billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const settings = await getSettings(session.shop);
  return {
    flowAllowed: (await featuresForShop(settings.shopId)).flow,
    flowEnabled: settings.flowEnabled,
    requestsViaFlow: settings.requestChannel === "FLOW",
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  if (form.get("integration") !== "flow") {
    return { ok: false, message: "Unknown integration." };
  }
  const enabled = form.get("enabled") === "true";
  await updateSettings(session.shop, { flowEnabled: enabled });
  return {
    ok: true,
    message: enabled ? "Shopify Flow turned on" : "Shopify Flow turned off",
  };
};

type Status =
  | { kind: "toggle"; enabled: boolean }
  | { kind: "upgrade"; plan: string }
  | { kind: "soon" };

type Integration = {
  id: string;
  name: string;
  category: string;
  description: string;
  /** Official logo in public/import-logos. */
  logo: string;
  status: Status;
};

const CSS = `
.bi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.bi-card { display: flex; gap: 14px; padding: 18px; background: #fff; border-radius: 12px; box-shadow: 0 1px 0 rgba(26,26,26,.07), 0 0 0 1px rgba(26,26,26,.08); }
.bi-logo { flex: none; width: 48px; height: 48px; border-radius: 10px; object-fit: contain; background: #fff; box-shadow: 0 0 0 1px rgba(26,26,26,.08); padding: 4px; box-sizing: border-box; }
.bi-body { display: grid; gap: 8px; align-content: start; min-width: 0; }
.bi-head { display: flex; justify-content: space-between; align-items: start; gap: 8px; }
.bi-name { margin: 0; font-weight: 650; font-size: 14px; color: #303030; }
.bi-desc { margin: 0; font-size: 13px; line-height: 1.45; color: #616161; }`;

function IntegrationCard({ item }: { item: Integration }) {
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const { status } = item;
  // Optimistic: show the new state while the save is in flight.
  const pending = fetcher.formData?.get("enabled");
  const enabled =
    status.kind === "toggle"
      ? pending !== undefined && pending !== null
        ? pending === "true"
        : status.enabled
      : false;

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data)
      shopify.toast.show(fetcher.data.message, { isError: !fetcher.data.ok });
  }, [fetcher.state, fetcher.data, shopify]);

  return (
    <div className="bi-card">
      <img className="bi-logo" src={item.logo} alt="" width={48} height={48} />
      <div className="bi-body">
        <div className="bi-head">
          <p className="bi-name">{item.name}</p>
          {status.kind === "toggle" ? (
            <s-switch
              accessibilityLabel={`${item.name} ${enabled ? "on" : "off"}`}
              checked={enabled}
              disabled={fetcher.state !== "idle"}
              onChange={() =>
                fetcher.submit(
                  { integration: item.id, enabled: String(!enabled) },
                  { method: "post" },
                )
              }
            />
          ) : null}
        </div>
        <s-stack direction="inline" gap="small-200">
          <s-badge>{item.category}</s-badge>
          {status.kind === "toggle" ? (
            <s-badge tone={enabled ? "success" : undefined}>
              {enabled ? "On" : "Off"}
            </s-badge>
          ) : status.kind === "upgrade" ? (
            <s-badge tone="info">{`${status.plan} plan`}</s-badge>
          ) : (
            <s-badge>Coming soon</s-badge>
          )}
        </s-stack>
        <p className="bi-desc">{item.description}</p>
        {status.kind === "upgrade" ? (
          <s-link href="/app/settings/plan">See plans</s-link>
        ) : null}
      </div>
    </div>
  );
}

export default function IntegrationsSettings() {
  const { flowAllowed, flowEnabled, requestsViaFlow } =
    useLoaderData<typeof loader>();

  const items: Integration[] = [
    {
      id: "flow",
      name: "Shopify Flow",
      category: "Automation and workflows",
      description: requestsViaFlow
        ? "Start workflows when reviews are submitted or published. Review requests are sent by your Flow workflows."
        : "Start workflows when reviews are submitted or published: tag customers, alert your team or reward reviewers.",
      logo: "/import-logos/shopify_flow.png",
      status: flowAllowed
        ? { kind: "toggle", enabled: flowEnabled }
        : { kind: "upgrade", plan: "Business" },
    },
    {
      id: "klaviyo",
      name: "Klaviyo",
      category: "Email and SMS",
      description:
        "Send review requests and review events to Klaviyo flows. Until then, use the Review request due Flow trigger with Klaviyo.",
      logo: "/import-logos/klaviyo.png",
      status: { kind: "soon" },
    },
    {
      id: "google",
      name: "Google Shopping",
      category: "Review syndication",
      description:
        "Show your star ratings in Google Shopping ads and free product listings.",
      logo: "/import-logos/google_shopping.png",
      status: { kind: "soon" },
    },
  ];

  return (
    <s-section heading="Integrations">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <s-stack gap="base">
        <s-text color="subdued">
          Connect Blinc Reviews with the tools you already use.
        </s-text>
        <div className="bi-grid">
          {items.map((item) => (
            <IntegrationCard key={item.id} item={item} />
          ))}
        </div>
      </s-stack>
    </s-section>
  );
}
