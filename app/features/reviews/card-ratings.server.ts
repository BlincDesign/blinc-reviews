import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";

// Star ratings for product cards (collections, search, recommendations). The app
// embed sends ratings for the products it can see in Liquid; this covers cards the
// theme loads later (filters, "load more", recommendations), by product handle.

const HANDLE = /^[a-z0-9][a-z0-9-]{0,254}$/;
const MAX_HANDLES = 50;
const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 5000;

export type CardRating = [average: number, count: number];

// Per process, so repeated page views of the same collection cost no API calls.
const cache = new Map<string, { at: number; value: CardRating }>();

const CARD_RATINGS = `#graphql
  query CardRatings($query: String!, $first: Int!) {
    products(first: $first, query: $query) {
      nodes {
        handle
        rating: metafield(namespace: "reviews", key: "rating") { value }
        count: metafield(namespace: "reviews", key: "rating_count") { value }
      }
    }
  }`;

export function parseHandles(value: string | null) {
  const handles = (value ?? "")
    .split(",")
    .map((handle) => handle.trim().toLowerCase())
    .filter((handle) => HANDLE.test(handle));
  return [...new Set(handles)].slice(0, MAX_HANDLES);
}

/** [average, count] per handle; products without reviews come back as [0, 0]. */
export async function cardRatings(
  admin: AdminApiContext,
  shop: string,
  handles: string[],
) {
  const now = Date.now();
  const result: Record<string, CardRating> = {};
  const missing: string[] = [];
  for (const handle of handles) {
    const hit = cache.get(`${shop}|${handle}`);
    if (hit && now - hit.at < TTL_MS) result[handle] = hit.value;
    else missing.push(handle);
  }
  if (missing.length === 0) return result;

  const response = await admin.graphql(CARD_RATINGS, {
    variables: {
      query: missing.map((handle) => `handle:"${handle}"`).join(" OR "),
      first: missing.length,
    },
  });
  const { data } = await response.json();
  type Node = {
    handle: string;
    rating: { value: string } | null;
    count: { value: string } | null;
  };
  const found = new Map<string, Node>(
    (data?.products?.nodes ?? []).map((node: Node) => [node.handle, node]),
  );

  if (cache.size > MAX_ENTRIES) cache.clear();
  for (const handle of missing) {
    const node = found.get(handle);
    let value: CardRating = [0, 0];
    if (node?.rating?.value) {
      const average = Number(JSON.parse(node.rating.value).value) || 0;
      value = [Math.round(average * 10) / 10, Number(node.count?.value) || 0];
    }
    cache.set(`${shop}|${handle}`, { at: now, value });
    result[handle] = value;
  }
  return result;
}
