import { randomBytes } from "node:crypto";
import sharp from "sharp";

import db from "../../db.server";
import { deleteObject, deletePrefix, putObject } from "./storage.server";

export const MAX_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const FULL_SIZE = 1600;
const THUMB_SIZE = 400;
// Refuse decompression bombs (e.g. a tiny file that expands to a gigapixel image).
const MAX_INPUT_PIXELS = 50_000_000;

/** Thumbnail key derived from the full-size key. */
export const thumbKey = (key: string) => key.replace(/\.webp$/, "-thumb.webp");
const shopPrefix = (shopId: string) => `shops/${shopId}/`;

/**
 * Validates and stores one uploaded photo: decodes it with sharp (rejects anything
 * that isn't a real image), auto-rotates, strips metadata such as GPS location, and
 * writes a 1600px and a 400px WebP.
 */
async function storePhoto(
  shopId: string,
  reviewId: string,
  input: Buffer,
  position: number,
) {
  const image = sharp(input, {
    limitInputPixels: MAX_INPUT_PIXELS,
    failOn: "error",
  }).rotate();
  const meta = await image.metadata();
  if (
    !meta.width ||
    !meta.height ||
    !["jpeg", "png", "webp", "heif", "gif", "avif"].includes(meta.format ?? "")
  ) {
    throw new Error("Not a supported image");
  }

  const full = await image
    .clone()
    .resize({
      width: FULL_SIZE,
      height: FULL_SIZE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await image
    .clone()
    .resize({ width: THUMB_SIZE, height: THUMB_SIZE, fit: "cover" })
    .webp({ quality: 75 })
    .toBuffer();

  const key = `${shopPrefix(shopId)}reviews/${reviewId}/${randomBytes(8).toString("hex")}.webp`;
  await putObject(key, full.data, "image/webp");
  await putObject(thumbKey(key), thumb, "image/webp");

  return db.reviewMedia.create({
    data: {
      reviewId,
      kind: "IMAGE",
      url: `/m/${key}`,
      storageKey: key,
      width: full.info.width,
      height: full.info.height,
      position,
    },
  });
}

/** Stores up to MAX_PHOTOS photos for a review. Bad files are skipped, not fatal. */
export async function attachPhotos(
  shopId: string,
  reviewId: string,
  files: File[],
) {
  const accepted = files
    .filter((f) => f.size > 0 && f.size <= MAX_PHOTO_BYTES)
    .slice(0, MAX_PHOTOS);
  let stored = 0;
  for (const [index, file] of accepted.entries()) {
    try {
      await storePhoto(
        shopId,
        reviewId,
        Buffer.from(await file.arrayBuffer()),
        index,
      );
      stored++;
    } catch (error) {
      console.error(`[photos] skipped a file for review ${reviewId}`, error);
    }
  }
  return stored;
}

/** Removes a photo (merchant moderation). Returns the review's product for re-sync. */
export async function deletePhoto(domain: string, mediaId: string) {
  const media = await db.reviewMedia.findFirst({
    where: { id: mediaId, review: { shop: { domain } } },
    include: { review: { select: { shopId: true, productId: true } } },
  });
  if (!media) return null;
  await db.reviewMedia.delete({ where: { id: media.id } });
  await Promise.all([
    deleteObject(media.storageKey),
    deleteObject(thumbKey(media.storageKey)),
  ]).catch((error) => console.error("[photos] object delete failed", error));
  return media.review;
}

/** Deletes the stored files for reviews that are about to be deleted. */
export async function deleteReviewFiles(reviewIds: string[]) {
  const media = await db.reviewMedia.findMany({
    where: { reviewId: { in: reviewIds } },
    select: { storageKey: true },
  });
  await Promise.all(
    media.flatMap((m) => [
      deleteObject(m.storageKey),
      deleteObject(thumbKey(m.storageKey)),
    ]),
  ).catch((error) => console.error("[photos] object delete failed", error));
}

/** shop/redact: remove every stored file for the shop. */
export async function deleteShopFiles(shopId: string) {
  await deletePrefix(shopPrefix(shopId));
}
