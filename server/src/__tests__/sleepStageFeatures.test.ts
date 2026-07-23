import { describe, expect, it } from "vitest";
import { createWindowedSleepStageExamples } from "../ml/sleepStageFeatures.js";
import type { SleepStageTrainingRow, SleepStageValue } from "../ml/sleepStageDataset.js";

const minute = 60 * 1000;

function row(index: number, respiratoryRate: number, sleepStage: SleepStageValue = 2): SleepStageTrainingRow {
  return {
    timestampMs: index * minute,
    sleepStage,
    respiratoryRate,
  };
}

describe("sleepStageFeatures", () => {
  it("creates examples from current and previous breathing context", () => {
    const examples = createWindowedSleepStageExamples(
      [row(0, 10), row(1, 11), row(2, 13, 2), row(3, 16, 1)],
      { historyMinutes: 2 },
    );

    expect(examples).toHaveLength(2);
    expect(examples[0]).toMatchObject({
      label: 2,
      timestampMs: 2 * minute,
      respiratoryRates: [10, 11, 13],
    });
    expect(examples[0].features).toEqual([13, 11, 10, 10, 13, 11.33, 1.25, 10, 13, 3]);
  });
});
