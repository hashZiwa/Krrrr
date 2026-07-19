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
        files: ["sleep.csv"],
        datasetRows: 10,
        trainingExamples: 5,
        model: {
          metadata: {
            trainedAt: "2026-07-20T00:00:00.000Z",
            trainingExamples: 5,
            featureCount: 10,
            stageCounts: { 0: 1, 1: 1, 2: 2, 3: 1 },
          },
        },
        evaluation: {
          total: 5,
          correct: 4,
          accuracy: 0.8,
          stages: {},
        },
      }),
    };
    const baseUrl = await createTestServer(service);

    const response = await fetch(`${baseUrl}/api/sleep-stage-training/train`, { method: "POST" });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      rawDataDir: "rawdata",
      files: ["sleep.csv"],
      datasetRows: 10,
      trainingExamples: 5,
      model: {
        trainedAt: "2026-07-20T00:00:00.000Z",
        featureCount: 10,
        stageCounts: { 0: 1, 1: 1, 2: 2, 3: 1 },
      },
      evaluation: {
        total: 5,
        correct: 4,
        accuracy: 0.8,
        stages: {},
      },
    });
  });
});
