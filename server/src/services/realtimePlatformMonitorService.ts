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

export type RealtimePlatformSaveResult =
  | {
      saved: true;
      fileName: string;
      sampleCount: number;
    }
  | {
      saved: false;
      fileName: null;
      sampleCount: number;
      reason: "no_data";
    };

export type RealtimePlatformMonitorService = {
  start(): void | Promise<void>;
  stop(): void;
  pollLatest(): Promise<void>;
  refreshPredictions(): Promise<void>;
  saveCurrentSession(): Promise<RealtimePlatformSaveResult>;
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
  now?: () => Date;
};

const discoveryLimit = 500;
const realtimeHydrationMaxSamples = 1_440;
const initialAnalysisExclusionMs = 30 * 60 * 1000;

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

function getCurrentSleepSessionRange(now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(18, 0, 0, 0);

  if (now.getTime() < start.getTime()) {
    start.setDate(start.getDate() - 1);
  }

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function getRnFromUri(uri: string): string | null {
  return uri.split("/").filter(Boolean).at(-1) ?? null;
}

function hasPlatformDiscoveryClient(
  client: Pick<MobiusClient, "getLatestCin"> & Partial<Pick<MobiusClient, "getContainer" | "discoverCinUris" | "getCinByUri">>,
): client is Pick<MobiusClient, "getLatestCin" | "getContainer" | "discoverCinUris" | "getCinByUri"> {
  return (
    typeof client.getContainer === "function" &&
    typeof client.discoverCinUris === "function" &&
    typeof client.getCinByUri === "function"
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

function getAnalysisStartMs(samples: BreathingSample[]): number {
  return samples[0]?.timestampMs + initialAnalysisExclusionMs;
}

function getAnalysisSamples(samples: BreathingSample[]): BreathingSample[] {
  const analysisStartMs = getAnalysisStartMs(samples);
  return samples.filter((sample) => sample.timestampMs >= analysisStartMs);
}

function toPredictedDisplayRows(
  breathingSamples: BreathingSample[],
  predictions: SleepStagePredictedSample[],
): PredictedDisplayDataRow[] {
  const predictionsByTimestamp = new Map(predictions.map((sample) => [sample.timestampMs, sample.sleepStage]));

  return breathingSamples.map((sample) => ({
    timestampMs: sample.timestampMs,
    respiratoryRate: sample.respiratoryRate,
    sleepStage: predictionsByTimestamp.get(sample.timestampMs) ?? null,
  }));
}
function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function getSleepSessionStart(date: Date): Date {
  const start = new Date(date);
  start.setHours(18, 0, 0, 0);

  if (date.getTime() < start.getTime()) {
    start.setDate(start.getDate() - 1);
  }

  return start;
}
function toPlatformBreathConditionSaveFileName(timestampMs: number): string {
  return `platform-breath-condition-${formatDateKey(getSleepSessionStart(new Date(timestampMs)))}.csv`;
}

export function createRealtimePlatformMonitorService(
  client: Pick<MobiusClient, "getLatestCin"> & Partial<Pick<MobiusClient, "getContainer" | "discoverCinUris" | "getCinByUri">>,
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

  async function predictCurrentSamples(): Promise<SleepStagePredictedSample[]> {
    if (!options.sleepStageTrainingService) {
      throw new Error("Realtime sleep stage prediction is not configured");
    }

    const analysisSamples = getAnalysisSamples(breathingSamples);

    predictedSamples =
      analysisSamples.length > 0 ? await options.sleepStageTrainingService.predictFromBreathingSamples(analysisSamples) : [];

    return predictedSamples;
  }

  async function refreshPredictionMemory(): Promise<void> {
    if (breathingSamples.length === 0 || !options.sleepStageTrainingService) return;

    predictedSamples = await predictCurrentSamples();
    await options.alarmService?.evaluate({
      latestSleepStage: predictedSamples[predictedSamples.length - 1]?.sleepStage ?? null,
    });
    lastPredictionAt = new Date().toISOString();
  }

  async function hydrateCurrentSessionFromPlatform(): Promise<void> {
    breathingSamples.length = 0;
    predictedSamples = [];
    lastPredictionAt = null;
    lastRn = null;
    primed = false;

    if (!hasPlatformDiscoveryClient(client)) return;

    const { start, end } = getCurrentSleepSessionRange(options.now?.() ?? new Date());
    const { currentNrOfInstances } = await client.getContainer(options.breathConditionContainer);
    const discoveryStartOffset = Math.max(0, currentNrOfInstances - realtimeHydrationMaxSamples);
    const discoveryEndOffset = currentNrOfInstances;
    const hydratedSamples: Array<BreathingSample & { rn: string }> = [];
    let offset = discoveryStartOffset;

    while (offset < discoveryEndOffset) {
      const limit = Math.min(discoveryLimit, discoveryEndOffset - offset);
      const uris = await client.discoverCinUris(options.breathConditionContainer, { offset, limit });
      if (uris.length === 0) break;

      const sortedUris = [...uris].sort((left, right) => (getRnFromUri(right) ?? "").localeCompare(getRnFromUri(left) ?? ""));
      const cins = await Promise.all(sortedUris.map((uri) => client.getCinByUri(uri)));
      for (const [index, cin] of cins.entries()) {
        const uri = sortedUris[index];
        const rn = cin.rn ?? getRnFromUri(uri);
        if (!rn) continue;

        const measuredAt = parseCinDateFromRn(rn);
        if (!measuredAt) continue;

        if (measuredAt.getTime() < start.getTime() || measuredAt.getTime() >= end.getTime()) continue;

        const respiratoryRate = parseBreathConditionValue(cin.con);
        if (respiratoryRate === null) continue;

        hydratedSamples.push({ timestampMs: measuredAt.getTime(), respiratoryRate, rn });
      }

      offset += limit;

      if (uris.length < limit) break;
    }

    if (hydratedSamples.length === 0) return;

    const sortedSamples = [...hydratedSamples].sort((left, right) => left.timestampMs - right.timestampMs);
    breathingSamples.push(...sortedSamples.map(({ timestampMs, respiratoryRate }) => ({ timestampMs, respiratoryRate })));
    lastRn = sortedSamples.reduce((latest, sample) => (sample.rn.localeCompare(latest) > 0 ? sample.rn : latest), sortedSamples[0].rn);
    primed = true;
  }
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
      predictedSamples = await predictCurrentSamples();
      await options.displayDataService.savePredictedSession(backupFileName, toPredictedDisplayRows(breathingSamples, predictedSamples));
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
    async start() {
      if (running) return;

      running = true;

      try {
        await hydrateCurrentSessionFromPlatform();
        await refreshPredictionMemory();
        await pollLatest();
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Unknown realtime platform start failure";
      }

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

    async saveCurrentSession() {
      if (breathingSamples.length === 0) {
        return {
          saved: false,
          fileName: null,
          sampleCount: 0,
          reason: "no_data",
        };
      }

      if (!options.displayDataService) {
        throw new Error("Realtime display data saving is not configured");
      }

      const analysisSamples = getAnalysisSamples(breathingSamples);
      const hasFreshPredictions =
        predictedSamples.length === analysisSamples.length &&
        predictedSamples[predictedSamples.length - 1]?.timestampMs === analysisSamples[analysisSamples.length - 1]?.timestampMs;
      const samplesToSave = hasFreshPredictions ? predictedSamples : await predictCurrentSamples();
      const fileName = toPlatformBreathConditionSaveFileName(breathingSamples[0].timestampMs);
      const savedCount = (await options.displayDataService.getSavedSessionSampleCount?.(fileName)) ?? null;

      if (savedCount !== null && savedCount >= breathingSamples.length) {
        return {
          saved: true,
          fileName,
          sampleCount: breathingSamples.length,
        };
      }

      const result = await options.displayDataService.savePredictedSession(fileName, toPredictedDisplayRows(breathingSamples, samplesToSave));

      return {
        saved: true,
        fileName: result.fileName,
        sampleCount: breathingSamples.length,
      };
    },

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
