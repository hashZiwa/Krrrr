import { Router, type Response } from "express";
import type { AlarmService } from "../services/alarmService.js";

function unavailable(res: Response) {
  res.status(503).json({
    error: "alarm_not_configured",
    message: "Alarm platform containers are not configured on this server.",
  });
}

function isAlarmField(value: string): value is "enabled" | "time" | "status" {
  return value === "enabled" || value === "time" || value === "status";
}

export function createAlarmRouter(service: AlarmService | null): Router {
  const router = Router();

  router.get("/settings", async (_req, res) => {
    if (!service) {
      unavailable(res);
      return;
    }

    res.json(await service.loadSettings());
  });

  router.put("/settings/:field", async (req, res) => {
    if (!service) {
      unavailable(res);
      return;
    }

    const field = req.params.field;

    if (!isAlarmField(field)) {
      res.status(404).json({ error: "alarm_setting_not_found" });
      return;
    }

    try {
      if (field === "enabled") {
        res.json(await service.updateEnabled(Boolean(req.body?.value)));
        return;
      }

      if (field === "status") {
        res.json(await service.updateStatus(Boolean(req.body?.value)));
        return;
      }

      res.json(await service.updateTime(String(req.body?.value ?? "")));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown alarm setting failure";
      res.status(500).json({ error: "alarm_setting_failed", message });
    }
  });

  return router;
}
