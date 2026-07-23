import { initialAnalysisExclusion, normalizeSleepStageValue, sleepStageValues } from "../charts/chartConfig";
import type { ChartSample } from "../types/sleep";
import { apneaGaugeConfig, apneaSeverityThresholds, type ApneaSeverityLevel } from "./sleepAnalysisConfig";

export type SleepStageRatio = {
  value: number;
  count: number;
  ratio: number;
};

export type SleepStageDonutSegment = SleepStageRatio & {
  startRatio: number;
  endRatio: number;
};

export type ApneaGaugeDisplay =
  | {
      hasData: true;
      apneaCountPerHour: number;
      severity: ApneaSeverityLevel;
    }
  | {
      hasData: false;
      apneaCountPerHour: null;
      severity: null;
    };

export function getSlidingWindowApneaCount(
  samples: ChartSample[],
  windowMinutes = apneaGaugeConfig.windowMinutes,
): number {
  const apneaTimes = samples
    .filter((sample) => sample.value === 0)
    .map((sample) => sample.timeMs)
    .sort((left, right) => left - right);
  const windowMs = windowMinutes * 60 * 1000;
  let startIndex = 0;
  let maxCount = 0;

  for (let endIndex = 0; endIndex < apneaTimes.length; endIndex += 1) {
    while (apneaTimes[endIndex] - apneaTimes[startIndex] > windowMs) {
      startIndex += 1;
    }

    maxCount = Math.max(maxCount, endIndex - startIndex + 1);
  }

  return maxCount;
}

export function getAverageHourlyApneaCount(samples: ChartSample[]): number | null {
  if (samples.length < 2) return null;

  const sortedSamples = [...samples].sort((left, right) => left.timeMs - right.timeMs);
  const firstSample = sortedSamples[0];
  const lastSample = sortedSamples[sortedSamples.length - 1];
  const durationHours = (lastSample.timeMs - firstSample.timeMs) / (60 * 60 * 1000);

  if (durationHours <= 0) return null;

  const apneaCount = sortedSamples.filter((sample) => sample.value === 0).length;

  return apneaCount / durationHours;
}

function getAnalysisEligibleSamples(
  samples: ChartSample[],
  exclusionMinutes = initialAnalysisExclusion.minutes,
): ChartSample[] {
  if (samples.length === 0) return [];

  const sortedSamples = [...samples].sort((left, right) => left.timeMs - right.timeMs);
  const analysisStartMs = sortedSamples[0].timeMs + exclusionMinutes * 60 * 1000;

  return sortedSamples.filter((sample) => sample.timeMs >= analysisStartMs);
}

export function getApneaSeverity(
  count: number,
  thresholds: ApneaSeverityLevel[] = apneaSeverityThresholds,
): ApneaSeverityLevel {
  return [...thresholds]
    .sort((left, right) => right.minCount - left.minCount)
    .find((level) => count >= level.minCount) ?? thresholds[0];
}

export function getApneaGaugeDisplay(samples: ChartSample[]): ApneaGaugeDisplay {
  const apneaCountPerHour = getAverageHourlyApneaCount(getAnalysisEligibleSamples(samples));

  if (apneaCountPerHour === null) {
    return {
      hasData: false,
      apneaCountPerHour: null,
      severity: null,
    };
  }

  return {
    hasData: true,
    apneaCountPerHour,
    severity: getApneaSeverity(apneaCountPerHour),
  };
}

export function getSleepStageRatios(samples: ChartSample[]): SleepStageRatio[] {
  const total = samples.length;

  return sleepStageValues.map((value) => {
    const count = samples.filter((sample) => normalizeSleepStageValue(sample.value) === value).length;

    return {
      value,
      count,
      ratio: total === 0 ? 0 : count / total,
    };
  });
}

export function getSleepStageDonutSegments(ratios: SleepStageRatio[]): SleepStageDonutSegment[] {
  let cursor = 0;

  return ratios.map((ratio) => {
    const startRatio = Number(cursor.toFixed(6));
    const endRatio = Number(Math.min(1, startRatio + ratio.ratio).toFixed(6));
    cursor = endRatio;

    return {
      ...ratio,
      startRatio,
      endRatio,
    };
  });
}
