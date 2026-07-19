import { useEffect, useMemo, useState } from "react";
import { fetchLatestSleepSession } from "./api/sleepApi";
import { BreathingChart } from "./charts/BreathingChart";
import { SleepStageChart } from "./charts/SleepStageChart";
import { AlarmControlPanel } from "./components/AlarmControlPanel";
import { SummaryMetric } from "./components/SummaryMetric";
import { TrainingInfoPanel } from "./components/TrainingInfoPanel";
import { formatTimeLabel, parseMeasuredAt, toChartSamples } from "./data/chartTransforms";
import type { SleepSessionResponse } from "./types/sleep";

export default function App() {
  const [session, setSession] = useState<SleepSessionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLatestSleepSession()
      .then((nextSession) => {
        setSession(nextSession);
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

  if (!session || !chartData) {
    return <main className="app-shell app-message">사용 가능한 수면 세션이 없습니다.</main>;
  }

  const domainStart = parseMeasuredAt(session.startedAt);
  const domainEnd = parseMeasuredAt(session.endedAt);
  const sessionWindow = { start: domainStart, end: domainEnd };

  return (
    <main className="app-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">수면 관리 IoT 시스템</p>
          <h1>숙면호흡</h1>
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

      <div className="chart-grid">
        <BreathingChart data={chartData.breathing} sleepStageData={chartData.sleepStages} window={sessionWindow} />
        <SleepStageChart data={chartData.sleepStages} window={sessionWindow} />
      </div>

      <TrainingInfoPanel />

      <section className="device-panel-grid" aria-label="기기 설정 업로드">
        <AlarmControlPanel />
      </section>
    </main>
  );
}
