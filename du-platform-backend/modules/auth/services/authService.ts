import { isAdminEmail } from "../../../shared/adminIdentity";
import { issueAccessTokenForUser } from "../../../shared/authSession";
import { hashPassword, verifyPassword } from "../../../shared/passwords";
import { isUserEmailConflictError } from "../../../utils/dbErrors";
import { AuthRepository } from "../repositories/authRepository";
import {
  clearLoginFailures,
  isLoginLocked,
  recordLoginFailure,
  AuthVersionChangedError,
} from "../../../shared/persistence/authStore";

// Avoid an immediate response for unknown addresses. This floor is not a
// constant-time guarantee: database lookup/persistence can take longer.
const FORGOT_PASSWORD_MIN_MS = 500;

export class AuthServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "AuthServiceError";
  }
}

export class AuthService {
  constructor(private readonly repository = new AuthRepository()) {}

  private toPublicUser(user: Record<string, unknown>) {
    return {
      id: Number(user.id ?? 0),
      fullName: String(user.full_name ?? ""),
      email: String(user.email ?? ""),
    };
  }

  async register(input: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword?: string;
  }) {
    const normalizedEmail = String(input.email ?? "")
      .trim()
      .toLowerCase();
    const existing = await this.repository.findByEmail(normalizedEmail);
    if (existing || isAdminEmail(normalizedEmail)) {
      throw new AuthServiceError(
        "AUTH_EMAIL_EXISTS",
        409,
        "An account with this email already exists."
      );
    }

    let user: Awaited<ReturnType<AuthRepository["createUser"]>>;
    try {
      user = await this.repository.createUser(
        String(input.fullName ?? "").trim(),
        normalizedEmail,
        await hashPassword(String(input.password ?? ""))
      );
    } catch (err) {
      if (isUserEmailConflictError(err)) {
        throw new AuthServiceError(
          "AUTH_EMAIL_EXISTS",
          409,
          "An account with this email already exists."
        );
      }
      throw err;
    }

    const session = await this.repository.createSession(Number(user.id), 0);
    return {
      sessionToken: session.token,
      payload: {
        message: "Account created successfully.",
        user: this.toPublicUser(user),
        accessToken: issueAccessTokenForUser({
          id: Number(user.id),
          email: String(user.email ?? ""),
          full_name: String(user.full_name ?? ""),
          auth_version: 0,
        }),
      },
    };
  }

  async login(input: { email: string; password: string }) {
    const normalizedEmail = String(input.email ?? "")
      .trim()
      .toLowerCase();

    const lockStatus = isLoginLocked(normalizedEmail);
    if (lockStatus.locked) {
      const retryAfterSecs = Math.ceil(lockStatus.retryAfterMs / 1000);
      throw new AuthServiceError(
        "AUTH_ACCOUNT_LOCKED",
        429,
        `Account temporarily locked due to too many failed attempts. Try again in ${retryAfterSecs} seconds.`
      );
    }

    const user = await this.repository.findByEmail(normalizedEmail);
    const passwordValid = user
      ? await verifyPassword(
          String(input.password ?? ""),
          String(user.password_hash ?? "")
        )
      : false;

    if (!user || !passwordValid) {
      recordLoginFailure(normalizedEmail);
      throw new AuthServiceError(
        "AUTH_INVALID_CREDENTIALS",
        401,
        "Invalid email or password."
      );
    }

    clearLoginFailures(normalizedEmail);
    let session: Awaited<ReturnType<AuthRepository["createSession"]>>;
    try {
      session = await this.repository.createSession(
        Number(user.id),
        Number(user.auth_version ?? 0)
      );
    } catch (error) {
      if (error instanceof AuthVersionChangedError)
        throw new AuthServiceError(
          "AUTH_INVALID_CREDENTIALS",
          401,
          "Credentials changed. Please sign in again."
        );
      throw error;
    }
    return {
      sessionToken: session.token,
      payload: {
        message: "Login successful.",
        user: this.toPublicUser(user),
        accessToken: issueAccessTokenForUser({
          id: Number(user.id),
          email: String(user.email ?? ""),
          full_name: String(user.full_name ?? ""),
          auth_version: Number(user.auth_version ?? 0),
        }),
      },
    };
  }

  async logout(sessionToken: string | null) {
    if (sessionToken) {
      await this.repository.deleteSession(sessionToken);
    }
    return { message: "Logged out." };
  }

  async forgotPassword(input: { email: string; language?: string }) {
    const normalizedEmail = String(input.email ?? "")
      .trim()
      .toLowerCase();
    const start = Date.now();

    try {
      const user = await this.repository.findByEmail(normalizedEmail);
      if (user)
        await this.repository.queuePasswordReset(
          Number(user.id),
          input.language
        );
    } catch {
      // Neutral even during storage failure; no account, token or SQL/provider
      // exception is logged. The request never calls the email provider.
      console.error("[auth] Password reset request could not be saved.");
    }

    // Apply the same minimum delay to existing and unknown addresses.
    const elapsed = Date.now() - start;
    if (elapsed < FORGOT_PASSWORD_MIN_MS) {
      await new Promise<void>(resolve =>
        setTimeout(resolve, FORGOT_PASSWORD_MIN_MS - elapsed)
      );
    }

    return {
      message:
        "If this address matches an account, a reset email may follow. Try again later if it does not arrive.",
    };
  }

  async resetPassword(input: { token: string; password: string }) {
    // Hash before taking database locks or consuming the one-time token.
    const reset = await this.repository.resetPasswordWithToken(
      String(input.token ?? ""),
      await hashPassword(String(input.password ?? ""))
    );
    if (!reset) {
      throw new AuthServiceError(
        "AUTH_INVALID_RESET_TOKEN",
        400,
        "Reset token is invalid or expired."
      );
    }

    return { message: "Password reset successful. Please sign in." };
  }

  async getUserById(userId: number) {
    const user = await this.repository.findById(userId);
    if (!user)
      throw new AuthServiceError("AUTH_UNAUTHORIZED", 401, "Unauthorized.");
    return user;
  }

  currentUser(user: Record<string, unknown>) {
    return { user: this.toPublicUser(user) };
  }

  refresh(user: Record<string, unknown>) {
    return {
      message: "Token refreshed.",
      accessToken: issueAccessTokenForUser({
        id: Number(user.id ?? 0),
        email: String(user.email ?? ""),
        full_name: String(user.full_name ?? ""),
        auth_version: Number(user.auth_version ?? 0),
      }),
    };
  }
}
