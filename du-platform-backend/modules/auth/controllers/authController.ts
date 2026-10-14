import type express from "express";
import {
  clearSessionCookie,
  resolveSessionToken,
  resolveSessionUser,
  setSessionCookie,
} from "../../../shared/authSession";
import { error, ok } from "../../../shared/responseFormatter";
import { AuthService, AuthServiceError } from "../services/authService";

export class AuthController {
  constructor(private readonly service = new AuthService()) {}

  private sendError(
    res: express.Response,
    err: unknown,
    fallbackCode: string,
    fallbackMessage: string
  ) {
    if (err instanceof AuthServiceError) {
      return res.status(err.status).json(error(err.code, err.message));
    }

    const isProduction =
      String(process.env.NODE_ENV ?? "development").toLowerCase() ===
      "production";
    const unexpectedMessage =
      !isProduction && err instanceof Error && String(err.message).trim()
        ? String(err.message).trim()
        : fallbackMessage;

    console.error(`[auth] unexpected ${fallbackCode}`, err);
    return res.status(500).json(error(fallbackCode, unexpectedMessage));
  }

  register = async (req: express.Request, res: express.Response) => {
    try {
      const result = await this.service.register(req.body);
      setSessionCookie(res, result.sessionToken);
      return res.status(201).json(ok(result.payload));
    } catch (err) {
      return this.sendError(
        res,
        err,
        "AUTH_REGISTER_FAILED",
        "Registration failed."
      );
    }
  };

  login = async (req: express.Request, res: express.Response) => {
    try {
      const result = await this.service.login(req.body);
      setSessionCookie(res, result.sessionToken);
      return res.json(ok(result.payload));
    } catch (err) {
      return this.sendError(res, err, "AUTH_LOGIN_FAILED", "Login failed.");
    }
  };

  logout = async (req: express.Request, res: express.Response) => {
    try {
      await this.service.logout(resolveSessionToken(req));
      clearSessionCookie(res);
      return res.json(ok({ message: "Logged out." }));
    } catch (err) {
      return this.sendError(res, err, "AUTH_LOGOUT_FAILED", "Logout failed.");
    }
  };

  forgotPassword = async (req: express.Request, res: express.Response) => {
    try {
      return res.json(ok(await this.service.forgotPassword(req.body)));
    } catch (err) {
      return this.sendError(
        res,
        err,
        "AUTH_FORGOT_PASSWORD_FAILED",
        "Unable to process password reset request."
      );
    }
  };

  resetPassword = async (req: express.Request, res: express.Response) => {
    try {
      return res.json(ok(await this.service.resetPassword(req.body)));
    } catch (err) {
      return this.sendError(
        res,
        err,
        "AUTH_RESET_PASSWORD_FAILED",
        "Password reset failed."
      );
    }
  };

  me = async (req: express.Request, res: express.Response) => {
    try {
      // req.auth is guaranteed by requireJwtAuth; look up by the JWT subject so
      // the session cookie cannot redirect this response to a different account.
      const user = await this.service.getUserById(req.auth!.userId);
      return res.json(ok(this.service.currentUser(user)));
    } catch (err) {
      return this.sendError(
        res,
        err,
        "AUTH_ME_FAILED",
        "Failed to resolve current user."
      );
    }
  };

  refresh = async (req: express.Request, res: express.Response) => {
    try {
      const user = await resolveSessionUser(req);
      if (!user)
        return res
          .status(401)
          .json(error("AUTH_UNAUTHORIZED", "Unauthorized."));
      return res.json(ok(this.service.refresh(user)));
    } catch (err) {
      return this.sendError(
        res,
        err,
        "AUTH_REFRESH_FAILED",
        "Failed to refresh token."
      );
    }
  };
}
