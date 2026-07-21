type DisplayDataSelectorProps = {
  error: string | null;
  isRealtime: boolean;
  realtimeStatus: string;
  onRequestToggleRealtime: () => void;
};

type RealtimeStatusTone = "idle" | "uploading" | "success" | "error";
export type RealtimeTrackingModalMode = "confirm" | "missing-model";

export function getRealtimeTrackingSwitchText(isRealtime: boolean): { state: "ON" | "OFF"; action: string } {
  return isRealtime
    ? { state: "ON", action: "실시간 트래킹 끄기" }
    : { state: "OFF", action: "실시간 트래킹 켜기" };
}

export function getRealtimeTrackingConfirmation(
  isRealtime: boolean,
  mode: RealtimeTrackingModalMode = "confirm",
): {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string | null;
} {
  if (mode === "missing-model") {
    return {
      title: "학습 모델이 필요합니다",
      body: "실시간 트래킹을 시작하려면 먼저 수면 단계 학습 패널에서 모델을 학습해 주세요.",
      confirmLabel: "확인",
      cancelLabel: null,
    };
  }

  return isRealtime
    ? {
        title: "실시간 트래킹을 끄시겠습니까?",
        body: "수면 데이터는 저장되나, 지금까지의 실시간 그래프 작성은 중단됩니다.",
        confirmLabel: "끄기",
        cancelLabel: "취소",
      }
    : {
        title: "실시간 트래킹을 켜시겠습니까?",
        body: "",
        confirmLabel: "확인",
        cancelLabel: "취소",
      };
}

export function getRealtimeStatusTone(status: string): RealtimeStatusTone {
  if (!status) return "idle";
  if (status.includes("오류")) return "error";
  if (status.includes("시작") || status.includes("확인 중")) return "uploading";
  return "success";
}

export function DisplayDataSelector({
  error,
  isRealtime,
  realtimeStatus,
  onRequestToggleRealtime,
}: DisplayDataSelectorProps) {
  const switchText = getRealtimeTrackingSwitchText(isRealtime);
  const statusText = error ?? (isRealtime ? realtimeStatus : "");
  const statusTone = error ? "error" : getRealtimeStatusTone(statusText);

  return (
    <section className="display-data-panel" aria-label="실시간 데이터 트래킹">
      <div>
        <p className="device-panel__eyebrow">Live Tracking</p>
        <h2>실시간 데이터 트래킹</h2>
      </div>
      <div className="display-data-panel__control">
        <span className={`display-data-panel__status display-data-panel__status--${statusTone}`} aria-live="polite">
          {statusText}
        </span>
        <button
          type="button"
          className={`tracking-switch${isRealtime ? " tracking-switch--on" : ""}`}
          aria-pressed={isRealtime}
          aria-label={switchText.action}
          onClick={onRequestToggleRealtime}
        >
          <span>{switchText.state}</span>
        </button>
      </div>
    </section>
  );
}
