import { AwsClient } from "aws4fetch";

// Railway bucket (S3-compatible, private). Files are served through /m/<key> and the
// app proxy, which redirect to short-lived presigned URLs (bucket egress is free).

const SIGNED_URL_SECONDS = 24 * 60 * 60;

function config() {
  const {
    BUCKET_NAME,
    BUCKET_ENDPOINT,
    BUCKET_ACCESS_KEY_ID,
    BUCKET_SECRET_ACCESS_KEY,
  } = process.env;
  if (
    !BUCKET_NAME ||
    !BUCKET_ENDPOINT ||
    !BUCKET_ACCESS_KEY_ID ||
    !BUCKET_SECRET_ACCESS_KEY
  ) {
    throw new Error("Photo storage isn't configured (BUCKET_* variables).");
  }
  const endpoint = new URL(BUCKET_ENDPOINT);
  // Virtual-hosted style: https://<bucket>.<endpoint host>/<key>
  const base =
    process.env.BUCKET_URL_STYLE === "path"
      ? `${endpoint.origin}/${BUCKET_NAME}`
      : `${endpoint.protocol}//${BUCKET_NAME}.${endpoint.host}`;
  const client = new AwsClient({
    accessKeyId: BUCKET_ACCESS_KEY_ID,
    secretAccessKey: BUCKET_SECRET_ACCESS_KEY,
    region: process.env.BUCKET_REGION || "auto",
    service: "s3",
  });
  return { base, client };
}

const objectUrl = (base: string, key: string) =>
  `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;

export function isStorageConfigured() {
  return Boolean(
    process.env.BUCKET_NAME && process.env.BUCKET_SECRET_ACCESS_KEY,
  );
}

export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string,
) {
  const { base, client } = config();
  const response = await client.fetch(objectUrl(base, key), {
    method: "PUT",
    // Copy into a plain ArrayBuffer-backed view, which fetch's body type requires.
    body: new Uint8Array(body),
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
  if (!response.ok) throw new Error(`Upload failed (${response.status})`);
}

export async function deleteObject(key: string) {
  const { base, client } = config();
  const response = await client.fetch(objectUrl(base, key), {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 404)
    throw new Error(`Delete failed (${response.status})`);
}

/** Deletes every object under a prefix, e.g. all of a shop's photos on shop/redact. */
export async function deletePrefix(prefix: string) {
  const { base, client } = config();
  let token: string | null = null;
  do {
    const query = new URLSearchParams({ "list-type": "2", prefix });
    if (token) query.set("continuation-token", token);
    const response = await client.fetch(`${base}/?${query}`);
    if (!response.ok) throw new Error(`List failed (${response.status})`);
    const xml = await response.text();
    const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1]);
    await Promise.all(keys.map((key) => deleteObject(key)));
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml)
      ? (xml.match(
          /<NextContinuationToken>([^<]+)<\/NextContinuationToken>/,
        )?.[1] ?? null)
      : null;
  } while (token);
}

/** Short-lived signed GET URL for a private object. */
export async function signedUrl(key: string) {
  const { base, client } = config();
  const url = new URL(objectUrl(base, key));
  url.searchParams.set("X-Amz-Expires", String(SIGNED_URL_SECONDS));
  const signed = await client.sign(url.toString(), {
    method: "GET",
    aws: { signQuery: true },
  });
  return signed.url;
}

export const SIGNED_URL_CACHE_SECONDS = SIGNED_URL_SECONDS / 2;
