import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDisplayDataService } from "../services/displayDataService.js";

const tempDirs: string[] = [];

async function createTempDisplayDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "sleeper-displaydata-"));
  tempDirs.push(dir);
  return dir;
}

describe("createDisplayDataService", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("lists CSV files sorted by name", async () => {
    const displayDataDir = await createTempDisplayDir();
    await writeFile(path.join(displayDataDir, "b.csv"), "timestamp,sleep_stage,sleep_stage_code,respiratory_rate_bpm\n");
    await writeFile(path.join(displayDataDir, "notes.txt"), "ignore me");
    await writeFile(path.join(displayDataDir, "a.csv"), "timestamp,sleep_stage,sleep_stage_code,respiratory_rate_bpm\n");

    const service = createDisplayDataService(displayDataDir);

    await expect(service.listFiles()).resolves.toEqual([
      { name: "a.csv" },
      { name: "b.csv" },
    ]);
  });

  it("builds a monitoring session from a selected CSV file", async () => {
    const displayDataDir = await createTempDisplayDir();
    await writeFile(
      path.join(displayDataDir, "sample.csv"),
      [
        "timestamp,sleep_stage,sleep_stage_code,respiratory_rate_bpm",
        "2026-07-19 01:20:17,Wake,40001,16",
        "2026-07-19 01:25:17,REM,40004,15",
        "2026-07-19 01:30:17,Light,40002,0",
        "2026-07-19 01:35:17,Deep,40003,12",
      ].join("\n"),
    );

    const service = createDisplayDataService(displayDataDir);
    const session = await service.getSession("sample.csv");

    expect(session.id).toBe("displaydata-sample.csv");
    expect(session.startedAt).toBe("20260719012017");
    expect(session.endedAt).toBe("20260719013517");
    expect(session.intervalMinutes).toBe(5);
    expect(session.sleepStageSamples.map((sample) => sample.value)).toEqual([0, 1, 2, 3]);
    expect(session.breathingSamples.map((sample) => sample.value)).toEqual([16, 15, 0, 12]);
    expect(session.summary).toMatchObject({
      averageBreathingRate: 14.3,
      movementCount: 0,
      apneaRecognitionFailureCount: 1,
      deepSleepRatio: 0.25,
    });
  });

  it("saves predicted rows in a display data compatible CSV format", async () => {
    const displayDataDir = await createTempDisplayDir();
    const service = createDisplayDataService(displayDataDir);

    await expect(
      service.savePredictedSession("predicted.csv", [
        { timestampMs: new Date(2026, 6, 19, 1, 20, 17).getTime(), sleepStage: 0, respiratoryRate: 16 },
        { timestampMs: new Date(2026, 6, 19, 1, 25, 17).getTime(), sleepStage: 1, respiratoryRate: 15 },
        { timestampMs: new Date(2026, 6, 19, 1, 30, 17).getTime(), sleepStage: 2, respiratoryRate: 0 },
        { timestampMs: new Date(2026, 6, 19, 1, 35, 17).getTime(), sleepStage: 3, respiratoryRate: 12 },
      ]),
    ).resolves.toEqual({ fileName: "predicted.csv" });

    const session = await service.getSession("predicted.csv");

    expect(session.startedAt).toBe("20260719012017");
    expect(session.sleepStageSamples.map((sample) => sample.value)).toEqual([0, 1, 2, 3]);
    expect(session.breathingSamples.map((sample) => sample.value)).toEqual([16, 15, 0, 12]);
  });

  it("rejects file names outside the display data directory", async () => {
    const displayDataDir = await createTempDisplayDir();
    const service = createDisplayDataService(displayDataDir);

    await expect(service.getSession("../rawdata/train.csv")).rejects.toThrow(/invalid display data file/i);
  });
});
