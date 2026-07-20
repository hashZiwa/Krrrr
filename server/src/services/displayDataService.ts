import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SensorSample, SleepSessionResponse, SleepSessionSummary } from "../models/sleep.js";
import type { SleepStageValue } from "../ml/sleepStageDataset.js";
import { parseSleepStageCsv } from "../ml/sleepStageDataset.js";
import { formatTimestamp } from "../utils/time.js";

export type DisplayDataFile = {
  name: string;
};

export type PredictedDisplayDataRow = {
  timestampMs: number;
  sleepStage: SleepStageValue;
  respiratoryRate: number;
};

export type DisplayDataSaveResult = {
  fileName: string;
};

export type DisplayDataWriter = {
  savePredictedSession(fileName: string, rows: PredictedDisplayDataRow[]): Promise<DisplayDataSaveResult>;
  getSavedSessionSampleCount?(fileName: string): Promise<number | null>;
};

const sleepStageLabels: Record<SleepStageValue, { label: string; code: string }> = {
  0: { label: "Wake", code: "40001" },
  1: { label: "REM", code: "40004" },
  2: { label: "Light", code: "40002" },
  3: { label: "Deep", code: "40003" },
};

function assertSafeCsvFileName(fileName: string): void {
  if (!fileName.endsWith(".csv") || fileName !== path.basename(fileName)) {
    throw new Error("Invalid display data file");
  }
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function summarize(sleepStageSamples: SensorSample[], breathingSamples: SensorSample[]): SleepSessionSummary {
  const validBreathing = breathingSamples.map((sample) => sample.value).filter((value) => value > 0);
  const deepSleepCount = sleepStageSamples.filter((sample) => sample.value === 3).length;

  return {
    averageBreathingRate:
      validBreathing.length === 0
        ? null
        : roundTo(validBreathing.reduce((sum, value) => sum + value, 0) / validBreathing.length, 1),
    movementCount: breathingSamples.filter((sample) => sample.value === -1).length,
    apneaRecognitionFailureCount: breathingSamples.filter((sample) => sample.value === 0).length,
    deepSleepRatio: sleepStageSamples.length === 0 ? 0 : roundTo(deepSleepCount / sleepStageSamples.length, 2),
  };
}

function getIntervalMinutes(timestampMs: number, nextTimestampMs: number | undefined): number {
  if (nextTimestampMs === undefined) return 0;
  return Math.max(0, Math.round((nextTimestampMs - timestampMs) / 60_000));
}

function formatCsvTimestamp(timestampMs: number): string {
  const date = new Date(timestampMs);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(
    2,
    "0",
  )} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(
    date.getSeconds(),
  ).padStart(2, "0")}`;
}

function toPredictedSessionCsv(rows: PredictedDisplayDataRow[]): string {
  const sortedRows = [...rows].sort((left, right) => left.timestampMs - right.timestampMs);
  const csvRows = ["timestamp,sleep_stage,sleep_stage_code,respiratory_rate_bpm"];

  for (const row of sortedRows) {
    const stage = sleepStageLabels[row.sleepStage];
    csvRows.push(`${formatCsvTimestamp(row.timestampMs)},${stage.label},${stage.code},${row.respiratoryRate}`);
  }

  return `${csvRows.join("\n")}\n`;
}

export function createDisplayDataService(displayDataDir = path.resolve(process.cwd(), "..", "displaydata")) {
  return {
    async listFiles(): Promise<DisplayDataFile[]> {
      const entries = await readdir(displayDataDir, { withFileTypes: true });

      return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".csv"))
        .map((entry) => ({ name: entry.name }))
        .sort((left, right) => left.name.localeCompare(right.name));
    },

    async getSession(fileName: string): Promise<SleepSessionResponse> {
      assertSafeCsvFileName(fileName);

      const csvText = await readFile(path.join(displayDataDir, fileName), "utf8");
      const rows = parseSleepStageCsv(csvText);

      if (rows.length === 0) {
        throw new Error("Display data CSV is empty");
      }

      const sleepStageSamples = rows.map((row) => ({
        measuredAt: formatTimestamp(new Date(row.timestampMs)),
        value: row.sleepStage,
      }));
      const breathingSamples = rows.map((row) => ({
        measuredAt: formatTimestamp(new Date(row.timestampMs)),
        value: row.respiratoryRate,
      }));

      return {
        id: `displaydata-${fileName}`,
        startedAt: sleepStageSamples[0].measuredAt,
        endedAt: sleepStageSamples[sleepStageSamples.length - 1].measuredAt,
        intervalMinutes: getIntervalMinutes(rows[0].timestampMs, rows[1]?.timestampMs),
        sleepStageSamples,
        breathingSamples,
        summary: summarize(sleepStageSamples, breathingSamples),
      };
    },

    async getSavedSessionSampleCount(fileName: string): Promise<number | null> {
      assertSafeCsvFileName(fileName);

      try {
        const csvText = await readFile(path.join(displayDataDir, fileName), "utf8");
        return parseSleepStageCsv(csvText).length;
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
          return null;
        }
        throw error;
      }
    },

    async savePredictedSession(fileName: string, rows: PredictedDisplayDataRow[]): Promise<DisplayDataSaveResult> {
      assertSafeCsvFileName(fileName);

      if (rows.length === 0) {
        throw new Error("Cannot save display data without samples");
      }

      await mkdir(displayDataDir, { recursive: true });
      await writeFile(path.join(displayDataDir, fileName), toPredictedSessionCsv(rows), "utf8");

      return { fileName };
    },
  };
}
