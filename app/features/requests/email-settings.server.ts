import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../../shopify.server";
import { getDesign } from "../appearance/design.server";
import { getSettings } from "../settings/settings.server";
import {
  normalizeEmailSettings,
  type EmailKind,
  type EmailSettings,
} from "./email-settings";
import type { EmailProduct } from "./email-template";
import { isDryRun } from "./mailer.server";
import { featuresForShop } from "../billing/billing.server";
import { sendConfirmSample, sendReplySample } from "./notifications.server";
import { sendTestRequest } from "./requests.server";

// Email settings live next to the widget design: a JSON metafield on the app
// installation (blinc.email). Only the app reads it, when it sends.

const GET_EMAIL = `#graphql
  query GetEmailSettings {
    currentAppInstallation {
      id
      metafield(namespace: "blinc", key: "email") { jsonValue }
    }
    shop { name contactEmail }
  }`;

const SET_EMAIL = `#graphql
  mutation SetEmailSettings($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      userErrors { field message }
    }
  }`;

const PREVIEW_PRODUCTS = `#graphql
  query EmailPreviewProducts {
    products(first: 2, query: "status:active", sortKey: UPDATED_AT, reverse: true) {
      nodes { id title featuredMedia { preview { image { url(transform: { maxWidth: 240, maxHeight: 240 }) } } } }
    }
  }`;

export async function getEmailSettings(admin: AdminApiContext) {
  const response = await admin.graphql(GET_EMAIL);
  const { data } = await response.json();
  return {
    settings: normalizeEmailSettings(
      data?.currentAppInstallation?.metafield?.jsonValue,
    ),
    shopName: (data?.shop?.name as string | undefined) ?? "",
    shopContactEmail: (data?.shop?.contactEmail as string | undefined) ?? null,
  };
}

export async function saveEmailSettings(
  admin: AdminApiContext,
  input: unknown,
): Promise<EmailSettings> {
  const settings = normalizeEmailSettings(input);
  const idResponse = await admin.graphql(GET_EMAIL);
  const { data } = await idResponse.json();
  const ownerId = data?.currentAppInstallation?.id;
  if (!ownerId) throw new Error("App installation not found");

  const response = await admin.graphql(SET_EMAIL, {
    variables: {
      metafields: [
        {
          ownerId,
          namespace: "blinc",
          key: "email",
          type: "json",
          value: JSON.stringify(settings),
        },
      ],
    },
  });
  const result = await response.json();
  const errors = result.data?.metafieldsSet?.userErrors ?? [];
  if (errors.length > 0) {
    throw new Error(`Email settings save failed: ${JSON.stringify(errors)}`);
  }
  return settings;
}

/** Everything an email editor page needs for its live preview. */
export async function loadEmailEditor(request: Request) {
  const { admin, session } = await authenticate.admin(request);
  const [email, design, shopSettings, productsResponse] = await Promise.all([
    getEmailSettings(admin),
    getDesign(admin),
    getSettings(session.shop),
    admin.graphql(PREVIEW_PRODUCTS),
  ]);
  const { data } = await productsResponse.json();
  type Node = {
    id: string;
    title: string;
    featuredMedia?: { preview?: { image?: { url?: string } } };
  };
  const products: EmailProduct[] = (data?.products?.nodes ?? []).map(
    (node: Node) => ({
      productId: node.id.split("/").pop()!,
      title: node.title,
      imageUrl: node.featuredMedia?.preview?.image?.url ?? null,
    }),
  );
  return {
    settings: email.settings,
    shopName: email.shopName || session.shop,
    contactEmail: shopSettings.replyToEmail || email.shopContactEmail,
    requestsOn: shopSettings.requestChannel === "APP",
    brandingAllowed: (await featuresForShop(shopSettings.shopId)).emailBranding,
    design,
    products: products.length
      ? products.slice(0, 1)
      : [{ productId: "1", title: "Example product", imageUrl: null }],
    dryRun: isDryRun(),
  };
}

const KINDS: EmailKind[] = ["initial", "reminder", "reply", "confirm"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Shared action: intent=save stores the template, intent=sample sends one. */
export async function emailEditorAction(request: Request) {
  const { admin, session } = await authenticate.admin(request);
  const form = await request.formData();

  if (form.get("intent") === "sample") {
    const to = String(form.get("to") ?? "").trim();
    const kind = String(form.get("kind")) as EmailKind;
    if (!EMAIL.test(to)) {
      return { ok: false as const, message: "Enter a valid email address." };
    }
    if (!KINDS.includes(kind)) {
      return { ok: false as const, message: "Unknown email." };
    }
    try {
      if (kind === "reply") await sendReplySample(session.shop, to);
      else if (kind === "confirm") await sendConfirmSample(session.shop, to);
      else await sendTestRequest(session.shop, to, kind);
      return { ok: true as const, message: `Sample email sent to ${to}` };
    } catch (error) {
      return { ok: false as const, message: (error as Error).message };
    }
  }

  try {
    await saveEmailSettings(admin, JSON.parse(String(form.get("settings"))));
    return { ok: true as const, message: "Email saved" };
  } catch (error) {
    console.error("[email] save failed", error);
    return { ok: false as const, message: "Couldn't save. Try again." };
  }
}
