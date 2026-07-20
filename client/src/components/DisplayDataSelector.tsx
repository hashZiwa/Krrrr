type DisplayDataSelectorProps = {
  error: string | null;
  isRealtime: boolean;
  realtimeStatus: string;
  onRequestToggleRealtime: () => void;
};

export function getRealtimeTrackingSwitchText(isRealtime: boolean): { state: "ON" | "OFF"; action: string } {
  return isRealtime
    ? { state: "ON", action: "실시간 트래킹 끄기" }
    : { state: "OFF", action: "실시간 트래킹 켜기" };
}

export function getRealtimeTrackingConfirmation(isRealtime: boolean): {
  title: string;
  body: string;
  confirmLabel: string;
} {
  return isRealtime
    ? {
        title: "실시간 트래킹을 끄시겠습니까?",
        body: "수면 데이터는 저장되나, 지금까지의 실시간 그래프 작성은 중단됩니다.",
        confirmLabel: "끄기",
      }
    : {
        title: "실시간 트래킹을 켜시겠습니까?",
        body: "",
        confirmLabel: "켜기",
      };
}

export function DisplayDataSelector({
  error,
  isRealtime,
  realtimeStatus,
  onRequestToggleRealtime,
}: DisplayDataSelectorProps) {
  const switchText = getRealtimeTrackingSwitchText(isRealtime);

  return (
    <section className="display-data-panel" aria-label="실시간 데이터 트래킹">
      <div>
        <p className="eyebrow">realtime tracking</p>
        <h2>실시간 데이터 트래킹</h2>
      </div>
      <div className="display-data-panel__control">
        <button
          type="button"
          className={`tracking-switch${isRealtime ? " tracking-switch--on" : ""}`}
          aria-pressed={isRealtime}
          aria-label={switchText.action}
          onClick={onRequestToggleRealtime}
        >
          <span>{switchText.state}</span>
        </button>
        <span className={`display-data-panel__status${error ? " display-data-panel__status--error" : ""}`}>
          {error ? error : realtimeStatus}
        </span>
      </div>
    </section>
  );
}
