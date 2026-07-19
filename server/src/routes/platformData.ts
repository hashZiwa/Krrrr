import { Router } from "express";
import type { PlatformDataService } from "../services/platformDataService.js";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function createPlatformDataRouter(service: PlatformDataService | null): Router {
  const router = Router();

  router.get("/breath-condition/discovery", async (_req, res) => {
    if (!service) {
      res.status(503).json({
        error: "platform_data_not_configured",
        message: "Mobius platform data is not configured on this server.",
      });
      return;
    }

    try {
      res.json(await service.discoverBreathConditionGroups());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown platform data discovery failure";
      res.status(500).json({ error: "platform_data_discovery_failed", message });
    }
  });

  router.post("/breath-condition/export", async (req, res) => {
    if (!service) {
      res.status(503).json({
        error: "platform_data_not_configured",
        message: "Mobius platform data is not configured on this server.",
      });
      return;
    }

    const groupKeys = (req.body as { groupKeys?: unknown }).groupKeys;

    if (!isStringArray(groupKeys) || groupKeys.length === 0) {
      res.status(400).json({
        error: "platform_data_invalid_group_keys",
        message: "Request body must include at least one group key.",
      });
      return;
    }

    try {
      const csv = await service.exportBreathConditionCsv(groupKeys);

      res
        .status(200)
        .setHeader("Content-Type", "text/csv; charset=utf-8")
        .setHeader("Content-Disposition", "attachment; filename=\"breath-condition.csv\"")
        .send(csv);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown platform data export failure";
      res.status(500).json({ error: "platform_data_export_failed", message });
    }
  });

  return router;
}
