import crypto from 'crypto';
import { AuthRepository } from '../repositories/authRepository';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export class AuthService {
  constructor(private readonly repository = new AuthRepository()) {}

  async register(input: { fullName: string; email: string; password: string }) {
    const existing = await this.repository.findByEmail(input.email);
    if (existing) throw new Error('An account with this email already exists.');

    const user = await this.repository.createUser(input.fullName, input.email, hashPassword(input.password));
    const session = await this.repository.createSession(Number(user.id));
    return { user, session };
  }
}
