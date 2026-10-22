import type { LoaderFunctionArgs } from "react-router";

import { redirectToPhoto } from "../features/media/serve.server";

// Storefront: /apps/blinc-reviews/m/<photo key> on the shop's own domain, forwarded here
// by the app proxy. Photos are public, so no proxy signature check is needed.
export const loader = ({ params }: LoaderFunctionArgs) =>
  redirectToPhoto(params["*"]);
