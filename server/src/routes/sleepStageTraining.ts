import { Router } from "express";
import type { createSleepStageTrainingService } from "../services/sleepStageTrainingService.js";

type SleepStageTrainingService = ReturnType<typeof createSleepStageTrainingService>;

type TrainingService = Pick<
  SleepStageTrainingService,
  "getModelStatus" | "trainFromRawData" | "incrementalTrainFromRawData"
>;

export function createSleepStageTrainingRouter(service: TrainingService): Router {
  const router = Router();

  function respondWithTrainingResult(res: Parameters<Parameters<Router["post"]>[1]>[1], result: Awaited<ReturnType<TrainingService["trainFromRawData"]>>) {
    res.status(201).json({
      rawDataDir: result.rawDataDir,
      version: result.version,
      trainingMode: result.trainingMode,
      files: result.files,
      datasetRows: result.datasetRows,
      trainingExamples: result.trainingExamples,
      trainingEvaluation: result.trainingEvaluation,
      validationEvaluation: result.validationEvaluation,
      model: {
        trainedAt: result.model.metadata.trainedAt,
        featureCount: result.model.metadata.featureCount,
        stageCounts: result.model.metadata.stageCounts,
      },
    });
  }

  router.get("/status", (_req, res) => {
    res.json(service.getModelStatus());
  });

  router.post("/train", async (_req, res) => {
    try {
      const result = await service.trainFromRawData();

      respondWithTrainingResult(res, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "sleep_stage_training_failed", message });
    }
  });

  router.post("/incremental-train", async (_req, res) => {
    try {
      const result = await service.incrementalTrainFromRawData();

      respondWithTrainingResult(res, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "sleep_stage_training_failed", message });
    }
  });

  return router;
}
