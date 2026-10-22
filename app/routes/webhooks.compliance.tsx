import type { ActionFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";
import {
  handleCustomerDataRequest,
  redactCustomer,
  redactShop,
} from "../features/privacy/privacy.server";

// Mandatory privacy webhooks. authenticate.webhook rejects requests with an invalid HMAC (401).
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  switch (topic) {
    case "CUSTOMERS_DATA_REQUEST":
      await handleCustomerDataRequest(shop, payload);
      break;
    case "CUSTOMERS_REDACT":
      await redactCustomer(shop, payload);
      break;
    case "SHOP_REDACT":
      await redactShop(shop);
      break;
    default:
      console.warn(`[privacy] unhandled topic ${topic} for ${shop}`);
  }

  return new Response();
};
