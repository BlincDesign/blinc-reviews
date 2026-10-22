import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";

// App block types in theme JSON look like "shopify://apps/<app handle>/blocks/<block>/<id>".
// The trailing id differs between dev previews and released versions, so match on the
// stable app handle and block name only.
const APP_BLOCK_PREFIX = "shopify://apps/blinc-reviews/blocks/";

const MAIN_THEME_PRODUCT_TEMPLATES = `#graphql
  query ThemeSetup {
    themes(first: 1, roles: [MAIN]) {
      nodes {
        name
        files(filenames: ["templates/product*.json", "config/settings_data.json"], first: 50) {
          nodes {
            filename
            body { ... on OnlineStoreThemeFileBodyText { content } }
          }
        }
      }
    }
  }`;

export type ThemeSetupStatus = {
  themeName: string | null;
  starRating: boolean;
  reviewsSection: boolean;
  cardStars: boolean;
};

type ThemeFile = { filename: string; body?: { content?: string } };

/** App embeds are switched on in settings_data.json (current preset, not disabled). */
function embedEnabled(settingsData: string | undefined, handle: string) {
  if (!settingsData) return false;
  try {
    // The file usually starts with a comment block, which JSON.parse rejects.
    const data = JSON.parse(settingsData.replace(/^\s*\/\*[\s\S]*?\*\//, ""));
    const current =
      typeof data.current === "string"
        ? data.presets?.[data.current]
        : data.current;
    const blocks = Object.values(current?.blocks ?? {}) as {
      type?: string;
      disabled?: boolean;
    }[];
    return blocks.some(
      (block) =>
        block.type?.startsWith(`${APP_BLOCK_PREFIX}${handle}/`) &&
        !block.disabled,
    );
  } catch {
    return false;
  }
}

/** Checks the live theme's product templates for our app blocks. */
export async function getThemeSetupStatus(
  admin: AdminApiContext,
): Promise<ThemeSetupStatus> {
  const response = await admin.graphql(MAIN_THEME_PRODUCT_TEMPLATES);
  const { data } = await response.json();
  const theme = data?.themes?.nodes?.[0];
  const files: ThemeFile[] = theme?.files?.nodes ?? [];
  const templates = files
    .filter((file) => file.filename.startsWith("templates/"))
    .map((file) => file.body?.content ?? "")
    .join("\n");
  const settingsData = files.find(
    (file) => file.filename === "config/settings_data.json",
  )?.body?.content;

  const hasBlock = (handle: string) =>
    templates.includes(`${APP_BLOCK_PREFIX}${handle}/`);

  return {
    themeName: theme?.name ?? null,
    starRating: hasBlock("star-rating"),
    reviewsSection: hasBlock("reviews"),
    cardStars: embedEnabled(settingsData, "app-embed"),
  };
}

/** Theme editor deep links that open with our block already added. */
export function themeEditorLinks(shop: string, apiKey: string) {
  const base = `https://${shop}/admin/themes/current/editor?template=product`;
  return {
    starRating: `${base}&addAppBlockId=${apiKey}/star-rating&target=mainSection`,
    reviewsSection: `${base}&addAppBlockId=${apiKey}/reviews&target=newAppsSection`,
    // Opens Theme settings > App embeds with ours switched on (the merchant saves).
    cardStars: `https://${shop}/admin/themes/current/editor?context=apps&activateAppId=${apiKey}/app-embed`,
  };
}
