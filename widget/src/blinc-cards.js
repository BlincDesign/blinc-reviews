// Star ratings on product cards (app embed). Finds product cards by their
// /products/<handle> links, adds the merchant's star badge under the title, and asks
// the app for ratings the page didn't include (filters, "load more", recommendations).
(() => {
  const dataNode = document.getElementById("blinc-card-data");
  const template = document.getElementById("blinc-card-badge");
  if (!dataNode || !template || dataNode.dataset.ready) return;
  dataNode.dataset.ready = "true";

  const data = JSON.parse(dataNode.textContent || "{}");
  const ratings = new Map(Object.entries(data.ratings || {}));
  const HANDLE = /\/products\/([a-z0-9][a-z0-9-]*)/i;
  const CARD =
    data.selector ||
    "li, article, .card, .card-wrapper, .product-card, .product-item, .grid__item, .grid-product, [class*='product-card'], [class*='ProductItem']";
  // Cards that already show stars: the theme's own rating, or another reviews app.
  const RATED = ".blinc-rating, .rating, .product-rating, .jdgm-preview-badge, .stamped-badge, .yotpo";
  const OUTSIDE = "header, nav, footer, form, blinc-reviews, dialog, [data-blinc-no-stars]";
  const done = new WeakSet();
  const showsRating = (card) =>
    [...card.querySelectorAll(RATED)].some((element) => element.getClientRects().length > 0);
  const waiting = new Map(); // handle -> cards
  let timer = 0;

  const countText = (count) =>
    data.text ? data.text.replace("{n}", count) : count === 1 ? data.one : data.other.replace("%n", count);

  const addBadge = (card, [average, count]) => {
    done.add(card);
    if (!count && data.hideEmpty) return;
    const badge = template.content.firstElementChild.cloneNode(true);
    const stars = badge.querySelector(".blinc-stars");
    stars.style.setProperty("--blinc-fill", `${average * 20}%`);
    stars.setAttribute("aria-label", data.aria.replace("%r", average));
    const label = badge.querySelector(".blinc-rating__count");
    if (label) label.textContent = count ? countText(count) : data.none;
    // Under the visible product title. Cards can hold more than one (Dawn keeps a hidden
    // fallback title for cards without an image), so skip titles that aren't shown.
    const titles = [...card.querySelectorAll("h2, h3, h4, [class*='title'], [class*='heading'], [class*='name']")].filter(
      (element) => !element.querySelector("img"),
    );
    const title = titles.find((element) => element.getClientRects().length > 0) || titles.at(-1);
    if (title) title.after(badge);
    else card.append(badge);
  };

  const fetchMissing = () => {
    const handles = [...waiting.keys()].filter((handle) => !ratings.has(handle)).slice(0, 50);
    if (!handles.length) return;
    fetch(`${data.endpoint}?handles=${handles.join(",")}`, { headers: { Accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : { ratings: {} }))
      .catch(() => ({ ratings: {} }))
      .then((result) => {
        for (const handle of handles) {
          ratings.set(handle, result.ratings?.[handle] || [0, 0]);
          for (const card of waiting.get(handle) || []) if (!done.has(card)) addBadge(card, ratings.get(handle));
          waiting.delete(handle);
        }
        if (waiting.size) fetchMissing();
      });
  };

  const scan = () => {
    for (const link of document.querySelectorAll('a[href*="/products/"]')) {
      const handle = link.getAttribute("href").match(HANDLE)?.[1]?.toLowerCase();
      if (!handle || link.closest(OUTSIDE)) continue;
      const card = link.closest(CARD);
      if (!card || done.has(card) || !card.querySelector("img") || showsRating(card)) continue;
      if (ratings.has(handle)) addBadge(card, ratings.get(handle));
      else waiting.set(handle, [...(waiting.get(handle) || []), card]);
    }
    if (waiting.size) fetchMissing();
  };

  scan();
  // Themes render more cards later (filters, infinite scroll, recommendations).
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(scan, 200);
  }).observe(document.body, { childList: true, subtree: true });
})();
