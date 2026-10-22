import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";

import {
  resolveUnsubscribe,
  unsubscribe,
} from "../features/requests/requests.server";

// Unsubscribe from review requests. GET only shows a confirmation, because mail
// scanners prefetch links; the unsubscribe itself is a POST (also used by
// one-click List-Unsubscribe in email clients).

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const target = await resolveUnsubscribe(params.token ?? "");
  return {
    valid: Boolean(target),
    shopName: target?.domain.replace(".myshopify.com", ""),
  };
};

export const action = async ({ params }: ActionFunctionArgs) => {
  return { done: await unsubscribe(params.token ?? "") };
};

const box = {
  maxWidth: 420,
  margin: "80px auto",
  padding: 28,
  fontFamily: "system-ui, sans-serif",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  lineHeight: 1.5,
} as const;

export default function Unsubscribe() {
  const { valid, shopName } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();

  if (!valid) return <div style={box}>This link is no longer valid.</div>;
  if (result?.done) {
    return (
      <div style={box}>
        <h1 style={{ fontSize: 20 }}>You&apos;re unsubscribed</h1>
        <p>{`You won't receive review emails from ${shopName} anymore.`}</p>
      </div>
    );
  }
  return (
    <div style={box}>
      <h1 style={{ fontSize: 20 }}>Unsubscribe from review emails?</h1>
      <p>{`You'll stop receiving review requests and review updates from ${shopName}.`}</p>
      <Form method="post">
        <button
          type="submit"
          style={{ padding: "10px 18px", borderRadius: 8, cursor: "pointer" }}
        >
          Unsubscribe
        </button>
      </Form>
    </div>
  );
}
