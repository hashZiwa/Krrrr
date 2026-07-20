import type { DisplayDataFile } from "../api/displayDataApi";
import csvIcon from "../assets/csv-icon.png";

type ObservedDataSelectorProps = {
  files: DisplayDataFile[];
  selectedFile: string;
  isLoading: boolean;
  error: string | null;
  onSelectFile: (fileName: string) => void;
};

export function getObservedDataFileLabel(fileName: string): string {
  const match = /^platform-breath-condition-(\d{4})-(\d{2})-(\d{2})\.csv$/.exec(fileName);

  if (!match) return fileName;

  return `${match[1].slice(2, 4)}년 ${match[2]}월 ${match[3]}일`;
}

export function ObservedDataSelector({
  files,
  selectedFile,
  isLoading,
  error,
  onSelectFile,
}: ObservedDataSelectorProps) {
  const selectedLabel = selectedFile ? getObservedDataFileLabel(selectedFile) : "선택 가능한 데이터 없음";

  return (
    <section className="observed-data-panel" aria-label="관찰할 데이터 선택">
      <div>
        <p className="eyebrow">display data</p>
        <h2>관찰할 데이터 선택</h2>
      </div>
      <div className="observed-data-panel__select-wrap">
        <img src={csvIcon} alt="" aria-hidden="true" />
        <select
          aria-label="관찰할 데이터 파일"
          value={selectedFile}
          disabled={isLoading || files.length === 0}
          onChange={(event) => onSelectFile(event.target.value)}
        >
          {files.length === 0 ? (
            <option value="">파일 없음</option>
          ) : (
            files.map((file) => (
              <option key={file.name} value={file.name}>
                {getObservedDataFileLabel(file.name)}
              </option>
            ))
          )}
        </select>
      </div>
      <p className={`observed-data-panel__status${error ? " observed-data-panel__status--error" : ""}`}>
        {error ? error : isLoading ? "불러오는 중..." : selectedLabel}
      </p>
    </section>
  );
}
