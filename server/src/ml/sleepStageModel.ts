import type { SleepStageValue } from "./sleepStageDataset.js";
import type { SleepStageTrainingExample } from "./sleepStageFeatures.js";

export type SleepStageModel = {
  labels: SleepStageValue[];
  featureMeans: number[];
  featureScales: number[];
  weights: number[][];
  metadata: {
    trainedAt: string;
    trainingExamples: number;
    featureCount: number;
    stageCounts: Record<number, number>;
  };
};

export type SleepStagePrediction = {
  stage: SleepStageValue;
  probabilities: Record<number, number>;
};

export type SleepStageModelEvaluation = {
  total: number;
  correct: number;
  accuracy: number;
  stages: Record<number, { total: number; correct: number; accuracy: number }>;
};

export type SleepStageTrainingOptions = {
  epochs?: number;
  learningRate?: number;
};

const labels: SleepStageValue[] = [0, 1, 2];

function normalize(features: number[], means: number[], scales: number[]): number[] {
  return features.map((value, index) => (value - means[index]) / scales[index]);
}

function softmax(scores: number[]): number[] {
  const maxScore = Math.max(...scores);
  const exps = scores.map((score) => Math.exp(score - maxScore));
  const sum = exps.reduce((total, value) => total + value, 0);

  return exps.map((value) => value / sum);
}

function dot(weights: number[], featuresWithBias: number[]): number {
  return weights.reduce((sum, weight, index) => sum + weight * featuresWithBias[index], 0);
}

function getFeatureStats(examples: SleepStageTrainingExample[]): { means: number[]; scales: number[] } {
  const featureCount = examples[0]?.features.length ?? 0;
  const means = Array.from({ length: featureCount }, (_, featureIndex) => {
    return examples.reduce((sum, example) => sum + example.features[featureIndex], 0) / examples.length;
  });
  const scales = means.map((mean, featureIndex) => {
    const variance =
      examples.reduce((sum, example) => sum + (example.features[featureIndex] - mean) ** 2, 0) / examples.length;

    return Math.sqrt(variance) || 1;
  });

  return { means, scales };
}

function getStageCounts(examples: SleepStageTrainingExample[]): Record<number, number> {
  return examples.reduce<Record<number, number>>((counts, example) => {
    counts[example.label] = (counts[example.label] ?? 0) + 1;
    return counts;
  }, {});
}

export function trainSleepStageModel(
  examples: SleepStageTrainingExample[],
  options: SleepStageTrainingOptions = {},
): SleepStageModel {
  if (examples.length === 0) {
    throw new Error("Cannot train sleep stage model without examples");
  }

  const epochs = options.epochs ?? 500;
  const learningRate = options.learningRate ?? 0.05;
  const { means, scales } = getFeatureStats(examples);
  const featureCount = examples[0].features.length;
  const weights = labels.map(() => Array.from({ length: featureCount + 1 }, () => 0));
  const stageCounts = getStageCounts(examples);
  const classWeights = Object.fromEntries(
    labels.map((label) => [label, examples.length / (labels.length * (stageCounts[label] ?? 1))]),
  ) as Record<number, number>;

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    for (const example of examples) {
      const normalized = normalize(example.features, means, scales);
      const featuresWithBias = [1, ...normalized];
      const probabilities = softmax(weights.map((classWeightsRow) => dot(classWeightsRow, featuresWithBias)));
      const exampleWeight = classWeights[example.label] ?? 1;

      labels.forEach((label, labelIndex) => {
        const expected = example.label === label ? 1 : 0;
        const error = (probabilities[labelIndex] - expected) * exampleWeight;

        featuresWithBias.forEach((feature, featureIndex) => {
          weights[labelIndex][featureIndex] -= learningRate * error * feature;
        });
      });
    }
  }

  return {
    labels,
    featureMeans: means,
    featureScales: scales,
    weights,
    metadata: {
      trainedAt: new Date().toISOString(),
      trainingExamples: examples.length,
      featureCount,
      stageCounts,
    },
  };
}

export function predictSleepStage(model: SleepStageModel, features: number[]): SleepStagePrediction {
  const normalized = normalize(features, model.featureMeans, model.featureScales);
  const featuresWithBias = [1, ...normalized];
  const probabilityValues = softmax(model.weights.map((classWeightsRow) => dot(classWeightsRow, featuresWithBias)));
  const bestIndex = probabilityValues.reduce(
    (best, probability, index) => (probability > probabilityValues[best] ? index : best),
    0,
  );

  return {
    stage: model.labels[bestIndex],
    probabilities: Object.fromEntries(model.labels.map((label, index) => [label, probabilityValues[index]])),
  };
}

export function evaluateSleepStageModel(
  model: SleepStageModel,
  examples: SleepStageTrainingExample[],
): SleepStageModelEvaluation {
  const stages = Object.fromEntries(
    model.labels.map((label) => [label, { total: 0, correct: 0, accuracy: 0 }]),
  ) as SleepStageModelEvaluation["stages"];
  let correct = 0;

  for (const example of examples) {
    const prediction = predictSleepStage(model, example.features);
    const stage = stages[example.label];

    stage.total += 1;
    if (prediction.stage === example.label) {
      correct += 1;
      stage.correct += 1;
    }
  }

  for (const stage of Object.values(stages)) {
    stage.accuracy = stage.total === 0 ? 0 : stage.correct / stage.total;
  }

  return {
    total: examples.length,
    correct,
    accuracy: examples.length === 0 ? 0 : correct / examples.length,
    stages,
  };
}
