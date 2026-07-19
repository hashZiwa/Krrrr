import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { SensorSample, SleepSessionResponse, SleepSessionSummary } from "../models/sleep.js";
import { parseSleepStageCsv } from "../ml/sleepStageDataset.js";
import { formatTimestamp } from "../utils/time.js";

export type DisplayDataFile = {
  name: string;
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
  };
}
