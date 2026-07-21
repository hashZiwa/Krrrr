export type ApneaSeverityLevel = {
  key: "normal" | "mild" | "moderate" | "severe";
  label: string;
  minCount: number;
  color: string;
};

export const apneaSeverityThresholds: ApneaSeverityLevel[] = [
  { key: "normal", label: "정상", minCount: 0, color: "#77b88b" },
  { key: "mild", label: "경증", minCount: 5, color: "#d2b64d" },
  { key: "moderate", label: "중등증", minCount: 15, color: "#d99045" },
  { key: "severe", label: "중증", minCount: 25, color: "#d95a4c" },
];

export const apneaGaugeConfig = {
  windowMinutes: 60,
  maxDisplayCount: 30,
} as const;
