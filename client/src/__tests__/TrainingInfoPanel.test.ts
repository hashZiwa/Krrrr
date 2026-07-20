import { describe, expect, it } from "vitest";
import {
  formatAccuracy,
  getPrimaryEvaluation,
  getTrainingFileCount,
  getTrainingModeText,
  getTrainingStatusText,
  isCsvFile,
} from "../components/TrainingInfoPanel";

describe("TrainingInfoPanel helpers", () => {
  it("formats training status and mode text", () => {
    expect(getTrainingStatusText({ trained: false })).toBe("미학습");
    expect(getTrainingStatusText({ trained: true, version: 3, trainingExamples: 10, trainedAt: "now", stageCounts: {} })).toBe(
      "v3 학습 완료",
    );
    expect(getTrainingModeText("full")).toBe("전체 재학습");
    expect(getTrainingModeText("incremental")).toBe("추가 학습");
  });

  it("formats accuracy as a percentage", () => {
    expect(formatAccuracy(0.83018)).toBe("83.0%");
    expect(formatAccuracy(undefined)).toBe("-");
  });

  it("prefers validation evaluation over training evaluation", () => {
    expect(
      getPrimaryEvaluation({
        trained: true,
        version: 1,
        trainingExamples: 10,
        trainedAt: "now",
        stageCounts: {},
        trainingEvaluation: { total: 10, correct: 9, accuracy: 0.9, stages: {} },
        validationEvaluation: { total: 4, correct: 2, accuracy: 0.5, stages: {} },
      }),
    ).toMatchObject({ label: "검증 정확도", evaluation: { accuracy: 0.5 } });
  });

  it("counts source files and accepts only CSV files", () => {
    expect(getTrainingFileCount({ trained: false })).toBe("-");
    expect(
      getTrainingFileCount({
        trained: true,
        version: 1,
        trainingExamples: 10,
        trainedAt: "now",
        stageCounts: {},
        sourceFiles: ["a.csv", "b.csv"],
      }),
    ).toBe(2);
    expect(isCsvFile({ name: "sleep.csv" } as File)).toBe(true);
    expect(isCsvFile({ name: "sleep.txt" } as File)).toBe(false);
  });
});
