import { sleepStageLabels, sleepStageLineStyles, sleepStageValues } from "../charts/chartConfig";
import { getChartAnimationKey } from "../data/chartAnimation";
import {
  getApneaGaugeDisplay,
  getSleepStageDonutSegments,
  getSleepStageRatios,
} from "../data/sleepAnalysis";
import { apneaGaugeConfig, apneaSeverityThresholds, getApneaGaugeBoundaryLabels } from "../data/sleepAnalysisConfig";
import type { ChartSample } from "../types/sleep";

type SleepAnalysisPanelProps = {
  breathingData: ChartSample[];
  sleepStageData: ChartSample[];
};

function polarToCartesian(centerX: number, centerY: number, radius: number, angleDegrees: number) {
  const angleRadians = ((angleDegrees - 180) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleRadians),
    y: centerY + radius * Math.sin(angleRadians),
  };
}

function describeArc(startAngle: number, endAngle: number, radius = 82): string {
  const start = polarToCartesian(100, 100, radius, startAngle);
  const end = polarToCartesian(100, 100, radius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getGaugeNeedlePoint(count: number): { x: number; y: number } {
  const ratio = clamp(count / apneaGaugeConfig.maxDisplayCount, 0, 1);
  const angle = ratio * 180;

  return polarToCartesian(100, 100, 48, angle);
}

function getGaugeBoundaryLabelPoint(count: number): { x: number; y: number } {
  const ratio = clamp(count / apneaGaugeConfig.maxDisplayCount, 0, 1);
  const angle = ratio * 180;

  return polarToCartesian(100, 100, 56, angle);
}

function describeDonutArc(startRatio: number, endRatio: number, radius = 15.9155): string {
  if (endRatio <= startRatio) {
    return "";
  }

  const startAngle = startRatio * 360;
  const endAngle = endRatio * 360;
  const start = polarToCartesian(21, 21, radius, startAngle + 90);
  const end = polarToCartesian(21, 21, radius, endAngle + 90);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

export function SleepAnalysisPanel({ breathingData, sleepStageData }: SleepAnalysisPanelProps) {
  const apneaDisplay = getApneaGaugeDisplay(breathingData);
  const needle = apneaDisplay.hasData ? getGaugeNeedlePoint(apneaDisplay.maxApneaCount) : null;
  const apneaGaugeBoundaryLabels = getApneaGaugeBoundaryLabels();
  const ratios = getSleepStageRatios(sleepStageData);
  const donutSegments = getSleepStageDonutSegments(ratios);
  const deepSleepRatio = ratios.find((item) => item.value === 3)?.ratio ?? 0;
  const analysisAnimationKey = `${getChartAnimationKey(breathingData)}-${getChartAnimationKey(sleepStageData)}`;

  return (
    <section key={analysisAnimationKey} className="sleep-analysis-grid" aria-label="수면 분석">
      <article className="analysis-card apnea-card">
        <div className="analysis-card__header">
          <p className="device-panel__eyebrow">apnea</p>
          <h2>무호흡증 정도</h2>
        </div>
        <div className="apnea-card__body">
          <div
            className="apnea-gauge"
            aria-label={
              apneaDisplay.hasData
                ? `최대 1시간 무호흡 ${apneaDisplay.maxApneaCount}회, ${apneaDisplay.severity.label}`
                : "무호흡증 정도 데이터 없음"
            }
          >
            <svg viewBox="0 0 200 122" role="img" aria-hidden="true">
              {apneaSeverityThresholds.map((level, index) => {
                const nextLevel = apneaSeverityThresholds[index + 1];
                const start = clamp((level.minCount / apneaGaugeConfig.maxDisplayCount) * 180, 0, 180);
                const end = clamp(((nextLevel?.minCount ?? apneaGaugeConfig.maxDisplayCount) / apneaGaugeConfig.maxDisplayCount) * 180, 0, 180);

                return (
                  <path
                    key={level.key}
                    className="apnea-gauge__arc"
                    d={describeArc(start, end)}
                    fill="none"
                    stroke={level.color}
                    strokeLinecap="round"
                    strokeWidth="18"
                    pathLength={1}
                    style={{ animationDelay: `${index * 80}ms` }}
                  />
                );
              })}
              {apneaGaugeBoundaryLabels.map((label) => {
                const point = getGaugeBoundaryLabelPoint(label.value);

                return (
                  <text key={label.value} x={point.x} y={point.y} className="apnea-gauge__boundary-label">
                    {label.label}
                  </text>
                );
              })}
              {needle ? (
                <>
                  <line x1="100" y1="100" x2={needle.x} y2={needle.y} className="apnea-gauge__needle" />
                  <circle cx="100" cy="100" r="7" className="apnea-gauge__hub" />
                </>
              ) : null}
            </svg>
            <div className="apnea-gauge__readout">
              {apneaDisplay.hasData ? (
                <strong style={{ color: apneaDisplay.severity.color }}>{apneaDisplay.severity.label}</strong>
              ) : null}
              <span>시간당 최대 무호흡 횟수 기준</span>
            </div>
          </div>
        </div>
        {apneaDisplay.hasData ? (
          <p className="apnea-card__comment" style={{ color: apneaDisplay.severity.color }}>
            {apneaDisplay.severity.comment}
          </p>
        ) : (
          <p className="apnea-card__comment apnea-card__comment--empty" aria-hidden="true">
            &nbsp;
          </p>
        )}
      </article>

      <article className="analysis-card sleep-ratio-card">
        <div className="analysis-card__header">
          <p className="device-panel__eyebrow">sleep depth</p>
          <h2>수면 깊이 비율</h2>
        </div>
        <div className="sleep-ratio-card__body">
          <div className="sleep-donut" aria-label={`깊은 잠 ${Math.round(deepSleepRatio * 100)}%`}>
            <svg viewBox="0 0 42 42" role="img" aria-hidden="true">
              <circle className="sleep-donut__track" cx="21" cy="21" r="15.9155" />
              {donutSegments.map((item) => {
                return (
                  <path
                    key={item.value}
                    className="sleep-donut__segment"
                    d={describeDonutArc(item.startRatio, item.endRatio)}
                    stroke={sleepStageLineStyles[item.value]?.color ?? sleepStageLineStyles[0].color}
                    pathLength={1}
                    style={{ animationDelay: `${item.value * 90}ms` }}
                  />
                );
              })}
            </svg>
            <div className="sleep-donut__center">
              <strong>{Math.round(deepSleepRatio * 100)}%</strong>
              <span>깊은 잠</span>
            </div>
          </div>
          <ul className="sleep-ratio-legend">
            {sleepStageValues.map((value) => {
              const item = ratios.find((ratio) => ratio.value === value);

              return (
                <li key={value}>
                  <i style={{ background: sleepStageLineStyles[value].color }} aria-hidden="true" />
                  <span>{sleepStageLabels[value]}</span>
                  <strong>{Math.round((item?.ratio ?? 0) * 100)}%</strong>
                </li>
              );
            })}
          </ul>
        </div>
      </article>
    </section>
  );
}
