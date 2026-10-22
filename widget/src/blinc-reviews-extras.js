// Carousel and page numbers for <blinc-reviews>. Loaded only when the merchant turned
// on the Carousel layout or page-number pagination, so other stores never download it.

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function setup(host) {
  const { signal } = host.events;
  const list = host.list;
  const prev = host.querySelector(".blinc-track__nav--prev");
  const next = host.querySelector(".blinc-track__nav--next");

  // ---- Carousel ----

  /** Arrows only when the track can scroll, and none at either end. */
  const updateArrows = () => {
    if (!prev || !next) return;
    const max = list.scrollWidth - list.clientWidth;
    const scrollable = max > 4;
    prev.hidden = !scrollable || list.scrollLeft <= 4;
    next.hidden = !scrollable || list.scrollLeft >= max - 4;
  };

  const slide = (direction, loop = false) => {
    const atEnd = list.scrollLeft + list.clientWidth >= list.scrollWidth - 4;
    const behavior = reducedMotion() ? "auto" : "smooth";
    if (loop && atEnd) return list.scrollTo({ left: 0, behavior });
    list.scrollBy({ left: direction * list.clientWidth * 0.9, behavior });
  };

  if (prev && next) {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateArrows);
    };
    list.addEventListener("scroll", update, { signal, passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(list);
    signal.addEventListener("abort", () => resize.disconnect());

    const seconds = Number(host.dataset.carousel);
    if (seconds && !reducedMotion()) {
      let timer = 0;
      const pause = () => clearInterval(timer);
      const run = () => {
        pause();
        timer = setInterval(() => slide(1, true), seconds * 1000);
      };
      // Pause while the shopper is reading or using the keyboard inside the widget.
      host.addEventListener("pointerenter", pause, { signal });
      host.addEventListener("pointerleave", run, { signal });
      host.addEventListener("focusin", pause, { signal });
      host.addEventListener("focusout", run, { signal });
      signal.addEventListener("abort", pause);
      run();
    }
  }

  // ---- Page numbers ----

  /** First, last, and two pages either side of the current one. */
  const renderPager = () => {
    const pager = host.pager;
    if (!pager) return;
    const count = Math.ceil(host.total / (Number(host.dataset.perPage) || 10));
    const items = [];
    if (count > 1) {
      const button = (page, text, label) => {
        const node = host.el("button", "blinc-pages__item", text);
        node.type = "button";
        node.dataset.blincPage = String(page);
        node.setAttribute("aria-label", label);
        if (page === host.page && text === String(page)) node.setAttribute("aria-current", "page");
        return node;
      };
      const pageLabel = (page) => (host.i18n.page || "%n").replace("%n", page);
      if (host.page > 1) items.push(button(host.page - 1, "‹", host.i18n.prev));
      let last = 0;
      for (let page = 1; page <= count; page += 1) {
        if (page !== 1 && page !== count && Math.abs(page - host.page) > 2) continue;
        if (page - last > 1) items.push(host.el("span", "blinc-pages__gap", "…"));
        items.push(button(page, String(page), pageLabel(page)));
        last = page;
      }
      if (host.page < count) items.push(button(host.page + 1, "›", host.i18n.next));
    }
    pager.replaceChildren(...items);
  };

  host.addEventListener(
    "click",
    (event) => {
      const arrow = event.target.closest("[data-blinc-slide]");
      if (arrow) return slide(Number(arrow.dataset.blincSlide));
      const page = event.target.closest("[data-blinc-page]");
      if (!page) return;
      host.page = Number(page.dataset.blincPage);
      host.load({ replace: true });
      list.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" });
    },
    { signal },
  );

  const refresh = () => {
    renderPager();
    updateArrows();
  };
  refresh();
  return { refresh };
}
