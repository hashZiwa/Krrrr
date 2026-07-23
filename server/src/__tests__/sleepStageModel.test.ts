import { describe, expect, it } from "vitest";
import { evaluateSleepStageModel, predictSleepStage, trainSleepStageModel } from "../ml/sleepStageModel.js";
import type { SleepStageTrainingExample } from "../ml/sleepStageFeatures.js";
import type { SleepStageValue } from "../ml/sleepStageDataset.js";

function example(label: SleepStageValue, currentRate: number, index: number): SleepStageTrainingExample {
  return {
    label,
    timestampMs: index,
    respiratoryRates: [currentRate - 1, currentRate, currentRate + 1],
    features: [currentRate, currentRate - 1, currentRate - 2, currentRate - 1, currentRate, currentRate, 0.8, currentRate - 2, currentRate + 1, 3],
  };
}

describe("sleepStageModel", () => {
  it("trains a deterministic softmax model that predicts sleep stages", () => {
    const trainingExamples = [
      ...Array.from({ length: 10 }, (_, index) => example(0, 18 + (index % 2), index)),
      ...Array.from({ length: 10 }, (_, index) => example(1, 16 + (index % 2), index + 10)),
      ...Array.from({ length: 10 }, (_, index) => example(2, 14 + (index % 2), index + 20)),
      ...Array.from({ length: 10 }, (_, index) => example(2, 11 + (index % 2), index + 30)),
    ];

    const model = trainSleepStageModel(trainingExamples, { epochs: 300, learningRate: 0.08 });
    const prediction = predictSleepStage(model, example(2, 11, 100).features);

    expect(model.metadata.trainingExamples).toBe(40);
    expect(model.labels).toEqual([0, 1, 2]);
    expect(prediction.stage).toBeGreaterThanOrEqual(0);
    expect(prediction.stage).toBeLessThanOrEqual(2);
    expect(Object.keys(prediction.probabilities).sort()).toEqual(["0", "1", "2"]);
    expect(prediction.probabilities[2]).toBeDefined();
    expect(evaluateSleepStageModel(model, trainingExamples)).toMatchObject({
      total: 40,
    });
  });
});
