import { normalizeSleepStageValue } from "../charts/chartConfig";
import type { ChartSample, SensorSample } from "../types/sleep";

const pad = (value: number) => String(value).padStart(2, "0");

export function parseMeasuredAt(value: string): number {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6)) - 1;
  const day = Number(value.slice(6, 8));
  const hour = Number(value.slice(8, 10));
  const minute = Number(value.slice(10, 12));
  const second = Number(value.slice(12, 14));

  return new Date(year, month, day, hour, minute, second).getTime();
}

export function formatTimeLabel(timeMs: number): string {
  const date = new Date(timeMs);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function getTimeTicksByInterval(startMs: number, endMs: number, intervalMinutes: number): number[] {
  const firstTick = new Date(startMs);
  const intervalMs = intervalMinutes * 60 * 1000;

  firstTick.setSeconds(0, 0);
  firstTick.setMinutes(Math.ceil(firstTick.getMinutes() / intervalMinutes) * intervalMinutes);
  if (firstTick.getTime() < startMs) {
    firstTick.setTime(firstTick.getTime() + intervalMs);
  }

  const ticks: number[] = [];
  for (let tick = firstTick.getTime(); tick <= endMs; tick += intervalMs) {
    ticks.push(tick);
  }

  return ticks;
}

export function getTwentyMinuteTimeTicks(startMs: number, endMs: number): number[] {
  return getTimeTicksByInterval(startMs, endMs, 20);
}

export type InitialAnalysisExclusionRange = {
  startMs: number;
  endMs: number;
};

export function getInitialAnalysisExclusionRange(
  window: { start: number; end: number },
  minutes: number,
): InitialAnalysisExclusionRange | null {
  const endMs = Math.min(window.end, window.start + minutes * 60 * 1000);

  if (endMs <= window.start) return null;

  return { startMs: window.start, endMs };
}
export function getInitialAnalysisExclusionRangeForSamples(
  samples: ChartSample[],
  window: { start: number; end: number },
  minutes: number,
): InitialAnalysisExclusionRange | null {
  const firstSample = samples[0];

  if (!firstSample) return null;

  const startMs = Math.max(window.start, firstSample.timeMs);
  const endMs = Math.min(window.end, firstSample.timeMs + minutes * 60 * 1000);

  if (endMs <= startMs) return null;

  return { startMs, endMs };
}

export function toChartSamples(samples: SensorSample[]): ChartSample[] {
  return samples.map((sample) => {
    const timeMs = parseMeasuredAt(sample.measuredAt);

    return {
      ...sample,
      timeMs,
      timeLabel: formatTimeLabel(timeMs),
    };
  });
}

export function getSleepStageValueAtTime(samples: ChartSample[], timeMs: number): number | null {
  const value = samples.find((sample) => sample.timeMs === timeMs)?.value;
  return typeof value === "number" ? normalizeSleepStageValue(value) : null;
}

function isLongChartGap(previous: ChartSample, next: ChartSample, gapThresholdMs = Number.POSITIVE_INFINITY): boolean {
  return next.timeMs - previous.timeMs >= gapThresholdMs;
}

export type SleepStageSegment = {
  value: number;
  points: Array<{
    timeMs: number;
    value: number;
  }>;
};

export function toSleepStageSegments(
  samples: ChartSample[],
  gapThresholdMs = Number.POSITIVE_INFINITY,
): SleepStageSegment[] {
  return samples.slice(0, -1).flatMap((sample, index) => {
    const next = samples[index + 1];

    if (isLongChartGap(sample, next, gapThresholdMs)) return [];

    return [
      {
        value: normalizeSleepStageValue(sample.value),
        points: [
          { timeMs: sample.timeMs, value: normalizeSleepStageValue(sample.value) },
          { timeMs: next.timeMs, value: normalizeSleepStageValue(sample.value) },
        ],
      },
    ];
  });
}

export type SleepStageTransitionSegment = {
  fromValue: number;
  toValue: number;
  timeMs: number;
};

export function toSleepStageTransitionSegments(
  samples: ChartSample[],
  gapThresholdMs = Number.POSITIVE_INFINITY,
): SleepStageTransitionSegment[] {
  return samples.slice(1).flatMap((sample, index) => {
    const previous = samples[index];

    if (normalizeSleepStageValue(previous.value) === normalizeSleepStageValue(sample.value) || isLongChartGap(previous, sample, gapThresholdMs)) {
      return [];
    }

    return [
      {
        fromValue: normalizeSleepStageValue(previous.value),
        toValue: normalizeSleepStageValue(sample.value),
        timeMs: sample.timeMs,
      },
    ];
  });
}

export type SleepStageOverlaySegment = {
  value: number;
  points: Array<{
    timeMs: number;
    overlayValue: number;
  }>;
};

function getSleepStageOverlayPositions(breathingDomain: [number, number]): Record<number, number> {
  const [min, max] = breathingDomain;
  const range = max - min;

  return {
    0: min + range * 0.85,
    1: min + range * 0.5,
    2: min + range * 0.15,
  };
}

export function toSleepStageOverlaySegments(
  samples: ChartSample[],
  breathingDomain: [number, number],
  gapThresholdMs = Number.POSITIVE_INFINITY,
): SleepStageOverlaySegment[] {
  const stagePositions = getSleepStageOverlayPositions(breathingDomain);

  return samples.slice(0, -1).flatMap((sample, index) => {
    const next = samples[index + 1];
    const normalizedValue = normalizeSleepStageValue(sample.value);
    const overlayValue = stagePositions[normalizedValue] ?? stagePositions[0];

    if (isLongChartGap(sample, next, gapThresholdMs)) return [];

    return [
      {
        value: normalizeSleepStageValue(sample.value),
        points: [
          { timeMs: sample.timeMs, overlayValue },
          { timeMs: next.timeMs, overlayValue },
        ],
      },
    ];
  });
}

export type SleepStageOverlayTransitionSegment = {
  fromValue: number;
  toValue: number;
  timeMs: number;
  fromOverlayValue: number;
  toOverlayValue: number;
};

export function toSleepStageOverlayTransitionSegments(
  samples: ChartSample[],
  breathingDomain: [number, number],
  gapThresholdMs = Number.POSITIVE_INFINITY,
): SleepStageOverlayTransitionSegment[] {
  const stagePositions = getSleepStageOverlayPositions(breathingDomain);

  return samples.slice(1).flatMap((sample, index) => {
    const previous = samples[index];

    if (normalizeSleepStageValue(previous.value) === normalizeSleepStageValue(sample.value) || isLongChartGap(previous, sample, gapThresholdMs)) {
      return [];
    }

    return [
      {
        fromValue: normalizeSleepStageValue(previous.value),
        toValue: normalizeSleepStageValue(sample.value),
        timeMs: sample.timeMs,
        fromOverlayValue: stagePositions[normalizeSleepStageValue(previous.value)] ?? stagePositions[0],
        toOverlayValue: stagePositions[normalizeSleepStageValue(sample.value)] ?? stagePositions[0],
      },
    ];
  });
}

export type BreathingEventOverlay = {
  value: number;
  timeMs: number;
  startMs: number;
  endMs: number;
};

export type BreathingDisplaySample = Omit<ChartSample, "value"> & {
  value: number | null;
  displayValue: number | null;
  isGap?: true;
};

function findPreviousNormalSample(samples: ChartSample[], startIndex: number): ChartSample | null {
  for (let index = startIndex; index >= 0; index -= 1) {
    if (samples[index].value > 0) return samples[index];
  }

  return null;
}

function findNextNormalSample(samples: ChartSample[], startIndex: number): ChartSample | null {
  for (let index = startIndex; index < samples.length; index += 1) {
    if (samples[index].value > 0) return samples[index];
  }

  return null;
}

export function toBreathingDisplaySamples(
  samples: ChartSample[],
  gapThresholdMs = Number.POSITIVE_INFINITY,
): BreathingDisplaySample[] {
  const displaySamples: BreathingDisplaySample[] = samples.map((sample) => ({
    ...sample,
    displayValue: sample.value > 0 ? sample.value : null,
  }));

  let index = 0;
  while (index < samples.length) {
    if (samples[index].value > 0) {
      index += 1;
      continue;
    }

    const runStart = index;
    while (index < samples.length && samples[index].value <= 0) {
      index += 1;
    }
    const runEnd = index - 1;
    const previousNormal = findPreviousNormalSample(samples, runStart - 1);
    const nextNormal = findNextNormalSample(samples, runEnd + 1);

    for (let eventIndex = runStart; eventIndex <= runEnd; eventIndex += 1) {
      if (previousNormal && nextNormal) {
        const step = eventIndex - runStart + 1;
        const runLength = runEnd - runStart + 1;
        const ratio = step / (runLength + 1);

        displaySamples[eventIndex].displayValue =
          previousNormal.value + (nextNormal.value - previousNormal.value) * ratio;
      } else if (previousNormal) {
        displaySamples[eventIndex].displayValue = previousNormal.value;
      } else if (nextNormal) {
        displaySamples[eventIndex].displayValue = nextNormal.value;
      }
    }
  }

  return displaySamples.flatMap((sample, index) => {
    const previous = samples[index - 1];

    if (!previous || !isLongChartGap(previous, samples[index], gapThresholdMs)) {
      return [sample];
    }

    const gapTimeMs = previous.timeMs + 1;

    return [
      {
        ...previous,
        value: null,
        displayValue: null,
        isGap: true as const,
        timeMs: gapTimeMs,
        timeLabel: formatTimeLabel(gapTimeMs),
      },
      sample,
    ];
  });
}

export function toBreathingEventOverlays(samples: ChartSample[]): BreathingEventOverlay[] {
  return samples.flatMap((sample, index) => {
    if (sample.value > 0) return [];

    const previous = samples[index - 1];
    const next = samples[index + 1];
    const previousDelta = previous ? sample.timeMs - previous.timeMs : next ? next.timeMs - sample.timeMs : 0;
    const nextDelta = next ? next.timeMs - sample.timeMs : previousDelta;

    return [
      {
        value: sample.value,
        timeMs: sample.timeMs,
        startMs: sample.timeMs - previousDelta / 2,
        endMs: sample.timeMs + nextDelta / 2,
      },
    ];
  });
}