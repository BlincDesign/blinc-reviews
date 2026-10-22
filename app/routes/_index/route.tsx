import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useEffect } from "react";
import {
  redirect,
  Form,
  useActionData,
  useLoaderData,
  useNavigate,
} from "react-router";

import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  // Any admin launch (shop, host or embedded params) belongs in the app.
  if (
    url.searchParams.get("shop") ||
    url.searchParams.get("host") ||
    url.searchParams.get("embedded")
  ) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return { errors };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;
  const navigate = useNavigate();

  // In-app navigation to "/" (e.g. the app name in the admin) carries no shop
  // param; inside the admin iframe, go to the app instead of this public page.
  useEffect(() => {
    if (window.top !== window.self) navigate("/app", { replace: true });
  }, [navigate]);

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Blinc Reviews</h1>
        <p className={styles.text}>
          Collect, moderate and show product reviews that help shoppers buy.
        </p>
        {showForm && (
          <Form className={styles.form} method="post">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>{errors?.shop ?? "e.g: my-shop-domain.myshopify.com"}</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Review requests</strong>. Automatic emails after
            fulfillment, with one-tap star ratings.
          </li>
          <li>
            <strong>Photo reviews</strong>. A fast widget that works with any
            theme, plus star ratings on collection pages.
          </li>
          <li>
            <strong>Built for Shopify</strong>. Native star ratings, Shopify
            Flow triggers and rich snippets for Google.
          </li>
        </ul>
      </div>
    </div>
  );
}
