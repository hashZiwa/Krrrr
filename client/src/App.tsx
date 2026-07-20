import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchDisplayDataFiles, fetchDisplayDataSession, type DisplayDataFile } from "./api/displayDataApi";
import { BreathingChart } from "./charts/BreathingChart";
import { SleepStageChart } from "./charts/SleepStageChart";
import { AlarmControlPanel } from "./components/AlarmControlPanel";
import { DisplayDataSelector } from "./components/DisplayDataSelector";
import { PlatformDataPanel } from "./components/PlatformDataPanel";
import { SummaryMetric } from "./components/SummaryMetric";
import { TrainingInfoPanel } from "./components/TrainingInfoPanel";
import { parseMeasuredAt, toChartSamples } from "./data/chartTransforms";
import type { SleepSessionResponse } from "./types/sleep";

export default function App() {
  const [displayFiles, setDisplayFiles] = useState<DisplayDataFile[]>([]);
  const [selectedDisplayFile, setSelectedDisplayFile] = useState("");
  const [session, setSession] = useState<SleepSessionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDisplaySession = useCallback(async (fileName: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const nextSession = await fetchDisplayDataSession(fileName);
      setSession(nextSession);
    } catch (nextError: unknown) {
      setError(nextError instanceof Error ? nextError.message : "표시 데이터를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialDisplayData() {
      setIsLoading(true);
      setError(null);

      try {
        const nextFiles = await fetchDisplayDataFiles();

        if (!isMounted) return;

        setDisplayFiles(nextFiles);

        const firstFile = nextFiles[0]?.name ?? "";
        setSelectedDisplayFile(firstFile);

        if (!firstFile) {
          setSession(null);
          setError("displaydata 폴더에 CSV 파일이 없습니다.");
          return;
        }

        const nextSession = await fetchDisplayDataSession(firstFile);

        if (!isMounted) return;

        setSession(nextSession);
      } catch (nextError: unknown) {
        if (!isMounted) return;
        setError(nextError instanceof Error ? nextError.message : "표시 데이터를 불러오지 못했습니다.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadInitialDisplayData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectDisplayFile = useCallback(
    (fileName: string) => {
      setSelectedDisplayFile(fileName);
      void loadDisplaySession(fileName);
    },
    [loadDisplaySession],
  );

  const handlePlatformDataSaved = useCallback(
    async (fileName: string) => {
      const nextFiles = await fetchDisplayDataFiles();

      setDisplayFiles(nextFiles);
      setSelectedDisplayFile(fileName);
      await loadDisplaySession(fileName);
    },
    [loadDisplaySession],
  );

  const chartData = useMemo(() => {
    if (!session) return null;

    return {
      sleepStages: toChartSamples(session.sleepStageSamples),
      breathing: toChartSamples(session.breathingSamples),
    };
  }, [session]);

  if (isLoading && !session) {
    return <main className="app-shell">Loading sleep data</main>;
  }

  if (error && !session) {
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
          <h1>슬립모니터</h1>
        </div>
      </header>

      <DisplayDataSelector
        files={displayFiles}
        selectedFile={selectedDisplayFile}
        isLoading={isLoading}
        error={error}
        onSelectFile={handleSelectDisplayFile}
      />

      <section className="summary-grid" aria-label="수면 요약">
        <SummaryMetric
          label="평균 호흡"
          value={session.summary.averageBreathingRate === null ? "-" : `${session.summary.averageBreathingRate}/분`}
        />
        <SummaryMetric label="뒤척임" value={`${session.summary.movementCount}회`} tone="alert" />
        <SummaryMetric label="무호흡 인식 실패" value={`${session.summary.apneaRecognitionFailureCount}회`} tone="alert" />
        <SummaryMetric label="깊은 수면 비율" value={`${Math.round(session.summary.deepSleepRatio * 100)}%`} />
      </section>

      <div className="chart-grid">
        <BreathingChart data={chartData.breathing} sleepStageData={chartData.sleepStages} window={sessionWindow} />
        <SleepStageChart data={chartData.sleepStages} window={sessionWindow} />
      </div>

      <section className="device-panel-grid" aria-label="기기 설정 업로드">
        <AlarmControlPanel />
      </section>

      <PlatformDataPanel onSaved={(fileName) => void handlePlatformDataSaved(fileName)} />

      <TrainingInfoPanel />

      <footer className="app-credit">
        <a href="https://www.flaticon.com/kr/free-icons/csv" title="csv 아이콘">
          Csv 아이콘 제작자: mpanicon - Flaticon
        </a>
      </footer>
    </main>
  );
}
