import { createSession, createUser, findUserByEmail } from '../../../db';

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
}
