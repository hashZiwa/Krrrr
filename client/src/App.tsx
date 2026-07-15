import { useEffect, useMemo, useState } from "react";
import { fetchLatestSleepSession } from "./api/sleepApi";
import { BreathingChart } from "./charts/BreathingChart";
import { SleepStageChart } from "./charts/SleepStageChart";
import { SummaryMetric } from "./components/SummaryMetric";
import { TimeWindowController } from "./components/TimeWindowController";
import { formatTimeLabel, parseMeasuredAt, toChartSamples } from "./data/chartTransforms";
import { createInitialTimeWindow, filterByTimeWindow, panTimeWindow, type TimeWindow } from "./data/timeWindow";
import type { SleepSessionResponse } from "./types/sleep";

const INITIAL_VISIBLE_MINUTES = 120;

export default function App() {
  const [session, setSession] = useState<SleepSessionResponse | null>(null);
  const [timeWindow, setTimeWindow] = useState<TimeWindow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLatestSleepSession()
      .then((nextSession) => {
        const domainStart = parseMeasuredAt(nextSession.startedAt);
        const domainEnd = parseMeasuredAt(nextSession.endedAt);
        setSession(nextSession);
        setTimeWindow(createInitialTimeWindow(domainStart, domainEnd, INITIAL_VISIBLE_MINUTES));
      })
      .catch((nextError: unknown) => {
        setError(nextError instanceof Error ? nextError.message : "수면 데이터를 불러올 수 없습니다.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const chartData = useMemo(() => {
    if (!session) return null;

    return {
      sleepStages: toChartSamples(session.sleepStageSamples),
      breathing: toChartSamples(session.breathingSamples),
    };
  }, [session]);

  if (isLoading) {
    return <main className="app-shell">Loading sleep data</main>;
  }

  if (error) {
    return <main className="app-shell app-message">{error}</main>;
  }

  if (!session || !chartData || !timeWindow) {
    return <main className="app-shell app-message">사용 가능한 수면 세션이 없습니다.</main>;
  }

  const domainStart = parseMeasuredAt(session.startedAt);
  const domainEnd = parseMeasuredAt(session.endedAt);
  const visibleSleepStages = filterByTimeWindow(chartData.sleepStages, timeWindow);
  const visibleBreathing = filterByTimeWindow(chartData.breathing, timeWindow);

  const handlePan = (deltaMs: number) => {
    setTimeWindow((current) => {
      if (!current) return current;
      return panTimeWindow(current, deltaMs, domainStart, domainEnd);
    });
  };

  return (
    <main className="app-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Mock monitoring session</p>
          <h1>Sleeper</h1>
        </div>
        <div className="session-window">
          {formatTimeLabel(domainStart)} - {formatTimeLabel(domainEnd)}
        </div>
      </header>

      <section className="summary-grid" aria-label="수면 요약">
        <SummaryMetric
          label="평균 호흡"
          value={session.summary.averageBreathingRate === null ? "-" : `${session.summary.averageBreathingRate}회/분`}
        />
        <SummaryMetric label="뒤척임" value={`${session.summary.movementCount}회`} tone="alert" />
        <SummaryMetric label="무호흡 인식 실패" value={`${session.summary.apneaRecognitionFailureCount}회`} tone="alert" />
        <SummaryMetric label="깊은 수면 비율" value={`${Math.round(session.summary.deepSleepRatio * 100)}%`} />
      </section>

      <TimeWindowController
        window={timeWindow}
        domainStart={domainStart}
        domainEnd={domainEnd}
        onPan={handlePan}
      />

      <div className="chart-grid">
        <SleepStageChart data={visibleSleepStages} window={timeWindow} />
        <BreathingChart data={visibleBreathing} window={timeWindow} />
      </div>
    </main>
  );
}
