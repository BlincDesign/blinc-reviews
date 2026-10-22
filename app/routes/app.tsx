import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";
import {
  planSelectionUrl,
  resolvePlan,
} from "../features/billing/billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session, redirect } = await authenticate.admin(request);

  // Every merchant picks a plan (Free included) on Shopify's hosted page. The
  // welcome link after approval carries plan_handle: re-check right away.
  const url = new URL(request.url);
  const { plan } = await resolvePlan(admin, session.shop, {
    force: url.searchParams.has("plan_handle"),
  });
  if (plan === null) {
    return redirect(planSelectionUrl(session.shop), { target: "_top" });
  }

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/reviews">Reviews</s-link>
        <s-link href="/app/questions">Questions</s-link>
        <s-link href="/app/requests">Requests</s-link>
        <s-link href="/app/appearance">Appearance</s-link>
        <s-link href="/app/settings">Settings</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
