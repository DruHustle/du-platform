import axios from "axios";
import { getAdminSetting } from "./persistence/settingsStore";
import { getShopRestockNotificationsBySlug } from "./persistence/shopStore";

export const ADMIN_SETTING_NOTIFY_ALERT_EMAILS = "notify_alert_emails";
export const ADMIN_SETTING_NOTIFY_FROM_EMAIL = "notify_from_email";

/** Escape user-controlled strings before embedding in HTML email bodies. */
function escHtml(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strip CRLF sequences from email subject lines to prevent header injection. */
function escSubject(str: string): string {
  return String(str ?? "").replace(/[\r\n]/g, " ").trim();
}

function getAdminEmails(): string[] {
  return String(process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
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
    .map((item) => item.trim().toLowerCase())
    .filter((item) => isValidEmail(item));
}

export async function sendEmailMessage(payload: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}) {
  const recipients = (Array.isArray(payload.to) ? payload.to : [payload.to])
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  if (recipients.length === 0) return;

  const provider = String(process.env.RESET_EMAIL_PROVIDER ?? "resend").trim().toLowerCase();
  const from = String(payload.from ?? process.env.FROM_EMAIL ?? "no-reply@du-platform.com").trim();

  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log(`[email:dry-run] to=${recipients.join(",")} subject=${payload.subject}`);
      return;
    }

    await axios.post(
      "https://api.resend.com/emails",
      {
        from,
        to: recipients,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    return;
  }

  console.log(`[email:unsupported-provider:${provider}] to=${recipients.join(",")}`);
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
      subject: payload.subject,
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
    html: `<p>We received a request to reset your password.</p><p><a href="${escHtml(resetUrl)}">Reset Password</a></p><p>If you did not request this, ignore this email.</p>`,
  });
}

export async function sendFintechCompletionEmailSafe(input: {
  to: string;
  fullName?: string | null;
  flow: "remittance" | "airtime";
  amount: number;
  currency: string;
  reference: string | null;
  recipientLabel: string;
  status: string;
  completedAt?: string | null;
}) {
  const recipient = String(input.to ?? "").trim().toLowerCase();
  if (!isValidEmail(recipient)) return false;

  const from = await getNotifyFromEmail();
  const name = escHtml(String(input.fullName ?? "").trim() || "there");
  const reference = escHtml(String(input.reference ?? "").trim() || "Pending");
  const recipientLabel = escHtml(String(input.recipientLabel ?? "").trim() || "-");
  const subject = escSubject(
    input.flow === "remittance"
      ? "Your remittance has been confirmed"
      : "Your airtime top-up has been confirmed"
  );
  const amountLine = `${Number(input.amount ?? 0).toFixed(2)} ${String(input.currency ?? "").trim().toUpperCase()}`;
  const completedAt = escHtml(String(input.completedAt ?? "").trim() || new Date().toISOString());
  const html = `<p>Hello ${name},</p>
<p>Your ${input.flow === "remittance" ? "remittance" : "airtime top-up"} has been confirmed.</p>
<p>Amount: <strong>${escHtml(amountLine)}</strong></p>
<p>Recipient: <strong>${recipientLabel}</strong></p>
<p>Reference: <strong>${reference}</strong></p>
<p>Status: <strong>${escHtml(String(input.status ?? "").trim() || "completed")}</strong></p>
<p>Completed at: <strong>${completedAt}</strong></p>
<p>Thank you for using Diaspora Unlocked.</p>`;
  const text =
    `Hello ${String(input.fullName ?? "").trim() || "there"}, your ${
      input.flow === "remittance" ? "remittance" : "airtime top-up"
    } has been confirmed. Amount: ${amountLine}. Recipient: ${String(input.recipientLabel ?? "").trim() || "-"}. ` +
    `Reference: ${String(input.reference ?? "").trim() || "Pending"}. Status: ${
      String(input.status ?? "").trim() || "completed"
    }. Completed at: ${String(input.completedAt ?? "").trim() || new Date().toISOString()}.`;

  return sendEmailMessageSafe({ to: recipient, from, subject, html, text }, "fintech-completion-email");
}

export async function notifyRestockSubscribersAndAdmins(input: {
  productId: number;
  productName: string;
  productSlug: string;
  stockQty: number;
  updatedByEmail: string;
}) {
  if ((process.env.NODE_ENV ?? "development") !== "production") return;

  const productSlug = String(input.productSlug ?? "").trim().toLowerCase();
  if (!productSlug) return;

  try {
    const fromEmail = await getNotifyFromEmail();
    const rows = await getShopRestockNotificationsBySlug(productSlug);
    const uniqueEmails = Array.from(
      new Set(
        rows
          .map((row: any) => String(row?.email ?? "").trim().toLowerCase())
          .filter((email) => isValidEmail(email))
      )
    );

    if (uniqueEmails.length > 0) {
      const subject = escSubject(`${input.productName} is back in stock`);
      const safeName = escHtml(input.productName);
      const html = `<p>Hello,</p>
<p><strong>${safeName}</strong> is now back in stock on the Zimbabwe Shop.</p>
<p>You can return to the shop and place your order.</p>
<p>Thank you.</p>`;
      const text = `${input.productName} is now back in stock on the Zimbabwe Shop. You can return to the shop and place your order.`;

      await sendEmailMessage({
        to: uniqueEmails,
        subject,
        html,
        text,
        from: fromEmail,
      });
    }

    const adminEmails = await getNotifyAlertEmails();
    if (adminEmails.length > 0) {
      const subject = escSubject(`Restock alert: ${input.productName}`);
      const safeName = escHtml(input.productName);
      const safeSlug = escHtml(productSlug);
      const safeEditor = escHtml(input.updatedByEmail);
      const safeQty = Number(input.stockQty);
      const html = `<p><strong>Restock detected.</strong></p>
<p>Product: ${safeName}</p>
<p>Slug: ${safeSlug}</p>
<p>Current stock: ${safeQty}</p>
<p>Subscribers notified automatically: ${uniqueEmails.length}</p>
<p>Action: please review Admin &gt; Notify Me and send any additional manual communication if needed.</p>
<p>Updated by: ${safeEditor}</p>`;
      const text = `Restock detected for ${input.productName} (${productSlug}). Current stock: ${input.stockQty}. Subscribers notified automatically: ${uniqueEmails.length}. Action: review Admin > Notify Me and send any additional manual communication if needed. Updated by: ${input.updatedByEmail}`;

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
