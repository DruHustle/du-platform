import crypto from 'crypto';
import { AuthRepository } from '../repositories/authRepository';
import { isUserEmailConflictError } from '../../../utils/dbErrors';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export class AuthRegistrationError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'AuthRegistrationError';
  }
}

export class AuthService {
  constructor(private readonly repository = new AuthRepository()) {}

  async register(input: { fullName: string; email: string; password: string }) {
    const normalizedEmail = String(input.email ?? '').trim().toLowerCase();
    const existing = await this.repository.findByEmail(normalizedEmail);
    if (existing) {
      throw new AuthRegistrationError('AUTH_EMAIL_EXISTS', 409, 'An account with this email already exists.');
    }

    let user: Awaited<ReturnType<AuthRepository['createUser']>>;
    try {
      user = await this.repository.createUser(
        String(input.fullName ?? '').trim(),
        normalizedEmail,
        hashPassword(String(input.password ?? ''))
      );
    } catch (err) {
      if (isUserEmailConflictError(err)) {
        throw new AuthRegistrationError('AUTH_EMAIL_EXISTS', 409, 'An account with this email already exists.');
      }
      throw err;
    }

    const session = await this.repository.createSession(Number(user.id));
    return { user, session };
  }
}
