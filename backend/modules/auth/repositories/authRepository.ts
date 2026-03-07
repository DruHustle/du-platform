import {
  consumePasswordResetToken,
  createPasswordResetToken,
  createSession,
  createUser,
  deleteSession,
  findUserByEmail,
  setUserKycVerified,
  updateUserPassword,
} from "../../../shared/persistence/authStore";

export class AuthRepository {
  findByEmail(email: string) {
    return findUserByEmail(email);
  }

  createUser(fullName: string, email: string, passwordHash: string) {
    return createUser(fullName, email, passwordHash);
  }

  createSession(userId: number) {
    return createSession(userId);
  }

  deleteSession(token: string) {
    return deleteSession(token);
  }

  createPasswordResetToken(userId: number) {
    return createPasswordResetToken(userId);
  }

  consumePasswordResetToken(token: string) {
    return consumePasswordResetToken(token);
  }

  updateUserPassword(userId: number, passwordHash: string) {
    return updateUserPassword(userId, passwordHash);
  }

  setUserKycVerified(userId: number, verified: boolean) {
    return setUserKycVerified(userId, verified);
  }
}
