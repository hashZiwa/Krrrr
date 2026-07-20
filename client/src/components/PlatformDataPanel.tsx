import { useMemo, useState } from "react";
import checkmarkIcon from "../assets/checkmark-icon.png";
import csvIcon from "../assets/csv-icon.png";
import {
  fetchBreathConditionGroups,
  saveBreathConditionDisplayData,
  type PlatformDataGroup,
} from "../api/platformDataApi";

type PlatformDataStatus = "idle" | "loading" | "success" | "saved" | "error" | "saving";

type PlatformDataPanelProps = {
  onSaved?: (fileName: string) => void;
};

export function getPlatformDataStatusText(status: PlatformDataStatus): string {
  if (status === "loading") return "데이터 불러오는 중...";
  if (status === "saving") return "데이터 저장 중...";
  if (status === "saved") return "데이터 저장 완료";
  if (status === "success") return "데이터 불러오기 완료";
  if (status === "error") return "데이터 불러오기 실패";
  return "대기 중";
}

export function getTotalDataText(count: number): string {
  return `총 ${count}개 데이터`;
}

export function getPlatformDataLoadButtonText(hasLoaded: boolean): string {
  return hasLoaded ? "데이터 새로고침" : "데이터 불러오기";
}

export function getPlatformDataGroupDisplayName(group: PlatformDataGroup): string {
  const year = group.startAt.slice(2, 4);
  const month = group.startAt.slice(4, 6);
  const day = group.startAt.slice(6, 8);

  return `${year}년 ${month}월 ${day}일`;
}

export function getPlatformDataGroupSaveLabel(saveState: PlatformDataGroup["saveState"]): string {
  if (saveState === "saved") return "다운로드됨";
  if (saveState === "updated") return "갱신됨";
  return "";
}

function mergeGroups(currentGroups: PlatformDataGroup[], nextGroups: PlatformDataGroup[]): PlatformDataGroup[] {
  const groups = new Map<string, PlatformDataGroup>();

  for (const group of [...currentGroups, ...nextGroups]) {
    const existing = groups.get(group.key);

    if (!existing) {
      groups.set(group.key, { ...group, items: [...group.items] });
      continue;
    }

    const items = new Map(existing.items.map((item) => [item.uri, item]));
    group.items.forEach((item) => items.set(item.uri, item));
    const mergedItems = [...items.values()].sort((left, right) => right.rn.localeCompare(left.rn));

    groups.set(group.key, {
      ...existing,
      count: mergedItems.length,
      items: mergedItems,
    });
  }

  return [...groups.values()].sort((left, right) => right.key.localeCompare(left.key));
}

export function PlatformDataPanel({ onSaved }: PlatformDataPanelProps) {
  const [status, setStatus] = useState<PlatformDataStatus>("idle");
  const [groups, setGroups] = useState<PlatformDataGroup[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const selectedCount = selectedKeys.length;
  const totalCinCount = useMemo(() => groups.reduce((sum, group) => sum + group.count, 0), [groups]);

  function clearFinishedStatus() {
    if (status === "success" || status === "saved" || status === "error") setStatus("idle");
  }

  async function loadGroups(offset = 0) {
    setStatus("loading");
    setErrorMessage("");

    try {
      const result = await fetchBreathConditionGroups(offset);

      setGroups((current) => (offset === 0 ? result.groups : mergeGroups(current, result.groups)));
      if (offset === 0) setSelectedKeys([]);
      setNextOffset(result.nextOffset);
      setHasMore(result.hasMore);
      setHasLoaded(true);
      setStatus("success");
    } catch (error) {
      if (offset === 0) {
        setGroups([]);
        setSelectedKeys([]);
        setNextOffset(0);
        setHasMore(false);
        setHasLoaded(false);
      }
      setErrorMessage(error instanceof Error ? error.message : "플랫폼 데이터 확인에 실패했습니다.");
      setStatus("error");
    }
  }

  async function saveSelectedGroups() {
    if (selectedKeys.length === 0) return;

    setStatus("saving");
    setErrorMessage("");

    try {
      const selectedGroups = groups.filter((group) => selectedKeys.includes(group.key));
      const result = await saveBreathConditionDisplayData(selectedGroups);

      setGroups((current) =>
        current.map((group) =>
          selectedKeys.includes(group.key)
            ? { ...group, saveState: "saved", savedCount: group.count, fileName: group.fileName }
            : group,
        ),
      );
      setSelectedKeys([]);
      onSaved?.(result.fileName);
      setStatus("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "데이터 저장에 실패했습니다.");
      setStatus("error");
    }
  }

  function toggleGroup(key: string, checked: boolean) {
    setSelectedKeys((current) => {
      const group = groups.find((item) => item.key === key);

      if (group?.saveState === "saved") return current;
      if (checked) return [...new Set([...current, key])].sort();
      return current.filter((item) => item !== key);
    });
  }

  return (
    <section className="device-panel platform-data-panel">
      <div className="device-panel__header">
        <div>
          <p className="device-panel__eyebrow">platform data</p>
          <div className="platform-data-panel__title-row">
            <h2>플랫폼 데이터</h2>
            <span
              className={`platform-data-panel__inline-status platform-data-panel__inline-status--${status}`}
              aria-live="polite"
              onAnimationEnd={clearFinishedStatus}
            >
              {status === "idle" ? "" : getPlatformDataStatusText(status)}
            </span>
          </div>
        </div>
        <div className="platform-data-panel__header-actions">
          {hasMore ? (
            <button
              type="button"
              disabled={status === "loading" || status === "saving"}
              onClick={() => void loadGroups(nextOffset)}
            >
              더 불러오기
            </button>
          ) : null}
          <button
            type="button"
            disabled={status === "loading" || status === "saving"}
            onClick={() => void loadGroups(0)}
          >
            {getPlatformDataLoadButtonText(hasLoaded)}
          </button>
        </div>
      </div>

      {errorMessage ? <p className="platform-data-panel__message platform-data-panel__message--error">{errorMessage}</p> : null}

      {groups.length > 0 ? (
        <div className="platform-data-panel__groups" aria-label="플랫폼 데이터 날짜 묶음">
          {groups.map((group) => {
            const saveLabel = getPlatformDataGroupSaveLabel(group.saveState);
            const isSaved = group.saveState === "saved";

            return (
            <label
              className={`platform-data-panel__group${
                selectedKeys.includes(group.key) ? " platform-data-panel__group--selected" : ""
              } platform-data-panel__group--${group.saveState}`}
              key={group.key}
            >
              <input
                type="checkbox"
                checked={selectedKeys.includes(group.key)}
                disabled={isSaved}
                onChange={(event) => toggleGroup(group.key, event.target.checked)}
              />
              <img src={isSaved ? checkmarkIcon : csvIcon} alt="" aria-hidden="true" />
              <span>
                {saveLabel ? <em>{saveLabel}</em> : null}
                <strong>{getPlatformDataGroupDisplayName(group)}</strong>
                <small>데이터 {group.count}개 분량</small>
              </span>
            </label>
            );
          })}
        </div>
      ) : null}

      <div className="platform-data-panel__footer">
        <span>{getTotalDataText(totalCinCount)}</span>
        <button
          type="button"
          disabled={selectedCount === 0 || status === "loading" || status === "saving"}
          onClick={() => void saveSelectedGroups()}
        >
          데이터 저장
        </button>
      </div>
    </section>
  );
}
