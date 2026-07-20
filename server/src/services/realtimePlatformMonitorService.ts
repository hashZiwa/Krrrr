import type { MobiusClient, MobiusCin } from "../clients/mobiusClient.js";
import type { SensorSample, SleepSessionResponse, SleepSessionSummary } from "../models/sleep.js";
import type { DisplayDataWriter, PredictedDisplayDataRow } from "./displayDataService.js";
import type { SleepStagePredictedSample } from "./sleepStageTrainingService.js";
import { formatTimestamp } from "../utils/time.js";

type BreathingSample = {
  timestampMs: number;
  respiratoryRate: number;
};

export type RealtimePlatformMonitorState = {
  running: boolean;
  primed: boolean;
  lastRn: string | null;
  lastError: string | null;
  breathingSamples: BreathingSample[];
  predictedSamples: SleepStagePredictedSample[];
  lastPredictionAt: string | null;
};

export type RealtimePlatformMonitorService = {
  start(): void;
  stop(): void;
  pollLatest(): Promise<void>;
  refreshPredictions(): Promise<void>;
  getState(): RealtimePlatformMonitorState;
  getSession(): SleepSessionResponse;
};

type RealtimePlatformMonitorOptions = {
  breathConditionContainer: string;
  pollIntervalMs?: number;
  predictionIntervalMs?: number;
  backupFileName?: string;
  displayDataService?: DisplayDataWriter;
  sleepStageTrainingService?: {
    predictFromBreathingSamples(samples: BreathingSample[]): Promise<SleepStagePredictedSample[]>;
  };
  alarmService?: {
    evaluate(input: { now?: Date; latestSleepStage: SleepStagePredictedSample["sleepStage"] | null }): Promise<unknown>;
  };
};

function parseCinDateFromRn(rn: string | undefined): Date | null {
  const match = /^4-(\d{14})/.exec(rn ?? "");

  if (!match) return null;

  const value = match[1];
  return new Date(
    Number(value.slice(0, 4)),
    Number(value.slice(4, 6)) - 1,
    Number(value.slice(6, 8)),
    Number(value.slice(8, 10)),
    Number(value.slice(10, 12)),
    Number(value.slice(12, 14)),
  );
}

function parseBreathConditionValue(value: MobiusCin["con"]): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= -1 && value <= 60 ? value : null;
  }

  if (typeof value !== "string" || !/^-?\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);

  return parsed >= -1 && parsed <= 60 ? parsed : null;
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function summarize(breathingSamples: BreathingSample[], predictedSamples: SleepStagePredictedSample[]): SleepSessionSummary {
  const validBreathing = breathingSamples.map((sample) => sample.respiratoryRate).filter((value) => value > 0);
  const deepSleepCount = predictedSamples.filter((sample) => sample.sleepStage === 3).length;

  return {
    averageBreathingRate:
      validBreathing.length === 0
        ? null
        : roundTo(validBreathing.reduce((sum, value) => sum + value, 0) / validBreathing.length, 1),
    movementCount: breathingSamples.filter((sample) => sample.respiratoryRate === -1).length,
    apneaRecognitionFailureCount: breathingSamples.filter((sample) => sample.respiratoryRate === 0).length,
    deepSleepRatio: predictedSamples.length === 0 ? 0 : roundTo(deepSleepCount / predictedSamples.length, 2),
  };
}

function getIntervalMinutes(samples: BreathingSample[]): number {
  if (samples.length < 2) return 0;

  return Math.max(0, Math.round((samples[1].timestampMs - samples[0].timestampMs) / 60_000));
}

function toPredictedDisplayRows(samples: SleepStagePredictedSample[]): PredictedDisplayDataRow[] {
  return samples.map((sample) => ({
    timestampMs: sample.timestampMs,
    respiratoryRate: sample.respiratoryRate,
    sleepStage: sample.sleepStage,
  }));
}

export function createRealtimePlatformMonitorService(
  client: Pick<MobiusClient, "getLatestCin">,
  options: RealtimePlatformMonitorOptions,
): RealtimePlatformMonitorService {
  const pollIntervalMs = options.pollIntervalMs ?? 30_000;
  const predictionIntervalMs = options.predictionIntervalMs ?? 300_000;
  const backupFileName = options.backupFileName ?? "realtime-breath-condition.csv";
  const breathingSamples: BreathingSample[] = [];
  let predictedSamples: SleepStagePredictedSample[] = [];
  let lastRn: string | null = null;
  let primed = false;
  let running = false;
  let lastError: string | null = null;
  let lastPredictionAt: string | null = null;
  let pollTimer: NodeJS.Timeout | null = null;
  let predictionTimer: NodeJS.Timeout | null = null;

  async function pollLatest(): Promise<void> {
    try {
      const cin = await client.getLatestCin(options.breathConditionContainer);
      const rn = cin.rn ?? null;

      if (!rn) return;

      if (!primed) {
        lastRn = rn;
        primed = true;
        lastError = null;
        return;
      }

      if (rn === lastRn) {
        lastError = null;
        return;
      }

      lastRn = rn;

      const measuredAt = parseCinDateFromRn(rn);
      const respiratoryRate = parseBreathConditionValue(cin.con);

      if (!measuredAt || respiratoryRate === null) return;

      breathingSamples.push({ timestampMs: measuredAt.getTime(), respiratoryRate });
      breathingSamples.sort((left, right) => left.timestampMs - right.timestampMs);
      lastError = null;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown realtime platform polling failure";
    }
  }

  async function refreshPredictions(): Promise<void> {
    if (breathingSamples.length === 0 || !options.sleepStageTrainingService || !options.displayDataService) return;

    try {
      predictedSamples = await options.sleepStageTrainingService.predictFromBreathingSamples([...breathingSamples]);
      await options.displayDataService.savePredictedSession(backupFileName, toPredictedDisplayRows(predictedSamples));
      await options.alarmService?.evaluate({
        latestSleepStage: predictedSamples[predictedSamples.length - 1]?.sleepStage ?? null,
      });
      lastPredictionAt = new Date().toISOString();
      lastError = null;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown realtime prediction failure";
    }
  }

  return {
    start() {
      if (running) return;

      running = true;
      void pollLatest();
      pollTimer = setInterval(() => void pollLatest(), pollIntervalMs);
      predictionTimer = setInterval(() => void refreshPredictions(), predictionIntervalMs);
    },

    stop() {
      running = false;
      if (pollTimer) clearInterval(pollTimer);
      if (predictionTimer) clearInterval(predictionTimer);
      pollTimer = null;
      predictionTimer = null;
    },

    pollLatest,
    refreshPredictions,

    getState() {
      return {
        running,
        primed,
        lastRn,
        lastError,
        breathingSamples: [...breathingSamples],
        predictedSamples: [...predictedSamples],
        lastPredictionAt,
      };
    },

    getSession() {
      if (breathingSamples.length === 0) {
        throw new Error("No realtime platform samples have been recorded yet");
      }

      const sleepStageSamples: SensorSample[] = predictedSamples.map((sample) => ({
        measuredAt: formatTimestamp(new Date(sample.timestampMs)),
        value: sample.sleepStage,
      }));
      const sessionBreathingSamples: SensorSample[] = breathingSamples.map((sample) => ({
        measuredAt: formatTimestamp(new Date(sample.timestampMs)),
        value: sample.respiratoryRate,
      }));

      return {
        id: "platform-realtime",
        startedAt: formatTimestamp(new Date(breathingSamples[0].timestampMs)),
        endedAt: formatTimestamp(new Date(breathingSamples[breathingSamples.length - 1].timestampMs)),
        intervalMinutes: getIntervalMinutes(breathingSamples),
        sleepStageSamples,
        breathingSamples: sessionBreathingSamples,
        summary: summarize(breathingSamples, predictedSamples),
      };
    },
  };
}
