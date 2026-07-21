import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createSleepStageModelStore } from "../services/sleepStageModelStore.js";
import type { StoredSleepStageModel } from "../services/sleepStageModelStore.js";

function storedModel(version = 1): StoredSleepStageModel {
  return {
    version,
    trainedAt: "2026-07-20T00:00:00.000Z",
    trainingMode: "full",
    sourceFiles: ["sleep.csv"],
    sourceFileFingerprints: [{ file: "sleep.csv", hash: "hash-1", size: 10, modifiedAtMs: 1 }],
    datasetRows: 6,
    trainingExamples: 5,
    historyMinutes: 1,
    trainingEvaluation: { total: 5, correct: 4, accuracy: 0.8, stages: {} },
    validationEvaluation: null,
    model: {
      labels: [0, 1, 2, 3],
      featureMeans: [1],
      featureScales: [1],
      weights: [[0], [0], [0], [0]],
      metadata: {
        trainedAt: "2026-07-20T00:00:00.000Z",
        trainingExamples: 5,
        featureCount: 1,
        stageCounts: { 0: 1, 1: 1, 2: 1, 3: 2 },
      },
    },
  };
}

describe("sleepStageModelStore", () => {
  it("saves versioned model snapshots and loads latest", async () => {
    const modelDir = await mkdtemp(join(tmpdir(), "sleeper-model-"));
    const store = createSleepStageModelStore(modelDir);

    const saved = await store.save(storedModel());
    const latest = await store.loadLatest();

    expect(saved.version).toBe(1);
    expect(saved.versionFile).toMatch(/sleep-stage-model\.v0001\.json$/);
    expect(latest?.version).toBe(1);
    expect(await store.getNextVersion()).toBe(2);
  });
});
