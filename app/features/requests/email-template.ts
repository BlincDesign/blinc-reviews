import type { Design } from "../appearance/design";
import { fillVariables, type EmailSettings } from "./email-settings";

// Customer emails. Pure functions shared by the senders and the editors' live
// previews, so a preview is exactly what customers get. Table layout and inline
// styles for email clients.

export type EmailProduct = {
  productId: string; // numeric id
  title: string;
  imageUrl: string | null;
};

type Common = {
  shopName: string;
  design: Design;
  settings: EmailSettings;
  /** Target of the "Reach out to us" link. */
  contactEmail: string | null;
  unsubscribeUrl: string;
};

export type RequestEmailInput = Common & {
  kind: "initial" | "reminder";
  customerName: string | null;
  orderName: string | null;
  products: EmailProduct[];
  writeUrl: (productId: string, rating: number) => string;
  openPixelUrl: string;
};

export type ReplyEmailInput = Common & {
  reviewerName: string | null;
  productTitle: string;
  rating: number;
  reviewTitle: string | null;
  reviewBody: string | null;
  reply: string;
};

export type ConfirmEmailInput = Common & {
  reviewerName: string | null;
  productTitle: string;
  rating: number;
  reviewTitle: string | null;
  reviewBody: string | null;
  confirmUrl: string;
};

const SHAPE_CHAR = {
  star: "★",
  heart: "♥",
  circle: "●",
  diamond: "◆",
} as const;

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const paragraphs = (value: string) => escapeHtml(value).replace(/\n/g, "<br>");

function firstName(name: string | null) {
  return name?.trim().split(/\s+/)[0] || null;
}

function theme({ design, settings }: Common) {
  return {
    accent:
      settings.accentColor ||
      design.widget.buttonColor ||
      design.branding.primaryColor,
    buttonText: design.widget.buttonTextColor,
    radius: { sharp: "0", soft: "6px", round: "999px" }[
      design.branding.corners
    ],
    star: SHAPE_CHAR[design.branding.starShape],
    starColor: design.branding.starColor,
  };
}

function quote(inner: string) {
  return `<tr><td style="padding:8px 0 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="background:#f5f5f5;padding:20px 24px;font-size:15px;line-height:1.5;color:#111827;">${inner}</td></tr></table></td></tr>`;
}

/** Card with header, the email's rows, contact line and sign-off; footer outside the card. */
function layout(
  input: Common & {
    subject: string;
    preheader: string;
    heading: string;
    rows: string;
    footerNote: string;
    unsubscribeLabel: string;
    fill: (template: string) => string;
    openPixelUrl?: string;
  },
) {
  const { settings } = input;
  const { accent } = theme(input);
  const shop = escapeHtml(input.shopName);

  const header = settings.logoUrl
    ? `<img src="${escapeHtml(settings.logoUrl)}" width="${settings.logoWidth}" alt="${shop}" style="display:inline-block;max-width:100%;height:auto;border:0;">`
    : `<div style="font-size:24px;font-weight:700;color:${accent};">${shop}</div>`;

  const contact =
    settings.showContact && input.contactEmail
      ? `<tr><td align="center" style="padding-top:12px;font-size:12px;line-height:1.6;color:#374151;">If there were issues with your purchase, let us know — we're here to help.<br><a href="mailto:${escapeHtml(input.contactEmail)}" style="color:#374151;">Reach out to us.</a></td></tr>`
      : "";
  const signOff = settings.signOff
    ? `<tr><td align="center" style="padding-top:32px;font-size:16px;color:#374151;">${escapeHtml(input.fill(settings.signOff))}</td></tr>`
    : "";
  const footer = settings.footer
    ? `${paragraphs(input.fill(settings.footer))}<br><br>`
    : "";
  const pixel = input.openPixelUrl
    ? `<img src="${escapeHtml(input.openPixelUrl)}" width="1" height="1" alt="" style="display:block;border:0;">`
    : "";

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.subject)}</title></head>
<body style="margin:0;padding:0;background:${settings.backgroundColor};font-family:${FONT};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(input.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${settings.backgroundColor};padding:40px 12px;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;background:#ffffff;padding:32px 28px;">
      <tr><td align="center" style="padding-bottom:28px;">${header}</td></tr>
      <tr><td align="center" style="font-size:28px;line-height:1.25;font-weight:700;color:#111827;padding-bottom:16px;">${escapeHtml(input.heading)}</td></tr>
      ${input.rows}
      ${contact}
      ${signOff}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;"><tr><td align="center" style="padding:20px 12px 0;font-size:12px;line-height:1.6;color:#4b5563;">
      ${footer}${escapeHtml(input.footerNote)}<br>
      <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#4b5563;">${escapeHtml(input.unsubscribeLabel)}</a>
    </td></tr></table>
  </td></tr></table>
  ${pixel}
</body></html>`;
}

export function renderRequestEmail(input: RequestEmailInput) {
  const { products, settings } = input;
  const copy = settings[input.kind];
  const t = theme(input);
  const fill = (template: string) =>
    fillVariables(template, {
      first_name: firstName(input.customerName),
      shop_name: input.shopName,
      order_name: input.orderName,
    });

  const subject = fill(copy.subject);
  const heading = fill(copy.heading);
  const body = fill(copy.body);
  const button = fill(copy.button);

  const productRows = products
    .map((p) => {
      const image =
        settings.showImages && p.imageUrl
          ? `<img src="${escapeHtml(p.imageUrl)}" width="120" height="120" alt="" style="display:inline-block;border-radius:6px;object-fit:cover;margin-bottom:12px;">`
          : "";
      const action = settings.showStars
        ? `<div>${[1, 2, 3, 4, 5]
            .map(
              (r) =>
                `<a href="${escapeHtml(input.writeUrl(p.productId, r))}" style="color:${t.starColor};text-decoration:none;font-size:36px;line-height:1;padding:0 3px;" aria-label="${r} out of 5">${t.star}</a>`,
            )
            .join("")}</div>${
            settings.showHelpText
              ? `<div style="font-size:13px;color:#374151;padding-top:6px;">Click a star to leave a review</div>`
              : ""
          }`
        : `<a href="${escapeHtml(input.writeUrl(p.productId, 5))}" style="display:inline-block;background:${t.accent};color:${t.buttonText};text-decoration:none;padding:12px 28px;border-radius:${t.radius};font-size:15px;font-weight:600;">${escapeHtml(button)}</a>`;
      return `<tr><td align="center" style="padding:20px 0 4px;">
        <div style="font-size:16px;font-weight:700;color:#111827;padding-bottom:12px;">${escapeHtml(p.title)}</div>
        ${image}${action}
      </td></tr>`;
    })
    .join("");

  const html = layout({
    ...input,
    subject,
    preheader: fill(copy.preheader),
    heading,
    fill,
    rows: `<tr><td align="center" style="font-size:15px;line-height:1.6;color:#374151;">${paragraphs(body)}</td></tr>${productRows}`,
    footerNote: `You received this because you ordered from ${input.shopName}.`,
    unsubscribeLabel: "Unsubscribe from review request emails",
  });

  const text = [
    heading,
    "",
    body,
    "",
    ...products.map((p) => `${p.title}: ${input.writeUrl(p.productId, 5)}`),
    "",
    ...(settings.signOff ? [fill(settings.signOff), ""] : []),
    ...(settings.footer ? [fill(settings.footer), ""] : []),
    `Unsubscribe: ${input.unsubscribeUrl}`,
  ].join("\n");

  return { subject, html, text };
}

export function renderReplyEmail(input: ReplyEmailInput) {
  const copy = input.settings.reply;
  const t = theme(input);
  const fill = (template: string) =>
    fillVariables(template, {
      first_name: firstName(input.reviewerName),
      shop_name: input.shopName,
      product_title: input.productTitle,
    });

  const subject = fill(copy.subject);
  const heading = fill(copy.heading);
  const body = fill(copy.body);
  const replyLabel = fill(copy.replyLabel);
  const stars = `<div style="color:${t.starColor};font-size:18px;letter-spacing:2px;padding-bottom:6px;">${t.star.repeat(input.rating)}</div>`;
  const reviewTitle = input.reviewTitle
    ? `<div style="font-weight:700;">${escapeHtml(input.reviewTitle)}</div>`
    : "";
  const reviewBody = input.reviewBody ? paragraphs(input.reviewBody) : "";

  const html = layout({
    ...input,
    subject,
    preheader: fill(copy.preheader),
    heading,
    fill,
    rows: `<tr><td align="center" style="font-size:15px;line-height:1.6;color:#374151;padding-bottom:16px;">${paragraphs(body)}</td></tr>
      ${quote(`${stars}${reviewTitle}${reviewBody}`)}
      <tr><td align="center" style="font-size:15px;line-height:1.6;color:#374151;padding-top:8px;">${escapeHtml(replyLabel)}</td></tr>
      ${quote(paragraphs(input.reply))}`,
    footerNote: `You received this because you reviewed a product from ${input.shopName}.`,
    unsubscribeLabel: "Unsubscribe from these emails",
  });

  const text = [
    heading,
    "",
    body,
    "",
    [input.reviewTitle, input.reviewBody].filter(Boolean).join("\n"),
    "",
    replyLabel,
    input.reply,
    "",
    ...(input.settings.signOff ? [fill(input.settings.signOff), ""] : []),
    `Unsubscribe: ${input.unsubscribeUrl}`,
  ].join("\n");

  return { subject, html, text };
}

export function renderConfirmEmail(input: ConfirmEmailInput) {
  const copy = input.settings.confirm;
  const t = theme(input);
  const fill = (template: string) =>
    fillVariables(template, {
      first_name: firstName(input.reviewerName),
      shop_name: input.shopName,
      product_title: input.productTitle,
    });

  const subject = fill(copy.subject);
  const heading = fill(copy.heading);
  const body = fill(copy.body);
  const button = fill(copy.button);
  const stars = `<div style="color:${t.starColor};font-size:18px;letter-spacing:2px;padding-bottom:6px;">${t.star.repeat(input.rating)}</div>`;
  const reviewTitle = input.reviewTitle
    ? `<div style="font-weight:700;">${escapeHtml(input.reviewTitle)}</div>`
    : "";
  const reviewBody = input.reviewBody ? paragraphs(input.reviewBody) : "";

  const html = layout({
    ...input,
    subject,
    preheader: fill(copy.preheader),
    heading,
    fill,
    rows: `<tr><td align="center" style="font-size:15px;line-height:1.6;color:#374151;padding-bottom:16px;">${paragraphs(body)}</td></tr>
      ${quote(`${stars}${reviewTitle}${reviewBody}`)}
      <tr><td align="center" style="padding-top:16px;"><a href="${escapeHtml(input.confirmUrl)}" style="display:inline-block;background:${t.accent};color:${t.buttonText};text-decoration:none;padding:14px 32px;border-radius:${t.radius};font-size:16px;font-weight:600;">${escapeHtml(button)}</a></td></tr>`,
    footerNote: `You received this because you left a review on ${input.shopName}.`,
    unsubscribeLabel: "Unsubscribe from these emails",
  });

  const text = [
    heading,
    "",
    body,
    "",
    [input.reviewTitle, input.reviewBody].filter(Boolean).join("\n"),
    "",
    `${button}: ${input.confirmUrl}`,
    "",
    `Unsubscribe: ${input.unsubscribeUrl}`,
  ].join("\n");

  return { subject, html, text };
}

export type AlertEmailInput = {
  shopName: string;
  productTitle: string;
  reviewerName: string;
  reviewerEmail: string | null;
  rating: number;
  reviewTitle: string | null;
  reviewBody: string | null;
  status: "PUBLISHED" | "PENDING" | "HIDDEN";
  flags: string[];
  adminUrl: string;
};

const STATUS_TEXT = {
  PUBLISHED: "Published",
  PENDING: "Waiting for your approval",
  HIDDEN: "Hidden",
};

/** Internal alert to the merchant about a new review. Not customer-facing. */
export function renderAlertEmail(input: AlertEmailInput) {
  const stars = "★".repeat(input.rating) + "☆".repeat(5 - input.rating);
  const subject =
    input.status === "PENDING"
      ? `New ${input.rating}-star review needs approval: ${input.productTitle}`
      : `New ${input.rating}-star review: ${input.productTitle}`;
  const reason = input.flags.length
    ? `<p style="margin:0 0 12px;color:#b45309;">Held because it contains: ${escapeHtml(input.flags.join(", "))}</p>`
    : "";
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f4f4f5;font-family:${FONT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:24px;font-size:15px;line-height:1.5;color:#111827;">
      <tr><td>
        <p style="margin:0 0 4px;color:#6b7280;font-size:13px;">${escapeHtml(input.shopName)} · ${escapeHtml(STATUS_TEXT[input.status])}</p>
        <p style="margin:0 0 12px;font-size:18px;font-weight:700;">${escapeHtml(input.productTitle)}</p>
        ${reason}
        <p style="margin:0 0 4px;color:#f59e0b;font-size:18px;letter-spacing:2px;">${stars}</p>
        ${input.reviewTitle ? `<p style="margin:0 0 4px;font-weight:700;">${escapeHtml(input.reviewTitle)}</p>` : ""}
        ${input.reviewBody ? `<p style="margin:0 0 12px;">${paragraphs(input.reviewBody)}</p>` : ""}
        <p style="margin:0 0 20px;color:#6b7280;font-size:13px;">${escapeHtml(input.reviewerName)}${input.reviewerEmail ? ` · ${escapeHtml(input.reviewerEmail)}` : ""}</p>
        <a href="${escapeHtml(input.adminUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;">${input.status === "PENDING" ? "Review and approve" : "Open reviews"}</a>
        <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;">Change these alerts in Blinc Reviews &gt; Settings.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  const text = [
    subject,
    "",
    STATUS_TEXT[input.status],
    ...(input.flags.length
      ? [`Held because it contains: ${input.flags.join(", ")}`]
      : []),
    stars,
    input.reviewTitle ?? "",
    input.reviewBody ?? "",
    `${input.reviewerName}${input.reviewerEmail ? ` (${input.reviewerEmail})` : ""}`,
    "",
    input.adminUrl,
  ].join("\n");
  return { subject, html, text };
}
