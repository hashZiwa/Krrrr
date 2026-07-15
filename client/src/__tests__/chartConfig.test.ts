import { describe, expect, it } from "vitest";
import { getSleepStageTooltipValue, sleepStageLabels, sleepStageLineStyles } from "../charts/chartConfig";

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
});
