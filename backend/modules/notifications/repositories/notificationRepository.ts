import { findUserById } from "../../../shared/persistence/authStore";
import { createFeatureNotification } from "../../../shared/persistence/notificationStore";

export class NotificationRepository {
  findUserById(userId: number) {
    return findUserById(userId);
  }

  createFeatureNotification(userId: number, email: string, feature: string) {
    return createFeatureNotification(userId, email, feature);
  }
}
