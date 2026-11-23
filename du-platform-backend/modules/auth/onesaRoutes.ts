import { Router, type Response } from "express";
import { z } from "zod";
import { AppError } from "../../core/errorHandler";
import { rateLimiter } from "../../core/rateLimiter";
import { clearSessionCookie, setSessionCookie } from "../../shared/authSession";
import { ok } from "../../shared/responseFormatter";
import { validateBody } from "../../shared/validators";
import { loginSchema } from "./dto/auth.dto";
import { linkAccount, resolveOnesa } from "./onesaAccounts";
import { clientSettings, exchangeCode, exchangeInput } from "./onesaIdentity";
import { AuthService, AuthServiceError } from "./services/authService";

const linkInput = loginSchema
  .extend({
    accessToken: z.string().min(1).max(16384),
    client: z.enum(["web", "native"]),
  })
  .strict();
const auth = new AuthService();

function accept(
  res: Response,
  client: string,
  token: string,
  expires: number,
  user: Record<string, unknown>,
) {
  if (client === "web")
    setSessionCookie(res, token, expires - Math.floor(Date.now() / 1000));
  res.json(
    ok({ ...auth.currentUser(user), accessToken: token, linkRequired: false }),
  );
}
export function onesaRoutes() {
  const router = Router();
  router.get("/config/:client", (req, res, next) => {
    if (req.params.client !== "web" && req.params.client !== "native")
      return res.sendStatus(404);
    try {
      res.json(ok(clientSettings(req.params.client)));
    } catch {
      next(
        new AppError(503, "ONESA_UNAVAILABLE", "Onesa sign-in is unavailable."),
      );
    }
  });
  router.post(
    "/exchange",
    rateLimiter({
      keyPrefix: "api:auth:onesa",
      windowMs: 300000,
      maxRequests: 36,
    }),
    validateBody(exchangeInput),
    async (req, res, next) => {
      try {
        const token = await exchangeCode(req.body);
        const { proof, user } = await resolveOnesa(token);
        if (user)
          return accept(res, req.body.client, token, proof.expires, user);
        if (req.body.client === "web") clearSessionCookie(res);
        res.json(ok({ accessToken: token, linkRequired: true }));
      } catch {
        next(
          new AppError(
            401,
            "ONESA_EXCHANGE_FAILED",
            "Onesa sign-in could not be completed. Start sign-in again.",
          ),
        );
      }
    },
  );
  // Confirm both credentials deliberately. Provider email is never consulted.
  router.post(
    "/link",
    rateLimiter({
      keyPrefix: "api:auth:login",
      windowMs: 300000,
      maxRequests: 12,
    }),
    validateBody(linkInput),
    async (req, res, next) => {
      try {
        const { proof } = await resolveOnesa(req.body.accessToken);
        const local = await auth.verifyLogin(req.body);
        const user = await linkAccount(
          proof.id,
          Number(local.id),
          Number(local.auth_version ?? 0),
        );
        accept(res, req.body.client, req.body.accessToken, proof.expires, user);
      } catch (e) {
        if (e instanceof AuthServiceError)
          return next(new AppError(e.status, e.code, e.message));
        next(
          e instanceof AppError
            ? e
            : new AppError(
                503,
                "ONESA_LINK_UNAVAILABLE",
                "Account linking is temporarily unavailable.",
              ),
        );
      }
    },
  );
  return router;
}
