import type { LoaderFunctionArgs } from "react-router";

import { markOpened } from "../features/requests/requests.server";

// 1×1 transparent GIF used as the open-tracking pixel in review request emails.
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export const loader = async ({ params }: LoaderFunctionArgs) => {
  if (params.token) await markOpened(params.token).catch(() => undefined);
  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, max-age=0",
    },
  });
};
