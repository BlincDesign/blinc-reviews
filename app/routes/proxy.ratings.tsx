import type { LoaderFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";
import {
  cardRatings,
  parseHandles,
} from "../features/reviews/card-ratings.server";

// Storefront: /apps/blinc-reviews/ratings?handles=a,b,c — star ratings for product
// cards the app embed couldn't read in Liquid (loaded after the page).
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.public.appProxy(request);
  if (!session || !admin) {
    return Response.json({ ratings: {} }, { status: 400 });
  }
  const handles = parseHandles(
    new URL(request.url).searchParams.get("handles"),
  );
  const ratings = handles.length
    ? await cardRatings(admin, session.shop, handles)
    : {};
  return Response.json(
    { ratings },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
};
