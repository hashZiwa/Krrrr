import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SleepStageModel, SleepStageModelEvaluation } from "../ml/sleepStageModel.js";

export type SleepStageTrainingMode = "full" | "incremental";

export type SourceFileFingerprint = {
  file: string;
  hash: string;
  size: number;
  modifiedAtMs: number;
};

export type StoredSleepStageModel = {
  version: number;
  trainedAt: string;
  trainingMode: SleepStageTrainingMode;
  sourceFiles: string[];
  sourceFileFingerprints: SourceFileFingerprint[];
  datasetRows: number;
  trainingExamples: number;
  historyMinutes: number;
  trainingEvaluation: SleepStageModelEvaluation;
  validationEvaluation: SleepStageModelEvaluation | null;
  model: SleepStageModel;
};

export type SavedSleepStageModel = StoredSleepStageModel & {
  latestFile: string;
  versionFile: string;
};

const latestModelFile = "sleep-stage-model.latest.json";
const versionFilePattern = /^sleep-stage-model\.v(\d{4})\.json$/;

function versionFileName(version: number): string {
  return `sleep-stage-model.v${String(version).padStart(4, "0")}.json`;
}

export function createSleepStageModelStore(modelDir: string) {
  async function ensureModelDir() {
    await mkdir(modelDir, { recursive: true });
  }

  return {
    async loadLatest(): Promise<StoredSleepStageModel | null> {
      try {
        return JSON.parse(await readFile(join(modelDir, latestModelFile), "utf8")) as StoredSleepStageModel;
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
          return null;
        }
        throw error;
      }
    },

    async getNextVersion(): Promise<number> {
      try {
        const entries = await readdir(modelDir);
        const versions = entries.flatMap((entry) => {
          const match = entry.match(versionFilePattern);
          return match ? [Number(match[1])] : [];
        });

        return versions.length === 0 ? 1 : Math.max(...versions) + 1;
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
          return 1;
        }
        throw error;
      }
    },

    async save(storedModel: StoredSleepStageModel): Promise<SavedSleepStageModel> {
      await ensureModelDir();

      const latestFile = join(modelDir, latestModelFile);
      const versionFile = join(modelDir, versionFileName(storedModel.version));
      const content = `${JSON.stringify(storedModel, null, 2)}\n`;

      await writeFile(versionFile, content, "utf8");
      await writeFile(latestFile, content, "utf8");

      return {
        ...storedModel,
        latestFile,
        versionFile,
      };
    },
  };
}
