import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { createWindowedSleepStageExamples } from "../ml/sleepStageFeatures.js";
import type { SleepStageModel } from "../ml/sleepStageModel.js";
import type { SleepStageModelEvaluation } from "../ml/sleepStageModel.js";
import { evaluateSleepStageModel, trainSleepStageModel } from "../ml/sleepStageModel.js";
import { parseSleepStageCsv } from "../ml/sleepStageDataset.js";
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
  const rawDataDir = findNamedDir(startDir, "rawdata");
  const trainDataDir = join(rawDataDir, "train");

  return existsSync(trainDataDir) ? trainDataDir : rawDataDir;
}

function findValidationDataDir(startDir: string): string | null {
  const rawDataDir = findNamedDir(startDir, "rawdata");
  const validationDataDir = join(rawDataDir, "validation");

  return existsSync(validationDataDir) ? validationDataDir : null;
}

function findModelDir(startDir: string): string {
  let current = resolve(startDir);

  while (true) {
    if (existsSync(join(current, "rawdata"))) return join(current, "modeldata");
    if (existsSync(join(current, "modeldata"))) return join(current, "modeldata");

    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return join(resolve(startDir), "modeldata");
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
    const examples = createWindowedSleepStageExamples(rows, { historyMinutes });
    const validationFiles = await getOptionalCsvFiles(validationDataDir);
    const validationRows = (
      await Promise.all(
        validationFiles.map(async (file) => parseSleepStageCsv(await readFile(join(validationDataDir ?? "", file), "utf8"))),
      )
    ).flat();
    const validationExamples = createWindowedSleepStageExamples(validationRows, { historyMinutes });

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

  return {
    async trainFromRawData(): Promise<SleepStageTrainingResult> {
      return train("full");
    },

    async incrementalTrainFromRawData(): Promise<SleepStageTrainingResult> {
      return train("incremental");
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

    async loadLatestModel() {
      storedModel = await store.loadLatest();
      model = storedModel?.model ?? null;
      return storedModel;
    },

    getModel() {
      return model;
    },
  };
}
