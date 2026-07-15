import { Router } from "express";
import type { createSleepSessionService } from "../services/sleepSessionService.js";

type SleepSessionService = ReturnType<typeof createSleepSessionService>;

export function createSleepSessionRouter(service: SleepSessionService): Router {
  const router = Router();

  router.get("/latest", async (_req, res) => {
    try {
      const session = await service.getLatestSession();
      res.json(session);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "sleep_session_load_failed", message });
    }
  });

  return router;
}
