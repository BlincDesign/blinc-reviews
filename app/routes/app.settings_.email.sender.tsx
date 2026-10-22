import { useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import {
  getSettings,
  parseSenderForm,
  updateSender,
} from "../features/settings/settings.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const settings = await getSettings(session.shop);
  return {
    senderName: settings.senderName ?? "",
    replyToEmail: settings.replyToEmail ?? "",
    fromAddress: `reviews@${process.env.EMAIL_FROM_DOMAIN || "example.com"}`,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const result = parseSenderForm(await request.formData());
  if (!result.ok) return { saved: false as const, errors: result.errors };
  await updateSender(session.shop, result.data);
  return { saved: true as const, errors: {} };
};

export default function SenderSettings() {
  const { senderName, replyToEmail, fromAddress } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const shopify = useAppBridge();
  const errors: { senderName?: string; replyToEmail?: string } =
    actionData?.errors ?? {};

  useEffect(() => {
    if (actionData?.saved) shopify.toast.show("Sender settings saved");
  }, [actionData, shopify]);

  return (
    <s-page heading="Edit sender settings">
      <s-link slot="breadcrumb-actions" href="/app/settings/email">
        Email templates
      </s-link>
      <form
        data-save-bar
        onSubmit={(event) => {
          event.preventDefault();
          submit(event.currentTarget, { method: "post" });
        }}
      >
        <s-stack gap="base">
          <s-section heading="Sender info">
            <s-stack gap="base">
              <s-text-field
                name="senderName"
                label="Sender name"
                details="Appears in emails to customers. Defaults to your store name."
                maxLength={80}
                defaultValue={senderName}
                error={errors.senderName}
              />
              <s-email-field
                name="replyToEmail"
                label="Reply-to email"
                details="Customer replies and “Reach out to us” go here. Defaults to your store's contact email."
                defaultValue={replyToEmail}
                error={errors.replyToEmail}
              />
              <s-text-field
                label="Sender email address"
                value={fromAddress}
                disabled
              />
            </s-stack>
          </s-section>
          <s-section heading="Use custom sender email">
            <s-stack gap="small-200">
              <s-badge>Coming soon</s-badge>
              <s-text color="subdued">
                Send from your own domain after verifying it with DNS records.
                Until then, emails are sent from the address above with your
                sender name and reply-to email.
              </s-text>
            </s-stack>
          </s-section>
        </s-stack>
      </form>
      {navigation.state === "submitting" ? (
        <s-spinner accessibilityLabel="Saving" />
      ) : null}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
