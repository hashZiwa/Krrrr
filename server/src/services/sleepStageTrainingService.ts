import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { createWindowedSleepStageExamples, createWindowedSleepStagePredictionInputs } from "../ml/sleepStageFeatures.js";
import type { SleepStageBreathingRow } from "../ml/sleepStageFeatures.js";
import type { SleepStageModel } from "../ml/sleepStageModel.js";
import type { SleepStageModelEvaluation } from "../ml/sleepStageModel.js";
import { evaluateSleepStageModel, predictSleepStage, trainSleepStageModel } from "../ml/sleepStageModel.js";
import { parseSleepStageCsv } from "../ml/sleepStageDataset.js";
import type { SleepStageTrainingRow, SleepStageValue } from "../ml/sleepStageDataset.js";
import { createSleepStageModelStore } from "./sleepStageModelStore.js";
import type { SourceFileFingerprint, SleepStageTrainingMode, StoredSleepStageModel } from "./sleepStageModelStore.js";

export type SleepStageTrainingServiceOptions = {
  rawDataDir?: string;
  validationDataDir?: string;
  modelDir?: string;
  historyMinutes?: number;
};

export type SleepStageTrainingResult = {
  rawDataDir: string;
  version: number;
  trainingMode: SleepStageTrainingMode;
  files: string[];
  sourceFileFingerprints: SourceFileFingerprint[];
  datasetRows: number;
  trainingExamples: number;
  trainingEvaluation: SleepStageModelEvaluation;
  validationEvaluation: SleepStageModelEvaluation | null;
  model: SleepStageModel;
};

export type SleepStagePredictedSample = {
  timestampMs: number;
  respiratoryRate: number;
  sleepStage: SleepStageValue;
};

export type SleepStageTrainingCsvUploadResult = {
  file: string;
  files: string[];
};

function findNamedDir(startDir: string, dirName: string): string {
  let current = resolve(startDir);

  while (true) {
    const candidate = join(current, dirName);
    if (existsSync(candidate)) return candidate;

    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return join(resolve(startDir), dirName);
}

function findRawDataDir(startDir: string): string {
  const dataDir = findNamedDir(startDir, "data");
  const nestedRawDataDir = join(dataDir, "rawdata");
  const rawDataDir = existsSync(nestedRawDataDir) ? nestedRawDataDir : findNamedDir(startDir, "rawdata");
  const trainDataDir = join(rawDataDir, "train");

  return existsSync(trainDataDir) ? trainDataDir : rawDataDir;
}

function findValidationDataDir(startDir: string): string | null {
  const dataDir = findNamedDir(startDir, "data");
  const nestedRawDataDir = join(dataDir, "rawdata");
  const rawDataDir = existsSync(nestedRawDataDir) ? nestedRawDataDir : findNamedDir(startDir, "rawdata");
  const validationDataDir = join(rawDataDir, "validation");

  return existsSync(validationDataDir) ? validationDataDir : null;
}

function findModelDir(startDir: string): string {
  let current = resolve(startDir);

  while (true) {
    if (existsSync(join(current, "data", "rawdata"))) return join(current, "model");
    if (existsSync(join(current, "rawdata"))) return join(current, "model");
    if (existsSync(join(current, "model"))) return join(current, "model");

    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return join(resolve(startDir), "model");
}

async function getCsvFiles(rawDataDir: string): Promise<string[]> {
  const entries = await readdir(rawDataDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".csv"))
    .map((entry) => entry.name)
    .sort();

  if (files.length === 0) {
    throw new Error(`No CSV files found in rawdata directory: ${rawDataDir}`);
  }

  return files;
}

async function getOptionalCsvFiles(dataDir: string | null): Promise<string[]> {
  if (!dataDir || !existsSync(dataDir)) return [];
  const entries = await readdir(dataDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".csv"))
    .map((entry) => entry.name)
    .sort();
}

async function fingerprintFile(rawDataDir: string, file: string): Promise<SourceFileFingerprint> {
  const filePath = join(rawDataDir, file);
  const [content, fileStat] = await Promise.all([readFile(filePath), stat(filePath)]);

  return {
    file,
    hash: createHash("sha256").update(content).digest("hex"),
    size: fileStat.size,
    modifiedAtMs: fileStat.mtimeMs,
  };
}

function rowsWithSleepStage(rows: Array<SleepStageTrainingRow | { timestampMs: number; sleepStage: SleepStageValue | null; respiratoryRate: number }>): SleepStageTrainingRow[] {
  return rows.filter((row): row is SleepStageTrainingRow => row.sleepStage !== null);
}
function sanitizeCsvFileName(fileName: string): string {
  const baseName = fileName
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.replace(/[^a-zA-Z0-9._ -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  if (!baseName || !baseName.toLowerCase().endsWith(".csv")) {
    throw new Error("Training upload must be a CSV file");
  }

  return baseName;
}

export function createSleepStageTrainingService(options: SleepStageTrainingServiceOptions = {}) {
  const rawDataDir = options.rawDataDir ?? process.env.SLEEP_STAGE_RAWDATA_DIR ?? findRawDataDir(process.cwd());
  const validationDataDir =
    options.validationDataDir ??
    (options.rawDataDir ? null : process.env.SLEEP_STAGE_VALIDATION_DATA_DIR ?? findValidationDataDir(process.cwd()));
  const modelDir = options.modelDir ?? process.env.SLEEP_STAGE_MODEL_DIR ?? findModelDir(process.cwd());
  const historyMinutes = options.historyMinutes ?? 5;
  const store = createSleepStageModelStore(modelDir);
  let model: SleepStageModel | null = null;
  let storedModel: StoredSleepStageModel | null = null;

  async function train(trainingMode: SleepStageTrainingMode): Promise<SleepStageTrainingResult> {
    const files = await getCsvFiles(rawDataDir);
    const sourceFileFingerprints = await Promise.all(files.map((file) => fingerprintFile(rawDataDir, file)));
    const rows = (
      await Promise.all(files.map(async (file) => parseSleepStageCsv(await readFile(join(rawDataDir, file), "utf8"))))
    ).flat();
    const trainingRows = rowsWithSleepStage(rows);
    const examples = createWindowedSleepStageExamples(trainingRows, { historyMinutes });
    const validationFiles = await getOptionalCsvFiles(validationDataDir);
    const validationRows = (
      await Promise.all(
        validationFiles.map(async (file) => parseSleepStageCsv(await readFile(join(validationDataDir ?? "", file), "utf8"))),
      )
    ).flat();
    const validationExamples = createWindowedSleepStageExamples(rowsWithSleepStage(validationRows), { historyMinutes });

    model = trainSleepStageModel(examples);
    const trainingEvaluation = evaluateSleepStageModel(model, examples);
    const validationEvaluation =
      validationExamples.length > 0 ? evaluateSleepStageModel(model, validationExamples) : null;
    const version = await store.getNextVersion();
    const trainedAt = new Date().toISOString();
    const savedModel = await store.save({
      version,
      trainedAt,
      trainingMode,
      sourceFiles: files,
      sourceFileFingerprints,
      datasetRows: rows.length,
      trainingExamples: examples.length,
      historyMinutes,
      trainingEvaluation,
      validationEvaluation,
      model,
    });
    storedModel = savedModel;

    return {
      rawDataDir,
      version,
      trainingMode,
      files,
      sourceFileFingerprints,
      datasetRows: rows.length,
      trainingExamples: examples.length,
      trainingEvaluation,
      validationEvaluation,
      model,
    };
  }

  async function loadLatestModel() {
    storedModel = await store.loadLatest();
    model = storedModel?.model ?? null;
    return storedModel;
  }

  return {
    async trainFromRawData(): Promise<SleepStageTrainingResult> {
      return train("full");
    },

    async incrementalTrainFromRawData(): Promise<SleepStageTrainingResult> {
      return train("incremental");
    },

    async saveTrainingCsv(fileName: string, content: string): Promise<SleepStageTrainingCsvUploadResult> {
      const safeFileName = sanitizeCsvFileName(fileName);

      if (!content.trim()) {
        throw new Error("Training upload content is empty");
      }

      parseSleepStageCsv(content);
      await mkdir(rawDataDir, { recursive: true });
      await writeFile(join(rawDataDir, safeFileName), content, "utf8");

      return {
        file: safeFileName,
        files: await getCsvFiles(rawDataDir),
      };
    },

    getModelStatus() {
      const currentStoredModel = storedModel;
      const currentModel = model ?? currentStoredModel?.model ?? null;

      return currentModel
        ? {
            trained: true,
            version: currentStoredModel?.version,
            trainingMode: currentStoredModel?.trainingMode,
            trainingExamples: currentModel.metadata.trainingExamples,
            trainedAt: currentStoredModel?.trainedAt ?? currentModel.metadata.trainedAt,
            stageCounts: currentModel.metadata.stageCounts,
            trainingEvaluation: currentStoredModel?.trainingEvaluation,
            validationEvaluation: currentStoredModel?.validationEvaluation,
            sourceFiles: currentStoredModel?.sourceFiles,
          }
        : { trained: false };
    },

    loadLatestModel,

    getModel() {
      return model;
    },

    async predictFromBreathingSamples(samples: SleepStageBreathingRow[]): Promise<SleepStagePredictedSample[]> {
      if (!model) {
        await loadLatestModel();
      }

      if (!model) {
        throw new Error("No trained sleep stage model is available");
      }

      const currentModel = model;

      return createWindowedSleepStagePredictionInputs(samples, { historyMinutes }).map((input) => ({
        timestampMs: input.timestampMs,
        respiratoryRate: input.respiratoryRate,
        sleepStage: predictSleepStage(currentModel, input.features).stage,
      }));
    },
  };
}
