import { isAdminEmail } from "../../../shared/adminIdentity";
import { issueAccessTokenForUser } from "../../../shared/authSession";
import { sendResetEmail } from "../../../shared/email";
import { hashPassword, verifyPassword } from "../../../shared/passwords";
import { isUserEmailConflictError } from "../../../utils/dbErrors";
import { AuthRepository } from "../repositories/authRepository";
import {
  clearLoginFailures,
  isLoginLocked,
  recordLoginFailure,
} from "../../../shared/persistence/authStore";

// Minimum response time for forgotPassword regardless of whether the email
// exists — prevents user enumeration via response latency.
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

    const session = await this.repository.createSession(Number(user.id));
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
    const session = await this.repository.createSession(Number(user.id));
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

  async forgotPassword(input: { email: string }) {
    const normalizedEmail = String(input.email ?? "")
      .trim()
      .toLowerCase();
    const start = Date.now();

    const user = await this.repository.findByEmail(normalizedEmail);

    if (user) {
      const tokenData = await this.repository.createPasswordResetToken(
        Number(user.id)
      );
      const appBaseUrl =
        process.env.APP_BASE_URL ??
        `http://localhost:${process.env.NODE_ENV === "production" ? 3000 : 5000}`;
      const resetUrl = `${appBaseUrl}/reset-password?token=${encodeURIComponent(tokenData.token)}`;
      await sendResetEmail(String(user.email ?? ""), resetUrl);
    }

    // Equalize response time regardless of whether the email exists so callers
    // cannot enumerate valid accounts via response latency.
    const elapsed = Date.now() - start;
    if (elapsed < FORGOT_PASSWORD_MIN_MS) {
      await new Promise<void>(resolve =>
        setTimeout(resolve, FORGOT_PASSWORD_MIN_MS - elapsed)
      );
    }

    return { message: "If this email exists, a reset link has been sent." };
  }

  async resetPassword(input: { token: string; password: string }) {
    const resetToken = await this.repository.consumePasswordResetToken(
      String(input.token ?? "")
    );
    if (!resetToken) {
      throw new AuthServiceError(
        "AUTH_INVALID_RESET_TOKEN",
        400,
        "Reset token is invalid or expired."
      );
    }

    const userId = Number(resetToken.user_id);
    await this.repository.updateUserPassword(
      userId,
      await hashPassword(String(input.password ?? ""))
    );
    try {
      await this.repository.deleteAllSessionsForUserStrict(userId);
    } catch {
      throw new AuthServiceError(
        "AUTH_SESSION_INVALIDATION_FAILED",
        503,
        "Password was updated, but active sessions could not be invalidated. Please retry once the session store is available."
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
