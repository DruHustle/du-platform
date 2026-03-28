import {
  consumePasswordResetToken,
  createPasswordResetToken,
  createSession,
  createUser,
  deleteSession,
  deleteAllSessionsForUser,
  deleteAllSessionsForUserStrict,
  findUserByEmail,
  findUserById,
  setUserKycVerified,
  updateUserPassword,
} from "../../../shared/persistence/authStore";

export class AuthRepository {
  findByEmail(email: string) {
    return findUserByEmail(email);
  }

  findById(id: number) {
    return findUserById(id);
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

  deleteAllSessionsForUser(userId: number) {
    return deleteAllSessionsForUser(userId);
  }

  deleteAllSessionsForUserStrict(userId: number) {
    return deleteAllSessionsForUserStrict(userId);
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
