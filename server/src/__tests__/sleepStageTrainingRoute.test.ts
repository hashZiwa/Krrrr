import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSleepStageTrainingRouter } from "../routes/sleepStageTraining.js";

const servers: Array<{ close: () => void }> = [];

async function createTestServer(service: Parameters<typeof createSleepStageTrainingRouter>[0]) {
  const app = express();
  app.use(express.json());
  app.use("/api/sleep-stage-training", createSleepStageTrainingRouter(service));

  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a port");
  }

  return `http://127.0.0.1:${address.port}`;
}

describe("createSleepStageTrainingRouter", () => {
  afterEach(() => {
    servers.splice(0).forEach((server) => server.close());
  });

  it("returns model status", async () => {
    const baseUrl = await createTestServer({
      getModelStatus: vi.fn().mockReturnValue({ trained: false }),
      trainFromRawData: vi.fn(),
      incrementalTrainFromRawData: vi.fn(),
      saveTrainingCsv: vi.fn(),
    });

    const response = await fetch(`${baseUrl}/api/sleep-stage-training/status`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ trained: false });
  });

  it("trains a model from rawdata", async () => {
    const service = {
      getModelStatus: vi.fn(),
      trainFromRawData: vi.fn().mockResolvedValue({
        rawDataDir: "rawdata",
        version: 2,
        trainingMode: "full",
        files: ["sleep.csv"],
        datasetRows: 10,
        trainingExamples: 5,
        model: {
          metadata: {
            trainedAt: "2026-07-20T00:00:00.000Z",
            trainingExamples: 5,
            featureCount: 10,
            stageCounts: { 0: 1, 1: 1, 2: 3 },
          },
        },
        trainingEvaluation: {
          total: 5,
          correct: 4,
          accuracy: 0.8,
          stages: {},
        },
        validationEvaluation: null,
      }),
      incrementalTrainFromRawData: vi.fn(),
      saveTrainingCsv: vi.fn(),
    };
    const baseUrl = await createTestServer(service);

    const response = await fetch(`${baseUrl}/api/sleep-stage-training/train`, { method: "POST" });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      rawDataDir: "rawdata",
      version: 2,
      trainingMode: "full",
      files: ["sleep.csv"],
      datasetRows: 10,
      trainingExamples: 5,
      model: {
        trainedAt: "2026-07-20T00:00:00.000Z",
        featureCount: 10,
        stageCounts: { 0: 1, 1: 1, 2: 3 },
      },
      trainingEvaluation: {
        total: 5,
        correct: 4,
        accuracy: 0.8,
        stages: {},
      },
      validationEvaluation: null,
    });
  });

  it("runs incremental training from rawdata", async () => {
    const service = {
      getModelStatus: vi.fn(),
      trainFromRawData: vi.fn(),
      incrementalTrainFromRawData: vi.fn().mockResolvedValue({
        rawDataDir: "rawdata",
        version: 3,
        trainingMode: "incremental",
        files: ["a.csv", "b.csv"],
        datasetRows: 20,
        trainingExamples: 14,
        model: {
          metadata: {
            trainedAt: "2026-07-20T00:00:00.000Z",
            trainingExamples: 14,
            featureCount: 10,
            stageCounts: { 0: 2, 1: 3, 2: 9 },
          },
        },
        trainingEvaluation: {
          total: 14,
          correct: 10,
          accuracy: 0.71,
          stages: {},
        },
        validationEvaluation: {
          total: 4,
          correct: 2,
          accuracy: 0.5,
          stages: {},
        },
      }),
      saveTrainingCsv: vi.fn(),
    };
    const baseUrl = await createTestServer(service);

    const response = await fetch(`${baseUrl}/api/sleep-stage-training/incremental-train`, { method: "POST" });

    expect(response.status).toBe(201);
    expect(service.incrementalTrainFromRawData).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toMatchObject({
      version: 3,
      trainingMode: "incremental",
      validationEvaluation: { accuracy: 0.5 },
    });
  });

  it("saves an uploaded training CSV", async () => {
    const service = {
      getModelStatus: vi.fn(),
      trainFromRawData: vi.fn(),
      incrementalTrainFromRawData: vi.fn(),
      saveTrainingCsv: vi.fn().mockResolvedValue({
        file: "new-data.csv",
        files: ["existing.csv", "new-data.csv"],
      }),
    };
    const baseUrl = await createTestServer(service);

    const response = await fetch(`${baseUrl}/api/sleep-stage-training/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: "new-data.csv",
        content: "timestamp,sleep_stage,sleep_stage_code,respiratory_rate_bpm\n2026-07-20 01:00:00,Wake,40001,18",
      }),
    });

    expect(response.status).toBe(201);
    expect(service.saveTrainingCsv).toHaveBeenCalledWith(
      "new-data.csv",
      "timestamp,sleep_stage,sleep_stage_code,respiratory_rate_bpm\n2026-07-20 01:00:00,Wake,40001,18",
    );
    await expect(response.json()).resolves.toEqual({
      file: "new-data.csv",
      files: ["existing.csv", "new-data.csv"],
    });
  });

  it("rejects non CSV training uploads", async () => {
    const service = {
      getModelStatus: vi.fn(),
      trainFromRawData: vi.fn(),
      incrementalTrainFromRawData: vi.fn(),
      saveTrainingCsv: vi.fn(),
    };
    const baseUrl = await createTestServer(service);

    const response = await fetch(`${baseUrl}/api/sleep-stage-training/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: "notes.txt", content: "hello" }),
    });

    expect(response.status).toBe(400);
    expect(service.saveTrainingCsv).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ error: "sleep_stage_training_invalid_upload" });
  });
});
