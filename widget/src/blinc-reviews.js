(() => {
  if (customElements.get("blinc-reviews")) return;

  class BlincReviews extends HTMLElement {
    connectedCallback() {
      this.i18n = JSON.parse(
        this.querySelector("[data-blinc-i18n]")?.textContent || "{}",
      );
      // Star badges on the page can now become buttons (theme editor reloads too).
      document.dispatchEvent(new Event("blinc:badges"));
      this.list = this.querySelector("[data-blinc-list]");
      this.moreButton = this.querySelector("[data-blinc-more]");
      this.pager = this.querySelector("[data-blinc-pages]");
      this.form = this.querySelector("[data-blinc-form]");
      this.notice = this.querySelector("[data-blinc-notice]");
      this.lightbox = this.querySelector("[data-blinc-lightbox]");
      this.formDialog = this.querySelector("[data-blinc-form-dialog]");
      this.reviewDialog = this.querySelector("[data-blinc-review-dialog]");
      this.mediaBase = (this.dataset.endpoint || "").replace(
        /\/reviews$/,
        "/m",
      );
      this.formModule = null;
      this.picker = null;
      this.cursor = null;
      this.page = 1;
      this.total = Number(this.dataset.total) || 0;
      this.sort = this.dataset.sort || "recent";
      this.rating = "";
      // Same strftime-style format as the server-rendered reviews (Liquid date filter).
      // English month names, like the Liquid date filter.
      const month = new Intl.DateTimeFormat("en", {
        month: "short",
        timeZone: "UTC",
      });
      const format = this.dataset.dateFormat || "%b %-d, %Y";
      this.dateFormat = {
        format: (date) =>
          format.replace(/%(-?)([dmYb])/g, (_, bare, code) => {
            if (code === "b") return month.format(date);
            const value = {
              d: date.getUTCDate(),
              m: date.getUTCMonth() + 1,
              Y: date.getUTCFullYear(),
            }[code];
            return bare || code === "Y"
              ? String(value)
              : String(value).padStart(2, "0");
          }),
      };

      // Re-created on every connect, so theme editor section reloads start clean.
      this.events = new AbortController();
      const { signal } = this.events;
      this.addEventListener("click", (event) => this.onClick(event), {
        signal,
      });
      this.addEventListener("change", (event) => this.onChange(event), {
        signal,
      });
      this.addEventListener(
        "keydown",
        (event) => {
          if (
            (event.key === "Enter" || event.key === " ") &&
            event.target.matches(".blinc-review[role=button]")
          ) {
            event.preventDefault();
            this.openReview(event.target);
          }
        },
        { signal },
      );
      // Submitting lives in the form module, which loads when the form first opens.
      this.form?.addEventListener(
        "submit",
        (event) => {
          event.preventDefault();
          this.loadPicker();
          this.formModule.then((module) =>
            module
              ? module.submit(this)
              : this.showNotice(this.i18n.errors?.unavailable),
          );
        },
        { signal },
      );
      this.querySelector("[data-blinc-toggle]")?.addEventListener(
        "pointerenter",
        () => this.loadPicker(),
        {
          signal,
          once: true,
        },
      );
      this.loadExtras();
      // Load the form script when the widget nears the screen, so the popup is ready
      // (star clicks advance) the moment it opens.
      this.prefetch = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          this.prefetch.disconnect();
          this.loadPicker();
        },
        { rootMargin: "200px" },
      );
      this.prefetch.observe(this);

      // First page already server-rendered (newest first): continue after it, unless
      // the merchant picked another default order.
      if (this.hasAttribute("data-ssr")) {
        this.cursor = this.dataset.cursor || null;
        this.clamp(this.list.children);
        if (this.sort !== "recent") this.reload();
        return;
      }

      // Nothing to fetch for a product without reviews (and no error if the app is down).
      if (this.total === 0) return;

      // Load reviews only when the block nears the viewport.
      this.observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          this.observer.disconnect();
          this.load();
        },
        { rootMargin: "300px" },
      );
      this.observer.observe(this);
    }

    disconnectedCallback() {
      this.events?.abort();
      this.observer?.disconnect();
      this.prefetch?.disconnect();
    }

    onClick(event) {
      const target = event.target;
      if (target.closest("[data-blinc-toggle]")) return this.openForm();
      // Close buttons, and clicks on a dialog's backdrop (the dialog itself is the target).
      if (target.closest("[data-blinc-dismiss]"))
        return target.closest("dialog")?.close();
      if (target instanceof HTMLDialogElement) return target.close();
      const photo = target.closest("[data-blinc-photo]");
      const card = target.closest("[data-blinc-list] > .blinc-review");
      if (photo && card)
        return this.openReview(
          card,
          [...card.querySelectorAll("[data-blinc-photo]")].indexOf(photo),
        );
      if (photo?.dataset.blincReview !== undefined) {
        const photos = [
          ...this.querySelectorAll(".blinc-photo-strip [data-blinc-photo]"),
        ];
        return this.openGallery(
          photos.indexOf(photo),
          photo.dataset.blincPhoto,
        );
      }
      if (photo) return this.openPhoto(photo.dataset.blincPhoto);

      const bar = target.closest("[data-blinc-rating]");
      if (bar) return this.filterBy(bar.dataset.blincRating);
      const more = target.closest("[data-blinc-expand]");
      if (more) return this.openReview(more.closest(".blinc-review"));
      if (target.closest("[data-blinc-more]")) return this.load();
      // Anywhere else on a review opens it, like Judge.me.
      if (card && !target.closest("button, a")) this.openReview(card);
    }

    onChange(event) {
      if (event.target.matches("[data-blinc-sort]")) {
        this.sort = event.target.value;
        this.reload();
      } else if (event.target.matches("[data-blinc-filter]")) {
        this.filterBy(event.target.value);
      }
    }

    filterBy(rating) {
      this.rating = rating || "";
      const select = this.querySelector("[data-blinc-filter]");
      if (select) select.value = this.rating;
      this.reload();
    }

    reload() {
      this.cursor = null;
      this.page = 1;
      this.load({ replace: true });
    }

    // ---- Dialogs ----

    openForm() {
      const dialog = this.formDialog;
      if (!dialog) return;
      this.form.elements.started_at.value = String(Date.now());
      this.loadPicker();
      // The module resets the steps; until it loads the dialog shows step 1 anyway.
      this.formModule.then((module) => module?.openSteps(this));
      dialog.showModal();
    }

    /** "More", a click on a review, or one of its photos: the full review dialog. */
    openReview(card, photo = 0) {
      this.loadPicker();
      this.formModule.then((module) => module?.openReview(this, card, photo));
    }

    openGallery(start, fallback) {
      this.loadPicker();
      this.formModule.then((module) =>
        module ? module.openGallery(this, start) : this.openPhoto(fallback),
      );
    }

    // ---- Photos ----

    /** Form extras (photo picker, summary refresh) load only once the form is opened. */
    loadPicker() {
      const src = this.dataset.formScript;
      if (this.formModule || !src) return;
      const { signal } = this.events;
      this.formModule = import(src)
        .then((module) => {
          module.markCards(this);
          return module;
        })
        .catch(() => null);
      this.picker = this.formModule.then((module) =>
        module && this.form.querySelector("[data-blinc-photo-input]")
          ? module.createPicker(this.form, {
              signal,
              removeLabel: this.i18n.removePhoto || "Remove photo",
            })
          : null,
      );
    }

    /** Carousel and page numbers, only for widgets that use them. */
    loadExtras() {
      const src = this.dataset.extrasScript;
      if (!src || this.extras) return;
      this.extras = import(src)
        .then((module) => module.setup(this))
        .catch(() => null);
    }

    openPhoto(src) {
      if (!this.lightbox) return;
      let img = this.lightbox.querySelector("img");
      if (!img) {
        img = this.el("img");
        img.alt = "";
        this.lightbox.prepend(img);
      }
      img.src = src;
      this.lightbox.showModal();
    }

    // ---- Reviews list ----

    url(params) {
      const query = new URLSearchParams({
        product_id: this.dataset.productId,
        per_page: this.dataset.perPage || "10",
        name_format: this.dataset.nameFormat || "first_initial",
        ...params,
      });
      return `${this.dataset.endpoint}?${query}`;
    }

    async load({ fresh = false, replace = false } = {}) {
      const pages = this.dataset.pagination === "pages";
      this.moreButton.disabled = true;
      this.setAttribute("aria-busy", "true");
      try {
        const params = {};
        if (this.sort !== "recent") params.sort = this.sort;
        if (this.rating) params.rating = this.rating;
        if (pages) params.page = String(this.page);
        else if (this.cursor && !replace) params.cursor = this.cursor;
        // Bypass the 60s cache right after the customer's own review goes live.
        if (fresh) params.t = String(Date.now());
        const response = await fetch(this.url(params), {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(String(response.status));
        const { reviews, nextCursor, total } = await response.json();

        const fragment = document.createDocumentFragment();
        for (const review of reviews)
          fragment.append(this.renderReview(review));
        if (replace || pages || fresh) this.list.replaceChildren(fragment);
        else this.list.append(fragment);
        if (!this.list.children.length)
          this.list.append(
            this.el("li", "blinc-reviews__none", this.i18n.noMatch),
          );
        this.clamp(this.list.children);
        this.formModule?.then((module) => module?.markCards(this));

        this.cursor = nextCursor;
        this.total = total ?? this.total;
        this.moreButton.hidden = pages || !nextCursor;
        this.extras?.then((extras) => extras?.refresh());
      } catch {
        this.showNotice(this.i18n.loadError);
      } finally {
        this.moreButton.disabled = false;
        this.removeAttribute("aria-busy");
      }
    }

    /** Adds a More/Less toggle to review texts the line clamp actually cut. */
    clamp(items) {
      if (
        !this.matches(
          ".blinc-clamp-short, .blinc-clamp-medium, .blinc-clamp-long",
        )
      )
        return;
      requestAnimationFrame(() => {
        for (const item of items) {
          const body = item.querySelector(
            ":scope > .blinc-review__content > .blinc-review__body",
          );
          if (
            !body ||
            body.nextElementSibling?.hasAttribute("data-blinc-expand")
          )
            continue;
          if (body.scrollHeight <= body.clientHeight + 1) continue;
          const toggle = this.el(
            "button",
            "blinc-review__more",
            this.i18n.readMore,
          );
          toggle.type = "button";
          toggle.dataset.blincExpand = "";
          toggle.setAttribute("aria-expanded", "false");
          body.after(toggle);
        }
      });
    }

    renderReview(review) {
      const item = document.createElement("li");
      item.className = "blinc-review";
      item.dataset.reviewId = review.id;

      // Same markup as the server-rendered first page in blocks/reviews.liquid.
      const author = this.el("div", "blinc-review__author");
      const who = this.el("div", "blinc-review__who");
      const nameRow = this.el("span", "blinc-review__name-row");
      nameRow.append(this.el("strong", "blinc-review__name", review.author));
      if (review.verified)
        nameRow.append(
          this.el("span", "blinc-review__verified", this.i18n.verified),
        );
      who.append(nameRow);
      if (this.dataset.showDate !== "false") {
        const time = this.el(
          "time",
          "blinc-review__date",
          this.dateFormat.format(new Date(review.date)),
        );
        time.dateTime = review.date;
        who.append(time);
      }
      const source =
        this.dataset.showSource !== "false" &&
        this.i18n.sources?.[review.source];
      if (source) who.append(this.el("span", "blinc-review__source", source));
      const avatar = this.el(
        "span",
        "blinc-avatar",
        (review.author || "?").charAt(0).toUpperCase(),
      );
      avatar.setAttribute("aria-hidden", "true");
      author.append(avatar, who);

      const content = this.el("div", "blinc-review__content");
      const stars = this.el("span", "blinc-stars");
      stars.style.setProperty("--blinc-fill", `${review.rating * 20}%`);
      stars.setAttribute("role", "img");
      stars.setAttribute(
        "aria-label",
        (this.i18n.starsAria || "").replace("%r", review.rating),
      );
      content.append(stars);
      item.append(author, content);

      if (review.title)
        content.append(this.el("h3", "blinc-review__title", review.title));
      if (review.body)
        content.append(this.el("p", "blinc-review__body", review.body));
      if (review.photos?.length) {
        const row = this.el("div", "blinc-review__photos");
        for (const photo of review.photos) {
          const button = this.el("button", "blinc-photo");
          button.type = "button";
          button.dataset.blincPhoto = `${this.mediaBase}/${photo.f}`;
          button.setAttribute(
            "aria-label",
            this.i18n.openPhoto || "Open photo",
          );
          const img = this.el("img");
          img.src = `${this.mediaBase}/${photo.t}`;
          img.alt = "";
          img.loading = "lazy";
          img.width = 72;
          img.height = 72;
          button.append(img);
          row.append(button);
        }
        content.append(row);
      }
      if (review.reply) {
        const reply = this.el("div", "blinc-review__reply");
        reply.append(
          this.el("strong", "", this.i18n.reply),
          this.el("p", "blinc-review__body", review.reply),
        );
        content.append(reply);
      }
      return item;
    }

    el(tag, className, text) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text) node.textContent = text;
      return node;
    }

    showNotice(message) {
      this.notice.textContent = message;
      this.notice.hidden = false;
    }
  }

  customElements.define("blinc-reviews", BlincReviews);

  // ---- Star rating badges ----
  // Badges render as plain stars (no link, so no URL preview on hover). With a reviews
  // widget on the page they become buttons that glide there; without one they stay
  // static instead of being a dead button. The block can be added twice, so the first
  // visible widget wins.
  const visibleWidget = () =>
    [...document.querySelectorAll("blinc-reviews")].find(
      (element) => element.getClientRects().length > 0,
    );

  const upgradeBadges = () => {
    const widget = visibleWidget();
    if (!widget) return;
    for (const badge of document.querySelectorAll(
      "[data-blinc-reviews-link]:not([role])",
    )) {
      badge.setAttribute("role", "button");
      badge.tabIndex = 0;
      badge.setAttribute(
        "aria-label",
        widget.i18n?.seeAll || "See all reviews",
      );
    }
  };

  const goToReviews = (event) => {
    if (!event.target.closest?.("[data-blinc-reviews-link][role=button]"))
      return;
    if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ")
      return;
    const widget = visibleWidget();
    if (!widget) return;
    event.preventDefault();
    const instant = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    widget.scrollIntoView({
      behavior: instant ? "auto" : "smooth",
      block: "start",
    });
    // Keyboard and screen reader users continue from the reviews too.
    widget.setAttribute("tabindex", "-1");
    widget.focus({ preventScroll: true });
  };
  document.addEventListener("click", goToReviews);
  document.addEventListener("keydown", goToReviews);
  // Widgets connecting and the live summary refresh (which re-renders badges) re-run it.
  document.addEventListener("blinc:badges", upgradeBadges);
  // Widgets already on the page connected before this listener existed.
  upgradeBadges();
})();
