import { useEffect, useRef, useState } from "react";
import {
  fetchSleepStageTrainingStatus,
  incrementalTrainSleepStageModel,
  trainSleepStageModel,
  uploadSleepStageTrainingCsv,
  type SleepStageEvaluation,
  type SleepStageTrainingStatus,
  type TrainingMode,
} from "../api/sleepStageTrainingApi";

export function formatAccuracy(value?: number): string {
  return typeof value === "number" ? `${(value * 100).toFixed(1)}%` : "-";
}

export function getTrainingModeText(mode?: TrainingMode): string {
  if (mode === "incremental") return "추가 학습";
  if (mode === "full") return "전체 재학습";
  return "-";
}

export function getTrainingStatusText(status: SleepStageTrainingStatus): string {
  if (!status.trained) return "미학습";
  return status.version ? `v${status.version} 학습 완료` : "학습 완료";
}

export function getPrimaryEvaluation(
  status: SleepStageTrainingStatus,
): { label: string; evaluation?: SleepStageEvaluation } {
  if (!status.trained) return { label: "검증 정확도" };
  if (status.validationEvaluation) return { label: "검증 정확도", evaluation: status.validationEvaluation };
  return { label: "학습셋 정확도", evaluation: status.trainingEvaluation };
}

export function getTrainingFileCount(status: SleepStageTrainingStatus): number | "-" {
  return status.sourceFiles?.length ?? "-";
}

export function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".csv");
}

export function getTrainingUploadDropzoneText(_file?: File | null): string {
  return "CSV 파일 드래그 혹은 선택";
}

export function TrainingInfoPanel() {
  const [status, setStatus] = useState<SleepStageTrainingStatus>({ trained: false });
  const [isLoading, setIsLoading] = useState(true);
  const [actionState, setActionState] = useState<"idle" | "training" | "error">("idle");
  const [uploadState, setUploadState] = useState<"idle" | "ready" | "uploading" | "success" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  async function refreshStatus() {
    setStatus(await fetchSleepStageTrainingStatus());
  }

  useEffect(() => {
    refreshStatus()
      .catch(() => setStatus({ trained: false }))
      .finally(() => setIsLoading(false));
  }, []);

  async function runTraining(mode: TrainingMode) {
    setActionState("training");

    try {
      const result = mode === "full" ? await trainSleepStageModel() : await incrementalTrainSleepStageModel();
      setStatus({
        trained: true,
        version: result.version,
        trainingMode: result.trainingMode,
        trainingExamples: result.trainingExamples,
        trainedAt: result.model.trainedAt,
        stageCounts: result.model.stageCounts,
        trainingEvaluation: result.trainingEvaluation,
        validationEvaluation: result.validationEvaluation,
        sourceFiles: result.files,
      });
      setUploadedFiles(result.files);
      setActionState("idle");
    } catch {
      setActionState("error");
    }
  }

  function selectUploadFile(file?: File) {
    if (!file) return;

    if (!isCsvFile(file)) {
      setSelectedUploadFile(null);
      setUploadState("error");
      setUploadMessage("CSV 파일만 업로드할 수 있습니다.");
      return;
    }

    setSelectedUploadFile(file);
    setUploadState("ready");
    setUploadMessage(`${file.name} 선택됨`);
  }

  function clearSelectedUploadFile() {
    setSelectedUploadFile(null);
    setUploadState("idle");
    setUploadMessage("");
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  }

  async function uploadTrainingFile() {
    if (!selectedUploadFile || uploadState === "uploading") return;

    setUploadState("uploading");
    setUploadMessage("업로드 중...");

    try {
      const result = await uploadSleepStageTrainingCsv(selectedUploadFile.name, await selectedUploadFile.text());
      setUploadedFiles(result.files);
      setStatus((current) => (current.trained ? { ...current, sourceFiles: result.files } : { ...current, sourceFiles: result.files }));
      setSelectedUploadFile(null);
      setUploadState("success");
      setUploadMessage(`${result.file} 저장 완료`);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    } catch {
      setUploadState("error");
      setUploadMessage("학습 데이터 저장 실패");
    }
  }

  const dataFileCount = uploadedFiles.length > 0 ? uploadedFiles.length : getTrainingFileCount(status);

  return (
    <section className="device-panel training-panel">
      <div className="device-panel__header">
        <div>
          <p className="device-panel__eyebrow">training</p>
          <h2>수면 단계 학습 모델</h2>
        </div>
        <div className="training-panel__actions">
          <button type="button" disabled={actionState === "training"} onClick={() => void runTraining("full")}>
            전체 재학습
          </button>
          <button type="button" disabled={actionState === "training"} onClick={() => void runTraining("incremental")}>
            추가 학습
          </button>
        </div>
      </div>

      <div className="training-panel__summary">
        <div>
          <span>학습 데이터</span>
          <strong>{isLoading ? "확인 중" : status.trained ? status.trainingExamples : "-"}</strong>
        </div>
        <div>
          <span>데이터 파일</span>
          <strong>{isLoading ? "확인 중" : dataFileCount}</strong>
        </div>
      </div>

      <div className="training-upload">
        <input
          ref={uploadInputRef}
          className="training-upload__input"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => selectUploadFile(event.currentTarget.files?.[0])}
        />
        <button
          type="button"
          className={`training-upload__dropzone${isDraggingUpload ? " training-upload__dropzone--active" : ""}`}
          onClick={() => uploadInputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDraggingUpload(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDraggingUpload(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDraggingUpload(false);
            selectUploadFile(event.dataTransfer.files[0]);
          }}
        >
          <span className="training-upload__title">{getTrainingUploadDropzoneText(selectedUploadFile)}</span>
        </button>
        <button
          type="button"
          className="training-upload__submit"
          disabled={!selectedUploadFile || uploadState === "uploading"}
          onClick={() => void uploadTrainingFile()}
        >
          학습 데이터 추가
        </button>
      </div>

      <p className={`training-panel__message training-panel__message--${uploadState}`} aria-live="polite">
        <span className="training-panel__message-text">{uploadMessage}</span>
        {selectedUploadFile && uploadState === "ready" ? (
          <button
            type="button"
            className="training-panel__clear-upload"
            aria-label="선택한 학습 데이터 취소"
            onClick={clearSelectedUploadFile}
          >
            X
          </button>
        ) : null}
      </p>

      <p className={`training-panel__message training-panel__message--${actionState}`} aria-live="polite">
        {actionState === "training" ? "학습 중..." : actionState === "error" ? "학습 실패" : ""}
      </p>
    </section>
  );
}
