import { findUserById } from "../../../shared/persistence/authStore";
import { TransactionalService } from "../transactionalService";

export class NotificationRepository {
  createContactInquiry(input: unknown) {
    return new TransactionalService().contact(input);
  }
  findUserById(userId: number) {
    return findUserById(userId);
  }

  createFeatureNotification(userId: number, _email: string, feature: string) {
    return new TransactionalService().feature(userId, feature);
  }
}
