import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";

import {
  confirmReview,
  findConfirmable,
} from "../features/requests/notifications.server";

// Review confirmation link. Like unsubscribe, GET only shows a button because mail
// scanners prefetch links; confirming is a POST.

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const review = await findConfirmable(params.token ?? "");
  return {
    valid: Boolean(review),
    confirmed: review ? review.verification !== "UNVERIFIED" : false,
    storeUrl: review ? `https://${review.shop.domain}` : null,
  };
};

export const action = async ({ params }: ActionFunctionArgs) => {
  return { done: await confirmReview(params.token ?? "") };
};

const box = {
  maxWidth: 420,
  margin: "80px auto",
  padding: 28,
  fontFamily: "system-ui, sans-serif",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  lineHeight: 1.5,
  textAlign: "center",
} as const;

const button = {
  padding: "12px 24px",
  borderRadius: 8,
  border: 0,
  background: "#111827",
  color: "#fff",
  fontSize: 15,
  cursor: "pointer",
} as const;

export default function ConfirmReview() {
  const { valid, confirmed, storeUrl } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();

  if (!valid) return <div style={box}>This link is no longer valid.</div>;
  if (confirmed || result?.done) {
    return (
      <div style={box}>
        <h1 style={{ fontSize: 20 }}>Thanks, your review is confirmed</h1>
        <p>This helps keep reviews authentic for other shoppers.</p>
        {storeUrl ? <a href={storeUrl}>Back to the store</a> : null}
      </div>
    );
  }
  return (
    <div style={box}>
      <h1 style={{ fontSize: 20 }}>Confirm your review</h1>
      <p>Confirm that you wrote this review to help keep reviews authentic.</p>
      <Form method="post">
        <button type="submit" style={button}>
          Confirm my review
        </button>
      </Form>
    </div>
  );
}
