import { useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Customized,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatTimeLabel,
  getHourlyTimeTicks,
  toBreathingDisplaySamples,
  toBreathingEventOverlays,
  toSleepStageOverlaySegments,
  toSleepStageOverlayTransitionSegments,
} from "../data/chartTransforms";
import type { TimeWindow } from "../data/timeWindow";
import type { ChartSample } from "../types/sleep";
import {
  breathingEventOverlayLayers,
  breathingCurveStyle,
  breathingFillGradientStops,
  breathingSleepStageOverlayStyle,
  breathingSleepStageOverlayTransitionStyle,
  breathingStrokeGradientStops,
  breathingYAxisTicks,
  type BreathingEventOverlayLayerKey,
  chartColors,
  formatBreathingValue,
  getBreathingEventDotOpacity,
  getBreathingEventOverlayColor,
  getBreathingEventOverlayOpacity,
  getBreathingEventOverlayLegendItems,
  getBreathingEventOverlayRenderItems,
  getBreathingSleepStageOverlayStrokeWidth,
  getBreathingSleepStageOverlayTransitionStrokeWidth,
  getBreathingScrollableWidth,
  getBreathingYAxisConfig,
  getSleepStageTransitionLineCoordinates,
  sleepStageLineStyles,
  sleepStageTransitionGradientStops,
  sleepStageTransitionGradientUnits,
} from "./chartConfig";

type BreathingChartProps = {
  data: ChartSample[];
  sleepStageData: ChartSample[];
  window: TimeWindow;
};

type AxisMap = Record<string, { scale?: (value: number) => number }>;

type ChartOffset = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type BreathingEventOverlayLayerProps = {
  data: ChartSample[];
  xAxisMap?: AxisMap;
  yAxisMap?: AxisMap;
  offset?: ChartOffset;
};

type SleepStageOverlayLayerProps = {
  sleepStageData: ChartSample[];
  breathingDomain: [number, number];
  xAxisMap?: AxisMap;
  yAxisMap?: AxisMap;
  offset?: ChartOffset;
};

function getPrimaryScale(axisMap?: AxisMap) {
  return Object.values(axisMap ?? {})[0]?.scale;
}

function BreathingEventOverlayLayer({ data, xAxisMap, offset }: BreathingEventOverlayLayerProps) {
  const xScale = getPrimaryScale(xAxisMap);
  const overlays = toBreathingEventOverlays(data);
  const layerEntries = Object.entries(breathingEventOverlayLayers) as Array<
    [BreathingEventOverlayLayerKey, (typeof breathingEventOverlayLayers)[BreathingEventOverlayLayerKey]]
  >;

  if (!xScale || !offset) {
    return null;
  }

  const clipPathId = "breathing-event-overlay-clip";
  const eventName = (value: number) => (value === -1 ? "movement" : "apnea");
  const gradientId = (value: number, layer: string) => `breathing-event-overlay-${layer}-${eventName(value)}`;

  return (
    <g>
      <defs>
        <clipPath id={clipPathId}>
          <rect x={offset.left} y={offset.top} width={offset.width} height={offset.height} />
        </clipPath>
        {[-1, 0].flatMap((value) =>
          layerEntries.map(([layer, config]) => {
            const color = getBreathingEventOverlayColor(value, layer);

            return (
              <linearGradient key={`${layer}-${value}`} id={gradientId(value, layer)} x1="0" y1="0" x2="1" y2="0">
                {config.gradientStops.map((stop) => (
                  <stop key={stop.offset} offset={stop.offset} stopColor={color} stopOpacity={stop.opacity} />
                ))}
              </linearGradient>
            );
          }),
        )}
      </defs>
      <g clipPath={`url(#${clipPathId})`}>
        {getBreathingEventOverlayRenderItems(overlays).map(({ layer, overlay }) => {
          const x1 = xScale(overlay.startMs);
          const x2 = xScale(overlay.endMs);
          const rawX = Math.min(x1, x2);
          const rawWidth = Math.abs(x2 - x1);
          const config = breathingEventOverlayLayers[layer];
          const xInset = rawWidth * config.xInsetRatio;
          const yInset = config.yInset;

          return (
            <rect
              key={`${overlay.timeMs}-${overlay.value}-${layer}`}
              data-overlay-layer={layer}
              data-event-value={overlay.value}
              x={rawX - xInset}
              y={offset.top + yInset}
              width={Math.max(0, rawWidth + xInset * 2)}
              height={Math.max(0, offset.height - yInset * 2)}
              fill={`url(#${gradientId(overlay.value, layer)})`}
              opacity={getBreathingEventOverlayOpacity(overlay.value, layer)}
            />
          );
        })}
      </g>
    </g>
  );
}

function SleepStageOverlayLayer({
  sleepStageData,
  breathingDomain,
  xAxisMap,
  yAxisMap,
  offset,
}: SleepStageOverlayLayerProps) {
  const xScale = getPrimaryScale(xAxisMap);
  const yScale = getPrimaryScale(yAxisMap);
  const segments = toSleepStageOverlaySegments(sleepStageData, breathingDomain);
  const transitions = toSleepStageOverlayTransitionSegments(sleepStageData, breathingDomain);

  if (!xScale || !yScale || !offset) {
    return null;
  }

  const clipPathId = "sleep-stage-overlay-clip";
  const transitionGradientId = (transitionIndex: number) => `breathing-sleep-stage-transition-gradient-${transitionIndex}`;

  return (
    <g data-testid="sleep-stage-breathing-overlay">
      <defs>
        <clipPath id={clipPathId}>
          <rect x={offset.left} y={offset.top} width={offset.width} height={offset.height} />
        </clipPath>
        {transitions.map((transition, index) => {
          const fromStyle = sleepStageLineStyles[transition.fromValue] ?? sleepStageLineStyles[0];
          const toStyle = sleepStageLineStyles[transition.toValue] ?? sleepStageLineStyles[0];
          const x = xScale(transition.timeMs);
          const fromY = yScale(transition.fromOverlayValue);
          const toY = yScale(transition.toOverlayValue);
          const lineCoordinates = getSleepStageTransitionLineCoordinates(
            fromY,
            toY,
            getBreathingSleepStageOverlayStrokeWidth(transition.fromValue),
            getBreathingSleepStageOverlayStrokeWidth(transition.toValue),
          );
          const topColor = fromY <= toY ? fromStyle.color : toStyle.color;
          const bottomColor = fromY <= toY ? toStyle.color : fromStyle.color;

          return (
            <linearGradient
              key={index}
              id={transitionGradientId(index)}
              gradientUnits={sleepStageTransitionGradientUnits}
              x1={x}
              x2={x}
              y1={lineCoordinates.gradientY1}
              y2={lineCoordinates.gradientY2}
            >
              {sleepStageTransitionGradientStops.map((stop) => (
                <stop
                  key={`${stop.offset}-${stop.color}`}
                  offset={stop.offset}
                  stopColor={stop.color === "from" ? topColor : bottomColor}
                />
              ))}
            </linearGradient>
          );
        })}
      </defs>
      <g clipPath={`url(#${clipPathId})`} opacity={breathingSleepStageOverlayStyle.opacity}>
        {transitions.map((transition, index) => {
          const x = xScale(transition.timeMs);
          const fromY = yScale(transition.fromOverlayValue);
          const toY = yScale(transition.toOverlayValue);
          const lineCoordinates = getSleepStageTransitionLineCoordinates(
            fromY,
            toY,
            getBreathingSleepStageOverlayStrokeWidth(transition.fromValue),
            getBreathingSleepStageOverlayStrokeWidth(transition.toValue),
          );

          return (
            <line
              key={`${transition.timeMs}-${transition.fromValue}-${transition.toValue}`}
              data-sleep-stage-overlay-transition-line
              x1={x}
              x2={x}
              y1={lineCoordinates.y1}
              y2={lineCoordinates.y2}
              stroke={`url(#${transitionGradientId(index)})`}
              strokeWidth={getBreathingSleepStageOverlayTransitionStrokeWidth()}
              strokeLinecap={breathingSleepStageOverlayTransitionStyle.strokeLinecap}
            />
          );
        })}
        {segments.map((segment) => {
          const [start, end] = segment.points;
          const style = sleepStageLineStyles[segment.value] ?? sleepStageLineStyles[0];
          const y = yScale(start.overlayValue);

          return (
            <line
              key={`${start.timeMs}-${end.timeMs}-${segment.value}`}
              data-sleep-stage-overlay-line={segment.value}
              x1={xScale(start.timeMs)}
              x2={xScale(end.timeMs)}
              y1={y}
              y2={y}
              stroke={style.color}
              strokeDasharray={(breathingSleepStageOverlayStyle as { strokeDasharray?: string }).strokeDasharray}
              strokeLinecap="butt"
              strokeWidth={getBreathingSleepStageOverlayStrokeWidth(segment.value)}
            />
          );
        })}
      </g>
    </g>
  );
}

function BreathingDot(props: { cx?: number; cy?: number; payload?: ChartSample }) {
  const opacity = getBreathingEventDotOpacity(props.payload?.value ?? 1);

  return (
    <circle
      cx={props.cx}
      cy={props.cy}
      r={breathingCurveStyle.dotRadius}
      fill="#fff"
      stroke={breathingStrokeGradientStops[0].color}
      opacity={opacity}
    />
  );
}

function FixedBreathingYAxis({ ticks }: { ticks: number[] }) {
  return (
    <div className="fixed-y-axis fixed-y-axis--breathing" aria-hidden="true">
      {[...ticks].reverse().map((value) => (
        <span key={value}>{value}</span>
      ))}
    </div>
  );
}

function BreathingEventLegend() {
  return (
    <div className="breathing-event-legend" aria-label="호흡 이벤트 범례">
      {getBreathingEventOverlayLegendItems().map((item) => (
        <div className="breathing-event-legend__item" key={item.label}>
          <span className="breathing-event-legend__swatch" style={{ backgroundColor: item.color }} />
          <span>: {item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function BreathingChart({ data, sleepStageData, window }: BreathingChartProps) {
  const [showSleepStageOverlay, setShowSleepStageOverlay] = useState(false);
  const hourlyTicks = getHourlyTimeTicks(window.start, window.end);
  const scrollableWidth = getBreathingScrollableWidth(window.start, window.end);
  const displayData = toBreathingDisplaySamples(data);
  const yAxisConfig = getBreathingYAxisConfig(data.map((sample) => sample.value));

  return (
    <section className="chart-panel">
      <p className="device-panel__eyebrow">Monitor</p>
      <div className="chart-panel__header">
        <h2>호흡 모니터</h2>
        <label className="chart-toggle">
          <input
            type="checkbox"
            checked={showSleepStageOverlay}
            onChange={(event) => setShowSleepStageOverlay(event.target.checked)}
          />
          <span className="chart-toggle__track" aria-hidden="true">
            <span className="chart-toggle__thumb" />
          </span>
          <span>수면 단계 겹쳐보기</span>
        </label>
      </div>
      <div className="scroll-chart-layout">
        <FixedBreathingYAxis ticks={yAxisConfig.ticks} />
        <div className="chart-scroll-frame">
          <div className="chart-scroll-content" style={{ width: `${scrollableWidth}px` }}>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={displayData} margin={{ top: 12, right: 20, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="breathing-area-gradient" x1="0" y1="0" x2="1" y2="0">
                    {breathingFillGradientStops.map((stop) => (
                      <stop
                        key={stop.offset}
                        offset={stop.offset}
                        stopColor={stop.color}
                        stopOpacity={stop.opacity}
                      />
                    ))}
                  </linearGradient>
                  <linearGradient id="breathing-stroke-gradient" x1="0" y1="0" x2="1" y2="0">
                    {breathingStrokeGradientStops.map((stop) => (
                      <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
                    ))}
                  </linearGradient>
                </defs>
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
                <YAxis domain={yAxisConfig.domain} ticks={yAxisConfig.ticks} width={0} hide />
                <Tooltip
                  labelFormatter={(value) => formatTimeLabel(Number(value))}
                  formatter={(_value, _name, item) => [formatBreathingValue(Number(item.payload.value)), "호흡"]}
                />
                <Area
                  type={breathingCurveStyle.type}
                  dataKey="displayValue"
                  fill="url(#breathing-area-gradient)"
                  stroke="none"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
                <Line
                  type={breathingCurveStyle.type}
                  dataKey="displayValue"
                  stroke="url(#breathing-stroke-gradient)"
                  strokeWidth={breathingCurveStyle.strokeWidth}
                  dot={breathingCurveStyle.showDots ? <BreathingDot /> : false}
                  activeDot={false}
                  isAnimationActive={false}
                />
                <Customized component={<BreathingEventOverlayLayer data={data} />} />
                {showSleepStageOverlay ? (
                  <Customized
                    component={
                      <SleepStageOverlayLayer sleepStageData={sleepStageData} breathingDomain={yAxisConfig.domain} />
                    }
                  />
                ) : null}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <BreathingEventLegend />
    </section>
  );
}
