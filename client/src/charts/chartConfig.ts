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
  0: "얕음",
  1: "중간",
  2: "깊음",
};

export function formatBreathingValue(value: number): string {
  if (value === -1) return "뒤척임";
  if (value === 0) return "무호흡 인식 실패";
  return `${value}회/분`;
}
