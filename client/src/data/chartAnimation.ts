import type { ChartSample } from "../types/sleep";

export function getChartAnimationKey(samples: ChartSample[]): string {
  if (samples.length === 0) {
    return "empty";
  }

  const first = samples[0];
  const last = samples[samples.length - 1];
  const checksum = samples.reduce((sum, sample, index) => {
    return (sum + (index + 1) * (sample.value + (sample.timeMs % 997))) % 1_000_003;
  }, 0);

  return `${samples.length}-${first.timeMs}-${last.timeMs}-${checksum}`;
}
