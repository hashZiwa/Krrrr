import { useMemo, useState } from "react";
import {
  exportBreathConditionCsv,
  fetchBreathConditionGroups,
  type PlatformDataGroup,
} from "../api/platformDataApi";

type PlatformDataStatus = "idle" | "loading" | "success" | "error" | "downloading";

export function getPlatformDataStatusText(status: PlatformDataStatus): string {
  if (status === "loading") return "플랫폼 확인 중...";
  if (status === "downloading") return "CSV 생성 중...";
  if (status === "success") return "플랫폼 데이터 확인 완료";
  if (status === "error") return "플랫폼 데이터 확인 실패";
  return "대기 중";
}

export function getSelectedGroupCountText(count: number): string {
  return count === 0 ? "선택된 묶음 없음" : `${count}개 묶음 선택됨`;
}

export function getDownloadFileName(groupKeys: string[]): string {
  const sortedKeys = [...groupKeys].sort();

  if (sortedKeys.length === 1) {
    return `breath-condition-${sortedKeys[0]}.csv`;
  }

  return `breath-condition-${sortedKeys[0]}_to_${sortedKeys[sortedKeys.length - 1]}.csv`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function PlatformDataPanel() {
  const [status, setStatus] = useState<PlatformDataStatus>("idle");
  const [groups, setGroups] = useState<PlatformDataGroup[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const selectedCount = selectedKeys.length;
  const totalCinCount = useMemo(() => groups.reduce((sum, group) => sum + group.count, 0), [groups]);

  async function loadGroups() {
    setStatus("loading");
    setErrorMessage("");

    try {
      const result = await fetchBreathConditionGroups();

      setGroups(result.groups);
      setSelectedKeys([]);
      setStatus("success");
    } catch (error) {
      setGroups([]);
      setSelectedKeys([]);
      setErrorMessage(error instanceof Error ? error.message : "플랫폼 데이터 확인에 실패했습니다.");
      setStatus("error");
    }
  }

  async function downloadSelectedGroups() {
    if (selectedKeys.length === 0) return;

    setStatus("downloading");
    setErrorMessage("");

    try {
      const blob = await exportBreathConditionCsv(selectedKeys);

      downloadBlob(blob, getDownloadFileName(selectedKeys));
      setStatus("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "CSV 다운로드에 실패했습니다.");
      setStatus("error");
    }
  }

  function toggleGroup(key: string, checked: boolean) {
    setSelectedKeys((current) => {
      if (checked) return [...new Set([...current, key])].sort();
      return current.filter((item) => item !== key);
    });
  }

  return (
    <section className="device-panel platform-data-panel">
      <div className="device-panel__header">
        <div>
          <p className="device-panel__eyebrow">platform data</p>
          <h2>플랫폼 데이터</h2>
        </div>
        <button type="button" disabled={status === "loading" || status === "downloading"} onClick={() => void loadGroups()}>
          플랫폼 데이터 확인
        </button>
      </div>

      <div className="platform-data-panel__summary">
        <span>{getPlatformDataStatusText(status)}</span>
        <span>{groups.length === 0 ? "묶음 없음" : `${groups.length}개 날짜 묶음 / ${totalCinCount}개 cin`}</span>
        <span>{getSelectedGroupCountText(selectedCount)}</span>
      </div>

      {errorMessage ? <p className="platform-data-panel__message platform-data-panel__message--error">{errorMessage}</p> : null}

      {groups.length > 0 ? (
        <div className="platform-data-panel__groups" aria-label="플랫폼 데이터 날짜 묶음">
          {groups.map((group) => (
            <label className="platform-data-panel__group" key={group.key}>
              <input
                type="checkbox"
                checked={selectedKeys.includes(group.key)}
                onChange={(event) => toggleGroup(group.key, event.target.checked)}
              />
              <span>
                <strong>{group.label}</strong>
                <small>{group.count}개 cin</small>
              </span>
            </label>
          ))}
        </div>
      ) : null}

      <div className="platform-data-panel__actions">
        <button
          type="button"
          disabled={selectedCount === 0 || status === "loading" || status === "downloading"}
          onClick={() => void downloadSelectedGroups()}
        >
          CSV 다운로드
        </button>
      </div>
    </section>
  );
}
