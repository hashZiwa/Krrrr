import { describe, expect, it } from "vitest";
import {
  getSleepStageTooltipValue,
  getSleepStageSegmentClipPadding,
  shouldRenderSleepStageGlow,
  sleepStageLabels,
  sleepStageLineStyles,
  sleepStageSegmentGlow,
} from "../charts/chartConfig";

describe("chartConfig", () => {
  it("uses the requested sleep stage labels", () => {
    expect(sleepStageLabels).toEqual({
      0: "깸",
      1: "얕은 잠",
      2: "깊은 잠",
    });
  });

  it("configures one pulse line style per sleep stage", () => {
    expect(Object.keys(sleepStageLineStyles).map(Number)).toEqual([0, 1, 2]);
    expect(new Set(Object.values(sleepStageLineStyles).map((style) => style.color)).size).toBe(3);
    expect(new Set(Object.values(sleepStageLineStyles).map((style) => style.strokeWidth)).size).toBe(3);
  });

  it("selects one valid sleep stage value from duplicated tooltip payload", () => {
    const payload = [
      { value: undefined },
      { value: 1 },
      { value: 1 },
      { value: 2 },
    ];

    expect(getSleepStageTooltipValue(payload)).toBe(1);
  });

  it("returns null when tooltip payload has no valid sleep stage", () => {
    expect(getSleepStageTooltipValue([{ value: undefined }, { value: "bad" }])).toBeNull();
  });

  it("adds glow only for light and deep sleep segments", () => {
    expect(shouldRenderSleepStageGlow(0)).toBe(false);
    expect(shouldRenderSleepStageGlow(1)).toBe(true);
    expect(shouldRenderSleepStageGlow(2)).toBe(true);
  });

  it("keeps sleep stage glow tuning in chart config", () => {
    expect(sleepStageSegmentGlow.height).toBeGreaterThan(0);
    expect(sleepStageSegmentGlow.opacity).toBeGreaterThan(0);
    expect(sleepStageSegmentGlow.opacity).toBeLessThanOrEqual(1);
    expect(sleepStageSegmentGlow.stages).toEqual([1, 2]);
  });

  it("expands the sleep stage clip area beyond the thickest segment stroke", () => {
    const maxStrokeWidth = Math.max(...Object.values(sleepStageLineStyles).map((style) => style.strokeWidth));

    expect(getSleepStageSegmentClipPadding()).toBeGreaterThan(maxStrokeWidth / 2);
  });
});
