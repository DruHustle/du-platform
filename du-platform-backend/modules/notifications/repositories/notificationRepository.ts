import { findUserById } from "../../../shared/persistence/authStore";
import {
  createFeatureNotification,
  createNewsletterSubscription,
} from "../../../shared/persistence/notificationStore";

export class NotificationRepository {
  findUserById(userId: number) {
    return findUserById(userId);
  }

  createNewsletterSubscription(email: string) {
    return createNewsletterSubscription(email);
  }

  createFeatureNotification(userId: number, email: string, feature: string) {
    return createFeatureNotification(userId, email, feature);
  }
}
