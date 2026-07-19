import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { createWindowedSleepStageExamples } from "../ml/sleepStageFeatures.js";
import type { SleepStageModel } from "../ml/sleepStageModel.js";
import type { SleepStageModelEvaluation } from "../ml/sleepStageModel.js";
import { evaluateSleepStageModel, trainSleepStageModel } from "../ml/sleepStageModel.js";
import { parseSleepStageCsv } from "../ml/sleepStageDataset.js";

export type SleepStageTrainingServiceOptions = {
  rawDataDir?: string;
  historyMinutes?: number;
};

export type SleepStageTrainingResult = {
  rawDataDir: string;
  files: string[];
  datasetRows: number;
  trainingExamples: number;
  evaluation: SleepStageModelEvaluation;
  model: SleepStageModel;
};

function findRawDataDir(startDir: string): string {
  let current = resolve(startDir);

  while (true) {
    const candidate = join(current, "rawdata");
    if (existsSync(candidate)) return candidate;

    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return join(resolve(startDir), "rawdata");
}

export function createSleepStageTrainingService(options: SleepStageTrainingServiceOptions = {}) {
  const rawDataDir = options.rawDataDir ?? process.env.SLEEP_STAGE_RAWDATA_DIR ?? findRawDataDir(process.cwd());
  const historyMinutes = options.historyMinutes ?? 5;
  let model: SleepStageModel | null = null;

  return {
    async trainFromRawData(): Promise<SleepStageTrainingResult> {
      const entries = await readdir(rawDataDir, { withFileTypes: true });
      const files = entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".csv"))
        .map((entry) => entry.name)
        .sort();

      if (files.length === 0) {
        throw new Error(`No CSV files found in rawdata directory: ${rawDataDir}`);
      }

      const rows = (
        await Promise.all(files.map(async (file) => parseSleepStageCsv(await readFile(join(rawDataDir, file), "utf8"))))
      ).flat();
      const examples = createWindowedSleepStageExamples(rows, { historyMinutes });

      model = trainSleepStageModel(examples);
      const evaluation = evaluateSleepStageModel(model, examples);

      return {
        rawDataDir,
        files,
        datasetRows: rows.length,
        trainingExamples: examples.length,
        evaluation,
        model,
      };
    },

    getModelStatus() {
      return model
        ? {
            trained: true,
            trainingExamples: model.metadata.trainingExamples,
            trainedAt: model.metadata.trainedAt,
            stageCounts: model.metadata.stageCounts,
          }
        : { trained: false };
    },

    getModel() {
      return model;
    },
  };
}
