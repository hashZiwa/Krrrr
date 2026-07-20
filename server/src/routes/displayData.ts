import { Router } from "express";
import type { DisplayDataFile } from "../services/displayDataService.js";
import type { SleepSessionResponse } from "../models/sleep.js";

type DisplayDataService = {
  listFiles(): Promise<DisplayDataFile[]>;
  getSession(fileName: string): Promise<SleepSessionResponse>;
};

export function createDisplayDataRouter(service: DisplayDataService): Router {
  const router = Router();

  router.get("/files", async (_req, res) => {
    try {
      const files = await service.listFiles();
      res.json({ files });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "display_data_files_load_failed", message });
    }
  });

  router.get("/session", async (req, res) => {
    const fileName = typeof req.query.file === "string" ? req.query.file : "";

    if (!fileName) {
      res.status(400).json({ error: "display_data_file_required" });
      return;
    }

    try {
      const session = await service.getSession(fileName);
      res.json(session);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "display_data_session_load_failed", message });
    }
  });

  return router;
}
