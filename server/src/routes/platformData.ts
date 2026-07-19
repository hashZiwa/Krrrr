import { Router } from "express";
import type { PlatformDataExportGroup, PlatformDataService } from "../services/platformDataService.js";

function isExportGroup(value: unknown): value is PlatformDataExportGroup {
  if (!value || typeof value !== "object") return false;

  const group = value as PlatformDataExportGroup;

  return (
    typeof group.label === "string" &&
    Array.isArray(group.items) &&
    group.items.every((item) => typeof item?.rn === "string" && typeof item?.uri === "string")
  );
}

function getOffset(value: unknown): number {
  const offset = Number(value ?? 0);

  return Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0;
}

export function createPlatformDataRouter(service: PlatformDataService | null): Router {
  const router = Router();

  router.get("/breath-condition/discovery", async (req, res) => {
    if (!service) {
      res.status(503).json({
        error: "platform_data_not_configured",
        message: "Mobius platform data is not configured on this server.",
      });
      return;
    }

    try {
      res.json(await service.discoverBreathConditionGroups({ offset: getOffset(req.query.offset) }));
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

    const groups = (req.body as { groups?: unknown }).groups;

    if (!Array.isArray(groups) || groups.length === 0 || !groups.every(isExportGroup)) {
      res.status(400).json({
        error: "platform_data_invalid_groups",
        message: "Request body must include at least one export group.",
      });
      return;
    }

    try {
      const csv = await service.exportBreathConditionCsv(groups);

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
