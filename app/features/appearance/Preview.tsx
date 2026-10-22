import type { CSSProperties } from "react";

import { formatName, widgetClasses, type Design, type Size } from "./design";

// Mirrors extensions/blinc-reviews-theme (snippets/blinc-root-open.liquid and the blocks)
// so the admin preview uses the same markup and the same stylesheet as the storefront.

function rootProps(
  design: Design,
  {
    starColor,
    starSize,
    extraClass,
  }: { starColor?: string; starSize: Size; extraClass: string },
) {
  const { branding: b, widget: w } = design;
  const style: Record<string, string> = {
    "--blinc-primary": b.primaryColor,
    "--blinc-star": starColor || b.starColor,
    "--blinc-button": w.buttonColor || b.primaryColor,
    "--blinc-button-text": w.buttonTextColor,
  };
  if (w.textColor) style["--blinc-text"] = w.textColor;
  if (w.mutedTextColor) style["--blinc-muted"] = w.mutedTextColor;

  return {
    className: [
      "blinc-root",
      `blinc-shape-${b.starShape}`,
      `blinc-corners-${b.corners}`,
      `blinc-star-${starSize}`,
      `blinc-text-${w.textSize}`,
      extraClass,
    ].join(" "),
    style: style as CSSProperties,
  };
}

function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="blinc-stars"
      style={{ "--blinc-fill": `${rating * 20}%` } as CSSProperties}
      role="img"
      aria-label={`Rated ${rating} out of 5`}
    />
  );
}

const SAMPLE = {
  average: 4.6,
  count: 128,
  breakdown: [2, 3, 8, 21, 94],
  reviews: [
    {
      author: "Sarah Kim",
      rating: 5,
      title: "Exactly as pictured",
      body: "Great quality and fast shipping. The fabric is soft but holds its shape, the stitching is neat, and the color is exactly as pictured. I've worn it every week since it arrived and it still looks new. I've already ordered a second one as a gift.",
      verified: true,
      source: "Via store invitation",
      date: "Oct 2, 2026",
      reply: "Thank you, Sarah! Enjoy your new favorite.",
    },
    {
      author: "Marco Rossi",
      rating: 4,
      title: "Really good",
      body: "Fits well and feels premium. Took a few days to arrive.",
      verified: true,
      source: "Via store invitation",
      date: "Sep 27, 2026",
      reply: "",
    },
    {
      author: "Jen Lee",
      rating: 5,
      title: "",
      body: "Love it. Would buy again.",
      verified: false,
      source: "Via store visitor",
      date: "Sep 20, 2026",
      reply: "",
    },
  ],
};

// Sample photo tiles (no network): soft solid colors.
const TILE_COLORS = [
  "#d9c7b0",
  "#a7b8c9",
  "#c9d6b8",
  "#e3b8a4",
  "#b9b0d9",
  "#d6cfa7",
];
const tile = (color: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="${color}"/></svg>`)}`;

// Same default as the storefront (locales/en.default.json, blinc.policy.text).
const DEFAULT_POLICY =
  "Reviews come from customers we invite by email after their order (marked Verified buyer) and from visitors who use the review form on this page. Some reviews may have been imported from another review app. Reviews may be checked before they are published.";

const SORT_LABELS = {
  recent: "Most recent",
  highest: "Highest rating",
  lowest: "Lowest rating",
  photos: "With photos first",
  photos_only: "Only with photos",
} as const;

export function WidgetPreview({
  design,
  shopName,
}: {
  design: Design;
  shopName: string;
}) {
  const w = design.widget;
  const carousel = w.layout === "carousel";
  const reviews = SAMPLE.reviews.slice(
    0,
    Math.min(w.perPage, SAMPLE.reviews.length),
  );
  const showBreakdown = w.showBreakdown && w.headerTheme !== "minimal";

  return (
    <div
      {...rootProps(design, {
        starSize: w.starSize,
        extraClass: widgetClasses(w),
      })}
    >
      <div className="blinc-body">
        <div className="blinc-reviews__top">
          {w.showTitle ? (
            <h2 className="blinc-reviews__heading">
              {w.title || "Customer reviews"}
            </h2>
          ) : null}
          <div className="blinc-reviews__summary">
            <div className="blinc-reviews__score">
              <span className="blinc-reviews__avg">{SAMPLE.average}</span>
              <Stars rating={SAMPLE.average} />
            </div>
            <p className="blinc-reviews__based">
              Based on {SAMPLE.count} reviews
            </p>
            {w.showPolicy ? (
              <details className="blinc-policy">
                <summary>How reviews are collected</summary>
                <p>{w.policyText || DEFAULT_POLICY}</p>
              </details>
            ) : null}
          </div>
          {showBreakdown ? (
            <ul className="blinc-breakdown" aria-label="Rating breakdown">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = SAMPLE.breakdown[stars - 1];
                return (
                  <li key={stars}>
                    <button type="button" className="blinc-breakdown__row">
                      <span>{stars}</span>
                      <span
                        className="blinc-stars blinc-stars--one"
                        aria-hidden="true"
                      />
                      <span className="blinc-breakdown__bar">
                        <span
                          style={{
                            width: `${Math.round((count * 100) / SAMPLE.count)}%`,
                          }}
                        />
                      </span>
                      <span className="blinc-breakdown__count">{count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {w.showMedia ? (
            <div className="blinc-photo-strip">
              {TILE_COLORS.map((color) => (
                <span key={color} className="blinc-photo">
                  <img src={tile(color)} alt="" width={96} height={96} />
                </span>
              ))}
            </div>
          ) : null}
          <div className="blinc-reviews__actions">
            <button type="button" className="blinc-btn">
              {w.writeButtonText || "Write a review"}
            </button>
          </div>
        </div>

        <div className="blinc-main">
          {w.showSortFilter ? (
            <div className="blinc-toolbar">
              <span className="blinc-select">
                <select aria-label="Filter by rating" disabled>
                  <option>All ratings</option>
                </select>
              </span>
              <span className="blinc-select">
                <select aria-label="Sort reviews" disabled>
                  <option>{SORT_LABELS[w.defaultSort]}</option>
                </select>
              </span>
            </div>
          ) : null}
          <div className="blinc-track">
            <ol className="blinc-reviews__list">
              {reviews.map((review, index) => (
                <li key={review.author} className="blinc-review">
                  <div className="blinc-review__author">
                    <span className="blinc-avatar" aria-hidden="true">
                      {formatName(review.author, w.nameFormat).charAt(0)}
                    </span>
                    <div className="blinc-review__who">
                      <span className="blinc-review__name-row">
                        <strong className="blinc-review__name">
                          {formatName(review.author, w.nameFormat)}
                        </strong>
                        {review.verified ? (
                          <span className="blinc-review__verified">
                            Verified buyer
                          </span>
                        ) : null}
                      </span>
                      {w.showDate ? (
                        <time className="blinc-review__date">
                          {review.date}
                        </time>
                      ) : null}
                      {w.showSource ? (
                        <span className="blinc-review__source">
                          {review.source}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="blinc-review__content">
                    <Stars rating={review.rating} />
                    {review.title ? (
                      <h3 className="blinc-review__title">{review.title}</h3>
                    ) : null}
                    <p className="blinc-review__body">{review.body}</p>
                    {index === 0 && w.textLength !== "full" ? (
                      <button type="button" className="blinc-review__more">
                        More
                      </button>
                    ) : null}
                    {index === 0 ? (
                      <div className="blinc-review__photos">
                        {TILE_COLORS.slice(0, 3).map((color) => (
                          <span key={color} className="blinc-photo">
                            <img
                              src={tile(color)}
                              alt=""
                              width={72}
                              height={72}
                            />
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {review.reply ? (
                      <div className="blinc-review__reply">
                        <strong>Reply from {w.replyAuthor || shopName}</strong>
                        <p className="blinc-review__body">{review.reply}</p>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
            {carousel ? (
              <>
                <button
                  type="button"
                  className="blinc-track__nav blinc-track__nav--prev"
                  aria-label="Previous reviews"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="blinc-track__nav blinc-track__nav--next"
                  aria-label="Next reviews"
                >
                  ›
                </button>
              </>
            ) : null}
          </div>
          {carousel ? null : w.pagination === "pages" ? (
            <nav className="blinc-pages" aria-label="Review pages">
              <button
                type="button"
                className="blinc-pages__item"
                aria-current="page"
              >
                1
              </button>
              <button type="button" className="blinc-pages__item">
                2
              </button>
              <button type="button" className="blinc-pages__item">
                3
              </button>
              <button type="button" className="blinc-pages__item">
                ›
              </button>
            </nav>
          ) : (
            <button type="button" className="blinc-btn blinc-btn--secondary">
              Show more reviews
            </button>
          )}
        </div>
      </div>
      {w.customCss ? <style>{w.customCss}</style> : null}
    </div>
  );
}

export function BadgePreview({ design }: { design: Design }) {
  const g = design.badge;
  const text = g.textTemplate
    ? g.textTemplate.replaceAll("{n}", String(SAMPLE.count))
    : `(${SAMPLE.count} reviews)`;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontSize: 22, fontWeight: 600 }}>Classic Cotton Tee</div>
      <div
        {...rootProps(design, {
          starColor: g.starColor,
          starSize: g.starSize,
          extraClass: "blinc-rating",
        })}
      >
        <Stars rating={SAMPLE.average} />
        {g.mode === "stars_text" ? (
          <span className="blinc-rating__count">{text}</span>
        ) : null}
      </div>
      <div style={{ opacity: 0.7 }}>$29.00</div>
    </div>
  );
}
