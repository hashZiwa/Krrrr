import { sleepStageLabels, sleepStageLineStyles, sleepStageValues } from "../charts/chartConfig";
import { getApneaSeverity, getSleepStageRatios, getSlidingWindowApneaCount } from "../data/sleepAnalysis";
import { apneaGaugeConfig, apneaSeverityThresholds, getApneaSeverityRangeLabel } from "../data/sleepAnalysisConfig";
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

  return polarToCartesian(100, 100, 66, angle);
}

function getDonutStrokeDash(ratio: number): string {
  const circumference = 100;

  return `${ratio * circumference} ${circumference}`;
}

export function SleepAnalysisPanel({ breathingData, sleepStageData }: SleepAnalysisPanelProps) {
  const maxApneaCount = getSlidingWindowApneaCount(breathingData);
  const severity = getApneaSeverity(maxApneaCount);
  const needle = getGaugeNeedlePoint(maxApneaCount);
  const ratios = getSleepStageRatios(sleepStageData);
  const deepSleepRatio = ratios.find((item) => item.value === 3)?.ratio ?? 0;
  let donutOffset = 25;

  return (
    <section className="sleep-analysis-grid" aria-label="수면 분석">
      <article className="analysis-card apnea-card">
        <div className="analysis-card__header">
          <p className="device-panel__eyebrow">apnea</p>
          <h2>무호흡증 정도</h2>
        </div>
        <div className="apnea-card__body">
          <div className="apnea-gauge" aria-label={`최대 1시간 무호흡 ${maxApneaCount}회, ${severity.label}`}>
            <svg viewBox="0 0 200 122" role="img" aria-hidden="true">
              {apneaSeverityThresholds.map((level, index) => {
                const nextLevel = apneaSeverityThresholds[index + 1];
                const start = clamp((level.minCount / apneaGaugeConfig.maxDisplayCount) * 180, 0, 180);
                const end = clamp(((nextLevel?.minCount ?? apneaGaugeConfig.maxDisplayCount) / apneaGaugeConfig.maxDisplayCount) * 180, 0, 180);

                return (
                  <path
                    key={level.key}
                    d={describeArc(start, end)}
                    fill="none"
                    stroke={level.color}
                    strokeLinecap="round"
                    strokeWidth="18"
                  />
                );
              })}
              <line x1="100" y1="100" x2={needle.x} y2={needle.y} className="apnea-gauge__needle" />
              <circle cx="100" cy="100" r="7" className="apnea-gauge__hub" />
            </svg>
            <div className="apnea-gauge__readout">
              <strong style={{ color: severity.color }}>{severity.label}</strong>
              <span>최대 1시간 {maxApneaCount}회</span>
            </div>
          </div>
          <ul className="apnea-severity-legend" aria-label="무호흡증 판단 기준">
            {apneaSeverityThresholds.map((level, index) => (
              <li key={level.key}>
                <i style={{ background: level.color }} aria-hidden="true" />
                <span>{level.label}</span>
                <strong>{getApneaSeverityRangeLabel(level, index)}</strong>
              </li>
            ))}
          </ul>
        </div>
        <p className="apnea-card__comment" style={{ color: severity.color }}>
          {severity.comment}
        </p>
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
              {ratios.map((item) => {
                const dash = getDonutStrokeDash(item.ratio);
                const offset = donutOffset;

                donutOffset -= item.ratio * 100;

                return (
                  <circle
                    key={item.value}
                    className="sleep-donut__segment"
                    cx="21"
                    cy="21"
                    r="15.9155"
                    stroke={sleepStageLineStyles[item.value]?.color ?? sleepStageLineStyles[0].color}
                    strokeDasharray={dash}
                    strokeDashoffset={offset}
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
