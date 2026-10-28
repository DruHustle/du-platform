import { customerLanguage } from "../../../shared/customerLanguage";
import { emailText } from "../../shared/copy/customerEmailCopy";
import { randomBytes, createHash } from "node:crypto";
import { escapeEmailHtml } from "../../shared/email";

export const newsletterToken = () => randomBytes(24).toString("hex");
export const hashNewsletterToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function newsletterOrigin() {
  const origin = new URL(
    process.env.APP_BASE_URL || "https://www.diasporaunlocked.com"
  );
  if (process.env.NODE_ENV === "production" && origin.protocol !== "https:")
    throw new Error("Newsletter requires an HTTPS APP_BASE_URL.");
  return origin.origin;
}
export const preferenceLink = (
  action: "confirm" | "unsubscribe",
  token: string,
  language: string = "en"
) =>
  `${newsletterOrigin()}/newsletter${customerLanguage(language) === "en" ? "" : `?lng=${customerLanguage(language)}`}#action=${action}&token=${token}`;

export function renderNewsletter(
  subject: string,
  body: string,
  unsubscribeUrl?: string,
  footerText?: string,
  language: string = "en"
) {
  const footer = unsubscribeUrl
    ? `${emailText(language, "newsletter_footer")}\n${emailText(language, "unsubscribe")}: ${unsubscribeUrl}`
    : footerText ||
      "Preview email for an authorized Diaspora Unlocked administrator. Subscribers will receive a personal unsubscribe link.";
  return {
    text: `${subject}\n\n${body}\n\n${footer}`,
    html: `<!doctype html><html lang="${customerLanguage(language)}"><body style="margin:0;background:#f1f5f9;color:#0f172a;font-family:Arial,sans-serif"><main style="max-width:600px;margin:24px auto;padding:32px;background:#fff;border-radius:16px"><p style="font-size:12px;letter-spacing:2px;color:#735800">DIASPORA UNLOCKED</p><h1 style="font-size:26px;line-height:1.3">${escapeEmailHtml(subject)}</h1><div style="font-size:16px;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere">${escapeEmailHtml(body)}</div><hr style="border:0;border-top:1px solid #e2e8f0;margin:28px 0"><p style="font-size:12px;line-height:1.6;color:#475569">${unsubscribeUrl ? `${escapeEmailHtml(emailText(language, "newsletter_footer"))} <a href="${escapeEmailHtml(unsubscribeUrl)}">${escapeEmailHtml(emailText(language, "unsubscribe"))}</a>` : escapeEmailHtml(footer)}</p></main></body></html>`,
  };
}
