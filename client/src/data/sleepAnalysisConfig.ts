export type ApneaSeverityLevel = {
  key: "normal" | "mild" | "moderate" | "severe";
  label: string;
  minCount: number;
  color: string;
  comment: string;
};

export const apneaSeverityThresholds: ApneaSeverityLevel[] = [
  {
    key: "normal",
    label: "정상",
    minCount: 0,
    color: "#77b88b",
    comment: "안정적인 호흡 흐름입니다.",
  },
  {
    key: "mild",
    label: "경증",
    minCount: 5,
    color: "#d2b64d",
    comment: "가벼운 무호흡 경향이 보입니다.",
  },
  {
    key: "moderate",
    label: "중등증",
    minCount: 15,
    color: "#d99045",
    comment: "수면 중 호흡 상태를 주의 깊게 확인하세요.",
  },
  {
    key: "severe",
    label: "중증",
    minCount: 25,
    color: "#d95a4c",
    comment: "병원 검진을 권장합니다.",
  },
];

export const apneaGaugeConfig = {
  windowMinutes: 60,
  maxDisplayCount: 30,
} as const;

export function getApneaSeverityRangeLabel(
  level: ApneaSeverityLevel,
  index: number,
  thresholds = apneaSeverityThresholds,
): string {
  const nextLevel = thresholds[index + 1];

  if (!nextLevel) {
    return `${level.minCount}회 이상`;
  }

  return `${level.minCount}~${nextLevel.minCount - 1}회`;
}

export function getApneaGaugeBoundaryLabels(
  thresholds = apneaSeverityThresholds,
): Array<{ value: number; label: string }> {
  return thresholds
    .filter((level) => level.minCount > 0)
    .map((level) => ({
      value: level.minCount,
      label: String(level.minCount),
    }));
}
