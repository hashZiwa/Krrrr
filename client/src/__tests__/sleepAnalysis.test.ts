import { describe, expect, it } from "vitest";
import {
  getApneaSeverity,
  getSleepStageRatios,
  getSlidingWindowApneaCount,
} from "../data/sleepAnalysis";
import { apneaSeverityThresholds } from "../data/sleepAnalysisConfig";
import type { ChartSample } from "../types/sleep";

function sample(minutes: number, value: number): ChartSample {
  const timeMs = new Date(2026, 6, 21, 0, minutes, 0).getTime();

  return {
    measuredAt: "20260721000000",
    value,
    timeMs,
    timeLabel: "00:00",
  };
}

describe("sleepAnalysis", () => {
  it("uses the worst one-hour sliding window for apnea frequency", () => {
    const samples = [
      sample(0, 16),
      sample(10, 0),
      sample(20, 0),
      sample(30, 0),
      sample(40, 0),
      sample(50, 0),
      sample(75, 0),
    ];

    expect(getSlidingWindowApneaCount(samples)).toBe(5);
  });

  it("maps apnea count thresholds to severity labels", () => {
    expect(getApneaSeverity(4, apneaSeverityThresholds).label).toBe("정상");
    expect(getApneaSeverity(5, apneaSeverityThresholds).label).toBe("경증");
    expect(getApneaSeverity(15, apneaSeverityThresholds).label).toBe("중등증");
    expect(getApneaSeverity(25, apneaSeverityThresholds).label).toBe("중증");
  });

  it("calculates sleep stage ratios for donut segments", () => {
    expect(getSleepStageRatios([sample(0, 0), sample(5, 1), sample(10, 2), sample(15, 3), sample(20, 3)])).toEqual([
      { value: 0, count: 1, ratio: 0.2 },
      { value: 1, count: 1, ratio: 0.2 },
      { value: 2, count: 1, ratio: 0.2 },
      { value: 3, count: 2, ratio: 0.4 },
    ]);
  });
});
