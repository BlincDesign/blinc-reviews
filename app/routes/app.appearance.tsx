import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getDesign, saveDesign } from "../features/appearance/design.server";
import { widgetCss } from "../features/appearance/widget-css.server";
import { themeEditorLinks } from "../features/setup/theme.server";
import {
  CAROUSEL_SPEED_MAX,
  CUSTOM_CSS_MAX,
  normalizeDesign,
  PER_PAGE_MAX,
  PER_PAGE_MIN,
  type Design,
} from "../features/appearance/design";
import { BadgePreview, WidgetPreview } from "../features/appearance/Preview";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const design = await getDesign(admin);
  // The preview uses the storefront stylesheet itself, so it matches the live widget.
  return {
    design,
    shopName: session.shop.replace(".myshopify.com", ""),
    widgetCss,
    links: themeEditorLinks(session.shop, process.env.SHOPIFY_API_KEY || ""),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const form = await request.formData();
  try {
    const design = await saveDesign(
      admin,
      JSON.parse(String(form.get("design") ?? "{}")),
    );
    return { ok: true as const, design };
  } catch (error) {
    console.error("[appearance] save failed", error);
    return { ok: false as const, design: null };
  }
};

// Checkbox fields are absent from FormData when unchecked.
const CHECKBOXES = [
  "widget.showTitle",
  "widget.showDate",
  "widget.showBreakdown",
  "widget.showAvatar",
  "widget.showMedia",
  "widget.showSortFilter",
  "widget.showSource",
  "widget.showPolicy",
  "widget.hideWhenEmpty",
  "badge.hideWhenEmpty",
];

function readForm(form: HTMLFormElement): Design {
  const raw: Record<string, Record<string, unknown>> = {
    branding: {},
    widget: {},
    badge: {},
  };
  const data = new FormData(form);
  for (const [name, value] of data.entries()) {
    const [group, key] = name.split(".");
    if (raw[group] && key) raw[group][key] = value;
  }
  for (const name of CHECKBOXES) {
    const [group, key] = name.split(".");
    raw[group][key] = data.has(name);
  }
  raw.widget.perPage = Number(raw.widget.perPage);
  raw.widget.carouselSpeed = Number(raw.widget.carouselSpeed);
  return normalizeDesign(raw);
}

// Two-column editor like Judge.me: settings left, sticky preview right.
const EDITOR_CSS = `
.blinc-editor { display: grid; gap: 16px; align-items: start; grid-template-columns: minmax(300px, 400px) 1fr; }
.blinc-editor__preview { position: sticky; top: 16px; min-width: 0; }
@media (max-width: 900px) {
  .blinc-editor { grid-template-columns: 1fr; }
  .blinc-editor__preview { position: static; }
}`;

type Tab = "branding" | "widget" | "badge";

const TABS: { id: Tab; label: string }[] = [
  { id: "branding", label: "Branding" },
  { id: "widget", label: "Reviews widget" },
  { id: "badge", label: "Star rating" },
];

function Option({
  value,
  label,
  current,
}: {
  value: string;
  label: string;
  current: string;
}) {
  return (
    <s-option value={value} defaultSelected={value === current}>
      {label}
    </s-option>
  );
}

export default function Appearance() {
  const {
    design: saved,
    shopName,
    widgetCss: css,
    links,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const shopify = useAppBridge();

  const formRef = useRef<HTMLFormElement>(null);
  const [design, setDesign] = useState<Design>(saved);
  const [tab, setTab] = useState<Tab>("branding");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  // Read after the event settles so Polaris fields have committed their new value.
  const sync = useCallback(() => {
    setTimeout(() => {
      if (formRef.current) setDesign(readForm(formRef.current));
    }, 0);
  }, []);
  // Attached to every field: Polaris fields handle input inside their shadow DOM,
  // so form-level listeners alone miss some changes (e.g. color pickers).
  const live = { onInput: sync, onChange: sync };

  // Fallback for any field without handlers, and re-read after the save bar's Discard.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const onReset = () => sync();
    form.addEventListener("input", sync, true);
    form.addEventListener("change", sync, true);
    form.addEventListener("reset", onReset);
    return () => {
      form.removeEventListener("input", sync, true);
      form.removeEventListener("change", sync, true);
      form.removeEventListener("reset", onReset);
    };
  }, [sync]);

  useEffect(() => {
    if (!actionData) return;
    shopify.toast.show(
      actionData.ok ? "Appearance saved" : "Couldn't save. Try again.",
      {
        isError: !actionData.ok,
      },
    );
  }, [actionData, shopify]);

  const { branding: b, widget: w, badge: g } = saved;

  return (
    <s-page heading="Appearance" inlineSize="large">
      {/* Our own stylesheet; every rule is scoped to .blinc-* classes. */}
      <style dangerouslySetInnerHTML={{ __html: css + EDITOR_CSS }} />
      <div className="blinc-editor">
        <form
          ref={formRef}
          data-save-bar
          onSubmit={(event) => {
            event.preventDefault();
            submit(
              { design: JSON.stringify(readForm(event.currentTarget)) },
              { method: "post" },
            );
          }}
        >
          <s-stack gap="base">
            <s-section padding="base">
              <s-stack direction="inline" gap="small-200">
                {TABS.map((t) => (
                  <s-button
                    key={t.id}
                    variant={tab === t.id ? "primary" : "secondary"}
                    onClick={() => setTab(t.id)}
                  >
                    {t.label}
                  </s-button>
                ))}
              </s-stack>
            </s-section>

            <div hidden={tab !== "branding"}>
              <s-section heading="Branding">
                <s-stack gap="base">
                  <s-paragraph>
                    Applies to every widget. Widgets can override these colors.
                  </s-paragraph>
                  <s-color-field
                    {...live}
                    name="branding.primaryColor"
                    label="Primary color"
                    defaultValue={b.primaryColor}
                  />
                  <s-color-field
                    {...live}
                    name="branding.starColor"
                    label="Star color"
                    defaultValue={b.starColor}
                  />
                  <s-select
                    {...live}
                    name="branding.starShape"
                    label="Rating icon"
                  >
                    <Option value="star" label="Star" current={b.starShape} />
                    <Option value="heart" label="Heart" current={b.starShape} />
                    <Option
                      value="circle"
                      label="Circle"
                      current={b.starShape}
                    />
                    <Option
                      value="diamond"
                      label="Diamond"
                      current={b.starShape}
                    />
                  </s-select>
                  <s-select
                    {...live}
                    name="branding.corners"
                    label="Corner style"
                  >
                    <Option value="sharp" label="Sharp" current={b.corners} />
                    <Option value="soft" label="Soft" current={b.corners} />
                    <Option value="round" label="Round" current={b.corners} />
                  </s-select>
                </s-stack>
              </s-section>
            </div>

            <div hidden={tab !== "widget"}>
              <s-stack gap="base">
                <s-section heading="Install">
                  <s-stack gap="base">
                    <s-paragraph>
                      Add the reviews widget to your product page. Google
                      ratings and the fallback for products without reviews are
                      set on the block in the theme editor.
                    </s-paragraph>
                    <s-stack direction="inline" gap="small-200">
                      <s-button href={links.reviewsSection} target="_top">
                        Add to theme
                      </s-button>
                      <s-button
                        href={links.starRating}
                        target="_top"
                        variant="tertiary"
                      >
                        Add star rating badge
                      </s-button>
                      <s-button
                        href={links.cardStars}
                        target="_top"
                        variant="tertiary"
                      >
                        Turn on collection stars
                      </s-button>
                    </s-stack>
                  </s-stack>
                </s-section>

                <s-section heading="Color and styling">
                  <s-stack gap="base">
                    <s-color-field
                      {...live}
                      name="widget.buttonColor"
                      label="Button color"
                      details="Leave empty to use the primary color. Star and bar colors come from Branding."
                      defaultValue={w.buttonColor}
                    />
                    <s-color-field
                      {...live}
                      name="widget.buttonTextColor"
                      label="Button text color"
                      defaultValue={w.buttonTextColor}
                    />
                    <s-color-field
                      {...live}
                      name="widget.textColor"
                      label="Text color"
                      details="Leave empty to use your theme's text color."
                      defaultValue={w.textColor}
                    />
                    <s-color-field
                      {...live}
                      name="widget.mutedTextColor"
                      label="Lighter text color"
                      details="Review dates, counts and hints."
                      defaultValue={w.mutedTextColor}
                    />
                  </s-stack>
                </s-section>

                <s-section heading="Text">
                  <s-stack gap="base">
                    <s-checkbox
                      {...live}
                      name="widget.showTitle"
                      label="Show widget title"
                      defaultChecked={w.showTitle}
                    />
                    <s-text-field
                      {...live}
                      name="widget.title"
                      label="Widget title"
                      placeholder="Customer reviews"
                      defaultValue={w.title}
                    />
                    <s-text-field
                      {...live}
                      name="widget.noReviewsText"
                      label="No reviews text"
                      placeholder="No reviews yet. Be the first to share your thoughts."
                      defaultValue={w.noReviewsText}
                    />
                    <s-text-field
                      {...live}
                      name="widget.writeButtonText"
                      label="Write button text"
                      placeholder="Write a review"
                      defaultValue={w.writeButtonText}
                    />
                    <s-text-field
                      {...live}
                      name="widget.replyAuthor"
                      label="Reply author name"
                      placeholder="Your store name"
                      details='Shown above your replies, e.g. "Reply from Blinc".'
                      defaultValue={w.replyAuthor}
                    />
                  </s-stack>
                </s-section>

                <s-section heading="Widget header">
                  <s-stack gap="base">
                    <s-select
                      {...live}
                      name="widget.headerTheme"
                      label="Header theme"
                    >
                      <Option
                        value="minimal"
                        label="Minimal (rating and button)"
                        current={w.headerTheme}
                      />
                      <Option
                        value="standard"
                        label="Standard (bars, photos, button)"
                        current={w.headerTheme}
                      />
                      <Option
                        value="sidebar"
                        label="Sidebar (summary beside the reviews)"
                        current={w.headerTheme}
                      />
                    </s-select>
                    <s-select
                      {...live}
                      name="widget.headerSize"
                      label="Title size"
                    >
                      <Option
                        value="small"
                        label="Small"
                        current={w.headerSize}
                      />
                      <Option
                        value="medium"
                        label="Medium (theme default)"
                        current={w.headerSize}
                      />
                      <Option
                        value="large"
                        label="Large"
                        current={w.headerSize}
                      />
                    </s-select>
                    <s-select
                      {...live}
                      name="widget.ratingStyle"
                      label="Average rating style"
                    >
                      <Option
                        value="compact"
                        label="Compact"
                        current={w.ratingStyle}
                      />
                      <Option
                        value="minimal"
                        label="Minimal (one line)"
                        current={w.ratingStyle}
                      />
                      <Option
                        value="bold"
                        label="Bold (large number)"
                        current={w.ratingStyle}
                      />
                    </s-select>
                    <s-checkbox
                      {...live}
                      name="widget.showBreakdown"
                      label="Show rating bars"
                      details="Shoppers can click a bar to see only those reviews. Not shown in the Minimal header."
                      defaultChecked={w.showBreakdown}
                    />
                    <s-checkbox
                      {...live}
                      name="widget.showMedia"
                      label="Show media gallery"
                      details="The latest customer photos for the product."
                      defaultChecked={w.showMedia}
                    />
                    <s-checkbox
                      {...live}
                      name="widget.showSortFilter"
                      label="Show sort and rating filter"
                      defaultChecked={w.showSortFilter}
                    />
                    <s-select
                      {...live}
                      name="widget.defaultSort"
                      label="Default sorting"
                    >
                      <Option
                        value="recent"
                        label="Most recent"
                        current={w.defaultSort}
                      />
                      <Option
                        value="highest"
                        label="Highest rating"
                        current={w.defaultSort}
                      />
                      <Option
                        value="lowest"
                        label="Lowest rating"
                        current={w.defaultSort}
                      />
                      <Option
                        value="photos"
                        label="With photos first"
                        current={w.defaultSort}
                      />
                      <Option
                        value="photos_only"
                        label="Only with photos"
                        current={w.defaultSort}
                      />
                    </s-select>
                  </s-stack>
                </s-section>

                <s-section heading="Reviews section">
                  <s-stack gap="base">
                    <s-select {...live} name="widget.layout" label="Theme">
                      <Option
                        value="standard"
                        label="Standard (one review per row)"
                        current={w.layout}
                      />
                      <Option
                        value="cards"
                        label="Cards (grid of review cards)"
                        current={w.layout}
                      />
                      <Option
                        value="align"
                        label="Align (reviewer on the left)"
                        current={w.layout}
                      />
                      <Option
                        value="carousel"
                        label="Carousel (swipe through cards)"
                        current={w.layout}
                      />
                    </s-select>
                    <s-number-field
                      {...live}
                      name="widget.perPage"
                      label="Reviews per page"
                      min={PER_PAGE_MIN}
                      max={PER_PAGE_MAX}
                      step={1}
                      defaultValue={String(w.perPage)}
                    />
                    {/* Both stay in the form so switching layouts keeps each value. */}
                    <div hidden={design.widget.layout !== "carousel"}>
                      <s-number-field
                        {...live}
                        name="widget.carouselSpeed"
                        label="Transition speed"
                        suffix="seconds"
                        details="0 turns off automatic sliding."
                        min={0}
                        max={CAROUSEL_SPEED_MAX}
                        step={1}
                        defaultValue={String(w.carouselSpeed)}
                      />
                    </div>
                    <div hidden={design.widget.layout === "carousel"}>
                      <s-select
                        {...live}
                        name="widget.pagination"
                        label="Pagination type"
                      >
                        <Option
                          value="load_more"
                          label="Load more button"
                          current={w.pagination}
                        />
                        <Option
                          value="pages"
                          label="Page numbers"
                          current={w.pagination}
                        />
                      </s-select>
                    </div>

                    <s-heading>Styling</s-heading>
                    <s-select
                      {...live}
                      name="widget.imageStyle"
                      label="Image style"
                    >
                      <Option
                        value="thumbnails"
                        label="Thumbnails"
                        current={w.imageStyle}
                      />
                      <Option
                        value="highlight"
                        label="Highlight (first photo large)"
                        current={w.imageStyle}
                      />
                    </s-select>
                    <s-select
                      {...live}
                      name="widget.starSize"
                      label="Stars size"
                    >
                      <Option
                        value="small"
                        label="Small"
                        current={w.starSize}
                      />
                      <Option
                        value="medium"
                        label="Medium"
                        current={w.starSize}
                      />
                      <Option
                        value="large"
                        label="Large"
                        current={w.starSize}
                      />
                    </s-select>
                    <s-select
                      {...live}
                      name="widget.verifiedStyle"
                      label="Verified badge"
                    >
                      <Option
                        value="badge"
                        label="Badge"
                        current={w.verifiedStyle}
                      />
                      <Option
                        value="text"
                        label="Text"
                        current={w.verifiedStyle}
                      />
                      <Option
                        value="icon"
                        label="Icon only"
                        current={w.verifiedStyle}
                      />
                    </s-select>
                    <s-select
                      {...live}
                      name="widget.titleSize"
                      label="Review title text size"
                    >
                      <Option
                        value="small"
                        label="Small"
                        current={w.titleSize}
                      />
                      <Option
                        value="medium"
                        label="Medium"
                        current={w.titleSize}
                      />
                      <Option
                        value="large"
                        label="Large"
                        current={w.titleSize}
                      />
                    </s-select>
                    <s-select
                      {...live}
                      name="widget.bodySize"
                      label="Review text size"
                    >
                      <Option
                        value="small"
                        label="Small"
                        current={w.bodySize}
                      />
                      <Option
                        value="medium"
                        label="Medium"
                        current={w.bodySize}
                      />
                      <Option
                        value="large"
                        label="Large"
                        current={w.bodySize}
                      />
                    </s-select>
                    <s-select
                      {...live}
                      name="widget.textLength"
                      label="Review text length"
                      details='Longer reviews get a "More" link.'
                    >
                      <Option
                        value="short"
                        label="Short (3 lines)"
                        current={w.textLength}
                      />
                      <Option
                        value="medium"
                        label="Medium (5 lines)"
                        current={w.textLength}
                      />
                      <Option
                        value="long"
                        label="Long (8 lines)"
                        current={w.textLength}
                      />
                      <Option
                        value="full"
                        label="Full text"
                        current={w.textLength}
                      />
                    </s-select>
                    <s-select
                      {...live}
                      name="widget.textSize"
                      label="Widget text size"
                    >
                      <Option
                        value="small"
                        label="Small"
                        current={w.textSize}
                      />
                      <Option
                        value="medium"
                        label="Medium"
                        current={w.textSize}
                      />
                      <Option
                        value="large"
                        label="Large"
                        current={w.textSize}
                      />
                    </s-select>

                    <s-heading>Transparency and privacy</s-heading>
                    <s-select
                      {...live}
                      name="widget.nameFormat"
                      label="Reviewer name format"
                    >
                      <Option
                        value="full"
                        label="Full name (John Smith)"
                        current={w.nameFormat}
                      />
                      <Option
                        value="first_initial"
                        label="First name, last initial (John S.)"
                        current={w.nameFormat}
                      />
                      <Option
                        value="initials"
                        label="Initials (J. S.)"
                        current={w.nameFormat}
                      />
                    </s-select>
                    <s-checkbox
                      {...live}
                      name="widget.showDate"
                      label="Show review date"
                      defaultChecked={w.showDate}
                    />
                    <s-checkbox
                      {...live}
                      name="widget.showSource"
                      label="Show how each review was collected"
                      details='"Via store invitation", "Via store visitor" or "Imported". EU consumer rules expect shoppers to see where reviews come from.'
                      defaultChecked={w.showSource}
                    />
                    <s-checkbox
                      {...live}
                      name="widget.showPolicy"
                      label='Show "How reviews are collected"'
                      details="A short note under the rating summary explaining how you collect and check reviews."
                      defaultChecked={w.showPolicy}
                    />
                    <s-text-area
                      {...live}
                      name="widget.policyText"
                      label="How reviews are collected (your text)"
                      details="Leave empty for the default text. Describe your real process: shoppers and regulators may rely on it."
                      rows={4}
                      maxLength={800}
                      defaultValue={w.policyText}
                    />

                    <s-heading>Content display</s-heading>
                    <s-checkbox
                      {...live}
                      name="widget.showAvatar"
                      label="Show reviewer avatar"
                      defaultChecked={w.showAvatar}
                    />
                    <s-checkbox
                      {...live}
                      name="widget.hideWhenEmpty"
                      label="Hide widget when a product has no reviews"
                      defaultChecked={w.hideWhenEmpty}
                    />
                  </s-stack>
                </s-section>

                <s-section heading="Advanced">
                  <s-text-area
                    {...live}
                    name="widget.customCss"
                    label="Custom CSS"
                    details={`Applies to the reviews widget. Up to ${CUSTOM_CSS_MAX} characters.`}
                    rows={6}
                    maxLength={CUSTOM_CSS_MAX}
                    defaultValue={w.customCss}
                  />
                </s-section>
              </s-stack>
            </div>

            <div hidden={tab !== "badge"}>
              <s-section heading="Star rating badge">
                <s-stack gap="base">
                  <s-select {...live} name="badge.mode" label="Display">
                    <Option
                      value="stars_text"
                      label="Stars and review count"
                      current={g.mode}
                    />
                    <Option
                      value="stars_only"
                      label="Stars only"
                      current={g.mode}
                    />
                  </s-select>
                  <s-text-field
                    {...live}
                    name="badge.textTemplate"
                    label="Review count text"
                    placeholder="({n} reviews)"
                    details="Use {n} for the number of reviews. Leave empty for the default."
                    defaultValue={g.textTemplate}
                  />
                  <s-color-field
                    {...live}
                    name="badge.starColor"
                    label="Star color"
                    details="Leave empty to use the Branding star color."
                    defaultValue={g.starColor}
                  />
                  <s-select {...live} name="badge.starSize" label="Star size">
                    <Option value="small" label="Small" current={g.starSize} />
                    <Option
                      value="medium"
                      label="Medium"
                      current={g.starSize}
                    />
                    <Option value="large" label="Large" current={g.starSize} />
                  </s-select>
                  <s-checkbox
                    {...live}
                    name="badge.hideWhenEmpty"
                    label="Hide when a product has no reviews"
                    defaultChecked={g.hideWhenEmpty}
                  />
                </s-stack>
              </s-section>
            </div>
          </s-stack>
        </form>

        <div className="blinc-editor__preview">
          <s-section heading="Preview">
            <s-stack gap="base">
              <s-stack direction="inline" gap="small-200">
                <s-button
                  icon="desktop"
                  variant={device === "desktop" ? "primary" : "secondary"}
                  accessibilityLabel="Desktop preview"
                  onClick={() => setDevice("desktop")}
                />
                <s-button
                  icon="mobile"
                  variant={device === "mobile" ? "primary" : "secondary"}
                  accessibilityLabel="Mobile preview"
                  onClick={() => setDevice("mobile")}
                />
                {navigation.state === "submitting" ? (
                  <s-spinner accessibilityLabel="Saving" />
                ) : null}
              </s-stack>
              <s-box
                border="base"
                borderRadius="base"
                padding="large-200"
                background="base"
              >
                <div
                  style={{
                    maxWidth: device === "mobile" ? 375 : "100%",
                    margin: "0 auto",
                  }}
                >
                  {tab === "badge" ? (
                    <BadgePreview design={design} />
                  ) : (
                    <s-stack gap="large">
                      {tab === "branding" ? (
                        <BadgePreview design={design} />
                      ) : null}
                      <WidgetPreview design={design} shopName={shopName} />
                    </s-stack>
                  )}
                </div>
              </s-box>
              <s-text color="subdued">Preview uses sample reviews.</s-text>
            </s-stack>
          </s-section>
        </div>
      </div>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
