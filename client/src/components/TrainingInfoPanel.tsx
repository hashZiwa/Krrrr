import { useEffect, useState } from "react";
import {
  fetchSleepStageTrainingStatus,
  incrementalTrainSleepStageModel,
  trainSleepStageModel,
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

function formatDateTime(value?: string): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function TrainingInfoPanel() {
  const [status, setStatus] = useState<SleepStageTrainingStatus>({ trained: false });
  const [isLoading, setIsLoading] = useState(true);
  const [actionState, setActionState] = useState<"idle" | "training" | "error">("idle");

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
      setActionState("idle");
    } catch {
      setActionState("error");
    }
  }

  const primaryEvaluation = getPrimaryEvaluation(status);

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
          <span>상태</span>
          <strong>{isLoading ? "확인 중" : getTrainingStatusText(status)}</strong>
        </div>
        <div>
          <span>학습 방식</span>
          <strong>{status.trained ? getTrainingModeText(status.trainingMode) : "-"}</strong>
        </div>
        <div>
          <span>학습 예제</span>
          <strong>{status.trained ? status.trainingExamples : "-"}</strong>
        </div>
        <div>
          <span>{primaryEvaluation.label}</span>
          <strong>{formatAccuracy(primaryEvaluation.evaluation?.accuracy)}</strong>
        </div>
        <div>
          <span>학습 시각</span>
          <strong>{status.trained ? formatDateTime(status.trainedAt) : "-"}</strong>
        </div>
        <div>
          <span>데이터 파일</span>
          <strong>{status.trained ? status.sourceFiles?.length ?? 0 : "-"}</strong>
        </div>
      </div>

      <p className={`training-panel__message training-panel__message--${actionState}`} aria-live="polite">
        {actionState === "training" ? "학습 중..." : actionState === "error" ? "학습 실패" : ""}
      </p>
    </section>
  );
}
