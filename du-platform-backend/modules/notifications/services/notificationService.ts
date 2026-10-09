import {
  getNotifyAlertEmails,
  getNotifyFromEmail,
  sendEmailMessageSafe,
} from "../../../shared/email";
import { NotificationRepository } from "../repositories/notificationRepository";

export class NotificationServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "NotificationServiceError";
  }
}

export class NotificationService {
  constructor(private readonly repository = new NotificationRepository()) {}

  async createNewsletterSubscription(email: string) {
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    if (!normalizedEmail) {
      throw new NotificationServiceError("VALIDATION_FAILED", 400, "Email is required.");
    }

    const result = await this.repository.createNewsletterSubscription(normalizedEmail);

    if (result.created) {
      const fromEmail = await getNotifyFromEmail();
      const userSubject = "Newsletter subscription confirmed";
      const userHtml = `<p>Hello,</p>
<p>You have been subscribed to the Diaspora Unlocked newsletter.</p>
<p>We will keep you updated on weekly opportunities.</p>`;
      const userText =
        "You have been subscribed to the Diaspora Unlocked newsletter. We will keep you updated on weekly opportunities.";
      await sendEmailMessageSafe(
        {
          to: normalizedEmail,
          subject: userSubject,
          html: userHtml,
          text: userText,
          from: fromEmail,
        },
        "newsletter-subscriptions:user-confirmation"
      );

      const alertEmails = await getNotifyAlertEmails();
      if (alertEmails.length > 0) {
        const adminSubject = "New newsletter subscription";
        const adminHtml = `<p><strong>New newsletter subscription</strong></p>
<p>Email: ${normalizedEmail}</p>`;
        const adminText = `New newsletter subscription: ${normalizedEmail}`;
        await sendEmailMessageSafe(
          {
            to: alertEmails,
            subject: adminSubject,
            html: adminHtml,
            text: adminText,
            from: fromEmail,
          },
          "newsletter-subscriptions:admin-alert"
        );
      }
    }

    return {
      message: result.created
        ? "Newsletter subscription saved."
        : "This email is already subscribed to the newsletter.",
      created: result.created,
      email: normalizedEmail,
    };
  }

  async createFeatureNotification(userId: number, feature: string) {
    const normalizedFeature = String(feature ?? "").trim();
    if (!normalizedFeature) {
      throw new NotificationServiceError("VALIDATION_FAILED", 400, "Feature is required.");
    }

    const user = await this.repository.findUserById(Math.floor(userId));
    if (!user) {
      throw new NotificationServiceError("AUTH_USER_NOT_FOUND", 401, "User not found.");
    }

    const result = await this.repository.createFeatureNotification(
      Number(user.id),
      String(user.email ?? ""),
      normalizedFeature
    );

    if (result.created) {
      const fromEmail = await getNotifyFromEmail();
      const safeFeature = normalizedFeature.replace(/[_-]+/g, " ").trim();
      const userSubject = `Notify request received: ${safeFeature}`;
      const userHtml = `<p>Hello,</p>
<p>Your notify request for <strong>${safeFeature}</strong> has been saved.</p>
<p>We will email you when this feature becomes available.</p>`;
      const userText = `Your notify request for ${safeFeature} has been saved. We will email you when this feature becomes available.`;
      await sendEmailMessageSafe(
        {
          to: String(user.email ?? ""),
          subject: userSubject,
          html: userHtml,
          text: userText,
          from: fromEmail,
        },
        "feature-notifications:user-confirmation"
      );

      const alertEmails = await getNotifyAlertEmails();
      if (alertEmails.length > 0) {
        const adminSubject = `New feature notify request: ${safeFeature}`;
        const adminHtml = `<p><strong>New notify request</strong></p>
<p>Feature: ${safeFeature}</p>
<p>User email: ${String(user.email ?? "")}</p>
<p>User id: ${Number(user.id)}</p>`;
        const adminText = `New notify request. Feature: ${safeFeature}. User email: ${String(user.email ?? "")}. User id: ${Number(user.id)}.`;
        await sendEmailMessageSafe(
          {
            to: alertEmails,
            subject: adminSubject,
            html: adminHtml,
            text: adminText,
            from: fromEmail,
          },
          "feature-notifications:admin-alert"
        );
      }
    }

    return {
      message: result.created ? "Notify request saved." : "Notify request already exists.",
      created: result.created,
      feature: normalizedFeature,
      email: String(user.email ?? ""),
    };
  }

  async createContactInquiry(input: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    module?: string;
  }) {
    const fromEmail = await getNotifyFromEmail();
    const safeName = String(input.name ?? "").trim();
    const safeEmail = String(input.email ?? "").trim().toLowerCase();
    const safeSubject = String(input.subject ?? "").trim();
    const safeMessage = String(input.message ?? "").trim();
    const safePhone = String(input.phone ?? "").trim();
    const safeModule = String(input.module ?? "general").trim();

    const alertEmails = await getNotifyAlertEmails();
    if (alertEmails.length > 0) {
      const adminSubject = `New contact inquiry: ${safeSubject}`;
      const adminHtml = `<p><strong>New contact inquiry via ${safeModule} module</strong></p>
<p>Name: ${safeName}</p>
<p>Email: ${safeEmail}</p>
${safePhone ? `<p>Phone: ${safePhone}</p>` : ""}
<p>Subject: ${safeSubject}</p>
<p>Message:</p>
<blockquote>${safeMessage.replace(/\n/g, "<br>")}</blockquote>`;
      const adminText = `New contact inquiry (${safeModule})\nName: ${safeName}\nEmail: ${safeEmail}${safePhone ? `\nPhone: ${safePhone}` : ""}\nSubject: ${safeSubject}\nMessage:\n${safeMessage}`;
      await sendEmailMessageSafe(
        { to: alertEmails, subject: adminSubject, html: adminHtml, text: adminText, from: fromEmail },
        "contact-inquiry:admin-alert"
      );
    }

    const confirmSubject = "We received your message";
    const confirmHtml = `<p>Hello ${safeName},</p>
<p>Thank you for reaching out to Diaspora Unlocked. We have received your message and will get back to you shortly.</p>
<p><strong>Your subject:</strong> ${safeSubject}</p>
<p>Warm regards,<br>The Diaspora Unlocked Team</p>`;
    const confirmText = `Hello ${safeName}, thank you for reaching out to Diaspora Unlocked. We have received your message and will get back to you shortly. Your subject: ${safeSubject}.`;
    await sendEmailMessageSafe(
      { to: safeEmail, subject: confirmSubject, html: confirmHtml, text: confirmText, from: fromEmail },
      "contact-inquiry:user-confirmation"
    );

    return { message: "Your message has been sent. We will be in touch soon." };
  }
}
