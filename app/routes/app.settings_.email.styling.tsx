import { useMemo, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import {
  emailEditorAction,
  loadEmailEditor,
} from "../features/requests/email-settings.server";
import {
  COPY_LIMITS,
  LOGO_WIDTH_MAX,
  LOGO_WIDTH_MIN,
} from "../features/requests/email-settings";
import {
  renderReplyEmail,
  renderRequestEmail,
} from "../features/requests/email-template";
import {
  EmailEditorLayout,
  useEmailForm,
} from "../features/requests/EmailEditor";

export const loader = ({ request }: LoaderFunctionArgs) =>
  loadEmailEditor(request);
export const action = ({ request }: ActionFunctionArgs) =>
  emailEditorAction(request);

const TABS = [
  { id: "initial", label: "Review request" },
  { id: "reply", label: "Reply notification" },
];

export default function EmailStyling() {
  const {
    settings: saved,
    design,
    shopName,
    contactEmail,
    products,
    dryRun,
    brandingAllowed,
  } = useLoaderData<typeof loader>();
  const { settings, live, formProps } = useEmailForm(saved, {
    checkboxes: ["showImages", "showContact"],
    numbers: ["logoWidth"],
  });
  const [lang, setLang] = useState("en");
  const [tab, setTab] = useState<"initial" | "reply">("initial");

  const email = useMemo(() => {
    const common = {
      shopName,
      lang,
      design,
      settings,
      contactEmail: contactEmail ?? "support@example.com",
      unsubscribeUrl: "#",
    };
    return tab === "reply"
      ? renderReplyEmail({
          ...common,
          reviewerName: "Alex Morgan",
          productTitle: products[0]?.title ?? "Example product",
          rating: 5,
          reviewTitle: "Love it",
          reviewBody: "Great quality and fast shipping.",
          reply: "Thank you, Alex!",
        })
      : renderRequestEmail({
          ...common,
          kind: "initial",
          customerName: "Alex Morgan",
          orderName: "#1042",
          products,
          writeUrl: () => "#",
          openPixelUrl: "data:,",
        });
  }, [tab, lang, shopName, design, settings, contactEmail, products]);

  const form = (
    <form {...formProps}>
      <s-stack gap="base">
        <s-section heading="Logo">
          <s-stack gap="base">
            <s-text-field
              {...live}
              name="logoUrl"
              label="Logo image URL"
              placeholder="https://cdn.shopify.com/…"
              details="Upload your logo in Content > Files, copy its link and paste it here. Leave empty to show your store name."
              defaultValue={saved.logoUrl}
            />
            <s-number-field
              {...live}
              name="logoWidth"
              label="Logo width"
              suffix="px"
              min={LOGO_WIDTH_MIN}
              max={LOGO_WIDTH_MAX}
              step={10}
              defaultValue={String(saved.logoWidth)}
            />
          </s-stack>
        </s-section>

        <s-section heading="Colors">
          <s-stack gap="base">
            <s-color-field
              {...live}
              name="accentColor"
              label="Accent color"
              details="Store name and buttons. Leave empty to use your reviews widget button color."
              defaultValue={saved.accentColor}
            />
            <s-color-field
              {...live}
              name="backgroundColor"
              label="Background color"
              defaultValue={saved.backgroundColor}
            />
          </s-stack>
        </s-section>

        <s-section heading="Content">
          <s-stack gap="base">
            <s-checkbox
              {...live}
              name="showImages"
              label="Show product images"
              defaultChecked={saved.showImages}
            />
            <s-checkbox
              {...live}
              name="showContact"
              label="Show “Reach out to us” line"
              details="Links to your reply-to email so unhappy customers contact you instead of leaving a bad review."
              defaultChecked={saved.showContact}
            />
            <s-text-field
              {...live}
              name="signOff"
              label="Sign-off"
              details="Leave empty to hide. You can use {shop_name}."
              maxLength={COPY_LIMITS.signOff}
              defaultValue={saved.signOff}
            />
            <s-text-area
              {...live}
              name="footer"
              label="Footer text"
              details="For example your store address. Shown above the unsubscribe link."
              rows={2}
              maxLength={COPY_LIMITS.footer}
              defaultValue={saved.footer}
            />
          </s-stack>
        </s-section>
      </s-stack>
    </form>
  );

  return (
    <EmailEditorLayout
      heading="Template styling"
      subtitle={
        brandingAllowed ? (
          <s-text color="subdued">Applies to every email the app sends.</s-text>
        ) : (
          <s-banner
            tone="info"
            heading="Logo and colors are on Pro and Business"
          >
            You can set them now; Free plan emails use the default look.{" "}
            <s-link href="/app/settings/plan">See plans</s-link>
          </s-banner>
        )
      }
      form={form}
      dryRun={dryRun}
      preview={{
        lang,
        onLang: setLang,
        tabs: TABS,
        tab,
        onTab: (id) => setTab(id as "initial" | "reply"),
        subject: email.subject,
        html: email.html,
        sampleKind: tab,
      }}
    />
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
