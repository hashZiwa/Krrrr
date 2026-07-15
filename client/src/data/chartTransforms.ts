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
