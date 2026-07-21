import { Router, type Response } from "express";
import type { RealtimePlatformMonitorService } from "../services/realtimePlatformMonitorService.js";

function unavailable(res: Response) {
  res.status(503).json({
    error: "realtime_platform_not_configured",
    message: "Realtime platform monitoring is not configured on this server.",
  });
}

export function createRealtimePlatformMonitorRouter(service: RealtimePlatformMonitorService | null): Router {
  const router = Router();

  router.post("/start", (_req, res) => {
    if (!service) {
      unavailable(res);
      return;
    }

    service.start();
    res.status(200).json({ state: service.getState() });
  });

  router.post("/stop", (_req, res) => {
    if (!service) {
      unavailable(res);
      return;
    }

    service.stop();
    res.status(200).json({ state: service.getState() });
  });

  router.post("/save", async (_req, res) => {
    if (!service) {
      unavailable(res);
      return;
    }

    try {
      res.status(200).json(await service.saveCurrentSession());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown realtime platform save failure";
      res.status(500).json({ error: "realtime_platform_save_failed", message });
    }
  });

  router.get("/session", (_req, res) => {
    if (!service) {
      unavailable(res);
      return;
    }

    const state = service.getState();

    try {
      res.status(200).json({ state, session: service.getSession() });
    } catch {
      res.status(200).json({ state, session: null });
    }
  });

  return router;
}
