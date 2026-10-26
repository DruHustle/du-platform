import { NotificationRepository } from "../repositories/notificationRepository";
import { contactInquirySchema } from "../dto/notification.dto";
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
    if (!normalizedFeature || normalizedFeature.length > 120)
      throw new NotificationServiceError(
        "VALIDATION_FAILED",
        400,
        "Feature must be 1–120 characters."
      );
    const user = await this.repository.findUserById(Math.floor(userId));
    if (!user)
      throw new NotificationServiceError(
        "AUTH_USER_NOT_FOUND",
        401,
        "User not found."
      );
    return this.repository.createFeatureNotification(
      Number(user.id),
      String(user.email ?? ""),
      normalizedFeature
    );
  }
  async createContactInquiry(input: unknown) {
    return this.repository.createContactInquiry(
      contactInquirySchema.parse(input)
    );
  }
}
