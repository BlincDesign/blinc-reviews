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
  useSearchParams,
} from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";

import db from "../db.server";
import { authenticate } from "../shopify.server";
import {
  getProductTitles,
  editReview,
  hasAnyReviews,
  listReviews,
  listTags,
  moderateReviews,
  resyncReview,
  saveReply,
  saveTags,
} from "../features/reviews/reviews.server";
import {
  DATE_RANGES,
  isModerationIntent,
  PAGE_SIZE,
  parseFilters,
  EDIT_LIMITS,
  MAX_TAGS,
  normalizeTags,
  REPLY_MAX_LENGTH,
  STATUS_FILTERS,
  SUGGESTED_TAGS,
  type StatusFilter,
} from "../features/reviews/reviews";
import { deletePhoto, thumbKey } from "../features/media/photos.server";
import { syncProductRating } from "../features/reviews/ratings.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const filters = parseFilters(new URL(request.url).searchParams);

  const [page, anyReviews, settings, tags] = await Promise.all([
    listReviews(session.shop, filters),
    hasAnyReviews(session.shop),
    db.shopSettings.findFirst({
      where: { shop: { domain: session.shop } },
      select: { autoPublishMinRating: true },
    }),
    listTags(session.shop),
  ]);
  const productTitles = await getProductTitles(
    admin,
    page.reviews.map((r) => r.productId),
  );

  return {
    filters,
    anyReviews,
    autoPublishMinRating: settings?.autoPublishMinRating ?? 0,
    tags,
    ...page,
    productTitles,
    reviews: page.reviews.map(({ media, ...r }) => ({
      ...r,
      photos: media.map((m) => ({
        id: m.id,
        full: `/m/${m.storageKey}`,
        thumb: `/m/${thumbKey(m.storageKey)}`,
      })),
      submittedAt: r.submittedAt.toISOString(),
      publishedAt: r.publishedAt?.toISOString() ?? null,
      editedAt: r.editedAt?.toISOString() ?? null,
    })),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get("intent");
  const ids = form.getAll("id").map(String);

  if (intent === "tags") {
    const saved = await saveTags(session.shop, String(form.get("id")), {
      tags: String(form.get("tags") ?? ""),
      favorite: form.get("favorite") === "true",
      pinned: form.get("pinned") === "true",
    });
    if (saved) await resyncReview(admin, session.shop, String(form.get("id")));
    return saved
      ? { ok: true as const, message: "Tags saved" }
      : { ok: false as const, message: "Review not found." };
  }

  if (intent === "edit") {
    const result = await editReview(session.shop, String(form.get("id")), {
      authorName: String(form.get("authorName") ?? ""),
      title: String(form.get("title") ?? ""),
      body: String(form.get("body") ?? ""),
    });
    if (result.ok)
      await resyncReview(admin, session.shop, String(form.get("id")));
    return result.ok
      ? { ok: true as const, message: "Review updated" }
      : { ok: false as const, message: result.message };
  }

  if (intent === "delete-photo") {
    const review = await deletePhoto(session.shop, String(form.get("mediaId")));
    if (!review) return { ok: false as const, message: "Photo not found." };
    // Refresh the product's photo strip; the photo itself is already gone.
    await syncProductRating(admin, review.shopId, review.productId).catch(
      (error) => console.error("[photos] rating sync failed", error),
    );
    return { ok: true as const, message: "Photo deleted" };
  }

  if (intent === "reply") {
    const saved = await saveReply(
      session.shop,
      String(form.get("id")),
      String(form.get("reply") ?? ""),
    );
    if (saved) await resyncReview(admin, session.shop, String(form.get("id")));
    return saved
      ? { ok: true as const, message: "Reply saved" }
      : { ok: false as const, message: "Review not found." };
  }

  if (!isModerationIntent(intent) || ids.length === 0) {
    return { ok: false as const, message: "Nothing to update." };
  }

  const { updated, failedProducts } = await moderateReviews(
    admin,
    session.shop,
    ids,
    intent,
  );
  const noun = updated === 1 ? "review" : "reviews";
  const verb = {
    publish: "published",
    pending: "moved to pending",
    hide: "hidden",
    reject: "rejected",
    pin: "pinned",
    unpin: "unpinned",
    archive: "archived",
    unarchive: "restored to Pending",
    favorite: "added to favorites",
    unfavorite: "removed from favorites",
    delete: "deleted",
  }[intent];
  return failedProducts.length > 0
    ? {
        ok: false as const,
        message: "Saved, but star ratings didn't update. Try again.",
      }
    : { ok: true as const, message: `${updated} ${noun} ${verb}` };
};

const STATUS_LABELS: Record<StatusFilter, string> = {
  ALL: "All reviews",
  PENDING: "Pending",
  PUBLISHED: "Published",
  HIDDEN: "Hidden",
  ARCHIVED: "Archive",
};

const STATUS_HELP: Record<StatusFilter, string> = {
  ALL: "Every review except archived ones.",
  PENDING: "Waiting for your approval. Not shown on your store.",
  PUBLISHED: "Live on your store and counted in your star rating.",
  HIDDEN:
    "Not shown on your store. Use for spam, abuse or reviews you don't want live.",
  ARCHIVED:
    "Moved out of your main list. Not shown on your store. Restore to review again.",
};

const STATUS_BADGE = {
  PENDING: { tone: "warning", label: "Pending" },
  PUBLISHED: { tone: "success", label: "Published" },
  HIDDEN: { tone: "neutral", label: "Hidden" },
  REJECTED: { tone: "neutral", label: "Hidden" },
  ARCHIVED: { tone: "neutral", label: "Archived" },
} as const;

const SOURCE_LABELS = {
  WEB: "Product page",
  EMAIL: "Review request",
  IMPORT: "Imported",
} as const;

const PAGE_CSS = `
.br-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--p-color-border, #e3e3e3); }
.br-tab { padding: 10px 14px; border: 0; background: none; font: inherit; cursor: pointer; color: inherit;
  border-bottom: 2px solid transparent; }
.br-tab[aria-current="page"] { border-bottom-color: currentColor; font-weight: 600; }
.br-status { display: flex; flex-wrap: wrap; gap: 4px; }
.br-filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
/* Polaris components lay out as display: contents, so size plain wrappers instead. */
.br-filter { flex: 0 0 150px; width: 150px; }
.br-search { flex: 1 1 240px; min-width: 200px; }
.br-status-select { inline-size: 140px; }
.br-review { display: grid; gap: 4px; max-inline-size: 640px; overflow-wrap: anywhere; }
.br-reply { padding-inline-start: 10px; border-inline-start: 3px solid #d1d5db; }
.br-photos { display: flex; flex-wrap: wrap; gap: 8px; padding-block: 4px; }
.br-photo { position: relative; }
.br-photo img { display: block; width: 48px; height: 48px; object-fit: cover; border-radius: 8px; background: #f1f1f1; }
.br-photo[data-armed] img { outline: 2px solid #c70a24; outline-offset: 1px; }
.br-photo__delete { position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; padding: 0; border: 0; border-radius: 50%; background: #303030; color: #fff; font-size: 13px; line-height: 20px; cursor: pointer; opacity: 0; transition: opacity .1s; }
.br-photo:hover .br-photo__delete, .br-photo__delete:focus-visible, .br-photo[data-armed] .br-photo__delete { opacity: 1; }
.br-photo[data-armed] .br-photo__delete { background: #c70a24; }
.br-visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.br-bulk { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
`;

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

function Stars({ rating }: { rating: number }) {
  return (
    <span
      role="img"
      aria-label={`${rating} out of 5 stars`}
      style={{ color: "#f59e0b" }}
    >
      {"★".repeat(rating)}
      <span style={{ color: "#d1d5db" }}>{"★".repeat(5 - rating)}</span>
    </span>
  );
}

function useResultToast(fetcher: {
  state: string;
  data?: { ok: boolean; message: string };
}) {
  const shopify = useAppBridge();
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      shopify.toast.show(fetcher.data.message, { isError: !fetcher.data.ok });
    }
  }, [fetcher.state, fetcher.data, shopify]);
}

function ReplyModal({
  id,
  reply,
  author,
}: {
  id: string;
  reply: string | null;
  author: string;
}) {
  const fetcher = useFetcher<typeof action>();
  const modal = useRef<HTMLElementTagNameMap["s-modal"]>(null);
  const modalId = `reply-${id}`;
  useResultToast(fetcher);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok)
      modal.current?.hideOverlay();
  }, [fetcher.state, fetcher.data]);

  return (
    <>
      <s-button commandFor={modalId} command="--show">
        {reply ? "Edit reply" : "Reply"}
      </s-button>
      <s-modal ref={modal} id={modalId} heading={`Reply to ${author}`}>
        <fetcher.Form method="post" id={`${modalId}-form`}>
          <input type="hidden" name="intent" value="reply" />
          <input type="hidden" name="id" value={id} />
          <s-text-area
            name="reply"
            label="Public reply"
            details="Shown under the review on your store. The reviewer gets an email if reply notifications are on. Leave empty to remove it."
            rows={4}
            maxLength={REPLY_MAX_LENGTH}
            defaultValue={reply ?? ""}
          />
        </fetcher.Form>
        <s-button
          slot="primary-action"
          variant="primary"
          loading={fetcher.state !== "idle"}
          onClick={() =>
            fetcher.submit(
              document.getElementById(`${modalId}-form`) as HTMLFormElement,
            )
          }
        >
          Save reply
        </s-button>
        <s-button
          slot="secondary-actions"
          commandFor={modalId}
          command="--hide"
        >
          Cancel
        </s-button>
      </s-modal>
    </>
  );
}

const STATUS_INTENT = {
  PUBLISHED: "publish",
  PENDING: "pending",
  HIDDEN: "hide",
  REJECTED: "hide",
  ARCHIVED: "archive",
} as const;

function StatusSelect({
  id,
  status,
}: {
  id: string;
  status: keyof typeof STATUS_BADGE;
}) {
  const fetcher = useFetcher<typeof action>();
  useResultToast(fetcher);

  return (
    <div className="br-status-select">
      <s-select
        label="Status"
        labelAccessibilityVisibility="exclusive"
        disabled={fetcher.state !== "idle"}
        onChange={(event) => {
          const next = event.currentTarget.value as keyof typeof STATUS_INTENT;
          fetcher.submit(
            { intent: STATUS_INTENT[next], id },
            { method: "post" },
          );
        }}
      >
        {(["PENDING", "PUBLISHED", "HIDDEN"] as const).map((value) => (
          <s-option
            key={value}
            value={value}
            defaultSelected={
              value === status || (value === "HIDDEN" && status === "REJECTED")
            }
          >
            {STATUS_BADGE[value].label}
          </s-option>
        ))}
        {status === "ARCHIVED" ? (
          <s-option value="ARCHIVED" defaultSelected disabled>
            Archived
          </s-option>
        ) : null}
      </s-select>
    </div>
  );
}

type ReviewRow = ReturnType<
  typeof useLoaderData<typeof loader>
>["reviews"][number];
function ReviewPhotos({ photos }: { photos: ReviewRow["photos"] }) {
  const fetcher = useFetcher<typeof action>();
  useResultToast(fetcher);
  // Deleting is permanent, so the first click only arms the button.
  const [armed, setArmed] = useState<string | null>(null);

  return (
    <div className="br-photos">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="br-photo"
          data-armed={armed === photo.id || undefined}
        >
          <a href={photo.full} target="_blank" rel="noreferrer">
            <img
              src={photo.thumb}
              alt="Customer upload"
              width={48}
              height={48}
            />
          </a>
          <button
            type="button"
            className="br-photo__delete"
            aria-label={
              armed === photo.id ? "Confirm delete photo" : "Delete photo"
            }
            title={
              armed === photo.id ? "Click again to delete" : "Delete photo"
            }
            disabled={fetcher.state !== "idle"}
            onClick={() => {
              if (armed !== photo.id) return setArmed(photo.id);
              setArmed(null);
              fetcher.submit(
                { intent: "delete-photo", mediaId: photo.id },
                { method: "post" },
              );
            }}
            onBlur={() => setArmed(null)}
          >
            {armed === photo.id ? "✓" : "×"}
          </button>
        </div>
      ))}
    </div>
  );
}

type Dialog = "edit" | "tags" | "details";

function RowMenu({
  review,
  onOpen,
  onDelete,
}: {
  review: ReviewRow;
  onOpen: (dialog: Dialog) => void;
  onDelete: () => void;
}) {
  const fetcher = useFetcher<typeof action>();
  useResultToast(fetcher);
  const menuId = `menu-${review.id}`;
  const run = (intent: string) =>
    fetcher.submit({ intent, id: review.id }, { method: "post" });
  const archived = review.status === "ARCHIVED";

  return (
    <>
      <s-button
        icon="menu-horizontal"
        accessibilityLabel="More actions"
        commandFor={menuId}
      />
      <s-menu id={menuId} accessibilityLabel="Review actions">
        <s-button
          icon="pin"
          onClick={() => run(review.pinned ? "unpin" : "pin")}
        >
          {review.pinned ? "Unpin from top" : "Pin to top"}
        </s-button>
        <s-button
          icon="archive"
          onClick={() => run(archived ? "unarchive" : "archive")}
        >
          {archived ? "Restore from archive" : "Archive"}
        </s-button>
        <s-button icon="edit" onClick={() => onOpen("edit")}>
          Edit review
        </s-button>
        <s-button
          icon={review.favorite ? "star" : "star-filled"}
          onClick={() => run(review.favorite ? "unfavorite" : "favorite")}
        >
          {review.favorite ? "Remove from featured" : "Feature review"}
        </s-button>
        <s-button icon="hashtag" onClick={() => onOpen("tags")}>
          Edit tags
        </s-button>
        <s-button icon="view" onClick={() => onOpen("details")}>
          View review details
        </s-button>
        <s-button icon="delete" tone="critical" onClick={onDelete}>
          Delete review
        </s-button>
      </s-menu>
    </>
  );
}

/** Judge.me-style tag picker: search or create, feature, pin, then tag checkboxes. */
function TagPicker({
  review,
  available,
  formId,
}: {
  review: ReviewRow;
  available: string[];
  formId: string;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(review.tags));
  const [created, setCreated] = useState<string[]>([]);

  const all = [
    ...new Set([...SUGGESTED_TAGS, ...available, ...review.tags, ...created]),
  ].sort();
  const needle = normalizeTags(query)[0] ?? "";
  const visible = needle ? all.filter((tag) => tag.includes(needle)) : all;
  const canCreate = needle && !all.includes(needle) && selected.size < MAX_TAGS;

  const toggle = (tag: string) => {
    const next = new Set(selected);
    if (next.has(tag)) next.delete(tag);
    else if (next.size < MAX_TAGS) next.add(tag);
    setSelected(next);
  };
  const create = () => {
    setCreated([...created, needle]);
    setSelected(new Set([...selected, needle]));
    setQuery("");
  };

  // Enter in the search field creates the typed tag. Polaris fields don't take
  // onKeyDown, but key events bubble out of them to this wrapper.
  const searchWrapper = useRef<HTMLDivElement>(null);
  const createRef = useRef(() => {});
  createRef.current = () => {
    if (canCreate) create();
  };
  useEffect(() => {
    const wrapper = searchWrapper.current;
    if (!wrapper) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      createRef.current();
    };
    wrapper.addEventListener("keydown", onKey);
    return () => wrapper.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      method="post"
      id={formId}
      onSubmit={(event) => event.preventDefault()}
    >
      <input type="hidden" name="intent" value="tags" />
      <input type="hidden" name="id" value={review.id} />
      <input type="hidden" name="tags" value={[...selected].join(",")} />
      {/* Feature and pin are set from the ••• menu; keep their current values. */}
      <input type="hidden" name="favorite" value={String(review.favorite)} />
      <input type="hidden" name="pinned" value={String(review.pinned)} />
      <s-stack gap="base">
        <s-paragraph>
          Use tags to organize reviews and pick them for widgets or marketing.
        </s-paragraph>
        <div ref={searchWrapper}>
          <s-search-field
            label="Search or create tags"
            labelAccessibilityVisibility="exclusive"
            placeholder="Search or create tags"
            value={query}
            onInput={(event) => setQuery(event.currentTarget.value)}
          />
        </div>
        <s-stack gap="small-200">
          <s-text color="subdued">Available</s-text>
          {canCreate ? (
            <s-button variant="tertiary" icon="plus" onClick={create}>
              {`Create "${needle}"`}
            </s-button>
          ) : null}
          {visible.map((tag) => (
            <s-checkbox
              key={tag}
              label={tag}
              checked={selected.has(tag)}
              disabled={!selected.has(tag) && selected.size >= MAX_TAGS}
              onChange={() => toggle(tag)}
            />
          ))}
          {visible.length === 0 && !canCreate ? (
            <s-text color="subdued">No matching tags.</s-text>
          ) : null}
        </s-stack>
        {selected.size >= MAX_TAGS ? (
          <s-text color="subdued">{`A review can have up to ${MAX_TAGS} tags.`}</s-text>
        ) : null}
      </s-stack>
    </form>
  );
}

/** One shared modal for edit, tags and details, filled from the clicked review. */
function ReviewDialogs({
  review,
  dialog,
  productTitle,
  availableTags,
  modalRef,
}: {
  review: ReviewRow | null;
  dialog: Dialog | null;
  productTitle: string | null;
  availableTags: string[];
  modalRef: React.RefObject<HTMLElementTagNameMap["s-modal"]>;
}) {
  const fetcher = useFetcher<typeof action>();
  useResultToast(fetcher);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok)
      modalRef.current?.hideOverlay();
  }, [fetcher.state, fetcher.data, modalRef]);

  const heading =
    dialog === "edit"
      ? "Edit review"
      : dialog === "tags"
        ? "Edit tags"
        : "Review details";
  const formId = "review-dialog-form";

  return (
    <s-modal ref={modalRef} id="review-dialog" heading={heading}>
      {review && dialog === "edit" ? (
        <fetcher.Form method="post" id={formId} key={`edit-${review.id}`}>
          <input type="hidden" name="intent" value="edit" />
          <input type="hidden" name="id" value={review.id} />
          <s-stack gap="base">
            <s-banner tone="info">
              Fix typos or the reviewer name only. The star rating can&apos;t be
              changed, and edited reviews are marked as edited, so shoppers can
              trust what they read.
            </s-banner>
            <s-text-field
              name="authorName"
              label="Reviewer name"
              maxLength={EDIT_LIMITS.name}
              defaultValue={review.authorName}
            />
            <s-text-field
              name="title"
              label="Title"
              maxLength={EDIT_LIMITS.title}
              defaultValue={review.title ?? ""}
            />
            <s-text-area
              name="body"
              label="Review"
              rows={5}
              maxLength={EDIT_LIMITS.body}
              defaultValue={review.body ?? ""}
            />
          </s-stack>
        </fetcher.Form>
      ) : null}

      {review && dialog === "tags" ? (
        <TagPicker
          key={`tags-${review.id}`}
          review={review}
          available={availableTags}
          formId={formId}
        />
      ) : null}

      {review && dialog === "details" ? (
        <s-stack gap="small-200">
          {[
            ["Reviewer", review.authorName],
            ["Email", review.authorEmail ?? "—"],
            ["Product", productTitle ?? "Deleted product"],
            ["Rating", `${review.rating} out of 5`],
            ["Status", STATUS_BADGE[review.status].label],
            ["Source", SOURCE_LABELS[review.source]],
            [
              "Verified buyer",
              review.verification === "VERIFIED_BUYER" ? "Yes" : "No",
            ],
            [
              "Order",
              review.orderId ? `#${review.orderId.split("/").pop()}` : "—",
            ],
            ["Language", review.language ?? "—"],
            ["Submitted", dateFormat.format(new Date(review.submittedAt))],
            [
              "Published",
              review.publishedAt
                ? dateFormat.format(new Date(review.publishedAt))
                : "—",
            ],
            [
              "Edited",
              review.editedAt
                ? dateFormat.format(new Date(review.editedAt))
                : "—",
            ],
            ["Tags", review.tags.length ? review.tags.join(", ") : "—"],
            ["Review ID", review.id],
          ].map(([label, value]) => (
            <s-stack key={label} direction="inline" gap="base">
              <div style={{ inlineSize: 130 }}>
                <s-text color="subdued">{label}</s-text>
              </div>
              <s-text>{value}</s-text>
            </s-stack>
          ))}
        </s-stack>
      ) : null}

      {dialog === "edit" || dialog === "tags" ? (
        <s-button
          slot="primary-action"
          variant="primary"
          loading={fetcher.state !== "idle"}
          onClick={() =>
            fetcher.submit(document.getElementById(formId) as HTMLFormElement)
          }
        >
          Save
        </s-button>
      ) : null}
      <s-button
        slot="secondary-actions"
        commandFor="review-dialog"
        command="--hide"
      >
        {dialog === "details" ? "Close" : "Cancel"}
      </s-button>
    </s-modal>
  );
}

const relativeTime = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
});
function timeAgo(iso: string) {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (Math.abs(minutes) < 60) return relativeTime.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relativeTime.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return relativeTime.format(days, "day");
  return dateFormat.format(new Date(iso));
}

export default function Reviews() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shopify = useAppBridge();
  const bulk = useFetcher<typeof action>();
  useResultToast(bulk);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const deleteModal = useRef<HTMLElementTagNameMap["s-modal"]>(null);
  const [deleteTargets, setDeleteTargets] = useState<string[]>([]);
  const dialogModal = useRef<HTMLElementTagNameMap["s-modal"]>(null);
  const [dialog, setDialog] = useState<{
    kind: Dialog;
    reviewId: string;
  } | null>(null);
  const openDialog = (reviewId: string, kind: Dialog) => {
    setDialog({ kind, reviewId });
    // Wait for the modal content to render before opening it.
    requestAnimationFrame(() => dialogModal.current?.showOverlay());
  };
  const dialogReview =
    data.reviews.find((r) => r.id === dialog?.reviewId) ?? null;
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // Clear selection whenever the visible page changes.
  const pageKey = data.reviews.map((r) => r.id).join();
  useEffect(() => setSelected(new Set()), [pageKey]);

  useEffect(() => {
    if (bulk.state === "idle" && bulk.data) deleteModal.current?.hideOverlay();
  }, [bulk.state, bulk.data]);

  const setParam = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (!("page" in updates)) next.delete("page");
    navigate(`?${next.toString()}`);
  };

  const runBulk = (intent: string, ids: Iterable<string> = selected) => {
    const form = new FormData();
    form.set("intent", intent);
    for (const id of ids) form.append("id", id);
    bulk.submit(form, { method: "post" });
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const response = await fetch(
        `/app/reviews-export?${searchParams.toString()}`,
      );
      if (!response.ok) throw new Error(String(response.status));
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `blinc-reviews-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      shopify.toast.show("Export failed. Try again.", { isError: true });
    } finally {
      setExporting(false);
    }
  };

  const confirmDelete = (ids: string[]) => {
    setDeleteTargets(ids);
    deleteModal.current?.showOverlay();
  };

  const allOnPage =
    data.reviews.length > 0 && data.reviews.every((r) => selected.has(r.id));
  const toggleAll = () =>
    setSelected(allOnPage ? new Set() : new Set(data.reviews.map((r) => r.id)));
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const f = data.filters;
  const filtered = Boolean(
    f.rating || f.source || f.verified || f.sinceDays || f.q || f.tag,
  );
  const autoPublish =
    data.autoPublishMinRating === 0
      ? { tone: "neutral" as const, label: "Auto-publish: Off" }
      : data.autoPublishMinRating === 1
        ? { tone: "success" as const, label: "Auto-publish: All reviews" }
        : {
            tone: "success" as const,
            label: `Auto-publish: ${data.autoPublishMinRating}★ and up`,
          };

  return (
    <s-page inlineSize="large">
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
      <s-stack gap="base">
        <s-section padding="none">
          <nav className="br-tabs" aria-label="Reviews sections">
            <button type="button" className="br-tab" aria-current="page">
              ★ Reviews
            </button>
            <button
              type="button"
              className="br-tab"
              onClick={() => navigate("/app/requests")}
            >
              ✉ Review requests
            </button>
          </nav>
        </s-section>

        <s-stack
          direction="inline"
          justifyContent="space-between"
          alignItems="center"
          gap="base"
        >
          <s-stack direction="inline" gap="small-200" alignItems="center">
            <s-heading>Reviews</s-heading>
            <s-badge tone={autoPublish.tone}>{autoPublish.label}</s-badge>
          </s-stack>
          <s-stack direction="inline" gap="small-200">
            <s-button href="/app/settings/import">Import</s-button>
            <s-button href="/app/settings">Publish and moderate</s-button>
            <s-button
              icon="export"
              loading={exporting}
              disabled={!data.anyReviews}
              onClick={exportCsv}
            >
              Export CSV
            </s-button>
          </s-stack>
        </s-stack>

        <s-section>
          {!data.anyReviews ? (
            <s-stack gap="base" alignItems="center">
              <s-text type="strong">View all your reviews here</s-text>
              <s-paragraph>
                You don&apos;t have any reviews yet. Send review requests to
                your customers, or reviews will appear here as shoppers submit
                them on your product pages.
              </s-paragraph>
              <s-stack direction="inline" gap="small-200">
                <s-button variant="primary" href="/app/requests">
                  Track review requests
                </s-button>
                <s-button href="/app/appearance">Customize widgets</s-button>
              </s-stack>
            </s-stack>
          ) : (
            <s-stack gap="base">
              <div
                className="br-status"
                role="tablist"
                aria-label="Review status"
              >
                {STATUS_FILTERS.map((status) => (
                  <s-button
                    key={status}
                    variant={status === f.status ? "secondary" : "tertiary"}
                    onClick={() =>
                      setParam({ status: status === "ALL" ? null : status })
                    }
                  >
                    {STATUS_LABELS[status]} ({data.counts[status]})
                  </s-button>
                ))}
              </div>

              <s-text color="subdued">{STATUS_HELP[f.status]}</s-text>
              <div className="br-filters">
                <div className="br-search">
                  <s-search-field
                    label="Search reviews"
                    labelAccessibilityVisibility="exclusive"
                    placeholder="Search by text, name or email"
                    defaultValue={f.q}
                    onInput={(event) => {
                      const value = event.currentTarget.value;
                      clearTimeout(searchTimer.current);
                      searchTimer.current = setTimeout(
                        () => setParam({ q: value }),
                        400,
                      );
                    }}
                  />
                </div>
                <div className="br-filter">
                  <s-select
                    label="Rating"
                    labelAccessibilityVisibility="exclusive"
                    onChange={(event) =>
                      setParam({ rating: event.currentTarget.value })
                    }
                  >
                    <s-option value="" defaultSelected={!f.rating}>
                      Rating: All
                    </s-option>
                    {[5, 4, 3, 2, 1].map((r) => (
                      <s-option
                        key={r}
                        value={String(r)}
                        defaultSelected={f.rating === r}
                      >
                        {r} star{r === 1 ? "" : "s"}
                      </s-option>
                    ))}
                  </s-select>
                </div>
                <div className="br-filter">
                  <s-select
                    label="Source"
                    labelAccessibilityVisibility="exclusive"
                    onChange={(event) =>
                      setParam({ source: event.currentTarget.value })
                    }
                  >
                    <s-option value="" defaultSelected={!f.source}>
                      Source: All
                    </s-option>
                    {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                      <s-option
                        key={value}
                        value={value}
                        defaultSelected={f.source === value}
                      >
                        {label}
                      </s-option>
                    ))}
                  </s-select>
                </div>
                <div className="br-filter">
                  <s-select
                    label="Verified"
                    labelAccessibilityVisibility="exclusive"
                    onChange={(event) =>
                      setParam({ verified: event.currentTarget.value })
                    }
                  >
                    <s-option value="" defaultSelected={!f.verified}>
                      Buyers: All
                    </s-option>
                    <s-option
                      value="verified"
                      defaultSelected={f.verified === "verified"}
                    >
                      Verified buyers
                    </s-option>
                    <s-option
                      value="unverified"
                      defaultSelected={f.verified === "unverified"}
                    >
                      Not verified
                    </s-option>
                  </s-select>
                </div>
                <div className="br-filter">
                  <s-select
                    label="Date"
                    labelAccessibilityVisibility="exclusive"
                    onChange={(event) =>
                      setParam({ since: event.currentTarget.value })
                    }
                  >
                    <s-option value="" defaultSelected={!f.sinceDays}>
                      All time
                    </s-option>
                    {DATE_RANGES.map((days) => (
                      <s-option
                        key={days}
                        value={String(days)}
                        defaultSelected={f.sinceDays === days}
                      >
                        Last {days} days
                      </s-option>
                    ))}
                  </s-select>
                </div>
                {data.tags.length > 0 ? (
                  <div className="br-filter">
                    <s-select
                      label="Tag"
                      labelAccessibilityVisibility="exclusive"
                      onChange={(event) =>
                        setParam({ tag: event.currentTarget.value })
                      }
                    >
                      <s-option value="" defaultSelected={!f.tag}>
                        Tag: All
                      </s-option>
                      {data.tags.map((tag) => (
                        <s-option
                          key={tag}
                          value={tag}
                          defaultSelected={f.tag === tag}
                        >
                          {tag}
                        </s-option>
                      ))}
                    </s-select>
                  </div>
                ) : null}
                <div className="br-filter">
                  <s-select
                    label="Sort"
                    labelAccessibilityVisibility="exclusive"
                    onChange={(event) =>
                      setParam({ sort: event.currentTarget.value })
                    }
                  >
                    <s-option
                      value="newest"
                      defaultSelected={f.sort === "newest"}
                    >
                      Newest first
                    </s-option>
                    <s-option
                      value="oldest"
                      defaultSelected={f.sort === "oldest"}
                    >
                      Oldest first
                    </s-option>
                    <s-option
                      value="highest"
                      defaultSelected={f.sort === "highest"}
                    >
                      Highest rating
                    </s-option>
                    <s-option
                      value="lowest"
                      defaultSelected={f.sort === "lowest"}
                    >
                      Lowest rating
                    </s-option>
                  </s-select>
                </div>
              </div>

              {selected.size > 0 ? (
                <s-box padding="small" background="subdued" borderRadius="base">
                  <div className="br-bulk">
                    <s-text type="strong">{selected.size} selected</s-text>
                    <s-button
                      disabled={bulk.state !== "idle"}
                      onClick={() => runBulk("publish")}
                    >
                      Publish
                    </s-button>
                    <s-button
                      disabled={bulk.state !== "idle"}
                      onClick={() => runBulk("hide")}
                    >
                      Hide
                    </s-button>
                    <s-button
                      tone="critical"
                      onClick={() => confirmDelete([...selected])}
                    >
                      Delete
                    </s-button>
                    <s-button
                      variant="tertiary"
                      onClick={() => setSelected(new Set())}
                    >
                      Clear
                    </s-button>
                  </div>
                </s-box>
              ) : null}

              {data.reviews.length === 0 ? (
                <s-stack gap="small-200" alignItems="center">
                  <s-text type="strong">No reviews match</s-text>
                  <s-text color="subdued">
                    {filtered
                      ? "Try changing or clearing the filters."
                      : "Nothing in this tab yet."}
                  </s-text>
                  {filtered ? (
                    <s-button
                      onClick={() =>
                        navigate(
                          f.status === "ALL" ? "?" : `?status=${f.status}`,
                        )
                      }
                    >
                      Clear filters
                    </s-button>
                  ) : null}
                </s-stack>
              ) : (
                <s-table>
                  <s-table-header-row>
                    <s-table-header>
                      <s-checkbox
                        accessibilityLabel="Select all reviews on this page"
                        checked={allOnPage}
                        onChange={toggleAll}
                      />
                    </s-table-header>
                    <s-table-header listSlot="secondary">
                      Customer
                    </s-table-header>
                    <s-table-header>Created</s-table-header>
                    <s-table-header listSlot="primary">Rating</s-table-header>
                    <s-table-header listSlot="inline">Status</s-table-header>
                    <s-table-header>
                      <span className="br-visually-hidden">Actions</span>
                    </s-table-header>
                  </s-table-header-row>
                  <s-table-body>
                    {data.reviews.map((review) => {
                      const productTitle = data.productTitles[review.productId];
                      return (
                        <s-table-row key={review.id}>
                          <s-table-cell>
                            <s-checkbox
                              accessibilityLabel={`Select review by ${review.authorName}`}
                              checked={selected.has(review.id)}
                              onChange={() => toggle(review.id)}
                            />
                          </s-table-cell>
                          <s-table-cell>
                            <s-stack gap="small-300">
                              <s-text type="strong">{review.authorName}</s-text>
                              {productTitle ? (
                                <s-link
                                  href={`shopify://admin/products/${review.productId.split("/").pop()}`}
                                  target="_blank"
                                >
                                  {productTitle}
                                </s-link>
                              ) : (
                                <s-text color="subdued">Deleted product</s-text>
                              )}
                              <s-text color="subdued">
                                via {SOURCE_LABELS[review.source]}
                              </s-text>
                              {review.verification === "VERIFIED_BUYER" ? (
                                <s-box>
                                  <s-badge tone="success" icon="check">
                                    Verified buyer
                                  </s-badge>
                                </s-box>
                              ) : review.verification ===
                                "VERIFIED_REVIEWER" ? (
                                <s-box>
                                  <s-badge icon="email">
                                    Email confirmed
                                  </s-badge>
                                </s-box>
                              ) : null}
                            </s-stack>
                          </s-table-cell>
                          <s-table-cell>
                            <span
                              title={dateFormat.format(
                                new Date(review.submittedAt),
                              )}
                            >
                              {timeAgo(review.submittedAt)}
                            </span>
                          </s-table-cell>
                          <s-table-cell>
                            <div className="br-review">
                              <Stars rating={review.rating} />
                              {review.title ? (
                                <s-text type="strong">{review.title}</s-text>
                              ) : null}
                              {review.body ? (
                                <s-paragraph>{review.body}</s-paragraph>
                              ) : null}
                              {review.favorite ||
                              review.pinned ||
                              review.tags.length ? (
                                <s-stack
                                  direction="inline"
                                  gap="small-200"
                                  alignItems="center"
                                >
                                  {review.favorite ? (
                                    <s-badge tone="info" icon="star-filled">
                                      Featured
                                    </s-badge>
                                  ) : null}
                                  {review.pinned ? (
                                    <s-badge tone="info" icon="pin">
                                      Pinned
                                    </s-badge>
                                  ) : null}
                                  {review.tags.map((tag) => (
                                    <s-clickable-chip
                                      key={tag}
                                      accessibilityLabel={`Show reviews tagged ${tag}`}
                                      onClick={() => setParam({ tag })}
                                    >
                                      {tag}
                                    </s-clickable-chip>
                                  ))}
                                </s-stack>
                              ) : null}
                              {review.photos.length > 0 ? (
                                <ReviewPhotos photos={review.photos} />
                              ) : null}
                              {review.editedAt ? (
                                <s-text color="subdued">Edited by you</s-text>
                              ) : null}
                              {review.merchantReply ? (
                                <div className="br-reply">
                                  <s-text color="subdued">
                                    Your reply: {review.merchantReply}
                                  </s-text>
                                </div>
                              ) : null}
                            </div>
                          </s-table-cell>
                          <s-table-cell>
                            <StatusSelect
                              id={review.id}
                              status={review.status}
                            />
                          </s-table-cell>
                          <s-table-cell>
                            <s-stack
                              direction="inline"
                              gap="small-200"
                              justifyContent="end"
                            >
                              <ReplyModal
                                id={review.id}
                                reply={review.merchantReply}
                                author={review.authorName}
                              />
                              <RowMenu
                                review={review}
                                onOpen={(kind) => openDialog(review.id, kind)}
                                onDelete={() => confirmDelete([review.id])}
                              />
                            </s-stack>
                          </s-table-cell>
                        </s-table-row>
                      );
                    })}
                  </s-table-body>
                </s-table>
              )}

              {data.reviews.length > 0 ? (
                <s-stack direction="inline" gap="small-200" alignItems="center">
                  <s-button
                    icon="chevron-left"
                    accessibilityLabel="Previous page"
                    disabled={!data.hasPreviousPage}
                    onClick={() => setParam({ page: String(f.page - 1) })}
                  />
                  <s-button
                    icon="chevron-right"
                    accessibilityLabel="Next page"
                    disabled={!data.hasNextPage}
                    onClick={() => setParam({ page: String(f.page + 1) })}
                  />
                  <s-text color="subdued">
                    Showing {(f.page - 1) * PAGE_SIZE + 1} to{" "}
                    {(f.page - 1) * PAGE_SIZE + data.reviews.length} of{" "}
                    {data.counts[f.status]} review
                    {data.counts[f.status] === 1 ? "" : "s"}
                  </s-text>
                </s-stack>
              ) : null}
            </s-stack>
          )}
        </s-section>
      </s-stack>

      <ReviewDialogs
        review={dialogReview}
        dialog={dialog?.kind ?? null}
        productTitle={
          dialogReview
            ? (data.productTitles[dialogReview.productId] ?? null)
            : null
        }
        availableTags={data.tags}
        modalRef={dialogModal}
      />

      <s-modal
        ref={deleteModal}
        id="bulk-delete"
        heading={`Delete ${deleteTargets.length} review${deleteTargets.length === 1 ? "" : "s"}?`}
      >
        <s-paragraph>
          Deleted reviews are removed from your store and from this app
          permanently. To take a review off your store but keep it, use Hide
          instead.
        </s-paragraph>
        <s-button
          slot="primary-action"
          variant="primary"
          tone="critical"
          loading={bulk.state !== "idle"}
          onClick={() => runBulk("delete", deleteTargets)}
        >
          Delete permanently
        </s-button>
        <s-button
          slot="secondary-actions"
          commandFor="bulk-delete"
          command="--hide"
        >
          Cancel
        </s-button>
      </s-modal>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
