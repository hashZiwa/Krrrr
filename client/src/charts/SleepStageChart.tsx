import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatTimeLabel } from "../data/chartTransforms";
import type { TimeWindow } from "../data/timeWindow";
import type { ChartSample } from "../types/sleep";
import { chartColors, sleepStageGuideLines, sleepStageLabels } from "./chartConfig";

type SleepStageChartProps = {
  data: ChartSample[];
  window: TimeWindow;
};

export function SleepStageChart({ data, window }: SleepStageChartProps) {
  return (
    <section className="chart-panel">
      <div className="chart-panel__header">
        <h2>수면 단계</h2>
      </div>
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 12, right: 20, bottom: 0, left: 0 }}>
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
            {sleepStageGuideLines.map((line) => (
              <ReferenceLine
                key={line.value}
                y={line.value}
                stroke={line.color}
                strokeWidth={line.strokeWidth}
                ifOverflow="extendDomain"
              />
            ))}
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
