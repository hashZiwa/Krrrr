import { useEffect, useState } from "react";
import { fetchAlarmSettings, updateAlarmSetting } from "../api/alarmApi";

export type UploadState = "idle" | "uploading" | "success" | "error";
type AlarmFieldKey = "enabled" | "time";
type AlarmUploadStates = Record<AlarmFieldKey, UploadState>;

const initialUploadStates: AlarmUploadStates = {
  enabled: "idle",
  time: "idle",
};

export function getUploadStatusText(status: UploadState): string {
  if (status === "uploading") return "업로드 중...";
  if (status === "success") return "업로드 완료!";
  if (status === "error") return "업로드 실패..!";
  return "";
}

export function getAlarmStatusReadout(isEnabled: boolean, isAlarmActive: boolean): string {
  if (!isEnabled) return "알람 비활성화";
  return isAlarmActive ? "알람 작동됨!" : "알람 대기중";
}

function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function FieldUploadStatus({ status, onFadeEnd }: { status: UploadState; onFadeEnd: () => void }) {
  return (
    <span
      className={`field-upload-status field-upload-status--${status}`}
      aria-live="polite"
      onAnimationEnd={() => {
        if (status === "success" || status === "error") onFadeEnd();
      }}
    >
      {getUploadStatusText(status)}
    </span>
  );
}

export function AlarmControlPanel() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [alarmHour, setAlarmHour] = useState(10);
  const [alarmMinute, setAlarmMinute] = useState(0);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [uploadStates, setUploadStates] = useState<AlarmUploadStates>(initialUploadStates);

  const alarmTimeValue = `${String(alarmHour).padStart(2, "0")}${String(alarmMinute).padStart(2, "0")}`;
  const alarmStatusReadout = getAlarmStatusReadout(isEnabled, isAlarmActive);

  useEffect(() => {
    fetchAlarmSettings()
      .then((settings) => {
        setIsEnabled(settings.enabled);
        setAlarmHour(Number(settings.time.slice(0, 2)));
        setAlarmMinute(Number(settings.time.slice(2, 4)));
        setIsAlarmActive(settings.active);
      })
      .catch(() => undefined);
  }, []);

  function setFieldUploadStatus(field: AlarmFieldKey, status: UploadState) {
    setUploadStates((current) => ({ ...current, [field]: status }));
  }

  async function upload(field: AlarmFieldKey, value: boolean | string) {
    setFieldUploadStatus(field, "uploading");

    try {
      const nextSettings = await updateAlarmSetting(field, value);
      setIsEnabled(nextSettings.enabled);
      setAlarmHour(Number(nextSettings.time.slice(0, 2)));
      setAlarmMinute(Number(nextSettings.time.slice(2, 4)));
      setIsAlarmActive(nextSettings.active);
      setFieldUploadStatus(field, "success");
    } catch {
      setFieldUploadStatus(field, "error");
    }
  }

  function handleEnabledChange(nextEnabled: boolean) {
    setIsEnabled(nextEnabled);
    void upload("enabled", nextEnabled);
  }

  return (
    <section className="device-panel">
      <div className="device-panel__header">
        <div>
          <p className="device-panel__eyebrow">upload</p>
          <h2>알람</h2>
        </div>
      </div>

      <div className="alarm-control-grid">
        <div className="alarm-control-field alarm-control-field--enabled">
          <span className="alarm-control-field__label">알람 기능</span>
          <label className="vertical-toggle">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(event) => handleEnabledChange(event.target.checked)}
            />
            <span className="vertical-toggle__track" aria-hidden="true">
              <span className="vertical-toggle__thumb" />
            </span>
            <span>{isEnabled ? "ON" : "OFF"}</span>
          </label>
          <FieldUploadStatus status={uploadStates.enabled} onFadeEnd={() => setFieldUploadStatus("enabled", "idle")} />
        </div>

        <div className="alarm-control-field alarm-control-field--time">
          <label className="alarm-control-field__label" htmlFor="alarm-hour">
            알람 시간
          </label>
          <div className="alarm-time-control">
            <input
              aria-label="알람 시간"
              id="alarm-hour"
              min="0"
              max="23"
              type="number"
              value={alarmHour}
              onChange={(event) => setAlarmHour(clampNumber(Number(event.target.value), 0, 23))}
            />
            <span className="alarm-time-control__separator">:</span>
            <input
              aria-label="알람 분"
              min="0"
              max="59"
              type="number"
              value={alarmMinute}
              onChange={(event) => setAlarmMinute(clampNumber(Number(event.target.value), 0, 59))}
            />
            <button type="button" onClick={() => void upload("time", alarmTimeValue)}>
              업로드
            </button>
          </div>
          <FieldUploadStatus status={uploadStates.time} onFadeEnd={() => setFieldUploadStatus("time", "idle")} />
        </div>

        <div className="alarm-control-field alarm-control-field--status">
          <span className="alarm-control-field__label">알람 작동 상태</span>
          <div className="alarm-status-readout">
            <span
              className={`alarm-status-readout__led ${
                isEnabled && isAlarmActive ? "alarm-status-readout__led--active" : "alarm-status-readout__led--idle"
              }`}
              aria-hidden="true"
            />
            <span>{alarmStatusReadout}</span>
          </div>
        </div>
      </div>
      <p className="alarm-control-note">
        설정한 시간이 되거나, 혹은 설정한 시간의 30분 이내면서 REM 이상 상태일 경우 알람을 울립니다.
      </p>
    </section>
  );
}
