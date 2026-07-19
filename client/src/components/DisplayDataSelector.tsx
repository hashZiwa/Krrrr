import type { DisplayDataFile } from "../api/displayDataApi";

type DisplayDataSelectorProps = {
  files: DisplayDataFile[];
  selectedFile: string;
  isLoading: boolean;
  error: string | null;
  onSelectFile: (fileName: string) => void;
};

export function DisplayDataSelector({
  files,
  selectedFile,
  isLoading,
  error,
  onSelectFile,
}: DisplayDataSelectorProps) {
  return (
    <section className="display-data-panel" aria-label="표시 데이터 선택">
      <div>
        <p className="eyebrow">display data</p>
        <h2>모니터링 데이터 선택</h2>
      </div>
      <div className="display-data-panel__control">
        <label htmlFor="display-data-file">CSV 파일</label>
        <select
          id="display-data-file"
          value={selectedFile}
          disabled={isLoading || files.length === 0}
          onChange={(event) => onSelectFile(event.target.value)}
        >
          {files.length === 0 ? (
            <option value="">파일 없음</option>
          ) : (
            files.map((file) => (
              <option key={file.name} value={file.name}>
                {file.name}
              </option>
            ))
          )}
        </select>
        <span className={`display-data-panel__status${error ? " display-data-panel__status--error" : ""}`}>
          {error ? error : isLoading ? "불러오는 중..." : selectedFile}
        </span>
      </div>
    </section>
  );
}
