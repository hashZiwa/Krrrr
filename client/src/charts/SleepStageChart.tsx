import {
  CartesianGrid,
  Customized,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatTimeLabel, getHourlyTimeTicks, toSleepStageSegments } from "../data/chartTransforms";
import type { TimeWindow } from "../data/timeWindow";
import type { ChartSample } from "../types/sleep";
import {
  chartColors,
  getSleepStageTooltipValue,
  getSleepStageScrollableWidth,
  getSleepStageSegmentClipPadding,
  shouldRenderSleepStageGlow,
  sleepStageLabels,
  sleepStageLineStyles,
  sleepStageSegmentGlow,
  type SleepStageTooltipPayloadItem,
} from "./chartConfig";

type SleepStageChartProps = {
  data: ChartSample[];
  window: TimeWindow;
};

type SleepStageTooltipProps = {
  active?: boolean;
  label?: number;
  payload?: SleepStageTooltipPayloadItem[];
};

type AxisMap = Record<string, { scale?: (value: number) => number }>;

type ChartOffset = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type SleepStageSegmentsLayerProps = {
  data: ChartSample[];
  xAxisMap?: AxisMap;
  yAxisMap?: AxisMap;
  offset?: ChartOffset;
};

function getPrimaryScale(axisMap?: AxisMap) {
  return Object.values(axisMap ?? {})[0]?.scale;
}

function SleepStageSegmentsLayer({
  data,
  xAxisMap,
  yAxisMap,
  offset,
}: SleepStageSegmentsLayerProps) {
  const xScale = getPrimaryScale(xAxisMap);
  const yScale = getPrimaryScale(yAxisMap);
  const segments = toSleepStageSegments(data);

  if (!xScale || !yScale || !offset) {
    return null;
  }

  const clipPathId = "sleep-stage-segment-clip";
  const glowGradientId = (value: number) => `sleep-stage-glow-${value}`;
  const clipPadding = getSleepStageSegmentClipPadding();

  return (
    <g>
      <defs>
        <clipPath id={clipPathId}>
          <rect
            x={offset.left - clipPadding}
            y={offset.top - clipPadding}
            width={offset.width + clipPadding * 2}
            height={offset.height + clipPadding * 2}
          />
        </clipPath>
        {sleepStageSegmentGlow.stages.map((value) => {
          const style = sleepStageLineStyles[value];

          return (
            <linearGradient key={value} id={glowGradientId(value)} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={style.color} stopOpacity={sleepStageSegmentGlow.opacity} />
              <stop offset="100%" stopColor={style.color} stopOpacity={0} />
            </linearGradient>
          );
        })}
      </defs>
      <g clipPath={`url(#${clipPathId})`}>
        {segments.map((segment, index) => {
          const style = sleepStageLineStyles[segment.value];
          const [start, end] = segment.points;
          const x1 = xScale(start.timeMs);
          const x2 = xScale(end.timeMs);
          const y = yScale(segment.value);
          const key = `${start.timeMs}-${index}`;
          const strokeOffset = style.strokeWidth / 2;

          return (
            <g key={key}>
              {shouldRenderSleepStageGlow(segment.value) ? (
                <rect
                  x={Math.min(x1, x2)}
                  y={y + strokeOffset}
                  width={Math.abs(x2 - x1)}
                  height={sleepStageSegmentGlow.height}
                  rx={strokeOffset}
                  fill={`url(#${glowGradientId(segment.value)})`}
                />
              ) : null}
              <line
                x1={x1}
                x2={x2}
                y1={y}
                y2={y}
                stroke={style.color}
                strokeWidth={style.strokeWidth}
                strokeLinecap="round"
              />
            </g>
          );
        })}
      </g>
    </g>
  );
}

function SleepStageTooltip({ active, label, payload }: SleepStageTooltipProps) {
  const value = getSleepStageTooltipValue(payload);

  if (!active || value === null) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      <strong>{formatTimeLabel(Number(label))}</strong>
      <span>{sleepStageLabels[value]}</span>
    </div>
  );
}

function FixedSleepStageYAxis() {
  return (
    <div className="fixed-y-axis fixed-y-axis--sleep" aria-hidden="true">
      {[2, 1, 0].map((value) => (
        <span key={value}>{sleepStageLabels[value]}</span>
      ))}
    </div>
  );
}

export function SleepStageChart({ data, window }: SleepStageChartProps) {
  const hourlyTicks = getHourlyTimeTicks(window.start, window.end);
  const scrollableWidth = getSleepStageScrollableWidth(window.start, window.end);

  return (
    <section className="chart-panel">
      <div className="chart-panel__header">
        <div>
          <p className="device-panel__eyebrow">Monitor</p>
          <h2>수면 단계 독립 모니터</h2>
        </div>
      </div>
      <div className="scroll-chart-layout">
        <FixedSleepStageYAxis />
        <div className="chart-scroll-frame">
          <div className="chart-scroll-content" style={{ width: `${scrollableWidth}px` }}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data} margin={{ top: 12, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={chartColors.grid} strokeDasharray="4 4" />
                <XAxis
                  dataKey="timeMs"
                  type="number"
                  domain={[window.start, window.end]}
                  ticks={hourlyTicks}
                  tick={{ fontSize: 12, fill: chartColors.axis }}
                  tickFormatter={formatTimeLabel}
                  stroke="transparent"
                  tickMargin={8}
                />
                <YAxis domain={[0, 2]} ticks={[0, 1, 2]} width={0} hide />
                <Tooltip content={<SleepStageTooltip />} />
                <Customized component={<SleepStageSegmentsLayer data={data} />} />
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
        </div>
      </div>
    </section>
  );
}
