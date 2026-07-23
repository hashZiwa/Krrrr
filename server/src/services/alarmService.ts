import type { MobiusCin, MobiusClient } from "../clients/mobiusClient.js";
import type { SleepStageValue } from "../ml/sleepStageDataset.js";

export type AlarmSettings = {
  enabled: boolean;
  time: string;
  active: boolean;
};

export type AlarmContainers = {
  enabled: string;
  time: string;
  status: string;
};

export type AlarmService = {
  loadSettings(): Promise<AlarmSettings>;
  getSettings(): AlarmSettings;
  updateEnabled(enabled: boolean): Promise<AlarmSettings>;
  updateTime(time: string): Promise<AlarmSettings>;
  updateStatus(active: boolean): Promise<AlarmSettings>;
  evaluate(input: {
    now?: Date;
    latestSleepStage: SleepStageValue | null;
    sleepStageSamples?: Array<{ timestampMs: number; sleepStage: SleepStageValue }>;
  }): Promise<AlarmSettings>;
};

function parseBooleanContent(value: MobiusCin["con"], fallback: boolean): boolean {
  if (value === true || value === "1" || value === 1) return true;
  if (value === false || value === "0" || value === 0) return false;
  return fallback;
}

function parseAlarmTime(value: MobiusCin["con"], fallback: string): string {
  const text = String(value ?? "");
  return /^\d{4}$/.test(text) ? text : fallback;
}

function getTodayAlarmAt(now: Date, time: string): Date {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    Number(time.slice(0, 2)),
    Number(time.slice(2, 4)),
    0,
    0,
  );
}

function isLightEnoughToWake(stage: SleepStageValue | null): boolean {
  return stage === 0 || stage === 1;
}

function hasLightSleepStageInWindow(
  samples: Array<{ timestampMs: number; sleepStage: SleepStageValue }> | undefined,
  observeFrom: Date,
  now: Date,
): boolean {
  return (
    samples?.some(
      (sample) =>
        sample.timestampMs >= observeFrom.getTime() &&
        sample.timestampMs <= now.getTime() &&
        isLightEnoughToWake(sample.sleepStage),
    ) ?? false
  );
}

export function createAlarmService(
  client: Pick<MobiusClient, "getLatestCin" | "createCin">,
  containers: AlarmContainers,
): AlarmService {
  const settings: AlarmSettings = {
    enabled: false,
    time: "1000",
    active: false,
  };

  async function uploadStatus(active: boolean): Promise<void> {
    if (settings.active === active) return;

    settings.active = active;
    await client.createCin(containers.status, active ? "1" : "0");
  }

  return {
    async loadSettings() {
      const [enabled, time, active] = await Promise.all([
        client.getLatestCin(containers.enabled).catch(() => null),
        client.getLatestCin(containers.time).catch(() => null),
        client.getLatestCin(containers.status).catch(() => null),
      ]);

      settings.enabled = parseBooleanContent(enabled?.con, settings.enabled);
      settings.time = parseAlarmTime(time?.con, settings.time);
      settings.active = parseBooleanContent(active?.con, settings.active);

      return { ...settings };
    },

    getSettings() {
      return { ...settings };
    },

    async updateEnabled(enabled) {
      settings.enabled = enabled;
      await client.createCin(containers.enabled, enabled ? "1" : "0");
      if (!enabled) await uploadStatus(false);
      return { ...settings };
    },

    async updateTime(time) {
      settings.time = parseAlarmTime(time, settings.time);
      await client.createCin(containers.time, settings.time);
      return { ...settings };
    },

    async updateStatus(active) {
      await uploadStatus(active);
      return { ...settings };
    },

    async evaluate({ now = new Date(), latestSleepStage, sleepStageSamples }) {
      if (!settings.enabled) {
        await uploadStatus(false);
        return { ...settings };
      }

      const alarmAt = getTodayAlarmAt(now, settings.time);
      const observeFrom = new Date(alarmAt.getTime() - 30 * 60_000);
      const alarmOffAfter = new Date(alarmAt.getTime() + 60_000);

      if (now.getTime() < observeFrom.getTime()) {
        await uploadStatus(false);
        return { ...settings };
      }

      if (now.getTime() >= alarmOffAfter.getTime()) {
        await uploadStatus(false);
        return { ...settings };
      }

      const hasLightStageInObserveWindow = hasLightSleepStageInWindow(sleepStageSamples, observeFrom, now);

      if (now.getTime() >= alarmAt.getTime() || hasLightStageInObserveWindow || (now >= observeFrom && isLightEnoughToWake(latestSleepStage))) {
        await uploadStatus(true);
      }

      return { ...settings };
    },
  };
}
