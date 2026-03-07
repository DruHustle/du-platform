import { issueAccessTokenForUser } from "../../../shared/authSession";
import { sendResetEmail } from "../../../shared/email";
import { hashPassword, verifyPassword } from "../../../shared/passwords";
import { isUserEmailConflictError } from "../../../utils/dbErrors";
import { AuthRepository } from "../repositories/authRepository";

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
      ...(user.kyc_verified === undefined ? {} : { kycVerified: Boolean(user.kyc_verified) }),
    };
  }

  async register(input: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword?: string;
  }) {
    const normalizedEmail = String(input.email ?? "").trim().toLowerCase();
    const existing = await this.repository.findByEmail(normalizedEmail);
    if (existing) {
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
        hashPassword(String(input.password ?? ""))
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
        }),
      },
    };
  }

  async login(input: { email: string; password: string }) {
    const normalizedEmail = String(input.email ?? "").trim().toLowerCase();
    const user = await this.repository.findByEmail(normalizedEmail);
    if (!user || !verifyPassword(String(input.password ?? ""), String(user.password_hash ?? ""))) {
      throw new AuthServiceError("AUTH_INVALID_CREDENTIALS", 401, "Invalid email or password.");
    }

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
    const normalizedEmail = String(input.email ?? "").trim().toLowerCase();
    const user = await this.repository.findByEmail(normalizedEmail);

    if (user) {
      const tokenData = await this.repository.createPasswordResetToken(Number(user.id));
      const appBaseUrl =
        process.env.APP_BASE_URL ??
        `http://localhost:${process.env.NODE_ENV === "production" ? 3000 : 5000}`;
      const resetUrl = `${appBaseUrl}/reset-password?token=${encodeURIComponent(tokenData.token)}`;
      await sendResetEmail(String(user.email ?? ""), resetUrl);
    }

    return { message: "If this email exists, a reset link has been sent." };
  }

  async resetPassword(input: { token: string; password: string }) {
    const resetToken = await this.repository.consumePasswordResetToken(String(input.token ?? ""));
    if (!resetToken) {
      throw new AuthServiceError(
        "AUTH_INVALID_RESET_TOKEN",
        400,
        "Reset token is invalid or expired."
      );
    }

    await this.repository.updateUserPassword(
      Number(resetToken.user_id),
      hashPassword(String(input.password ?? ""))
    );
    return { message: "Password reset successful. Please sign in." };
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
      }),
    };
  }

  async verifyKyc(userId: number) {
    if ((process.env.NODE_ENV ?? "development").toLowerCase() === "production") {
      throw new AuthServiceError(
        "KYC_SELF_VERIFY_DISABLED",
        403,
        "KYC self-verify is unavailable in production."
      );
    }

    const updated = await this.repository.setUserKycVerified(Math.floor(userId), true);
    if (!updated) {
      throw new AuthServiceError("AUTH_USER_NOT_FOUND", 404, "User not found.");
    }

    return {
      message: "KYC status updated.",
      user: this.toPublicUser(updated),
    };
  }
}
