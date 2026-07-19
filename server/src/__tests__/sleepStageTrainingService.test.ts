import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createSleepStageTrainingService } from "../services/sleepStageTrainingService.js";

describe("sleepStageTrainingService", () => {
  it("loads CSV files from a rawdata directory and trains a model", async () => {
    const rawDataDir = await mkdtemp(join(tmpdir(), "sleeper-rawdata-"));
    await writeFile(
      join(rawDataDir, "sleep.csv"),
      [
        "timestamp,sleep_stage,sleep_stage_code,respiratory_rate_bpm",
        "2026-07-19 01:20:17,Wake,40001,18",
        "2026-07-19 01:21:17,Wake,40001,18",
        "2026-07-19 01:22:17,REM,40004,16",
        "2026-07-19 01:23:17,Light,40002,14",
        "2026-07-19 01:24:17,Deep,40003,11",
        "2026-07-19 01:25:17,Deep,40003,11",
      ].join("\n"),
      "utf8",
    );

    const service = createSleepStageTrainingService({ rawDataDir, historyMinutes: 1 });
    const result = await service.trainFromRawData();

    expect(result.datasetRows).toBe(6);
    expect(result.trainingExamples).toBe(5);
    expect(result.model.metadata.stageCounts).toEqual({ 0: 1, 1: 1, 2: 1, 3: 2 });
    expect(result.evaluation.total).toBe(5);
    expect(result.evaluation.accuracy).toBeGreaterThanOrEqual(0);
    expect(service.getModelStatus()).toMatchObject({ trained: true, trainingExamples: 5 });
  });
});
