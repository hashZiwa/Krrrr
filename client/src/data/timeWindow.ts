export type TimeWindow = {
  start: number;
  end: number;
};

const minutesToMs = (minutes: number) => minutes * 60_000;

export function createInitialTimeWindow(domainStart: number, domainEnd: number, visibleMinutes: number): TimeWindow {
  const visibleMs = minutesToMs(visibleMinutes);
  const domainWidth = domainEnd - domainStart;

  if (domainWidth <= visibleMs) {
    return { start: domainStart, end: domainEnd };
  }

  return {
    start: domainStart,
    end: domainStart + visibleMs,
  };
}

export function panTimeWindow(
  current: TimeWindow,
  deltaMs: number,
  domainStart: number,
  domainEnd: number,
): TimeWindow {
  const width = current.end - current.start;
  let nextStart = current.start + deltaMs;
  let nextEnd = current.end + deltaMs;

  if (nextStart < domainStart) {
    nextStart = domainStart;
    nextEnd = domainStart + width;
  }

  if (nextEnd > domainEnd) {
    nextEnd = domainEnd;
    nextStart = domainEnd - width;
  }

  return { start: nextStart, end: nextEnd };
}

export function filterByTimeWindow<T extends { timeMs: number }>(samples: T[], window: TimeWindow): T[] {
  return samples.filter((sample) => sample.timeMs >= window.start && sample.timeMs <= window.end);
}
