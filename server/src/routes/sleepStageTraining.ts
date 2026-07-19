import { Router } from "express";
import type { createSleepStageTrainingService } from "../services/sleepStageTrainingService.js";

type SleepStageTrainingService = ReturnType<typeof createSleepStageTrainingService>;

export function createSleepStageTrainingRouter(service: Pick<SleepStageTrainingService, "getModelStatus" | "trainFromRawData">): Router {
  const router = Router();

  router.get("/status", (_req, res) => {
    res.json(service.getModelStatus());
  });

  router.post("/train", async (_req, res) => {
    try {
      const result = await service.trainFromRawData();

      res.status(201).json({
        rawDataDir: result.rawDataDir,
        files: result.files,
        datasetRows: result.datasetRows,
        trainingExamples: result.trainingExamples,
        evaluation: result.evaluation,
        model: {
          trainedAt: result.model.metadata.trainedAt,
          featureCount: result.model.metadata.featureCount,
          stageCounts: result.model.metadata.stageCounts,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "sleep_stage_training_failed", message });
    }
  });

  return router;
}
