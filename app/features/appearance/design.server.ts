import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";

import { normalizeDesign, type Design } from "./design";

// Theme blocks read this as {{ app.metafields.blinc.design.value }}.
const NAMESPACE = "blinc";
const KEY = "design";

const GET_DESIGN = `#graphql
  query GetDesign {
    currentAppInstallation {
      id
      metafield(namespace: "blinc", key: "design") { jsonValue }
    }
  }`;

const SET_DESIGN = `#graphql
  mutation SetDesign($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      userErrors { field message }
    }
  }`;

export async function getDesign(admin: AdminApiContext) {
  const response = await admin.graphql(GET_DESIGN);
  const { data } = await response.json();
  return normalizeDesign(data?.currentAppInstallation?.metafield?.jsonValue);
}

export async function saveDesign(
  admin: AdminApiContext,
  input: unknown,
): Promise<Design> {
  const design = normalizeDesign(input);

  const idResponse = await admin.graphql(GET_DESIGN);
  const { data } = await idResponse.json();
  const ownerId = data?.currentAppInstallation?.id;
  if (!ownerId) throw new Error("App installation not found");

  const response = await admin.graphql(SET_DESIGN, {
    variables: {
      metafields: [
        {
          ownerId,
          namespace: NAMESPACE,
          key: KEY,
          type: "json",
          value: JSON.stringify(design),
        },
      ],
    },
  });
  const result = await response.json();
  const errors = result.data?.metafieldsSet?.userErrors ?? [];
  if (errors.length > 0)
    throw new Error(`Design save failed: ${JSON.stringify(errors)}`);

  return design;
}
