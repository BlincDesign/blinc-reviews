import type { Prisma, ReviewStatus } from "@prisma/client";
import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";

import db from "../../db.server";
import { unauthenticated } from "../../shopify.server";
import { syncProductRating } from "../reviews/ratings.server";
import { EXPORT_COLUMNS } from "../reviews/reviews.server";
import { parseCsv } from "./csv.server";
import {
  detectMapping,
  readRows,
  type ImportRow,
  type Mapping,
} from "./mapping.server";
import type { ImportSourceId, StatusMode } from "./sources";

const BATCH = 500;
const MAX_ERRORS_KEPT = 50;

// ---- Product matching ----

const PRODUCTS_BY_ID = `#graphql
  query ImportProductsById($ids: [ID!]!) {
    nodes(ids: $ids) { ... on Product { id title handle } }
  }`;

const PRODUCTS_BY_HANDLE = `#graphql
  query ImportProductsByHandle($query: String!) {
    products(first: 250, query: $query) { nodes { id title handle } }
  }`;

type ProductRef = { id: string; title: string };

/** Resolves numeric ids and handles from the file to existing products. */
async function resolveProducts(admin: AdminApiContext, rows: ImportRow[]) {
  const byId = new Map<string, ProductRef>();
  const byHandle = new Map<string, ProductRef>();

  const ids = [
    ...new Set(rows.map((r) => r.productId).filter(Boolean)),
  ] as string[];
  for (let i = 0; i < ids.length; i += 250) {
    const response = await admin.graphql(PRODUCTS_BY_ID, {
      variables: {
        ids: ids.slice(i, i + 250).map((id) => `gid://shopify/Product/${id}`),
      },
    });
    const { data } = await response.json();
    for (const node of data?.nodes ?? []) {
      if (node?.id) {
        const ref = { id: node.id, title: node.title };
        byId.set(node.id.split("/").pop()!, ref);
        byHandle.set(node.handle, ref);
      }
    }
  }

  // Handles only go into search queries when they're plain handle characters.
  const handles = [
    ...new Set(
      rows
        .map((r) => r.handle)
        .filter((h): h is string => !!h && /^[a-z0-9-]+$/.test(h)),
    ),
  ].filter((h) => !byHandle.has(h));
  for (let i = 0; i < handles.length; i += 50) {
    const query = handles
      .slice(i, i + 50)
      .map((h) => `handle:${h}`)
      .join(" OR ");
    const response = await admin.graphql(PRODUCTS_BY_HANDLE, {
      variables: { query },
    });
    const { data } = await response.json();
    for (const node of data?.products?.nodes ?? []) {
      byHandle.set(node.handle, { id: node.id, title: node.title });
    }
  }

  return (row: ImportRow) =>
    (row.productId && byId.get(row.productId)) ||
    (row.handle && byHandle.get(row.handle)) ||
    null;
}

// ---- Duplicates ----

const squash = (text: string) =>
  text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 200);

/**
 * A review is a duplicate if the same email already reviewed the product, or the
 * same rating and text already exist for it. Names aren't compared: apps often
 * drop or rename them on export (e.g. "Anonymous").
 */
function duplicateKeys(
  productId: string,
  r: { authorEmail: string | null; body: string; rating: number },
) {
  const keys = [`${productId}|text|${r.rating}|${squash(r.body)}`];
  if (r.authorEmail) keys.push(`${productId}|email|${r.authorEmail}`);
  return keys;
}

async function existingKeys(shopId: string, productIds: string[]) {
  const keys = new Set<string>();
  for (let i = 0; i < productIds.length; i += 500) {
    const existing = await db.review.findMany({
      where: { shopId, productId: { in: productIds.slice(i, i + 500) } },
      select: { productId: true, authorEmail: true, body: true, rating: true },
    });
    for (const r of existing) {
      for (const key of duplicateKeys(r.productId, {
        ...r,
        body: r.body ?? "",
      })) {
        keys.add(key);
      }
    }
  }
  return keys;
}

// ---- Analysis shared by preview and import ----

type Analysis = {
  mapping: Mapping;
  totalRows: number;
  toImport: { row: ImportRow; product: ProductRef }[];
  invalid: { line: number; error: string }[];
  unmatched: { line: number; product: string }[];
  duplicates: number;
};

async function analyze(
  admin: AdminApiContext,
  shopId: string,
  csv: string,
  source: ImportSourceId,
): Promise<Analysis | { error: string }> {
  const table = parseCsv(csv);
  if (table.headers.length === 0 || table.rows.length === 0) {
    return { error: "The file is empty or isn't a CSV." };
  }
  const mapping = detectMapping(table.headers);
  if (!mapping.rating || !mapping.body) {
    const missing = [
      !mapping.rating && "rating",
      !mapping.body && "review text",
    ]
      .filter(Boolean)
      .join(" and ");
    return {
      error: `Couldn't find a ${missing} column. Found columns: ${table.headers.slice(0, 15).join(", ")}.`,
    };
  }

  const results = readRows(table, mapping, source);
  const valid = results.flatMap((r) => (r.ok ? [r.row] : []));
  const invalid = results.flatMap((r) =>
    r.ok ? [] : [{ line: r.line, error: r.error }],
  );
  const productFor = await resolveProducts(admin, valid);

  const matched: { row: ImportRow; product: ProductRef }[] = [];
  const unmatched: { line: number; product: string }[] = [];
  for (const row of valid) {
    const product = productFor(row);
    if (product) matched.push({ row, product });
    else
      unmatched.push({
        line: row.line,
        product: row.handle ?? row.productId ?? "(no product)",
      });
  }

  const seen = await existingKeys(shopId, [
    ...new Set(matched.map((m) => m.product.id)),
  ]);
  let duplicates = 0;
  const toImport = matched.filter(({ row, product }) => {
    const keys = duplicateKeys(product.id, row);
    if (keys.some((key) => seen.has(key))) {
      duplicates++;
      return false;
    }
    for (const key of keys) seen.add(key); // also catches duplicates inside the file
    return true;
  });

  return {
    mapping,
    totalRows: table.rows.length,
    toImport,
    invalid,
    unmatched,
    duplicates,
  };
}

// ---- Preview ----

export async function createPreview(
  admin: AdminApiContext,
  domain: string,
  input: { filename: string; source: ImportSourceId; csv: string },
) {
  const shop = await db.shop.findUniqueOrThrow({
    where: { domain },
    select: { id: true },
  });
  const analysis = await analyze(admin, shop.id, input.csv, input.source);
  if ("error" in analysis) return { ok: false as const, error: analysis.error };

  // Only one preview at a time per shop; an abandoned one is replaced.
  await db.importJob.deleteMany({
    where: { shopId: shop.id, status: "PREVIEW" },
  });
  const job = await db.importJob.create({
    data: {
      shopId: shop.id,
      filename: input.filename.slice(0, 200),
      source: input.source,
      csv: input.csv,
      mapping: analysis.mapping as Prisma.InputJsonValue,
      totalRows: analysis.totalRows,
      summary: {
        rows: analysis.totalRows,
        toImport: analysis.toImport.length,
        duplicates: analysis.duplicates,
        invalid: analysis.invalid.length,
        unmatched: analysis.unmatched.length,
        unmatchedSamples: [
          ...new Set(analysis.unmatched.map((u) => u.product)),
        ].slice(0, 5),
        invalidSamples: analysis.invalid.slice(0, 5),
        sample: analysis.toImport.slice(0, 5).map(({ row, product }) => ({
          line: row.line,
          product: product.title,
          rating: row.rating,
          title: row.title,
          body: row.body.slice(0, 140),
          author: row.authorName,
          date: row.submittedAt?.toISOString() ?? null,
          status: row.fileStatus,
        })),
      },
    },
  });
  return { ok: true as const, jobId: job.id };
}

export async function confirmImport(
  domain: string,
  jobId: string,
  statusMode: StatusMode,
) {
  const { count } = await db.importJob.updateMany({
    where: { id: jobId, shop: { domain }, status: "PREVIEW" },
    data: { status: "QUEUED", statusMode },
  });
  if (count > 0) void processImports(); // start now; the worker would pick it up within a minute
  return count > 0;
}

export async function discardPreview(domain: string, jobId: string) {
  await db.importJob.deleteMany({
    where: { id: jobId, shop: { domain }, status: "PREVIEW" },
  });
}

export function listImports(domain: string) {
  return db.importJob.findMany({
    where: { shop: { domain } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      filename: true,
      source: true,
      status: true,
      summary: true,
      mapping: true,
      totalRows: true,
      imported: true,
      skipped: true,
      failed: true,
      errors: true,
      createdAt: true,
      finishedAt: true,
    },
  });
}

// ---- Background processing ----

function statusFor(mode: string, row: ImportRow): ReviewStatus {
  if (mode === "publish") return "PUBLISHED";
  if (mode === "pending") return "PENDING";
  return row.fileStatus ?? "PUBLISHED";
}

async function runImport(jobId: string) {
  const job = await db.importJob.findUniqueOrThrow({
    where: { id: jobId },
    include: { shop: { select: { id: true, domain: true } } },
  });
  const { admin } = await unauthenticated.admin(job.shop.domain);
  const analysis = await analyze(
    admin,
    job.shopId,
    job.csv ?? "",
    job.source as ImportSourceId,
  );
  if ("error" in analysis) throw new Error(analysis.error);

  let imported = 0;
  for (let i = 0; i < analysis.toImport.length; i += BATCH) {
    const batch = analysis.toImport.slice(i, i + BATCH);
    const { count } = await db.review.createMany({
      data: batch.map(({ row, product }) => {
        const status = statusFor(job.statusMode, row);
        const submittedAt = row.submittedAt ?? new Date();
        return {
          shopId: job.shopId,
          productId: product.id,
          authorName: row.authorName,
          authorEmail: row.authorEmail,
          rating: row.rating,
          title: row.title,
          body: row.body,
          status,
          // A CSV can't prove a purchase, so imported reviews are never "verified".
          verification: "UNVERIFIED" as const,
          source: "IMPORT" as const,
          submittedAt,
          publishedAt: status === "PUBLISHED" ? submittedAt : null,
          merchantReply: row.reply,
          merchantRepliedAt: row.reply ? (row.replyAt ?? submittedAt) : null,
        };
      }),
    });
    imported += count;
    await db.importJob.update({ where: { id: jobId }, data: { imported } });
  }

  // Refresh star ratings for every product that received published reviews.
  const published = new Set(
    analysis.toImport
      .filter(({ row }) => statusFor(job.statusMode, row) === "PUBLISHED")
      .map(({ product }) => product.id),
  );
  const syncErrors: string[] = [];
  for (const productId of published) {
    await syncProductRating(admin, job.shopId, productId).catch((error) => {
      syncErrors.push(
        `Rating sync failed for ${productId}: ${(error as Error).message}`,
      );
    });
  }

  const errors = [
    ...analysis.invalid.map((e) => `Line ${e.line}: ${e.error}`),
    ...analysis.unmatched.map(
      (u) => `Line ${u.line}: product not found (${u.product})`,
    ),
    ...syncErrors,
  ].slice(0, MAX_ERRORS_KEPT);

  await db.importJob.update({
    where: { id: jobId },
    data: {
      status: "COMPLETE",
      imported,
      skipped: analysis.duplicates,
      failed: analysis.invalid.length + analysis.unmatched.length,
      errors,
      csv: null, // don't keep customer data longer than needed
      finishedAt: new Date(),
    },
  });
}

let running = false;

/** Claims queued imports one at a time (SKIP LOCKED keeps app instances apart). */
export async function processImports() {
  if (running) return;
  running = true;
  try {
    // Re-queue imports interrupted by a restart. Duplicate detection makes a re-run
    // skip reviews that were already inserted.
    await db.importJob.updateMany({
      where: {
        status: "RUNNING",
        startedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) },
      },
      data: { status: "QUEUED" },
    });
    for (;;) {
      const [claimed] = await db.$queryRaw<{ id: string }[]>`
        UPDATE "ImportJob" SET "status" = 'RUNNING', "startedAt" = now()
        WHERE "id" = (
          SELECT "id" FROM "ImportJob" WHERE "status" = 'QUEUED'
          ORDER BY "createdAt" LIMIT 1 FOR UPDATE SKIP LOCKED
        )
        RETURNING "id"`;
      if (!claimed) break;
      try {
        await runImport(claimed.id);
      } catch (error) {
        console.error(`[imports] ${claimed.id} failed`, error);
        await db.importJob.update({
          where: { id: claimed.id },
          data: {
            status: "FAILED",
            errors: [String((error as Error).message ?? error).slice(0, 500)],
            csv: null,
            finishedAt: new Date(),
          },
        });
      }
    }
  } finally {
    running = false;
  }
}

/** Downloadable template: Judge.me's import columns, which our export also uses. */
export function templateCsv() {
  const example = [
    "Love it",
    "Great quality and fast shipping.",
    "5",
    "24/12/2025",
    "Jane Doe",
    "jane@example.com",
    "",
    "your-product-handle",
    "Thank you, Jane!",
    "26/12/2025",
    "",
    "ok",
    "no",
  ];
  return [
    EXPORT_COLUMNS.join(","),
    example.map((v) => `"${v}"`).join(","),
  ].join("\r\n");
}
