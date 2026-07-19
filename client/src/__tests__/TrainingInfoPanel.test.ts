import { describe, expect, it } from "vitest";
import { formatAccuracy, getTrainingModeText, getTrainingStatusText } from "../components/TrainingInfoPanel";

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
});
