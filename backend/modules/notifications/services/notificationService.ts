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
}
