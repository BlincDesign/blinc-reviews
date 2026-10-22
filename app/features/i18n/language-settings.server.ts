import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";

import { LANGUAGES, resolveLang } from "./i18n";
import {
  normalizeLanguageSettings,
  type LanguageSettings,
} from "./language-settings";

const GET_LANGUAGE = `#graphql
  query GetLanguageSettings {
    currentAppInstallation {
      id
      metafield(namespace: "blinc", key: "language") { jsonValue }
    }
    shopLocales(published: true) { locale name primary }
  }`;

const SET_LANGUAGE = `#graphql
  mutation SetLanguageSettings($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) { userErrors { field message } }
  }`;

export type StoreLanguage = {
  locale: string;
  name: string;
  primary: boolean;
  /** Blinc has translations for it (otherwise English is shown). */
  supported: boolean;
};

export async function getLanguageSettings(admin: AdminApiContext) {
  const response = await admin.graphql(GET_LANGUAGE);
  const { data } = await response.json();
  type Locale = { locale: string; name: string; primary: boolean };
  const storeLanguages: StoreLanguage[] = (data?.shopLocales ?? []).map(
    (l: Locale) => ({
      locale: l.locale,
      name: l.name,
      primary: l.primary,
      supported:
        resolveLang(l.locale) !== "en" ||
        l.locale.toLowerCase().startsWith("en"),
    }),
  );
  return {
    settings: normalizeLanguageSettings(
      data?.currentAppInstallation?.metafield?.jsonValue,
    ),
    storeLanguages,
    primaryLocale: storeLanguages.find((l) => l.primary)?.locale ?? "en",
    ownerId: data?.currentAppInstallation?.id as string | undefined,
  };
}

export async function saveLanguageSettings(
  admin: AdminApiContext,
  input: unknown,
): Promise<LanguageSettings> {
  const settings = normalizeLanguageSettings(input);
  const { ownerId } = await getLanguageSettings(admin);
  if (!ownerId) throw new Error("App installation not found");
  const response = await admin.graphql(SET_LANGUAGE, {
    variables: {
      metafields: [
        {
          ownerId,
          namespace: "blinc",
          key: "language",
          type: "json",
          value: JSON.stringify(settings),
        },
      ],
    },
  });
  const { data } = await response.json();
  const errors = data?.metafieldsSet?.userErrors ?? [];
  if (errors.length)
    throw new Error(`language save: ${JSON.stringify(errors)}`);
  return settings;
}

export { LANGUAGES };
