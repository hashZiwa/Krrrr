import { describe, expect, it } from "vitest";
import { parseMeasuredAt, toChartSamples, toSleepStageSegments } from "../data/chartTransforms";

describe("chartTransforms", () => {
  it("parses yyyyMMddHHmmss timestamps into local Date milliseconds", () => {
    const value = parseMeasuredAt("20260714230000");
    const date = new Date(value);

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(14);
    expect(date.getHours()).toBe(23);
  });

  it("adds numeric time and readable labels to samples", () => {
    const samples = toChartSamples([{ measuredAt: "20260714230000", value: 2 }]);

    expect(samples[0]).toMatchObject({
      measuredAt: "20260714230000",
      value: 2,
      timeLabel: "23:00",
    });
    expect(typeof samples[0].timeMs).toBe("number");
  });

  it("creates horizontal sleep stage segments without vertical transitions", () => {
    const samples = toChartSamples([
      { measuredAt: "20260714230000", value: 0 },
      { measuredAt: "20260714230500", value: 1 },
      { measuredAt: "20260714231000", value: 1 },
    ]);

    const segments = toSleepStageSegments(samples);

    expect(segments).toHaveLength(2);
    expect(segments[0].value).toBe(0);
    expect(segments[0].points).toEqual([
      { timeMs: samples[0].timeMs, value: 0 },
      { timeMs: samples[1].timeMs, value: 0 },
    ]);
    expect(segments[1].value).toBe(1);
    expect(segments[1].points).toEqual([
      { timeMs: samples[1].timeMs, value: 1 },
      { timeMs: samples[2].timeMs, value: 1 },
    ]);
  });
});
