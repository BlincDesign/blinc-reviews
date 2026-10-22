import type { ActionFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";
import { scheduleFromOrder } from "../features/requests/requests.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);
  await scheduleFromOrder(shop, payload);
  return new Response();
};
