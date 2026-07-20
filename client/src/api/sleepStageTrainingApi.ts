export type TrainingMode = "full" | "incremental";

export type SleepStageEvaluation = {
  total: number;
  correct: number;
  accuracy: number;
  stages: Record<string, { total: number; correct: number; accuracy: number }>;
};

export type SleepStageTrainingStatus =
  | { trained: false; sourceFiles?: string[] }
  | {
      trained: true;
      version?: number;
      trainingMode?: TrainingMode;
      trainingExamples: number;
      trainedAt: string;
      stageCounts: Record<string, number>;
      trainingEvaluation?: SleepStageEvaluation;
      validationEvaluation?: SleepStageEvaluation | null;
      sourceFiles?: string[];
    };

export type SleepStageTrainingResponse = {
  rawDataDir: string;
  version: number;
  trainingMode: TrainingMode;
  files: string[];
  datasetRows: number;
  trainingExamples: number;
  trainingEvaluation: SleepStageEvaluation;
  validationEvaluation: SleepStageEvaluation | null;
  model: {
    trainedAt: string;
    featureCount: number;
    stageCounts: Record<string, number>;
  };
};

export type SleepStageTrainingUploadResponse = {
  file: string;
  files: string[];
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);

  if (!response.ok) {
    throw new Error(`Sleep stage training request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchSleepStageTrainingStatus(): Promise<SleepStageTrainingStatus> {
  return requestJson<SleepStageTrainingStatus>("/api/sleep-stage-training/status");
}

export function trainSleepStageModel(): Promise<SleepStageTrainingResponse> {
  return requestJson<SleepStageTrainingResponse>("/api/sleep-stage-training/train", { method: "POST" });
}

export function incrementalTrainSleepStageModel(): Promise<SleepStageTrainingResponse> {
  return requestJson<SleepStageTrainingResponse>("/api/sleep-stage-training/incremental-train", { method: "POST" });
}

export function uploadSleepStageTrainingCsv(
  fileName: string,
  content: string,
): Promise<SleepStageTrainingUploadResponse> {
  return requestJson<SleepStageTrainingUploadResponse>("/api/sleep-stage-training/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, content }),
  });
}
