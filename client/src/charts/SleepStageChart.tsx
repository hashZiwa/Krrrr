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
import {
  formatTimeLabel,
  getHourlyTimeTicks,
  toSleepStageSegments,
  toSleepStageTransitionSegments,
} from "../data/chartTransforms";
import type { TimeWindow } from "../data/timeWindow";
import type { ChartSample } from "../types/sleep";
import {
  chartColors,
  getSleepStageDisplayValue,
  getSleepStageTooltipValue,
  getSleepStageScrollableWidth,
  getSleepStageSegmentClipPadding,
  sleepStageLabels,
  sleepStageLineStyles,
  sleepStageTransitionGradientUnits,
  sleepStageTransitionLineStyle,
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
  const transitions = toSleepStageTransitionSegments(data);

  if (!xScale || !yScale || !offset) {
    return null;
  }

  const clipPathId = "sleep-stage-segment-clip";
  const transitionGradientId = (transitionIndex: number) => `sleep-stage-transition-gradient-${transitionIndex}`;
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
        {transitions.map((transition, index) => {
          const fromStyle = sleepStageLineStyles[transition.fromValue];
          const toStyle = sleepStageLineStyles[transition.toValue];
          const x = xScale(transition.timeMs);
          const fromY = yScale(getSleepStageDisplayValue(transition.fromValue));
          const toY = yScale(getSleepStageDisplayValue(transition.toValue));
          const topColor = fromY <= toY ? fromStyle.color : toStyle.color;
          const bottomColor = fromY <= toY ? toStyle.color : fromStyle.color;

          return (
            <linearGradient
              key={index}
              id={transitionGradientId(index)}
              gradientUnits={sleepStageTransitionGradientUnits}
              x1={x}
              x2={x}
              y1={Math.min(fromY, toY)}
              y2={Math.max(fromY, toY)}
            >
              <stop offset="0%" stopColor={topColor} />
              <stop offset="100%" stopColor={bottomColor} />
            </linearGradient>
          );
        })}
      </defs>
      <g clipPath={`url(#${clipPathId})`}>
        {transitions.map((transition, index) => {
          const x = xScale(transition.timeMs);
          const fromY = yScale(getSleepStageDisplayValue(transition.fromValue));
          const toY = yScale(getSleepStageDisplayValue(transition.toValue));

          return (
            <line
              key={`${transition.timeMs}-${transition.fromValue}-${transition.toValue}`}
              x1={x}
              x2={x}
              y1={fromY}
              y2={toY}
              stroke={`url(#${transitionGradientId(index)})`}
              strokeWidth={sleepStageTransitionLineStyle.strokeWidth}
              strokeLinecap={sleepStageTransitionLineStyle.strokeLinecap}
            />
          );
        })}
        {segments.map((segment, index) => {
          const style = sleepStageLineStyles[segment.value];
          const [start, end] = segment.points;
          const x1 = xScale(start.timeMs);
          const x2 = xScale(end.timeMs);
          const y = yScale(getSleepStageDisplayValue(segment.value));
          const key = `${start.timeMs}-${index}`;

          return (
            <line
              key={key}
              x1={x1}
              x2={x2}
              y1={y}
              y2={y}
              stroke={style.color}
              strokeWidth={style.strokeWidth}
              strokeLinecap="round"
            />
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
      {[0, 1, 2].map((value) => (
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
