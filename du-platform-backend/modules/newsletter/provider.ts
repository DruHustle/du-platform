import axios from "axios";
import { AppError } from "../../core/errorHandler";
import { getNotifyFromEmail, isValidEmail } from "../../lib/email";
import { outboundMessagesPaused } from "../../lib/outboundMessages";

export type NewsletterEmail = {
  from: string;
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
};
export async function newsletterSender() {
  const from = await getNotifyFromEmail();
  const ready =
    Boolean(process.env.RESEND_API_KEY) &&
    (process.env.RESET_EMAIL_PROVIDER || "resend").toLowerCase() === "resend" &&
    isValidEmail(from);
  return { ready, from };
}
export async function requireNewsletterSender() {
  const sender = await newsletterSender();
  if (!sender.ready)
    throw new AppError(
      503,
      "NEWSLETTER_EMAIL_UNAVAILABLE",
      "Email delivery is not configured. Your saved subscribers and drafts are safe."
    );
  return sender.from;
}
// A missing provider is never reported as a successful delivery.
export async function sendNewsletterEmail(
  payload: NewsletterEmail,
  key: string
): Promise<string> {
  if (outboundMessagesPaused())
    throw new Error("Outbound messages are paused.");
  if (!process.env.RESEND_API_KEY)
    throw new Error("Email delivery is not configured.");
  const { data } = await axios.post("https://api.resend.com/emails", payload, {
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Idempotency-Key": key,
    },
    timeout: 20000,
  });
  if (!data?.id)
    throw new Error("Email provider returned no message identifier.");
  return String(data.id);
}
