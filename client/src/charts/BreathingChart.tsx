import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatTimeLabel } from "../data/chartTransforms";
import type { TimeWindow } from "../data/timeWindow";
import type { ChartSample } from "../types/sleep";
import { chartColors, formatBreathingValue } from "./chartConfig";

type BreathingChartProps = {
  data: ChartSample[];
  window: TimeWindow;
};

export function BreathingChart({ data, window }: BreathingChartProps) {
  const eventPoints = data.filter((sample) => sample.value <= 0);

  return (
    <section className="chart-panel">
      <div className="chart-panel__header">
        <h2>호흡 모니터</h2>
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
            <YAxis stroke={chartColors.axis} width={48} />
            <Tooltip
              labelFormatter={(value) => formatTimeLabel(Number(value))}
              formatter={(value) => [formatBreathingValue(Number(value)), "호흡"]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={chartColors.breathingLine}
              strokeWidth={3}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
            {eventPoints.map((sample) => (
              <ReferenceDot
                key={`${sample.measuredAt}-${sample.value}`}
                x={sample.timeMs}
                y={sample.value}
                r={6}
                fill={sample.value === -1 ? chartColors.movement : chartColors.apnea}
                stroke="white"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
