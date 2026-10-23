import { emailText } from "../../shared/customerEmailCopy";
import axios from "axios";
import { getAdminSetting } from "./persistence/settingsStore";
import { getShopRestockNotificationsBySlug } from "./persistence/shopStore";

export const ADMIN_SETTING_NOTIFY_ALERT_EMAILS = "notify_alert_emails";
export const ADMIN_SETTING_NOTIFY_FROM_EMAIL = "notify_from_email";

/** Escape user-controlled strings before embedding in HTML email bodies. */
export function escapeEmailHtml(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strip CRLF sequences from email subject lines to prevent header injection. */
function escSubject(str: string): string {
  return String(str ?? "")
    .replace(/[\r\n]/g, " ")
    .trim();
}

function getAdminEmails(): string[] {
  return String(process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isValidEmail(email: string): boolean {
  const value = String(email ?? "").trim();
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function parseCsvEmails(value: string | null | undefined): string[] {
  return String(value ?? "")
    .split(",")
    .map(item => item.trim().toLowerCase())
    .filter(item => isValidEmail(item));
}

export async function sendEmailMessage(payload: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}) {
  const recipients = (Array.isArray(payload.to) ? payload.to : [payload.to])
    .map(value => String(value ?? "").trim())
    .filter(Boolean);

  if (recipients.length === 0) return;

  const provider = String(process.env.RESET_EMAIL_PROVIDER ?? "resend")
    .trim()
    .toLowerCase();
  const from = String(
    payload.from ?? process.env.FROM_EMAIL ?? "no-reply@du-platform.com"
  ).trim();

  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log(
        `[email:dry-run] to=${recipients.join(",")} subject=${payload.subject}`
      );
      return;
    }

    await axios.post(
      "https://api.resend.com/emails",
      {
        from,
        to: recipients,
        subject: escSubject(payload.subject),
        html: payload.html,
        text: payload.text,
      },
      {
        timeout: 5_000,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    return;
  }

  console.log(
    `[email:unsupported-provider:${provider}] to=${recipients.join(",")}`
  );
}

export async function sendEmailMessageSafe(
  payload: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string;
  },
  context: string
) {
  try {
    await sendEmailMessage(payload);
    return true;
  } catch (error: any) {
    console.error(`[email] failed in ${context}`, {
      message: String(error?.message ?? error),
      subject: escSubject(payload.subject),
    });
    return false;
  }
}

export async function getNotifyFromEmail(): Promise<string> {
  const configured = await getAdminSetting(ADMIN_SETTING_NOTIFY_FROM_EMAIL);
  if (configured && isValidEmail(configured)) return configured;
  return String(process.env.FROM_EMAIL ?? "no-reply@du-platform.com").trim();
}

export async function getNotifyAlertEmails(): Promise<string[]> {
  const configured = await getAdminSetting(ADMIN_SETTING_NOTIFY_ALERT_EMAILS);
  const configuredEmails = parseCsvEmails(configured);
  if (configuredEmails.length > 0) return configuredEmails;
  return getAdminEmails();
}

export async function sendResetEmail(to: string, resetUrl: string) {
  const from = process.env.FROM_EMAIL ?? "no-reply@du-platform.com";
  await sendEmailMessage({
    from,
    to: [to],
    subject: "Reset your Diaspora Unlocked password",
    html: `<p>We received a request to reset your password.</p><p><a href="${escapeEmailHtml(resetUrl)}">Reset Password</a></p><p>If you did not request this, ignore this email.</p>`,
  });
}

export async function notifyRestockSubscribersAndAdmins(input: {
  productId: number;
  productName: string;
  productSlug: string;
  stockQty: number;
  updatedByEmail: string;
}) {
  if ((process.env.NODE_ENV ?? "development") !== "production") return;

  const productSlug = String(input.productSlug ?? "")
    .trim()
    .toLowerCase();
  if (!productSlug) return;

  try {
    const fromEmail = await getNotifyFromEmail();
    const rows = await getShopRestockNotificationsBySlug(productSlug);
    const recipients = new Map<string, string>();
    for (const row of rows) {
      const email = String(row.email ?? "")
        .trim()
        .toLowerCase();
      if (isValidEmail(email))
        recipients.set(email, String(row.language ?? "en"));
    }
    const uniqueEmails = Array.from(recipients.keys());
    // Send separately: recipients must never see other subscribers' addresses.
    for (const [email, language] of Array.from(recipients.entries())) {
      const subject = escSubject(
        emailText(language, "stock_subject", { product: input.productName })
      );
      const text = emailText(language, "stock_available", {
        product: input.productName,
      });
      await sendEmailMessageSafe(
        {
          to: email,
          subject,
          text,
          html: `<p>${escapeEmailHtml(text)}</p>`,
          from: fromEmail,
        },
        "shop-restock:availability"
      );
    }

    const adminEmails = await getNotifyAlertEmails();
    if (adminEmails.length > 0) {
      const subject = escSubject(`Restock alert: ${input.productName}`);
      const safeName = escapeEmailHtml(input.productName);
      const safeSlug = escapeEmailHtml(productSlug);
      const safeEditor = escapeEmailHtml(input.updatedByEmail);
      const safeQty = Number(input.stockQty);
      const html = `<p><strong>Restock detected.</strong></p>
<p>Product: ${safeName}</p>
<p>Slug: ${safeSlug}</p>
<p>Current stock: ${safeQty}</p>
<p>Stock alerts attempted: ${uniqueEmails.length}</p>
<p>Action: please review Admin &gt; Notify Me and send any additional manual communication if needed.</p>
<p>Updated by: ${safeEditor}</p>`;
      const text = `Restock detected for ${input.productName} (${productSlug}). Current stock: ${input.stockQty}. Stock alerts attempted: ${uniqueEmails.length}. Action: review Admin > Notify Me and send any additional manual communication if needed. Updated by: ${input.updatedByEmail}`;

      await sendEmailMessage({
        to: adminEmails,
        subject,
        html,
        text,
        from: fromEmail,
      });
    }
  } catch (error: any) {
    console.error("[shop/restock-notify] failed", {
      productSlug,
      message: String(error?.message ?? error),
    });
  }
}
