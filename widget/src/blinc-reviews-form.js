// Review form extras: photo picker and summary refresh. Loaded when the form first opens.

const MAX_PHOTOS = 5;
const MAX_SIDE = 1600;

/**
 * Shrinks a photo before upload (max 1600px JPEG). Re-encoding through a canvas also
 * drops EXIF data such as GPS location. Falls back to the original file when the
 * browser can't decode it (e.g. HEIC on desktop Chrome); the server checks it anyway.
 */
async function shrinkPhoto(file) {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob || file;
  } catch {
    return file;
  }
}

/** Wires the picker inside `form`; listeners are removed when `signal` aborts. */
export function createPicker(form, { signal, removeLabel }) {
  const input = form.querySelector("[data-blinc-photo-input]");
  const previews = form.querySelector("[data-blinc-previews]");
  let photos = [];

  const render = () => {
    previews.replaceChildren(
      ...photos.map((photo, index) => {
        const wrap = document.createElement("div");
        wrap.className = "blinc-preview";
        const img = document.createElement("img");
        img.src = photo.url;
        img.alt = "";
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "blinc-preview__remove";
        remove.textContent = "×";
        remove.dataset.blincRemovePhoto = String(index);
        remove.setAttribute("aria-label", removeLabel);
        wrap.append(img, remove);
        return wrap;
      }),
    );
    input.disabled = photos.length >= MAX_PHOTOS;
  };

  const clear = () => {
    for (const photo of photos) URL.revokeObjectURL(photo.url);
    photos = [];
    render();
  };

  input.addEventListener(
    "change",
    async () => {
      const files = [...(input.files || [])];
      input.value = "";
      for (const file of files) {
        if (photos.length >= MAX_PHOTOS) break;
        if (!file.type.startsWith("image/")) continue;
        const blob = await shrinkPhoto(file);
        photos.push({ blob, url: URL.createObjectURL(blob) });
      }
      render();
    },
    { signal },
  );

  previews.addEventListener(
    "click",
    (event) => {
      const remove = event.target.closest("[data-blinc-remove-photo]");
      if (!remove) return;
      const [photo] = photos.splice(Number(remove.dataset.blincRemovePhoto), 1);
      if (photo) URL.revokeObjectURL(photo.url);
      render();
    },
    { signal },
  );

  signal.addEventListener("abort", clear);

  return {
    appendTo(body) {
      photos.forEach((photo, index) => body.append("photos", photo.blob, `photo-${index + 1}.jpg`));
    },
    clear,
  };
}

/**
 * Re-renders the server-rendered rating summary and star badges after a review goes
 * live, using the Section Rendering API (max 5 sections per request). Metafield
 * changes take a few seconds to reach the storefront, so it retries until the
 * rendered count reaches `expected` and never swaps in an older summary.
 */
export async function refreshSummary(expected) {
  for (const delay of [1500, 3000, 6000]) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    if (await renderSummary(expected)) return;
  }
}

async function renderSummary(expected) {
  const roots = document.querySelectorAll("blinc-reviews, .blinc-rating");
  const ids = [
    ...new Set([...roots].map((root) => root.closest(".shopify-section")?.id.replace("shopify-section-", ""))),
  ]
    .filter(Boolean)
    .slice(0, 5);
  if (ids.length === 0) return true;

  const url = new URL(window.location.href);
  url.searchParams.set("sections", ids.join(","));
  url.searchParams.set("blinc", String(Date.now()));
  try {
    const response = await fetch(url);
    if (!response.ok) return false;
    const sections = await response.json();
    const counts = Object.values(sections).flatMap((html) =>
      [...html.matchAll(/data-blinc-count="(\d+)"/g)].map((match) => Number(match[1])),
    );
    if (expected && !counts.some((count) => count >= expected)) return false;
    for (const id of ids) {
      if (!sections[id]) continue;
      const fresh = new DOMParser().parseFromString(sections[id], "text/html");
      const current = document.getElementById(`shopify-section-${id}`);
      if (!current) continue;
      for (const selector of [".blinc-rating", "blinc-reviews .blinc-reviews__top", "blinc-reviews .blinc-photo-strip"]) {
        const next = fresh.querySelectorAll(selector);
        current.querySelectorAll(selector).forEach((node, index) => {
          if (next[index]) node.replaceWith(document.importNode(next[index], true));
        });
      }
      // The photo strip appears with the product's first photo.
      const strip = fresh.querySelector("blinc-reviews .blinc-photo-strip");
      const top = current.querySelector("blinc-reviews .blinc-reviews__top");
      if (strip && top && !current.querySelector("blinc-reviews .blinc-photo-strip")) {
        top.after(document.importNode(strip, true));
      }
    }
    // Re-rendered badges are plain again; let the main script make them buttons.
    document.dispatchEvent(new Event("blinc:badges"));
    return true;
  } catch {
    // Non-critical: the next page load shows the new totals.
    return true;
  }
}

// ---- Steps: rating → review → about you → photos ----

const LAST_STEP = 4;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Which step holds each server-side field error.
const FIELD_STEP = { rating: 1, body: 2, title: 2, email: 3, name: 3 };
const steppers = new WeakMap();

/** Returns an error code for the step's fields, or "" when the step is complete. */
function checkStep(form, step) {
  const value = (name) => (form.elements[name]?.value || "").trim();
  if (step === 1 && !form.querySelector("input[name=rating]:checked")) return ["rating", "rating_required"];
  if (step === 2 && !value("body")) return ["body", "body_required"];
  if (step === 3) {
    if (!EMAIL.test(value("email"))) return ["email", "email_invalid"];
    if (!form.elements.anonymous?.checked && !value("name")) return ["name", "name_required"];
  }
  return null;
}

function stepper(host) {
  if (steppers.has(host)) return steppers.get(host);
  const dialog = host.formDialog;
  const form = host.form;
  const sections = [...form.querySelectorAll("[data-step]")];
  const thanks = dialog.querySelector("[data-blinc-thanks]");
  const { signal } = host.events;
  let current = 1;

  const errorBox = (step) => sections[step - 1].querySelector("[data-blinc-step-error], [data-blinc-error]");
  const clearErrors = () => {
    form.querySelectorAll("[aria-invalid]").forEach((field) => field.removeAttribute("aria-invalid"));
    form.querySelectorAll("[data-blinc-step-error], [data-blinc-error]").forEach((box) => (box.hidden = true));
  };
  const showError = (step, field, message) => {
    const box = errorBox(step);
    if (box) {
      box.textContent = message || host.i18n.errors?.unavailable;
      box.hidden = false;
    }
    const input = field && form.elements[field];
    (input instanceof RadioNodeList ? input[0] : input)?.setAttribute?.("aria-invalid", "true");
  };

  const show = (step) => {
    current = Math.min(Math.max(step, 1), LAST_STEP);
    sections.forEach((section, index) => (section.hidden = index + 1 !== current));
    // Focus the first field so keyboard and screen reader users land in the new step.
    const section = sections[current - 1];
    const field = section.querySelector("input:not([type=hidden]):not(.blinc-visually-hidden), textarea") ||
      section.querySelector("input[name=rating]");
    // Step 1 keeps the dialog's own focus until a star is picked, so no star looks pre-selected.
    (current === 1 ? form.querySelector("input[name=rating]:checked") : field)?.focus();
  };

  const next = () => {
    clearErrors();
    const problem = checkStep(form, current);
    if (problem) return showError(current, problem[0], host.i18n.errors?.[problem[1]]);
    show(current + 1);
  };

  dialog.addEventListener(
    "click",
    (event) => {
      const move = event.target.closest("[data-blinc-step]");
      if (!move) return;
      if (Number(move.dataset.blincStep) > 0) next();
      else {
        clearErrors();
        show(current - 1);
      }
    },
    { signal },
  );
  // Clicking a star moves on, also when it was already picked; arrow keys only change
  // the rating (they don't click the label), so keyboard users choose before going on.
  form.addEventListener(
    "click",
    (event) => {
      if (current === 1 && event.target.closest(".blinc-form__star-row label")) setTimeout(next, 250);
    },
    { signal },
  );
  form.addEventListener(
    "change",
    (event) => {
      if (event.target.name === "anonymous") form.elements.name.disabled = event.target.checked;
    },
    { signal },
  );

  const api = {
    get current() {
      return current;
    },
    next,
    reset() {
      clearErrors();
      form.hidden = false;
      thanks.hidden = true;
      show(1);
    },
    finish(message) {
      form.hidden = true;
      thanks.querySelector("[data-blinc-thanks-text]").textContent = message;
      thanks.hidden = false;
      thanks.focus();
    },
    fail(errors, message) {
      clearErrors();
      const entries = Object.entries(errors || {});
      const step = entries.length ? Math.min(...entries.map(([field]) => FIELD_STEP[field] || LAST_STEP)) : current;
      show(step);
      const text = entries
        .map(([, code]) => host.i18n.errors?.[code])
        .concat(message ? host.i18n.errors?.[message] : [])
        .filter(Boolean)
        .join(" ");
      showError(step, entries.find(([field]) => FIELD_STEP[field] === step)?.[0], text);
    },
  };
  steppers.set(host, api);
  return api;
}

/** Called each time the write-a-review dialog opens. */
export function openSteps(host) {
  const steps = stepper(host);
  // Start over after a finished review; otherwise keep the shopper's progress.
  if (!host.form.hidden && steps.current > 1) return;
  steps.reset();
}

/** Submits the review form of a <blinc-reviews> element and shows the result. */
export async function submit(host) {
  const { form, i18n } = host;
  const steps = stepper(host);
  // Enter in an earlier step means "Next", not "send".
  if (steps.current < LAST_STEP) return steps.next();

  const button = form.querySelector("[type=submit]");
  button.disabled = true;
  const body = new FormData(form);
  const picker = await host.picker;
  picker?.appendTo(body);

  try {
    const response = await fetch(host.dataset.endpoint, {
      method: "POST",
      body,
      headers: { Accept: "application/json" },
      // Never leave the shopper waiting on a spinner.
      signal: AbortSignal.timeout(30000),
    });
    const result = await response.json();

    if (!result.ok) return steps.fail(result.errors, result.message);

    form.reset();
    form.elements.name.disabled = false;
    picker?.clear();
    steps.finish(result.published ? i18n.published : i18n.pending);
    if (result.published) {
      host.cursor = null;
      host.page = 1;
      host.load({ fresh: true });
      // Average, count, breakdown and badges are server-rendered; re-render them.
      refreshSummary(result.count);
    }
  } catch {
    steps.fail({}, "unavailable");
  } finally {
    button.disabled = false;
  }
}

// ---- Full review dialog (every layout) ----

/** Makes every listed review a button that opens the full review. */
export function markCards(host) {
  for (const card of host.list.querySelectorAll(":scope > .blinc-review:not([role])")) {
    const name = card.querySelector(".blinc-review__name")?.textContent || "";
    const fill = parseFloat(card.querySelector(".blinc-stars")?.style.getPropertyValue("--blinc-fill")) || 0;
    card.setAttribute("role", "button");
    card.tabIndex = 0;
    card.setAttribute(
      "aria-label",
      (host.i18n.openReview || "%n, %r/5").replace("%n", name).replace("%r", Math.round(fill / 20)),
    );
  }
}

/** A review card as dialog content: plain (not a button), full text, photos optional. */
function reviewCopy(card, keepPhotos) {
  const copy = card.cloneNode(true);
  for (const name of ["role", "tabindex", "aria-label"]) copy.removeAttribute(name);
  copy.querySelector("[data-blinc-expand]")?.remove();
  copy.querySelector(".blinc-review__body")?.classList.add("is-expanded");
  if (!keepPhotos) copy.querySelector(".blinc-review__photos")?.remove();
  return copy;
}

const photosOf = (root, selector) =>
  [...root.querySelectorAll(selector)].map((button) => ({
    full: button.dataset.blincPhoto,
    thumb: button.querySelector("img")?.src || button.dataset.blincPhoto,
    review: button.dataset.blincReview || "",
  }));

/**
 * Two panels like Judge.me: a photo viewer (photo over a blurred copy of itself,
 * arrows, thumbnails, arrow keys) beside the review. `onShow` runs for each photo.
 */
function openViewer(host, photos, start, onShow) {
  const dialog = host.reviewDialog;
  const make = (tag, className, text) => host.el(tag, className, text);

  const stage = make("div", "blinc-viewer__stage");
  const image = make("img");
  image.alt = "";
  let index = 0;
  const nav = (direction, label) => {
    const button = make(
      "button",
      `blinc-viewer__nav blinc-viewer__nav--${direction > 0 ? "next" : "prev"}`,
      direction > 0 ? "›" : "‹",
    );
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.addEventListener("click", () => show(index + direction));
    return button;
  };
  const prev = nav(-1, host.i18n.photoPrev || "Previous photo");
  const next = nav(1, host.i18n.photoNext || "Next photo");
  stage.append(image, prev, next);

  const thumbs = make("div", "blinc-viewer__thumbs");
  const thumbButtons = photos.map((photo, i) => {
    const button = make("button");
    button.type = "button";
    button.setAttribute("aria-label", `${i + 1} / ${photos.length}`);
    const img = make("img");
    img.src = photo.thumb;
    img.alt = "";
    img.loading = "lazy";
    button.append(img);
    button.addEventListener("click", () => show(i));
    return button;
  });
  thumbs.append(...thumbButtons);

  const content = make("div", "blinc-review-view__content");
  function show(i) {
    index = (i + photos.length) % photos.length;
    image.src = photos[index].full;
    stage.style.setProperty("--blinc-bg", `url("${photos[index].full}")`);
    thumbButtons.forEach((button, n) => button.setAttribute("aria-current", String(n === index)));
    thumbButtons[index].scrollIntoView({ block: "nearest", inline: "nearest" });
    prev.hidden = next.hidden = photos.length < 2;
    onShow(photos[index], content);
  }

  const viewer = make("div", "blinc-viewer");
  viewer.append(stage, thumbs);
  viewer.tabIndex = -1;
  viewer.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") show(index - 1);
    if (event.key === "ArrowRight") show(index + 1);
  });
  const view = make("div", "blinc-review-view");
  view.append(viewer, content);
  dialog.classList.add("blinc-modal--media");
  dialog.querySelector("[data-blinc-review-body]").replaceChildren(view);
  dialog.showModal();
  show(start);
}

/** "More", a click on a review, or one of its photos. */
export function openReview(host, card, start = 0) {
  const dialog = host.reviewDialog;
  if (!dialog || !card) return;
  const photos = photosOf(card, ".blinc-review__photos [data-blinc-photo]");
  if (photos.length) {
    const copy = reviewCopy(card, false);
    return openViewer(host, photos, start, (photo, content) => {
      if (!content.firstChild) content.append(copy);
    });
  }
  dialog.classList.remove("blinc-modal--media");
  dialog.querySelector("[data-blinc-review-body]").replaceChildren(reviewCopy(card, true));
  dialog.showModal();
}

/**
 * Header media gallery: every customer photo of the product; the review beside it
 * follows the photo. Reviews not on the current page are fetched once by id.
 */
export function openGallery(host, start = 0) {
  if (!host.reviewDialog) return;
  const strip = host.querySelector(".blinc-photo-strip");
  const photos = strip ? photosOf(strip, "[data-blinc-photo]") : [];
  if (!photos.length) return;
  const cache = new Map();
  const reviewFor = (id) => {
    const card = id && host.list.querySelector(`:scope > .blinc-review[data-review-id="${CSS.escape(id)}"]`);
    if (card) return Promise.resolve(card);
    if (!id) return Promise.resolve(null);
    if (!cache.has(id)) {
      cache.set(
        id,
        fetch(host.url({ review_id: id }), { headers: { Accept: "application/json" } })
          .then((response) => (response.ok ? response.json() : { reviews: [] }))
          .then(({ reviews }) => (reviews[0] ? host.renderReview(reviews[0]) : null))
          .catch(() => null),
      );
    }
    return cache.get(id);
  };
  openViewer(host, photos, start, (photo, content) => {
    content.dataset.review = photo.review;
    reviewFor(photo.review).then((card) => {
      // Ignore late answers once the shopper has moved to another photo.
      if (content.dataset.review !== photo.review) return;
      content.replaceChildren(...(card ? [reviewCopy(card, false)] : []));
    });
  });
}
