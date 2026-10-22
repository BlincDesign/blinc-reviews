import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";

import { authenticate } from "../shopify.server";
import { submitQuestion } from "../features/questions/questions.server";

// POST /apps/blinc-reviews/questions - "Ask a question" on the product page.
// JSON for the widget script; the no-JS form (_format=html) gets a redirect.

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.public.appProxy(request);
  if (!session || !admin) {
    return Response.json(
      { ok: false, errors: {}, message: "unavailable" },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const result = await submitQuestion({ admin, domain: session.shop, form });

  if (form.get("_format") === "html") {
    const lang = encodeURIComponent(String(form.get("language") ?? ""));
    return redirect(
      `/apps/blinc-reviews/thanks?s=${result.ok ? "question" : "error"}&l=${lang}`,
    );
  }
  return Response.json(result, { status: result.ok ? 200 : 422 });
};
