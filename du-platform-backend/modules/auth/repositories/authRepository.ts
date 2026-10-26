import {
  createSession,
  createUser,
  deleteSession,
  findUserByEmail,
  findUserById,
  resetPasswordWithToken,
} from "../../../shared/persistence/authStore";
import { TransactionalService } from "../../notifications/transactionalService";

export class AuthRepository {
  queuePasswordReset(userId: number, language?: string) {
    return new TransactionalService().passwordReset(userId, language);
  }
  resetPasswordWithToken(token: string, passwordHash: string) {
    return resetPasswordWithToken(token, passwordHash);
  }
  findByEmail(email: string) {
    return findUserByEmail(email);
  }

  findById(id: number) {
    return findUserById(id);
  }

  createUser(fullName: string, email: string, passwordHash: string) {
    return createUser(fullName, email, passwordHash);
  }

  createSession(userId: number, authVersion?: number) {
    return createSession(userId, undefined, authVersion);
  }

  deleteSession(token: string) {
    return deleteSession(token);
  }
}
