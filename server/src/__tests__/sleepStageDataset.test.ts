import { describe, expect, it } from "vitest";
import { parseSleepStageCsv } from "../ml/sleepStageDataset.js";

describe("sleepStageDataset", () => {
  it("parses raw CSV rows and maps sleep stages to app stage values", () => {
    const rows = parseSleepStageCsv(
      [
        "timestamp,sleep_stage,sleep_stage_code,respiratory_rate_bpm",
        "2026-07-19 01:20:17,Light,40002,14",
        "2026-07-19 01:21:17,Wake,40001,16",
        "2026-07-19 01:22:17,Deep,40003,12",
        "2026-07-19 01:23:17,REM,40004,15",
      ].join("\n"),
    );

    expect(rows.map((row) => row.sleepStage)).toEqual([2, 0, 2, 1]);
    expect(rows.map((row) => row.respiratoryRate)).toEqual([14, 16, 12, 15]);
    expect(rows[0].timestampMs).toBeLessThan(rows[1].timestampMs);
  });

  it("rejects rows with unknown sleep stage labels", () => {
    expect(() =>
      parseSleepStageCsv(
        [
          "timestamp,sleep_stage,sleep_stage_code,respiratory_rate_bpm",
          "2026-07-19 01:20:17,Nap,49999,14",
        ].join("\n"),
      ),
    ).toThrow(/unknown sleep stage/i);
  });
});
