import { useEffect, useRef, useState } from "react";
import type { DisplayDataFile } from "../api/displayDataApi";
import csvIcon from "../assets/csv-icon.png";

type ObservedDataSelectorProps = {
  files: DisplayDataFile[];
  selectedFile: string;
  isLoading: boolean;
  onSelectFile: (fileName: string) => void;
};

export function getObservedDataFileLabel(fileName: string): string {
  const match = /^platform-breath-condition-(\d{4})-(\d{2})-(\d{2})\.csv$/.exec(fileName);

  if (!match) return fileName;

  return `${match[1].slice(2, 4)}년 ${match[2]}월 ${match[3]}일`;
}

export function getObservedDataSelectedLabel(fileName: string): string {
  return fileName ? getObservedDataFileLabel(fileName) : "없음";
}

export function shouldShowObservedDataSelectedIcon(fileName: string): boolean {
  return fileName.length > 0;
}

export function isObservedDataFileSelected(fileName: string, selectedFile: string): boolean {
  return fileName === selectedFile;
}

export function ObservedDataSelector({
  files,
  selectedFile,
  isLoading,
  onSelectFile,
}: ObservedDataSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedLabel = getObservedDataSelectedLabel(selectedFile);
  const isDisabled = isLoading || files.length === 0;

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <section className="observed-data-panel" aria-label="관찰할 데이터 선택">
      <div>
        <p className="eyebrow">display data</p>
        <h2>관찰할 데이터 선택</h2>
      </div>
      <div
        className={`observed-data-panel__select-wrap${
          shouldShowObservedDataSelectedIcon(selectedFile) ? "" : " observed-data-panel__select-wrap--empty"
        }`}
      >
        {shouldShowObservedDataSelectedIcon(selectedFile) ? <img src={csvIcon} alt="" aria-hidden="true" /> : null}
        <div className="observed-data-select" ref={rootRef}>
          <button
            type="button"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            disabled={isDisabled}
            onClick={() => setIsOpen((current) => !current)}
          >
            <span className={selectedFile ? "" : "observed-data-select__none-label"}>{selectedLabel}</span>
            <i aria-hidden="true" />
          </button>
          {isOpen ? (
            <ul className="observed-data-select__list" role="listbox" aria-label="관찰할 데이터 파일">
              <li role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={!selectedFile}
                  className={`observed-data-select__none-option${
                    !selectedFile ? " observed-data-select__option--selected" : ""
                  }`}
                  onClick={() => {
                    onSelectFile("");
                    setIsOpen(false);
                  }}
                >
                  <span className="observed-data-select__none-label">없음</span>
                </button>
              </li>
              {files.map((file) => {
                const isSelected = isObservedDataFileSelected(file.name, selectedFile);

                return (
                  <li key={file.name} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={isSelected ? "observed-data-select__option--selected" : ""}
                      onClick={() => {
                        onSelectFile(file.name);
                        setIsOpen(false);
                      }}
                    >
                      <img src={csvIcon} alt="" aria-hidden="true" />
                      <span>{getObservedDataFileLabel(file.name)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
