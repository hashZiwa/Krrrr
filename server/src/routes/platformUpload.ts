import { Router } from "express";
import type { MobiusCin } from "../clients/mobiusClient.js";
import type { PlatformUploadService } from "../services/platformUploadService.js";

function isUploadContent(value: unknown): value is MobiusCin["con"] {
  const valueType = typeof value;

  return (
    valueType === "string" ||
    valueType === "number" ||
    valueType === "boolean" ||
    (valueType === "object" && value !== null)
  );
}

export function createPlatformUploadRouter(service: PlatformUploadService | null): Router {
  const router = Router();

  router.post("/:featureKey", async (req, res) => {
    if (!service) {
      res.status(503).json({
        error: "platform_upload_not_configured",
        message: "Mobius upload is not configured on this server.",
      });
      return;
    }

    const content = (req.body as { content?: unknown }).content;

    if (!isUploadContent(content)) {
      res.status(400).json({
        error: "platform_upload_invalid_content",
        message: "Request body must include content.",
      });
      return;
    }

    try {
      const cin = await service.upload(req.params.featureKey, content);
      res.status(201).json({ cin });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown platform upload failure";
      res.status(500).json({ error: "platform_upload_failed", message });
    }
  });

  return router;
}
