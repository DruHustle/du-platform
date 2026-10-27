import { Router } from "express";
import { z } from "zod";
import { db } from "../../shared/databaseRuntime";
import { requireJwtAuth } from "../../middleware/jwtAuth";
import { requireCurrentUser } from "../../middleware/currentUser";
import { rateLimiter } from "../../core/rateLimiter";
import { savedTravelSchema, travelCapabilities } from "../../../shared/travel";
import { TravelRepository } from "./repository";
import { ok, error } from "../../shared/responseFormatter";

export function createTravelRouter() {
  const router = Router();
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });
  router.get("/capabilities", (_req, res) => res.json(ok(travelCapabilities)));
  // No monitoring, consent records or queued messages can be created while access
  // is pending, including during recovery holds. No env flag bypasses this gate.
  router.post("/alerts", (_req, res) =>
    res
      .status(503)
      .json(
        error(
          "TRAVEL_MONITORING_UNAVAILABLE",
          "Price alerts are not available."
        )
      )
  );
  router.use(
    requireJwtAuth,
    requireCurrentUser,
    rateLimiter({
      keyPrefix: "travel:saved",
      windowMs: 60000,
      maxRequests: 30,
      keyByUser: true,
    })
  );
  router.use((_req, res, next) =>
    db
      ? next()
      : res
          .status(503)
          .json(
            error(
              "TRAVEL_STORAGE_UNAVAILABLE",
              "Saved trips are temporarily unavailable."
            )
          )
  );
  router.get("/saved", async (req, res) => {
    try {
      res.json(ok(await new TravelRepository(db!).list(req.auth!.userId)));
    } catch {
      res
        .status(503)
        .json(
          error(
            "TRAVEL_STORAGE_UNAVAILABLE",
            "Saved trips are temporarily unavailable."
          )
        );
    }
  });
  router.post("/saved", async (req, res) => {
    const parsed = savedTravelSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json(error("TRAVEL_INVALID", "Check the trip details."));
    try {
      res.status(201).json(
        ok({
          id: await new TravelRepository(db!).save(
            req.auth!.userId,
            parsed.data
          ),
        })
      );
    } catch (e) {
      res
        .status(e instanceof Error && e.message === "TRAVEL_LIMIT" ? 409 : 503)
        .json(
          error(
            "TRAVEL_SAVE_FAILED",
            "Could not save. Keep your draft and try again, or remove an old trip."
          )
        );
    }
  });
  router.delete("/saved/:id", async (req, res) => {
    if (!z.string().uuid().safeParse(req.params.id).success)
      return res
        .status(400)
        .json(error("TRAVEL_INVALID", "Invalid saved trip."));
    try {
      const removed = await new TravelRepository(db!).remove(
        req.auth!.userId,
        req.params.id
      );
      res
        .status(removed ? 200 : 404)
        .json(
          removed
            ? ok({ removed: true })
            : error("TRAVEL_NOT_FOUND", "Saved trip not found.")
        );
    } catch {
      res
        .status(503)
        .json(
          error(
            "TRAVEL_STORAGE_UNAVAILABLE",
            "Saved trips are temporarily unavailable."
          )
        );
    }
  });
  return router;
}
