import { SIGNED_URL_CACHE_SECONDS, signedUrl } from "./storage.server";

// Only review photo paths can be requested, so nothing else in the bucket is reachable.
const PHOTO_KEY =
  /^shops\/[a-z0-9]+\/reviews\/[a-z0-9]+\/[0-9a-f]{16}(-thumb)?\.webp$/;

/** Redirects to a short-lived signed URL for a review photo. */
export async function redirectToPhoto(key: string | undefined) {
  if (!key || !PHOTO_KEY.test(key))
    return new Response("Not found", { status: 404 });
  return new Response(null, {
    status: 302,
    headers: {
      Location: await signedUrl(key),
      // Cache the redirect for less time than the signed URL lives.
      "Cache-Control": `public, max-age=${SIGNED_URL_CACHE_SECONDS}`,
    },
  });
}
