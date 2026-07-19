import type { SleepStageTrainingRow, SleepStageValue } from "./sleepStageDataset.js";

export type SleepStageTrainingExample = {
  label: SleepStageValue;
  timestampMs: number;
  respiratoryRates: number[];
  features: number[];
};

export type SleepStageFeatureOptions = {
  historyMinutes: number;
};

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function buildFeatures(respiratoryRates: number[]): number[] {
  const current = respiratoryRates.at(-1) ?? 0;
  const previous1 = respiratoryRates.at(-2) ?? current;
  const previous2 = respiratoryRates.at(-3) ?? previous1;
  const first = respiratoryRates[0] ?? current;
  const last = current;
  const mean = respiratoryRates.reduce((sum, value) => sum + value, 0) / respiratoryRates.length;
  const variance =
    respiratoryRates.reduce((sum, value) => sum + (value - mean) ** 2, 0) / respiratoryRates.length;
  const min = Math.min(...respiratoryRates);
  const max = Math.max(...respiratoryRates);

  return [
    current,
    previous1,
    previous2,
    first,
    last,
    roundTo(mean, 2),
    roundTo(Math.sqrt(variance), 2),
    min,
    max,
    last - first,
  ];
}

export function createWindowedSleepStageExamples(
  rows: SleepStageTrainingRow[],
  options: SleepStageFeatureOptions,
): SleepStageTrainingExample[] {
  const sortedRows = [...rows].sort((left, right) => left.timestampMs - right.timestampMs);
  const windowSize = Math.max(1, options.historyMinutes + 1);

  return sortedRows.slice(windowSize - 1).map((row, index) => {
    const windowRows = sortedRows.slice(index, index + windowSize);
    const respiratoryRates = windowRows.map((windowRow) => windowRow.respiratoryRate);

    return {
      label: row.sleepStage,
      timestampMs: row.timestampMs,
      respiratoryRates,
      features: buildFeatures(respiratoryRates),
    };
  });
}
