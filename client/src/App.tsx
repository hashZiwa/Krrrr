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
import type { SleepSessionResponse } from "./types/sleep";

export function shouldShowObservedDataSelector(isRealtime: boolean): boolean {
  return !isRealtime;
}

export default function App() {
  const [displayFiles, setDisplayFiles] = useState<DisplayDataFile[]>([]);
  const [selectedDisplayFile, setSelectedDisplayFile] = useState("");
  const [session, setSession] = useState<SleepSessionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRealtime, setIsRealtime] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState("실시간 모니터링 대기 중");
  const [isRealtimeConfirmOpen, setIsRealtimeConfirmOpen] = useState(false);
  const [isRealtimeConfirmClosing, setIsRealtimeConfirmClosing] = useState(false);

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
      void loadDisplaySession(fileName);
    },
    [loadDisplaySession],
  );

  const handleToggleRealtime = useCallback(async () => {
    if (isRealtime) {
      await stopRealtimePlatformMonitoring();
      setIsRealtime(false);
      setRealtimeStatus("실시간 모니터링 대기 중");
      if (selectedDisplayFile) void loadDisplaySession(selectedDisplayFile);
      return;
    }

    setError(null);
    setRealtimeStatus("실시간 모니터링 시작 중...");
    await startRealtimePlatformMonitoring();
    setIsRealtime(true);
    applyRealtimeSession(await fetchRealtimePlatformSession());
  }, [applyRealtimeSession, isRealtime, loadDisplaySession, selectedDisplayFile]);

  const realtimeConfirmation = getRealtimeTrackingConfirmation(isRealtime);

  const closeRealtimeConfirm = useCallback(() => {
    setIsRealtimeConfirmClosing(true);
    window.setTimeout(() => {
      setIsRealtimeConfirmOpen(false);
      setIsRealtimeConfirmClosing(false);
    }, 180);
  }, []);

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
        error={error}
        isRealtime={isRealtime}
        onRequestToggleRealtime={() => setIsRealtimeConfirmOpen(true)}
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
              <button type="button" onClick={closeRealtimeConfirm}>
                취소
              </button>
              <button
                type="button"
                className="tracking-modal__confirm"
                onClick={() => {
                  closeRealtimeConfirm();
                  void handleToggleRealtime();
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
