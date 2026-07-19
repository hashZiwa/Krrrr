export const chartColors = {
  sleepLine: "#b86b18",
  sleepFill: "#f3d8ad",
  breathingLine: "#62564a",
  movement: "#fff6d4",
  apnea: "#eba4a3",
  grid: "#e3d6c4",
  axis: "#8a765f",
};

export const sleepStageLabels: Record<number, string> = {
  0: "깸",
  1: "REM",
  2: "얕은 잠",
  3: "깊은 잠",
};

export const sleepStageValues = [0, 1, 2, 3] as const;

export type SleepStageLineStyle = {
  color: string;
  strokeWidth: number;
};

export const sleepStageLineStyles: Record<number, SleepStageLineStyle> = {
  0: { color: "#ff5f03ff", strokeWidth: 4 },
  1: { color: "#f8c302ff", strokeWidth: 8 },
  2: { color: "#239bf1", strokeWidth: 12 },
  3: { color: "#5541e6", strokeWidth: 16 },
};

export const sleepStageTransitionLineStyle = {
  strokeWidth: sleepStageLineStyles[0].strokeWidth,
  strokeLinecap: "butt",
} as const;

export const sleepStageChartStyle = {
  opacity: 0.6,
} as const;

export const sleepStageTransitionGradientUnits = "userSpaceOnUse";

export const sleepStageTransitionGradientStops: Array<{ offset: string; color: "from" | "to" }> = [
  { offset: "0%", color: "from" },
  { offset: "3%", color: "from" },
  { offset: "30%", color: "to" },
  { offset: "100%", color: "to" },
];

export function getSleepStageTransitionLineCoordinates(
  fromY: number,
  toY: number,
  fromStrokeWidth: number,
  toStrokeWidth: number,
): { y1: number; y2: number; gradientY1: number; gradientY2: number } {
  const fromExtension = fromStrokeWidth / 2 - 2;
  const toExtension = toStrokeWidth / 2 - 2;
  const fromIsTop = fromY <= toY;
  const topY = fromIsTop ? fromY - fromExtension : toY - toExtension;
  const bottomY = fromIsTop ? toY + toExtension : fromY + fromExtension;

  return {
    y1: fromIsTop ? topY : bottomY,
    y2: fromIsTop ? bottomY : topY,
    gradientY1: topY,
    gradientY2: bottomY,
  };
}

export const sleepStageSegmentGlow = {
  stages: [] as number[],
  height: 70,
  opacity: 0.28,
} as const;

export const sleepStageSegmentClipPaddingBuffer = 12;

export const breathingSleepStageOverlayStyle = {
  opacity: 0.33,
  strokeWidthByStage: {
    0: sleepStageLineStyles[0].strokeWidth,
    1: sleepStageLineStyles[1].strokeWidth,
    2: sleepStageLineStyles[2].strokeWidth,
    3: sleepStageLineStyles[3].strokeWidth,
  },
} as const;

export const breathingSleepStageOverlayTransitionStyle = {
  strokeWidth: sleepStageTransitionLineStyle.strokeWidth,
  strokeLinecap: "butt",
} as const;

export function getBreathingSleepStageOverlayStrokeWidth(value: number): number {
  return (
    breathingSleepStageOverlayStyle.strokeWidthByStage[
      value as keyof typeof breathingSleepStageOverlayStyle.strokeWidthByStage
    ] ?? sleepStageLineStyles[0].strokeWidth
  );
}

export function getBreathingSleepStageOverlayTransitionStrokeWidth(): number {
  return breathingSleepStageOverlayTransitionStyle.strokeWidth;
}

export const breathingCurveStyle = {
  type: "natural",
  strokeWidth: 3,
  dotRadius: 3,
  showDots: false,
} as const;

export const breathingFillGradientStops = [
  { offset: "0%", color: "#d38457", opacity: 0.62 },
  { offset: "52%", color: "#e5b878", opacity: 0.54 },
  { offset: "100%", color: "#f5df88", opacity: 0.46 },
] as const;

export const breathingStrokeGradientStops = [
  { offset: "0%", color: "#c66f48" },
  { offset: "58%", color: "#dca45c" },
  { offset: "100%", color: "#e7c85d" },
] as const;

const sleepStageMinScrollableWidth = 360;
const sleepStagePixelsPerHour = 420;

function getScrollableChartWidth(startMs: number, endMs: number): number {
  const durationHours = Math.max(0, endMs - startMs) / (60 * 60 * 1000);

  return Math.max(sleepStageMinScrollableWidth, Math.ceil(durationHours * sleepStagePixelsPerHour));
}

export function getSleepStageScrollableWidth(startMs: number, endMs: number): number {
  return getScrollableChartWidth(startMs, endMs);
}

export function getBreathingScrollableWidth(startMs: number, endMs: number): number {
  return getScrollableChartWidth(startMs, endMs);
}

export const breathingYAxisTicks = [0, 6, 12, 18];
export const breathingYAxisPadding = 2;
export const breathingYAxisMinRange = 6;

export const breathingEventOverlayLayers = {
  mask: {
    color: "#ffffff",
    xInsetRatio: 0.5,
    yInset: 0,
    gradientStops: [
      { offset: "0%", opacity: 0 },
      { offset: "10%", opacity: 0.9 },
      { offset: "30%", opacity: 1 },
      { offset: "70%", opacity: 1 },
      { offset: "90%", opacity: 0.9 },
      { offset: "100%", opacity: 0 },
    ],
  },
  event: {
    xInsetRatio: 0.5,
    yInset: 0,
    gradientStops: [
      { offset: "0%", opacity: 0 },
      { offset: "35%", opacity: 0.5 },
      { offset: "50%", opacity: 0.55 },
      { offset: "65%", opacity: 0.5 },
      { offset: "100%", opacity: 0 },
    ],
  },
} as const;

export type BreathingEventOverlayLayerKey = keyof typeof breathingEventOverlayLayers;

export const breathingEventVisibility = {
  movementMaskOpacity: 0.3,
  movementDotOpacity: 0.8,
  apneaMaskOpacity: 1,
  apneaDotOpacity: 0,
} as const;

export function getBreathingEventOverlayRenderItems<T>(overlays: T[]): Array<{
  layer: BreathingEventOverlayLayerKey;
  overlay: T;
}> {
  const layers = Object.keys(breathingEventOverlayLayers) as BreathingEventOverlayLayerKey[];

  return layers.flatMap((layer) => overlays.map((overlay) => ({ layer, overlay })));
}

export function getBreathingEventOverlayColor(value: number, layer: BreathingEventOverlayLayerKey): string {
  if (layer === "mask") return breathingEventOverlayLayers.mask.color;
  return value === -1 ? chartColors.movement : chartColors.apnea;
}

export function getBreathingEventOverlayOpacity(value: number, layer: BreathingEventOverlayLayerKey): number {
  if (layer !== "mask") return 1;
  return value === -1 ? breathingEventVisibility.movementMaskOpacity : breathingEventVisibility.apneaMaskOpacity;
}

export function getBreathingEventDotOpacity(value: number): number {
  if (value === -1) return breathingEventVisibility.movementDotOpacity;
  if (value === 0) return breathingEventVisibility.apneaDotOpacity;
  return 1;
}

export function getBreathingEventOverlayLegendItems(): Array<{ label: string; color: string }> {
  return [
    { label: "뒤척임", color: chartColors.movement },
    { label: "무호흡", color: chartColors.apnea },
  ];
}

export function getBreathingYAxisConfig(values: number[]): { domain: [number, number]; ticks: number[] } {
  const normalValues = values.filter((value) => value > 0);

  if (normalValues.length === 0) {
    return { domain: [-1, 18], ticks: [...breathingYAxisTicks] };
  }

  const min = Math.min(...normalValues);
  const max = Math.max(...normalValues);
  const center = (min + max) / 2;
  const paddedMin = min - breathingYAxisPadding;
  const paddedMax = max + breathingYAxisPadding;
  const halfRange = Math.max((paddedMax - paddedMin) / 2, breathingYAxisMinRange / 2);
  const domainMin = Math.floor(center - halfRange);
  const domainMax = Math.ceil(center + halfRange);
  const tickStep = (domainMax - domainMin) / 3;

  return {
    domain: [domainMin, domainMax],
    ticks: [0, 1, 2, 3].map((index) => Math.round(domainMin + tickStep * index)),
  };
}

export function getSleepStageSegmentClipPadding(): number {
  const maxStrokeWidth = Math.max(...Object.values(sleepStageLineStyles).map((style) => style.strokeWidth));

  return maxStrokeWidth / 2 + sleepStageSegmentClipPaddingBuffer;
}

export function getSleepStageDisplayValue(value: number): number {
  return 3 - value;
}

export function shouldRenderSleepStageGlow(value: number): boolean {
  return sleepStageSegmentGlow.stages.includes(value);
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
  if (value === -1) return "뒤척임으로 값 부정확";
  if (value === 0) return "무호흡";
  return `${value}회/min`;
}
