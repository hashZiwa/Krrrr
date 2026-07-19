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

export function getHourlyTimeTicks(startMs: number, endMs: number): number[] {
  const firstTick = new Date(startMs);

  firstTick.setMinutes(0, 0, 0);
  if (firstTick.getTime() < startMs) {
    firstTick.setHours(firstTick.getHours() + 1);
  }

  const ticks: number[] = [];
  for (let tick = firstTick.getTime(); tick <= endMs; tick += 60 * 60 * 1000) {
    ticks.push(tick);
  }

  return ticks;
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

export type SleepStageSegment = {
  value: number;
  points: Array<{
    timeMs: number;
    value: number;
  }>;
};

export function toSleepStageSegments(samples: ChartSample[]): SleepStageSegment[] {
  return samples.slice(0, -1).map((sample, index) => ({
    value: sample.value,
    points: [
      { timeMs: sample.timeMs, value: sample.value },
      { timeMs: samples[index + 1].timeMs, value: sample.value },
    ],
  }));
}

export type SleepStageOverlaySegment = {
  value: number;
  points: Array<{
    timeMs: number;
    overlayValue: number;
  }>;
};

export function toSleepStageOverlaySegments(
  samples: ChartSample[],
  breathingDomain: [number, number],
): SleepStageOverlaySegment[] {
  const [min, max] = breathingDomain;
  const range = max - min;
  const stagePositions: Record<number, number> = {
    0: min + range * 0.15,
    1: min + range * 0.5,
    2: min + range * 0.85,
  };

  return samples.slice(0, -1).map((sample, index) => {
    const overlayValue = stagePositions[sample.value] ?? stagePositions[0];

    return {
      value: sample.value,
      points: [
        { timeMs: sample.timeMs, overlayValue },
        { timeMs: samples[index + 1].timeMs, overlayValue },
      ],
    };
  });
}

export type BreathingEventOverlay = {
  value: number;
  timeMs: number;
  startMs: number;
  endMs: number;
};

export type BreathingDisplaySample = ChartSample & {
  displayValue: number | null;
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

export function toBreathingDisplaySamples(samples: ChartSample[]): BreathingDisplaySample[] {
  const displaySamples = samples.map((sample) => ({
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

  return displaySamples;
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
