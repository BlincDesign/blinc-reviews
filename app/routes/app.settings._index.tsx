import { redirect, type LoaderFunctionArgs } from "react-router";

// /app/settings opens the first section; keep the embedded app's query string.
export const loader = ({ request }: LoaderFunctionArgs) => {
  const { search } = new URL(request.url);
  return redirect(`/app/settings/publishing${search}`);
};
