import type { SensorSample, SleepSessionResponse, SleepSessionSummary } from "../models/sleep.js";
import { addMinutes, formatTimestamp } from "../utils/time.js";
import type { SleepDataProvider } from "./sleepDataProvider.js";

const START = new Date(2026, 6, 14, 23, 0, 0);
const INTERVAL_MINUTES = 5;

const sleepStages = [
  0, 0, 1, 1, 1,
  2, 2, 2, 1, 2,
  2, 2, 1, 1, 2,
  2, 2, 1, 1, 1,
  0, 1, 0, 0, 0,
  1, 1, 2, 2, 2,
  1, 1, 1, 2, 2,
  2, 1, 0, 0, 1,
  1, 2, 2, 1, 1,
  0, 0, 1, 1,
];

const breathingValues = [
  15, 14, 14, 15, -1,
  -1, 14, 15, 0, 14,
  15, 16, 15, 14, 14,
  -1, 0, 14, 15, 0,
  16, 15, 14, 14, 13,
  13, 14, 15, 15, 16,
  15, 14, -1, 14, 13,
  0, 14, 15, 16, 15,
  14, -1, 0, 13, 14,
  15, 15, 14, 13,
];

function buildSamples(values: number[]): SensorSample[] {
  return values.map((value, index) => ({
    measuredAt: formatTimestamp(addMinutes(START, index * INTERVAL_MINUTES)),
    value,
  }));
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function summarize(sleepStageSamples: SensorSample[], breathingSamples: SensorSample[]): SleepSessionSummary {
  const validBreathing = breathingSamples
    .map((sample) => sample.value)
    .filter((value) => value > 0);

  const averageBreathingRate =
    validBreathing.length === 0
      ? null
      : roundTo(validBreathing.reduce((sum, value) => sum + value, 0) / validBreathing.length, 1);

  const deepSleepCount = sleepStageSamples.filter((sample) => sample.value === 2).length;

  return {
    averageBreathingRate,
    movementCount: breathingSamples.filter((sample) => sample.value === -1).length,
    apneaRecognitionFailureCount: breathingSamples.filter((sample) => sample.value === 0).length,
    deepSleepRatio: roundTo(deepSleepCount / sleepStageSamples.length, 2),
  };
}

export const mockSleepDataProvider: SleepDataProvider = {
  async getLatestSession(): Promise<SleepSessionResponse> {
    const sleepStageSamples = buildSamples(sleepStages);
    const breathingSamples = buildSamples(breathingValues);

    return {
      id: "mock-session-20260714",
      startedAt: sleepStageSamples[0].measuredAt,
      endedAt: sleepStageSamples[sleepStageSamples.length - 1].measuredAt,
      intervalMinutes: INTERVAL_MINUTES,
      sleepStageSamples,
      breathingSamples,
      summary: summarize(sleepStageSamples, breathingSamples),
    };
  },
};
