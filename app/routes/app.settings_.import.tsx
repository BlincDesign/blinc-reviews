import { useEffect, useRef, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useRevalidator,
} from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { SettingsShell } from "../features/settings/SettingsShell";
import {
  confirmImport,
  createPreview,
  discardPreview,
  listImports,
} from "../features/imports/imports.server";
import { decodeCsv } from "../features/imports/decode.server";
import {
  ENCODINGS,
  IMPORT_SOURCES,
  MAX_IMPORT_BYTES,
  STATUS_MODES,
  type EncodingId,
  type ImportSourceId,
  type StatusMode,
} from "../features/imports/sources";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const jobs = await listImports(session.shop);
  return {
    jobs: jobs.map((job) => ({
      ...job,
      createdAt: job.createdAt.toISOString(),
      finishedAt: job.finishedAt?.toISOString() ?? null,
    })),
  };
};

const SOURCE_IDS = IMPORT_SOURCES.map((s) => s.id) as readonly string[];
const MODE_IDS = STATUS_MODES.map((m) => m.id) as readonly string[];
const ENCODING_IDS = ENCODINGS.map((e) => e.id) as readonly string[];

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "preview") {
    const file = form.get("file");
    const source = String(form.get("source"));
    const encoding = String(form.get("encoding"));
    if (form.get("confirmGenuine") !== "true") {
      return {
        ok: false as const,
        message: "Confirm the reviews are genuine and you may import them.",
      };
    }
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false as const, message: "Choose a CSV file to import." };
    }
    if (!/\.(csv|txt)$/i.test(file.name)) {
      return {
        ok: false as const,
        message: "Upload a .csv file. In Excel, use File → Save as → CSV.",
      };
    }
    if (file.size > MAX_IMPORT_BYTES) {
      return {
        ok: false as const,
        message: "The file is larger than 20 MB. Split it and import in parts.",
      };
    }
    if (!SOURCE_IDS.includes(source)) {
      return {
        ok: false as const,
        message: "Choose where your reviews come from.",
      };
    }
    const result = await createPreview(admin, session.shop, {
      filename: file.name,
      source: source as ImportSourceId,
      csv: decodeCsv(
        await file.arrayBuffer(),
        (ENCODING_IDS.includes(encoding) ? encoding : "auto") as EncodingId,
      ),
    });
    return result.ok
      ? { ok: true as const, message: "" }
      : { ok: false as const, message: result.error };
  }

  const jobId = String(form.get("jobId") ?? "");
  if (intent === "import") {
    const mode = String(form.get("statusMode"));
    const started = await confirmImport(
      session.shop,
      jobId,
      (MODE_IDS.includes(mode) ? mode : "file") as StatusMode,
    );
    return started
      ? { ok: true as const, message: "Import started" }
      : {
          ok: false as const,
          message: "This preview has expired. Upload the file again.",
        };
  }
  if (intent === "discard") {
    await discardPreview(session.shop, jobId);
    return { ok: true as const, message: "" };
  }
  return { ok: false as const, message: "Unknown action" };
};

type Job = ReturnType<typeof useLoaderData<typeof loader>>["jobs"][number];
type Source = (typeof IMPORT_SOURCES)[number];

type Summary = {
  rows: number;
  toImport: number;
  duplicates: number;
  invalid: number;
  unmatched: number;
  unmatchedSamples: string[];
  invalidSamples: { line: number; error: string }[];
  sample: {
    line: number;
    product: string;
    rating: number;
    title: string | null;
    body: string;
    author: string;
    date: string | null;
  }[];
};

const FIELD_LABELS: Record<string, string> = {
  rating: "Rating",
  body: "Review text",
  title: "Title",
  name: "Reviewer name",
  email: "Reviewer email",
  date: "Review date",
  productId: "Product ID",
  handle: "Product handle",
  productUrl: "Product URL",
  status: "Status",
  reply: "Reply",
  replyDate: "Reply date",
};

const STATUS_BADGE = {
  PREVIEW: { tone: "info", label: "Preview" },
  QUEUED: { tone: "info", label: "Queued" },
  RUNNING: { tone: "info", label: "Importing…" },
  COMPLETE: { tone: "success", label: "Import complete" },
  FAILED: { tone: "critical", label: "Failed" },
} as const;

// The apps list shows other review apps; spreadsheet and store-to-store have their own cards.
const APP_SOURCES = IMPORT_SOURCES.filter(
  (s) => s.id !== "spreadsheet" && s.id !== "blinc",
);
const SPREADSHEET = IMPORT_SOURCES.find((s) => s.id === "spreadsheet")!;
const OTHER_STORE = IMPORT_SOURCES.find((s) => s.id === "blinc")!;
const sourceName = (id: string) =>
  IMPORT_SOURCES.find((s) => s.id === id)?.name ?? id;
const dateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const PAGE_CSS = `
.bi-card { display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: center; }
.bi-tiles { display: flex; gap: 8px; margin-bottom: 12px; }
.bi-tile { display: inline-grid; place-items: center; inline-size: 40px; block-size: 40px; border-radius: 8px;
  color: #fff; font: 700 14px/1 system-ui, sans-serif; letter-spacing: -0.02em; flex: none; }
.bi-tile--logo { object-fit: cover; background: #fff; box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.08); }
.bi-tile--sm { inline-size: 32px; block-size: 32px; font-size: 12px; border-radius: 6px; }
.bi-app-row { display: flex; gap: 12px; align-items: center; inline-size: 100%; padding: 12px 4px;
  border: 0; border-bottom: 1px solid #e3e3e3; background: none; font: inherit; color: inherit;
  cursor: pointer; text-align: start; }
.bi-app-row:hover, .bi-app-row:focus-visible { background: #f6f6f7; }
.bi-app-row span { color: #2c6ecb; }
.bi-steps { margin: 0; padding-inline-start: 20px; display: grid; gap: 4px; }
.bi-stats { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
.bi-stat { display: grid; gap: 2px; }
.bi-stat strong { font-size: 22px; }
@media (max-width: 640px) { .bi-card { grid-template-columns: 1fr; } }
`;

function Tile({ source, small = false }: { source: Source; small?: boolean }) {
  const [broken, setBroken] = useState(false);
  const className = `bi-tile${small ? " bi-tile--sm" : ""}`;

  if (source.logo && !broken) {
    return (
      <img
        className={`${className} bi-tile--logo`}
        src={source.logo}
        alt=""
        width={small ? 32 : 40}
        height={small ? 32 : 40}
        loading="lazy"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span
      className={className}
      style={{ background: source.color }}
      aria-hidden="true"
    >
      {source.mark}
    </span>
  );
}

function useToast(fetcher: {
  state: string;
  data?: { ok: boolean; message: string };
}) {
  const shopify = useAppBridge();
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.message) {
      shopify.toast.show(fetcher.data.message, { isError: !fetcher.data.ok });
    }
  }, [fetcher.state, fetcher.data, shopify]);
}

async function downloadTemplate(onError: () => void) {
  try {
    const response = await fetch("/app/import-template");
    if (!response.ok) throw new Error(String(response.status));
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = "blinc-reviews-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  } catch {
    onError();
  }
}

/** "Import reviews from Loox": steps, file, encoding, genuine-reviews confirmation. */
function ImportDialog({
  source,
  modalRef,
}: {
  source: Source | null;
  modalRef: React.RefObject<HTMLElementTagNameMap["s-modal"]>;
}) {
  const shopify = useAppBridge();
  const upload = useFetcher<typeof action>();
  useToast(upload);
  const [file, setFile] = useState<File | null>(null);
  const [encoding, setEncoding] = useState<EncodingId>("auto");
  const [confirmed, setConfirmed] = useState(false);

  // Fresh dialog for each app.
  useEffect(() => {
    setFile(null);
    setConfirmed(false);
    setEncoding("auto");
  }, [source?.id]);

  useEffect(() => {
    if (upload.state === "idle" && upload.data?.ok)
      modalRef.current?.hideOverlay();
  }, [upload.state, upload.data, modalRef]);

  const submit = () => {
    if (!file || !source || !confirmed) return;
    const form = new FormData();
    form.set("intent", "preview");
    form.set("source", source.id);
    form.set("encoding", encoding);
    form.set("confirmGenuine", "true");
    form.set("file", file);
    upload.submit(form, { method: "post", encType: "multipart/form-data" });
  };

  const isSpreadsheet = source?.id === "spreadsheet";

  return (
    <s-modal
      ref={modalRef}
      id="import-dialog"
      heading={
        !source
          ? "Import reviews"
          : isSpreadsheet
            ? "Import from a spreadsheet"
            : source.id === "blinc"
              ? "Import from another store"
              : `Import reviews from ${source.name}`
      }
    >
      {source ? (
        <s-stack gap="base">
          <ol className="bi-steps">
            <li>{source.export}</li>
            <li>
              Upload the file below. You&apos;ll see a preview before anything
              is imported.
            </li>
          </ol>
          {isSpreadsheet ? (
            <s-box>
              <s-button
                icon="download"
                onClick={() =>
                  downloadTemplate(() =>
                    shopify.toast.show("Couldn't download the template.", {
                      isError: true,
                    }),
                  )
                }
              >
                Download template
              </s-button>
            </s-box>
          ) : null}
          <s-drop-zone
            label="Review file"
            labelAccessibilityVisibility="exclusive"
            accept=".csv,text/csv"
            onChange={(event) => setFile(event.currentTarget.files[0] ?? null)}
          />
          <s-text color="subdued">
            {file
              ? `Selected: ${file.name} (${Math.ceil(file.size / 1024)} KB)`
              : "Accepts .csv up to 20 MB. Excel files: use File → Save as → CSV first."}
          </s-text>
          <div style={{ maxInlineSize: 320 }}>
            <s-select
              label="File encoding"
              onChange={(event) =>
                setEncoding(event.currentTarget.value as EncodingId)
              }
            >
              {ENCODINGS.map((e) => (
                <s-option
                  key={e.id}
                  value={e.id}
                  defaultSelected={e.id === encoding}
                >
                  {e.label}
                </s-option>
              ))}
            </s-select>
          </div>
          <s-checkbox
            label="I confirm these reviews are genuine customer reviews and I have permission to import them"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.currentTarget.checked)}
          />
        </s-stack>
      ) : null}
      <s-button
        slot="primary-action"
        variant="primary"
        disabled={!file || !confirmed}
        loading={upload.state !== "idle"}
        onClick={submit}
      >
        Preview import
      </s-button>
      <s-button
        slot="secondary-actions"
        commandFor="import-dialog"
        command="--hide"
      >
        Cancel
      </s-button>
    </s-modal>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <s-box border="base" borderRadius="base" padding="base">
      <div className="bi-stat">
        <s-text color="subdued">{label}</s-text>
        <strong>{value}</strong>
      </div>
    </s-box>
  );
}

function Preview({ job }: { job: Job }) {
  const fetcher = useFetcher<typeof action>();
  useToast(fetcher);
  const [mode, setMode] = useState<StatusMode>("file");
  const summary = job.summary as Summary;
  const mapping = job.mapping as Record<string, string>;
  const source = IMPORT_SOURCES.find((s) => s.id === job.source);

  return (
    <s-section>
      <s-stack gap="base">
        <s-stack direction="inline" gap="base" alignItems="center">
          {source ? <Tile source={source} /> : null}
          <s-stack gap="small-300">
            <s-heading>Review your import</s-heading>
            <s-text color="subdued">
              {job.filename} · {sourceName(job.source)} · nothing has been
              imported yet
            </s-text>
          </s-stack>
        </s-stack>

        <div className="bi-stats">
          <Stat label="Rows in file" value={summary.rows} />
          <Stat label="Ready to import" value={summary.toImport} />
          <Stat label="Duplicates skipped" value={summary.duplicates} />
          <Stat label="Products not found" value={summary.unmatched} />
          <Stat label="Invalid rows" value={summary.invalid} />
        </div>

        {summary.unmatched > 0 ? (
          <s-banner
            tone="warning"
            heading={`${summary.unmatched} reviews are for products we couldn't find`}
          >
            They&apos;ll be skipped. Examples:{" "}
            {summary.unmatchedSamples.join(", ")}. Check the product handles or
            IDs in your file match this store.
          </s-banner>
        ) : null}
        {summary.invalid > 0 ? (
          <s-banner
            tone="warning"
            heading={`${summary.invalid} rows can't be imported`}
          >
            {summary.invalidSamples
              .map((s) => `Line ${s.line}: ${s.error}`)
              .join(" · ")}
          </s-banner>
        ) : null}

        <s-stack gap="small-200">
          <s-text type="strong">Columns we matched</s-text>
          <s-stack direction="inline" gap="small-200">
            {Object.entries(mapping).map(([field, header]) => (
              <s-badge key={field}>
                {FIELD_LABELS[field] ?? field} ← {header}
              </s-badge>
            ))}
          </s-stack>
        </s-stack>

        {summary.sample.length > 0 ? (
          <s-table>
            <s-table-header-row>
              <s-table-header>Line</s-table-header>
              <s-table-header listSlot="primary">Review</s-table-header>
              <s-table-header>Product</s-table-header>
              <s-table-header>Reviewer</s-table-header>
              <s-table-header>Date</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {summary.sample.map((row) => (
                <s-table-row key={row.line}>
                  <s-table-cell>{row.line}</s-table-cell>
                  <s-table-cell>
                    <s-stack gap="small-300">
                      <span style={{ color: "#f59e0b" }}>
                        {"★".repeat(row.rating)}
                        <span style={{ color: "#d1d5db" }}>
                          {"★".repeat(5 - row.rating)}
                        </span>
                      </span>
                      {row.title ? (
                        <s-text type="strong">{row.title}</s-text>
                      ) : null}
                      <s-text>{row.body}</s-text>
                    </s-stack>
                  </s-table-cell>
                  <s-table-cell>{row.product}</s-table-cell>
                  <s-table-cell>{row.author}</s-table-cell>
                  <s-table-cell>
                    {row.date
                      ? new Date(row.date).toLocaleDateString()
                      : "Today"}
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        ) : null}

        <div style={{ maxInlineSize: 420 }}>
          <s-select
            label="Status of imported reviews"
            onChange={(event) =>
              setMode(event.currentTarget.value as StatusMode)
            }
          >
            {STATUS_MODES.map((m) => (
              <s-option key={m.id} value={m.id} defaultSelected={m.id === mode}>
                {m.label}
              </s-option>
            ))}
          </s-select>
        </div>
        <s-text color="subdued">
          Imported reviews aren&apos;t marked as Verified buyer, because a file
          can&apos;t prove a purchase.
        </s-text>

        <s-stack direction="inline" gap="small-200">
          <s-button
            variant="primary"
            disabled={summary.toImport === 0}
            loading={fetcher.state !== "idle"}
            onClick={() =>
              fetcher.submit(
                { intent: "import", jobId: job.id, statusMode: mode },
                { method: "post" },
              )
            }
          >
            {`Import ${summary.toImport} review${summary.toImport === 1 ? "" : "s"}`}
          </s-button>
          <s-button
            onClick={() =>
              fetcher.submit(
                { intent: "discard", jobId: job.id },
                { method: "post" },
              )
            }
          >
            Cancel
          </s-button>
        </s-stack>
      </s-stack>
    </s-section>
  );
}

function ImportLog({ jobs }: { jobs: Job[] }) {
  const done = jobs.filter((job) => job.status !== "PREVIEW");
  return (
    <s-section heading="Import log">
      {done.length === 0 ? (
        <s-paragraph>Your imports will be listed here.</s-paragraph>
      ) : (
        <s-table>
          <s-table-header-row>
            <s-table-header listSlot="primary">File</s-table-header>
            <s-table-header>Date</s-table-header>
            <s-table-header>Source</s-table-header>
            <s-table-header>Rows in file</s-table-header>
            <s-table-header>Imported</s-table-header>
            <s-table-header>Duplicates skipped</s-table-header>
            <s-table-header>Failed</s-table-header>
            <s-table-header listSlot="inline">Status</s-table-header>
          </s-table-header-row>
          <s-table-body>
            {done.map((job) => (
              <s-table-row key={job.id}>
                <s-table-cell>
                  <s-stack gap="small-300">
                    <s-text>{job.filename}</s-text>
                    {(job.errors as string[]).length > 0 ? (
                      <s-text color="subdued">
                        {(job.errors as string[]).slice(0, 2).join(" · ")}
                      </s-text>
                    ) : null}
                  </s-stack>
                </s-table-cell>
                <s-table-cell>
                  {dateTime.format(new Date(job.createdAt))}
                </s-table-cell>
                <s-table-cell>{sourceName(job.source)}</s-table-cell>
                <s-table-cell>{job.totalRows}</s-table-cell>
                <s-table-cell>{job.imported}</s-table-cell>
                <s-table-cell>{job.skipped}</s-table-cell>
                <s-table-cell>{job.failed}</s-table-cell>
                <s-table-cell>
                  <s-badge tone={STATUS_BADGE[job.status].tone}>
                    {STATUS_BADGE[job.status].label}
                  </s-badge>
                </s-table-cell>
              </s-table-row>
            ))}
          </s-table-body>
        </s-table>
      )}
    </s-section>
  );
}

export default function ImportPage() {
  const { jobs } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const shopify = useAppBridge();

  const [view, setView] = useState<"home" | "apps">("home");
  const [source, setSource] = useState<Source | null>(null);
  const [query, setQuery] = useState("");
  const dialog = useRef<HTMLElementTagNameMap["s-modal"]>(null);

  const preview = jobs.find((job) => job.status === "PREVIEW");
  const busy = jobs.some(
    (job) => job.status === "QUEUED" || job.status === "RUNNING",
  );

  // Poll while an import runs in the background.
  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => {
      if (revalidator.state === "idle") revalidator.revalidate();
    }, 3000);
    return () => clearInterval(timer);
  }, [busy, revalidator]);

  const open = (next: Source) => {
    setSource(next);
    requestAnimationFrame(() => dialog.current?.showOverlay());
  };

  const apps = APP_SOURCES.filter((s) =>
    s.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <SettingsShell
      heading={
        view === "apps" && !preview ? "From review apps" : "Import reviews"
      }
      actions={
        <s-button
          slot="secondary-actions"
          onClick={() =>
            view === "apps" ? setView("home") : navigate("/app/reviews")
          }
        >
          {view === "apps" ? "Back" : "Back to reviews"}
        </s-button>
      }
    >
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />

      <s-stack gap="base">
        {preview ? (
          <Preview job={preview} />
        ) : view === "apps" ? (
          <s-section heading="Import reviews from a CSV file">
            <s-stack gap="base">
              <s-text color="subdued">
                Export reviews from your current reviews app, then import them
                here.
              </s-text>
              <s-search-field
                label="Search apps"
                labelAccessibilityVisibility="exclusive"
                placeholder="Search app"
                onInput={(event) => setQuery(event.currentTarget.value)}
              />
              <div>
                {apps.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    className="bi-app-row"
                    onClick={() => open(app)}
                  >
                    <Tile source={app} small />
                    <span>{app.name}</span>
                  </button>
                ))}
                {apps.length === 0 ? (
                  <s-text color="subdued">
                    No match. Choose &quot;Another app&quot; to import any CSV
                    with a rating and review text.
                  </s-text>
                ) : null}
              </div>
            </s-stack>
          </s-section>
        ) : (
          <s-section heading="Import reviews">
            <s-stack gap="base">
              <s-box border="base" borderRadius="base" padding="base">
                <div className="bi-card">
                  <div>
                    <div className="bi-tiles">
                      {APP_SOURCES.slice(0, 5).map((app) => (
                        <Tile key={app.id} source={app} />
                      ))}
                    </div>
                    <s-stack gap="small-200">
                      <s-text type="strong">From review apps</s-text>
                      <s-text color="subdued">
                        Bring your reviews from Judge.me, Loox, Yotpo, Okendo,
                        Stamped and others.
                      </s-text>
                    </s-stack>
                  </div>
                  <s-button onClick={() => setView("apps")}>
                    Import from apps
                  </s-button>
                </div>
              </s-box>
              <s-box border="base" borderRadius="base" padding="base">
                <div className="bi-card">
                  <div>
                    <div className="bi-tiles">
                      <Tile source={SPREADSHEET} />
                    </div>
                    <s-stack gap="small-200">
                      <s-text type="strong">From a spreadsheet</s-text>
                      <s-text color="subdued">
                        Add your own reviews to our template (it matches
                        Judge.me&apos;s import format).
                      </s-text>
                    </s-stack>
                  </div>
                  <s-stack direction="inline" gap="small-200">
                    <s-button
                      icon="download"
                      onClick={() =>
                        downloadTemplate(() =>
                          shopify.toast.show(
                            "Couldn't download the template.",
                            { isError: true },
                          ),
                        )
                      }
                    >
                      Template
                    </s-button>
                    <s-button onClick={() => open(SPREADSHEET)}>
                      Import from a spreadsheet
                    </s-button>
                  </s-stack>
                </div>
              </s-box>
              <s-box border="base" borderRadius="base" padding="base">
                <div className="bi-card">
                  <div>
                    <div className="bi-tiles">
                      <Tile source={OTHER_STORE} />
                    </div>
                    <s-stack gap="small-200">
                      <s-text type="strong">
                        From another store you own that uses Blinc Reviews
                      </s-text>
                      <s-text color="subdued">
                        Copy reviews between your stores. Products are matched
                        by handle.
                      </s-text>
                    </s-stack>
                  </div>
                  <s-button onClick={() => open(OTHER_STORE)}>
                    Import from another store
                  </s-button>
                </div>
              </s-box>
            </s-stack>
          </s-section>
        )}

        <ImportLog jobs={jobs} />
      </s-stack>

      <ImportDialog source={source} modalRef={dialog} />
    </SettingsShell>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
