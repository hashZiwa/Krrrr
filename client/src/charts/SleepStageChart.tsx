import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatTimeLabel } from "../data/chartTransforms";
import type { TimeWindow } from "../data/timeWindow";
import type { ChartSample } from "../types/sleep";
import { chartColors, sleepStageLabels } from "./chartConfig";

type SleepStageChartProps = {
  data: ChartSample[];
  window: TimeWindow;
};

export function SleepStageChart({ data, window }: SleepStageChartProps) {
  return (
    <section className="chart-panel">
      <div className="chart-panel__header">
        <h2>수면 단계</h2>
        <span>높을수록 깊은 수면</span>
      </div>
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 12, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={chartColors.grid} strokeDasharray="4 4" />
            <XAxis
              dataKey="timeMs"
              type="number"
              domain={[window.start, window.end]}
              tickFormatter={formatTimeLabel}
              stroke={chartColors.axis}
            />
            <YAxis
              domain={[0, 2]}
              ticks={[0, 1, 2]}
              tickFormatter={(value) => sleepStageLabels[Number(value)]}
              stroke={chartColors.axis}
              width={56}
            />
            <Tooltip
              labelFormatter={(value) => formatTimeLabel(Number(value))}
              formatter={(value) => [sleepStageLabels[Number(value)], "단계"]}
            />
            <Area
              type="stepAfter"
              dataKey="value"
              stroke={chartColors.sleepLine}
              fill={chartColors.sleepFill}
              strokeWidth={3}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
