// Sends email through Resend's HTTP API. Without RESEND_API_KEY it runs as a dry run:
// the email is logged instead of sent, so the whole request flow can be tested locally.

export type OutgoingEmail = {
  to: string;
  fromName: string;
  replyTo?: string | null;
  subject: string;
  html: string;
  text: string;
  /** Customer emails only; adds one-click List-Unsubscribe headers. */
  unsubscribeUrl?: string;
};

export function isDryRun() {
  return !process.env.RESEND_API_KEY;
}

export async function sendEmail(email: OutgoingEmail): Promise<{ id: string }> {
  const domain = process.env.EMAIL_FROM_DOMAIN || "example.com";
  const from = `${email.fromName.replace(/["<>]/g, "")} <reviews@${domain}>`;

  if (isDryRun()) {
    console.info(
      `[mail:dry-run] to=${email.to} subject="${email.subject}" from="${from}"`,
    );
    return { id: "dry-run" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email.to],
      reply_to: email.replyTo || undefined,
      subject: email.subject,
      html: email.html,
      text: email.text,
      headers: email.unsubscribeUrl
        ? {
            "List-Unsubscribe": `<${email.unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          }
        : undefined,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `Resend ${response.status}: ${body?.message ?? "send failed"}`,
    );
  }
  return { id: body.id };
}
