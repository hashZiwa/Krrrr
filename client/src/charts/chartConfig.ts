export const chartColors = {
  sleepLine: "#276b7a",
  sleepFill: "#b9dde3",
  breathingLine: "#4f6f52",
  movement: "#c87941",
  apnea: "#b94a48",
  grid: "#d9e3e5",
  axis: "#66777b",
};

export const sleepStageLabels: Record<number, string> = {
  0: "깸",
  1: "얕은 잠",
  2: "깊은 잠",
};

export const sleepStageLineStyles: Record<number, { color: string; strokeWidth: number }> = {
  0: { color: "#f8c302ff", strokeWidth: 4 },
  1: { color: "#239bf1", strokeWidth: 5 },
  2: { color: "#5541e6", strokeWidth: 7 },
};

export const sleepStageSegmentGlow = {
  stages: [1, 2],
  height: 70,
  opacity: 0.28,
} as const;

export const sleepStageSegmentClipPaddingBuffer = 12;

export function getSleepStageSegmentClipPadding(): number {
  const maxStrokeWidth = Math.max(...Object.values(sleepStageLineStyles).map((style) => style.strokeWidth));

  return maxStrokeWidth / 2 + sleepStageSegmentClipPaddingBuffer;
}

export function shouldRenderSleepStageGlow(value: number): boolean {
  return sleepStageSegmentGlow.stages.includes(value as 1 | 2);
}

export type SleepStageTooltipPayloadItem = {
  value?: unknown;
};

export function getSleepStageTooltipValue(payload?: SleepStageTooltipPayloadItem[] | null): number | null {
  const item = payload?.find((entry) => {
    return typeof entry.value === "number" && entry.value in sleepStageLabels;
  });

  return typeof item?.value === "number" ? item.value : null;
}

export function formatBreathingValue(value: number): string {
  if (value === -1) return "뒤척임";
  if (value === 0) return "무호흡 인식 실패";
  return `${value}회/분`;
}
