import { describe, expect, it } from "vitest";
import { sleepStageGuideLines, sleepStageLabels } from "../charts/chartConfig";

describe("chartConfig", () => {
  it("uses the requested sleep stage labels", () => {
    expect(sleepStageLabels).toEqual({
      0: "깸",
      1: "얕은 잠",
      2: "깊은 잠",
    });
  });

  it("configures one horizontal guide line per sleep stage", () => {
    expect(sleepStageGuideLines).toHaveLength(3);
    expect(sleepStageGuideLines.map((line) => line.value)).toEqual([0, 1, 2]);
    expect(new Set(sleepStageGuideLines.map((line) => line.color)).size).toBe(3);
    expect(new Set(sleepStageGuideLines.map((line) => line.strokeWidth)).size).toBe(3);
  });
});
