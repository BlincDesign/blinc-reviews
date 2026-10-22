import type { LoaderFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";
import { exportReviewsCsv } from "../features/reviews/reviews.server";
import { parseFilters } from "../features/reviews/reviews";

// GET /app/reviews-export?<same filters as the Reviews page> → CSV download.
// Called with fetch() from the embedded app, which adds the session token.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const filters = parseFilters(new URL(request.url).searchParams);
  const csv = await exportReviewsCsv(admin, session.shop, filters);
  const date = new Date().toISOString().slice(0, 10);

  // Byte-order mark so Excel opens UTF-8 (accents, emoji) correctly.
  return new Response(String.fromCharCode(0xfeff) + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="blinc-reviews-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
};
