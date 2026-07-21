import { describe, expect, it } from "vitest";
import { getChartAnimationKey } from "../data/chartAnimation";
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

describe("chartAnimation", () => {
  it("changes the animation key when chart values change on the same time range", () => {
    const first = [sample(0, 1), sample(5, 2), sample(10, 3)];
    const second = [sample(0, 1), sample(5, 3), sample(10, 3)];

    expect(getChartAnimationKey(first)).not.toBe(getChartAnimationKey(second));
  });

  it("returns a stable empty key when there is no chart data", () => {
    expect(getChartAnimationKey([])).toBe("empty");
  });
});
