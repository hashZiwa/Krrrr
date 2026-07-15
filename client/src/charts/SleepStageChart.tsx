import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatTimeLabel, toSleepStageSegments } from "../data/chartTransforms";
import type { TimeWindow } from "../data/timeWindow";
import type { ChartSample } from "../types/sleep";
import { chartColors, sleepStageLabels, sleepStageLineStyles } from "./chartConfig";

type SleepStageChartProps = {
  data: ChartSample[];
  window: TimeWindow;
};

export function SleepStageChart({ data, window }: SleepStageChartProps) {
  const segments = toSleepStageSegments(data);

  return (
    <section className="chart-panel">
      <div className="chart-panel__header">
        <h2>수면 단계</h2>
      </div>
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 12, right: 20, bottom: 0, left: 0 }}>
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
            {segments.map((segment, index) => {
              const style = sleepStageLineStyles[segment.value];

              return (
                <Line
                  key={`${segment.points[0].timeMs}-${index}`}
                  type="linear"
                  data={segment.points}
                  dataKey="value"
                  stroke={style.color}
                  strokeWidth={style.strokeWidth}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                  legendType="none"
                />
              );
            })}
            <Line
              type="linear"
              dataKey="value"
              stroke="transparent"
              strokeWidth={0}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
