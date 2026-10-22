import { useEffect, useRef } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import {
  buildRequestEmail,
  cancelRequest,
  listRequests,
  sendNow,
  sendTestRequest,
} from "../features/requests/requests.server";
import { isDryRun } from "../features/requests/mailer.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const data = await listRequests(session.shop);
  return {
    ...data,
    dryRun: isDryRun(),
    requests: data.requests.map((r) => ({
      ...r,
      itemCount: Array.isArray(r.items) ? r.items.length : 0,
      items: undefined,
      scheduledAt: r.scheduledAt.toISOString(),
      sentAt: r.sentAt?.toISOString() ?? null,
      openedAt: r.openedAt?.toISOString() ?? null,
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
    })),
  };
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));
  const id = String(form.get("id") ?? "");

  try {
    if (intent === "preview") {
      const { email } = await buildRequestEmail(id, "initial");
      return { ok: true as const, message: "", preview: email.html };
    }
    if (intent === "send") {
      const ok = await sendNow(session.shop, id);
      return {
        ok,
        message: ok ? "Request sent" : "This request can't be sent",
        preview: null,
      };
    }
    if (intent === "cancel") {
      const ok = await cancelRequest(session.shop, id);
      return {
        ok,
        message: ok ? "Request cancelled" : "This request can't be cancelled",
        preview: null,
      };
    }
    if (intent === "test") {
      const to = String(form.get("email") ?? "").trim();
      if (!EMAIL_PATTERN.test(to)) {
        return {
          ok: false as const,
          message: "Enter a valid email address",
          preview: null,
        };
      }
      const result = await sendTestRequest(session.shop, to);
      return result?.status === "SENT"
        ? {
            ok: true as const,
            message: `Test email sent to ${to}`,
            preview: null,
          }
        : {
            ok: false as const,
            message: result?.error ?? "Test email failed",
            preview: null,
          };
    }
  } catch (error) {
    console.error("[requests] action failed", error);
    return {
      ok: false as const,
      message: (error as Error).message,
      preview: null,
    };
  }
  return { ok: false as const, message: "Unknown action", preview: null };
};

const STATUS_BADGE = {
  SCHEDULED: { tone: "info", label: "Scheduled" },
  SENDING: { tone: "info", label: "Sending" },
  SENT: { tone: "success", label: "Sent" },
  FAILED: { tone: "critical", label: "Failed" },
  CANCELLED: { tone: "neutral", label: "Cancelled" },
} as const;

const dateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});
const fmt = (iso: string | null) =>
  iso ? dateTime.format(new Date(iso)) : "—";

function useToastResult(fetcher: ReturnType<typeof useFetcher<typeof action>>) {
  const shopify = useAppBridge();
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.message) {
      shopify.toast.show(fetcher.data.message, { isError: !fetcher.data.ok });
    }
  }, [fetcher.state, fetcher.data, shopify]);
}

function RowActions({
  id,
  status,
}: {
  id: string;
  status: keyof typeof STATUS_BADGE;
}) {
  const fetcher = useFetcher<typeof action>();
  const preview = useFetcher<typeof action>();
  const modal = useRef<HTMLElementTagNameMap["s-modal"]>(null);
  useToastResult(fetcher);
  const busy = fetcher.state !== "idle";

  useEffect(() => {
    if (preview.state === "idle" && preview.data?.preview)
      modal.current?.showOverlay();
  }, [preview.state, preview.data]);

  return (
    <s-stack direction="inline" gap="small-200">
      {status === "SCHEDULED" || status === "FAILED" ? (
        <>
          <s-button
            disabled={busy}
            onClick={() =>
              fetcher.submit({ intent: "send", id }, { method: "post" })
            }
          >
            Send now
          </s-button>
          <s-button
            tone="critical"
            disabled={busy}
            onClick={() =>
              fetcher.submit({ intent: "cancel", id }, { method: "post" })
            }
          >
            Cancel
          </s-button>
        </>
      ) : null}
      <s-button
        loading={preview.state !== "idle"}
        onClick={() =>
          preview.submit({ intent: "preview", id }, { method: "post" })
        }
      >
        Preview
      </s-button>
      <s-modal
        ref={modal}
        id={`preview-${id}`}
        heading="Email preview"
        size="large"
      >
        {preview.data?.preview ? (
          <iframe
            title="Email preview"
            srcDoc={preview.data.preview}
            sandbox=""
            style={{ width: "100%", height: 560, border: 0 }}
          />
        ) : null}
      </s-modal>
    </s-stack>
  );
}

function TestEmail() {
  const fetcher = useFetcher<typeof action>();
  useToastResult(fetcher);

  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value="test" />
      <s-stack direction="inline" gap="base" alignItems="end">
        <s-box inlineSize="320px">
          <s-email-field name="email" label="Send a test email to" required />
        </s-box>
        <s-button type="submit" loading={fetcher.state !== "idle"}>
          Send test email
        </s-button>
      </s-stack>
    </fetcher.Form>
  );
}

export default function Requests() {
  const { requests, counts, reviewed, opened, dryRun } =
    useLoaderData<typeof loader>();
  const sent = (counts.SENT ?? 0) as number;
  const rate = (part: number) =>
    sent > 0 ? `${Math.round((part * 100) / sent)}%` : "—";

  return (
    <s-page heading="Review requests">
      <s-button slot="secondary-actions" href="/app/settings/email">
        Customize email
      </s-button>
      {dryRun ? (
        <s-banner tone="info" heading="Emails are in test mode">
          No email provider is connected yet, so emails are created and logged
          but not delivered.
        </s-banner>
      ) : null}

      <s-grid gridTemplateColumns="1fr 1fr 1fr 1fr" gap="base">
        {[
          ["Scheduled", String(counts.SCHEDULED ?? 0)],
          ["Sent", String(sent)],
          ["Open rate", rate(opened)],
          ["Review rate", rate(reviewed)],
        ].map(([label, value]) => (
          <s-section key={label}>
            <s-stack gap="small-200">
              <s-text color="subdued">{label}</s-text>
              <s-heading>{value}</s-heading>
            </s-stack>
          </s-section>
        ))}
      </s-grid>

      <s-section heading="Test">
        <TestEmail />
      </s-section>

      <s-section heading="History" padding="none">
        {requests.length === 0 ? (
          <s-box padding="base">
            <s-paragraph>
              Requests are scheduled automatically when an order is fulfilled.
              Send a test email above to see what customers receive.
            </s-paragraph>
          </s-box>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header listSlot="primary">Order</s-table-header>
              <s-table-header>Customer</s-table-header>
              <s-table-header listSlot="inline">Status</s-table-header>
              <s-table-header>Scheduled</s-table-header>
              <s-table-header>Opened</s-table-header>
              <s-table-header>Reviewed</s-table-header>
              <s-table-header>Actions</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {requests.map((r) => (
                <s-table-row key={r.id}>
                  <s-table-cell>
                    <s-stack gap="small-300">
                      <s-text type="strong">{r.orderName ?? "Order"}</s-text>
                      <s-text color="subdued">
                        {r.itemCount} product{r.itemCount === 1 ? "" : "s"}
                      </s-text>
                    </s-stack>
                  </s-table-cell>
                  <s-table-cell>
                    <s-stack gap="small-300">
                      <s-text>{r.customerName ?? "—"}</s-text>
                      <s-text color="subdued">{r.customerEmail}</s-text>
                    </s-stack>
                  </s-table-cell>
                  <s-table-cell>
                    <s-stack gap="small-300">
                      <s-badge tone={STATUS_BADGE[r.status].tone}>
                        {STATUS_BADGE[r.status].label}
                      </s-badge>
                      {r.error ? (
                        <s-text color="subdued">{r.error}</s-text>
                      ) : null}
                    </s-stack>
                  </s-table-cell>
                  <s-table-cell>{fmt(r.sentAt ?? r.scheduledAt)}</s-table-cell>
                  <s-table-cell>{fmt(r.openedAt)}</s-table-cell>
                  <s-table-cell>{fmt(r.reviewedAt)}</s-table-cell>
                  <s-table-cell>
                    <RowActions id={r.id} status={r.status} />
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
