import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchDisplayDataFiles, fetchDisplayDataSession, type DisplayDataFile } from "./api/displayDataApi";
import {
  fetchRealtimePlatformSession,
  startRealtimePlatformMonitoring,
  stopRealtimePlatformMonitoring,
  type RealtimePlatformSessionResponse,
} from "./api/realtimePlatformApi";
import { BreathingChart } from "./charts/BreathingChart";
import { SleepStageChart } from "./charts/SleepStageChart";
import { AlarmControlPanel } from "./components/AlarmControlPanel";
import { DisplayDataSelector } from "./components/DisplayDataSelector";
import { getRealtimeTrackingConfirmation } from "./components/DisplayDataSelector";
import { ObservedDataSelector } from "./components/ObservedDataSelector";
import { PlatformDataPanel } from "./components/PlatformDataPanel";
import { TrainingInfoPanel } from "./components/TrainingInfoPanel";
import { parseMeasuredAt, toChartSamples } from "./data/chartTransforms";
import { fetchSleepStageTrainingStatus, type SleepStageTrainingStatus } from "./api/sleepStageTrainingApi";
import type { SleepSessionResponse } from "./types/sleep";
import type { RealtimeTrackingModalMode } from "./components/DisplayDataSelector";

export function shouldShowObservedDataSelector(isRealtime: boolean): boolean {
  return !isRealtime;
}

export function getInitialObservedDataSelection(): string {
  return "";
}

export function shouldShowMonitorCharts({
  hasChartData,
}: {
  hasChartData: boolean;
}): boolean {
  return hasChartData;
}

export function shouldUseEmptyMonitorGraph({
  selectedDisplayFile,
  isRealtime,
}: {
  selectedDisplayFile: string;
  isRealtime: boolean;
}): boolean {
  return !isRealtime && selectedDisplayFile.length === 0;
}

export function shouldBlockRealtimeStartForMissingModel(status: SleepStageTrainingStatus): boolean {
  return !status.trained;
}

export default function App() {
  const [displayFiles, setDisplayFiles] = useState<DisplayDataFile[]>([]);
  const [selectedDisplayFile, setSelectedDisplayFile] = useState(getInitialObservedDataSelection());
  const [session, setSession] = useState<SleepSessionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRealtime, setIsRealtime] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState("실시간 모니터링 대기 중");
  const [isRealtimeConfirmOpen, setIsRealtimeConfirmOpen] = useState(false);
  const [isRealtimeConfirmClosing, setIsRealtimeConfirmClosing] = useState(false);
  const [realtimeModalMode, setRealtimeModalMode] = useState<RealtimeTrackingModalMode>("confirm");

  const applyRealtimeSession = useCallback((result: RealtimePlatformSessionResponse) => {
    const state = result.state;

    if (state.lastError) {
      setRealtimeStatus(`실시간 오류: ${state.lastError}`);
    } else if (result.session) {
      setRealtimeStatus(
        `실시간 수집 중 · 호흡 ${result.session.breathingSamples.length}개 · 수면 ${result.session.sleepStageSamples.length}개`,
      );
    } else if (state.primed) {
      setRealtimeStatus("기준 cin 확인 완료 · 새 데이터 대기 중");
    } else {
      setRealtimeStatus("기준 cin 확인 중...");
    }

    if (result.session) {
      setSession(result.session);
      setError(null);
    }
  }, []);

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
        if (!firstFile) {
          setSession(null);
          setError("data/displaydata 폴더에 CSV 파일이 없습니다.");
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

  const handlePlatformDataSaved = useCallback(
    async (fileName: string) => {
      const nextFiles = await fetchDisplayDataFiles();

      setDisplayFiles(nextFiles);
      setSelectedDisplayFile(fileName);
      await loadDisplaySession(fileName);
    },
    [loadDisplaySession],
  );

  const handleSelectDisplayFile = useCallback(
    (fileName: string) => {
      setSelectedDisplayFile(fileName);
      if (!fileName) {
        setError(null);
        return;
      }
      void loadDisplaySession(fileName);
    },
    [loadDisplaySession],
  );

  const handleToggleRealtime = useCallback(async () => {
    if (isRealtime) {
      await stopRealtimePlatformMonitoring();
      setIsRealtime(false);
      setRealtimeStatus("실시간 모니터링 대기 중");
      if (selectedDisplayFile) {
        void loadDisplaySession(selectedDisplayFile);
      }
      return;
    }

    setError(null);
    setRealtimeStatus("실시간 모니터링 시작 중...");
    await startRealtimePlatformMonitoring();
    setIsRealtime(true);
    applyRealtimeSession(await fetchRealtimePlatformSession());
  }, [applyRealtimeSession, isRealtime, loadDisplaySession, selectedDisplayFile]);

  const realtimeConfirmation = getRealtimeTrackingConfirmation(isRealtime, realtimeModalMode);

  const closeRealtimeConfirm = useCallback(() => {
    setIsRealtimeConfirmClosing(true);
    window.setTimeout(() => {
      setIsRealtimeConfirmOpen(false);
      setIsRealtimeConfirmClosing(false);
      setRealtimeModalMode("confirm");
    }, 180);
  }, []);

  const handleRequestToggleRealtime = useCallback(async () => {
    if (isRealtime) {
      setRealtimeModalMode("confirm");
      setIsRealtimeConfirmOpen(true);
      return;
    }

    setRealtimeStatus("학습 모델 확인 중...");

    try {
      const trainingStatus = await fetchSleepStageTrainingStatus();

      if (shouldBlockRealtimeStartForMissingModel(trainingStatus)) {
        setRealtimeStatus("실시간 모니터링 대기 중");
        setRealtimeModalMode("missing-model");
        setIsRealtimeConfirmOpen(true);
        return;
      }

      setRealtimeModalMode("confirm");
      setIsRealtimeConfirmOpen(true);
    } catch (nextError: unknown) {
      setRealtimeStatus(
        nextError instanceof Error
          ? `실시간 오류: ${nextError.message}`
          : "실시간 오류: 학습 모델 상태를 확인하지 못했습니다.",
      );
    }
  }, [isRealtime]);

  useEffect(() => {
    if (!isRealtime) return;

    const timer = window.setInterval(() => {
      void fetchRealtimePlatformSession()
        .then(applyRealtimeSession)
        .catch((nextError: unknown) => {
          setRealtimeStatus(
            nextError instanceof Error ? `실시간 오류: ${nextError.message}` : "실시간 데이터를 불러오지 못했습니다.",
          );
        });
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [applyRealtimeSession, isRealtime]);

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

  if (error && !session && displayFiles.length === 0) {
    return <main className="app-shell app-message">{error}</main>;
  }

  const shouldRenderCharts = shouldShowMonitorCharts({
    hasChartData: Boolean(session && chartData),
  });
  const shouldRenderEmptyGraph = shouldUseEmptyMonitorGraph({ selectedDisplayFile, isRealtime });
  const renderedChartData =
    chartData && shouldRenderEmptyGraph
      ? {
          sleepStages: [],
          breathing: [],
        }
      : chartData;
  const sessionWindow =
    session && shouldRenderCharts
      ? {
          start: parseMeasuredAt(session.startedAt),
          end: parseMeasuredAt(session.endedAt),
        }
      : null;

  return (
    <main className="app-shell">
      <header className="dashboard-header">
        <div>
          <h1>[숙면의호흡] IoT 모니터링 · 관리 시스템</h1>
        </div>
      </header>

      <DisplayDataSelector
        error={error}
        isRealtime={isRealtime}
        realtimeStatus={realtimeStatus}
        onRequestToggleRealtime={() => void handleRequestToggleRealtime()}
      />

      {isRealtimeConfirmOpen ? (
        <div
          className={`tracking-modal${isRealtimeConfirmClosing ? " tracking-modal--closing" : ""}`}
          role="presentation"
          onClick={closeRealtimeConfirm}
        >
          <div
            className="tracking-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tracking-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="tracking-modal-title">{realtimeConfirmation.title}</h2>
            {realtimeConfirmation.body ? <p>{realtimeConfirmation.body}</p> : null}
            <div className="tracking-modal__actions">
              {realtimeConfirmation.cancelLabel ? (
                <button type="button" onClick={closeRealtimeConfirm}>
                  {realtimeConfirmation.cancelLabel}
                </button>
              ) : null}
              <button
                type="button"
                className="tracking-modal__confirm"
                onClick={() => {
                  closeRealtimeConfirm();
                  if (realtimeModalMode === "confirm") {
                    void handleToggleRealtime();
                  }
                }}
              >
                {realtimeConfirmation.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {shouldShowObservedDataSelector(isRealtime) ? (
        <ObservedDataSelector
          files={displayFiles}
          selectedFile={selectedDisplayFile}
          isLoading={isLoading}
          onSelectFile={handleSelectDisplayFile}
        />
      ) : null}

      {shouldRenderCharts && renderedChartData && sessionWindow ? (
        <div className="chart-grid">
          <BreathingChart
            data={renderedChartData.breathing}
            sleepStageData={renderedChartData.sleepStages}
            window={sessionWindow}
          />
          <SleepStageChart data={renderedChartData.sleepStages} window={sessionWindow} />
        </div>
      ) : null}

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
