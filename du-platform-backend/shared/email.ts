import axios from "axios";
import { getAdminSetting } from "./persistence/settingsStore";

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
