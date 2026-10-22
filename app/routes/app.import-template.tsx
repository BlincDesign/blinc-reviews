import type { LoaderFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";
import { templateCsv } from "../features/imports/imports.server";

// GET /app/import-template → CSV template (Judge.me-compatible columns).
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return new Response(String.fromCharCode(0xfeff) + templateCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="blinc-reviews-import-template.csv"',
    },
  });
};
