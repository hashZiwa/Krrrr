import { describe, expect, it } from "vitest";
import {
  getApneaSeverity,
  getSleepStageRatios,
  getSleepStageDonutSegments,
  getSlidingWindowApneaCount,
} from "../data/sleepAnalysis";
import { apneaSeverityThresholds, getApneaGaugeBoundaryLabels, getApneaSeverityRangeLabel } from "../data/sleepAnalysisConfig";
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

  it("keeps apnea range labels and comments configurable by severity", () => {
    expect(apneaSeverityThresholds.map((level, index) => getApneaSeverityRangeLabel(level, index))).toEqual([
      "0~4회",
      "5~14회",
      "15~24회",
      "25회 이상",
    ]);
    expect(apneaSeverityThresholds.map((level) => level.comment)).toEqual([
      "안정적인 호흡 흐름입니다.",
      "가벼운 무호흡 경향이 보입니다.",
      "수면 중 호흡 상태를 주의 깊게 확인하세요.",
      "병원 검진을 권장합니다.",
    ]);
  });

  it("uses non-zero apnea thresholds as gauge boundary labels", () => {
    expect(getApneaGaugeBoundaryLabels().map((item) => item.label)).toEqual(["5", "15", "25"]);
  });

  it("calculates sleep stage ratios for donut segments", () => {
    expect(getSleepStageRatios([sample(0, 0), sample(5, 1), sample(10, 2), sample(15, 3), sample(20, 3)])).toEqual([
      { value: 0, count: 1, ratio: 0.2 },
      { value: 1, count: 1, ratio: 0.2 },
      { value: 2, count: 1, ratio: 0.2 },
      { value: 3, count: 2, ratio: 0.4 },
    ]);
  });

  it("creates non-overlapping donut segment ranges for each sleep stage", () => {
    const segments = getSleepStageDonutSegments([
      { value: 0, count: 1, ratio: 0.2 },
      { value: 1, count: 2, ratio: 0.4 },
      { value: 2, count: 1, ratio: 0.2 },
      { value: 3, count: 1, ratio: 0.2 },
    ]);

    expect(segments.map(({ value, startRatio, endRatio }) => ({ value, startRatio, endRatio }))).toEqual([
      { value: 0, startRatio: 0, endRatio: 0.2 },
      { value: 1, startRatio: 0.2, endRatio: 0.6 },
      { value: 2, startRatio: 0.6, endRatio: 0.8 },
      { value: 3, startRatio: 0.8, endRatio: 1 },
    ]);
  });
});
