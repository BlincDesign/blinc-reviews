import type { LoaderFunctionArgs } from "react-router";

import { redirectToPhoto } from "../features/media/serve.server";

// GET /m/<photo key> → review photo (admin pages and emails).
export const loader = ({ params }: LoaderFunctionArgs) =>
  redirectToPhoto(params["*"]);
