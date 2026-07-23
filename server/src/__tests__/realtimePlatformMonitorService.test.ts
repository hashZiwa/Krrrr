import { describe, expect, it, vi } from "vitest";
import type { MobiusClient } from "../clients/mobiusClient.js";
import { createRealtimePlatformMonitorService } from "../services/realtimePlatformMonitorService.js";

function createClient(cins: Array<{ rn: string; con: string }>): Pick<MobiusClient, "getLatestCin"> {
  let index = 0;

  return {
    getLatestCin: vi.fn(async () => cins[Math.min(index++, cins.length - 1)]),
  };
}

function createDiscoveryClient({
  latest,
  cinsByUri,
  currentNrOfInstances = Object.keys(cinsByUri).length,
}: {
  latest: { rn: string; con: string };
  cinsByUri: Record<string, { rn: string; con: string }>;
  currentNrOfInstances?: number;
}): Pick<MobiusClient, "getLatestCin" | "discoverCinUris" | "getCinByUri" | "getContainer"> {
  return {
    getLatestCin: vi.fn(async () => latest),
    discoverCinUris: vi.fn(async () => Object.keys(cinsByUri)),
    getCinByUri: vi.fn(async (uri) => cinsByUri[uri]),
    getContainer: vi.fn(async () => ({ currentNrOfInstances })),
  };
}

describe("createRealtimePlatformMonitorService", () => {
  it("hydrates the current sleep session from platform data when realtime monitoring starts", async () => {
    const client = createDiscoveryClient({
      latest: { rn: "4-20260720181000000", con: "19" },
      cinsByUri: {
        "ae/status/old": { rn: "4-20260720175930000", con: "17" },
        "ae/status/current-1": { rn: "4-20260720180500000", con: "18" },
        "ae/status/current-2": { rn: "4-20260720181000000", con: "19" },
        "ae/status/junk": { rn: "4-20260720181500000", con: "junk" },
      },
    });
    const service = createRealtimePlatformMonitorService(client, {
      breathConditionContainer: "STATUS_CNT/BREATH_CONDITION_CNT",
      pollIntervalMs: 60_000,
      predictionIntervalMs: 60_000,
      now: () => new Date(2026, 6, 20, 20, 0, 0),
    });

    await service.start();
    service.stop();

    expect(client.discoverCinUris).toHaveBeenCalledWith("STATUS_CNT/BREATH_CONDITION_CNT", { offset: 0, limit: 4 });
    expect(service.getState()).toMatchObject({
      primed: true,
      lastRn: "4-20260720181000000",
    });
    expect(service.getState().breathingSamples).toEqual([
      { timestampMs: new Date(2026, 6, 20, 18, 5, 0).getTime(), respiratoryRate: 18 },
      { timestampMs: new Date(2026, 6, 20, 18, 10, 0).getTime(), respiratoryRate: 19 },
    ]);
  });
  it("starts realtime hydration near the latest content instances based on container cni", async () => {
    const client = createDiscoveryClient({
      latest: { rn: "4-20260722035719199", con: "19" },
      currentNrOfInstances: 2_000,
      cinsByUri: {
        "ae/status/current": { rn: "4-20260722035719199", con: "19" },
      },
    });
    const service = createRealtimePlatformMonitorService(client, {
      breathConditionContainer: "STATUS_CNT/BREATH_CONDITION_CNT",
      pollIntervalMs: 60_000,
      predictionIntervalMs: 60_000,
      now: () => new Date(2026, 6, 22, 4, 0, 0),
    });

    await service.start();
    service.stop();

    expect(client.getContainer).toHaveBeenCalledWith("STATUS_CNT/BREATH_CONDITION_CNT");
    expect(client.discoverCinUris).toHaveBeenCalledWith("STATUS_CNT/BREATH_CONDITION_CNT", { offset: 560, limit: 500 });
    expect(service.getState().breathingSamples).toEqual([
      { timestampMs: new Date(2026, 6, 22, 3, 57, 19).getTime(), respiratoryRate: 19 },
    ]);
  });
  it("continues scanning discovery pages until current session data is found", async () => {
    const oldUris = Array.from({ length: 500 }, (_, index) => `ae/status/old-${index}`);
    const cinsByUri = Object.fromEntries(
      oldUris.map((uri, index) => [uri, { rn: `4-2026071917${String(index % 60).padStart(2, "0")}00000`, con: "17" }]),
    );
    cinsByUri["ae/status/current"] = { rn: "4-20260720180500000", con: "18" };
    const discoverCinUris = vi.fn(async (_container: string, options?: { offset?: number; limit?: number }) => {
      if ((options?.offset ?? 0) === 0) return oldUris;
      if (options?.offset === 500) return ["ae/status/current"];
      return [];
    });
    const client: Pick<MobiusClient, "getLatestCin" | "getContainer" | "discoverCinUris" | "getCinByUri"> = {
      getLatestCin: vi.fn(async () => ({ rn: "4-20260720180500000", con: "18" })),
      getContainer: vi.fn(async () => ({ currentNrOfInstances: 501 })),
      discoverCinUris,
      getCinByUri: vi.fn(async (uri) => cinsByUri[uri]),
    };
    const service = createRealtimePlatformMonitorService(client, {
      breathConditionContainer: "STATUS_CNT/BREATH_CONDITION_CNT",
      pollIntervalMs: 60_000,
      predictionIntervalMs: 60_000,
      now: () => new Date(2026, 6, 20, 20, 0, 0),
    });

    await service.start();
    service.stop();

    expect(discoverCinUris).toHaveBeenCalledWith("STATUS_CNT/BREATH_CONDITION_CNT", { offset: 0, limit: 500 });
    expect(discoverCinUris).toHaveBeenCalledWith("STATUS_CNT/BREATH_CONDITION_CNT", { offset: 500, limit: 1 });
    expect(service.getState().breathingSamples).toEqual([
      { timestampMs: new Date(2026, 6, 20, 18, 5, 0).getTime(), respiratoryRate: 18 },
    ]);
  });
  it("uses the first cin as a baseline and records only changed latest cins", async () => {
    const client = createClient([
      { rn: "4-20260720090000000", con: "18" },
      { rn: "4-20260720090000000", con: "18" },
      { rn: "4-20260720090030000", con: "19" },
      { rn: "4-20260720090100000", con: "junk" },
      { rn: "4-20260720090130000", con: "20" },
    ]);
    const service = createRealtimePlatformMonitorService(client, {
      breathConditionContainer: "STATUS_CNT/BREATH_CONDITION_CNT",
    });

    await service.pollLatest();
    await service.pollLatest();
    await service.pollLatest();
    await service.pollLatest();
    await service.pollLatest();

    expect(client.getLatestCin).toHaveBeenCalledWith("STATUS_CNT/BREATH_CONDITION_CNT");
    expect(service.getState().breathingSamples).toEqual([
      { timestampMs: new Date(2026, 6, 20, 9, 0, 30).getTime(), respiratoryRate: 19 },
      { timestampMs: new Date(2026, 6, 20, 9, 1, 30).getTime(), respiratoryRate: 20 },
    ]);
  });


  it("evaluates alarm state on every platform poll", async () => {
    const client = createClient([
      { rn: "4-20260720100000000", con: "18" },
      { rn: "4-20260720100000000", con: "18" },
    ]);
    const evaluate = vi.fn().mockResolvedValue(undefined);
    const service = createRealtimePlatformMonitorService(client, {
      breathConditionContainer: "STATUS_CNT/BREATH_CONDITION_CNT",
      alarmService: { evaluate },
      now: () => new Date(2026, 6, 20, 10, 0, 30),
    });

    await service.pollLatest();
    await service.pollLatest();

    expect(evaluate).toHaveBeenCalledTimes(2);
    expect(evaluate).toHaveBeenLastCalledWith({
      now: new Date(2026, 6, 20, 10, 0, 30),
      latestSleepStage: null,
      sleepStageSamples: [],
    });
  });

  it("predicts sleep stages and backs up a display data csv on refresh", async () => {
    const client = createClient([
      { rn: "4-20260720090000000", con: "18" },
      { rn: "4-20260720090030000", con: "19" },
      { rn: "4-20260720093100000", con: "20" },
    ]);
    const predictFromBreathingSamples = vi.fn().mockResolvedValue([
      { timestampMs: new Date(2026, 6, 20, 9, 31, 0).getTime(), respiratoryRate: 20, sleepStage: 2 },
    ]);
    const savePredictedSession = vi.fn().mockResolvedValue({ fileName: "realtime-breath-condition.csv" });
    const service = createRealtimePlatformMonitorService(client, {
      breathConditionContainer: "STATUS_CNT/BREATH_CONDITION_CNT",
      displayDataService: { savePredictedSession },
      sleepStageTrainingService: { predictFromBreathingSamples },
    });

    await service.pollLatest();
    await service.pollLatest();
    await service.pollLatest();
    await service.pollLatest();
    await service.refreshPredictions();

    expect(predictFromBreathingSamples).toHaveBeenCalledWith([
      { timestampMs: new Date(2026, 6, 20, 9, 31, 0).getTime(), respiratoryRate: 20 },
    ]);
    expect(savePredictedSession).toHaveBeenCalledWith("realtime-breath-condition.csv", [
      { timestampMs: new Date(2026, 6, 20, 9, 0, 30).getTime(), respiratoryRate: 19, sleepStage: null },
      { timestampMs: new Date(2026, 6, 20, 9, 31, 0).getTime(), respiratoryRate: 20, sleepStage: 2 },
    ]);
    expect(service.getSession()).toMatchObject({
      id: "platform-realtime",
      startedAt: "20260720090030",
      endedAt: "20260720093100",
    });
    expect(service.getSession().sleepStageSamples.map((sample) => sample.value)).toEqual([2]);
    expect(service.getSession().breathingSamples.map((sample) => sample.value)).toEqual([19, 20]);
  });

  it("evaluates alarm state after refreshing sleep stage predictions", async () => {
    const client = createClient([
      { rn: "4-20260720090000000", con: "18" },
      { rn: "4-20260720090030000", con: "19" },
      { rn: "4-20260720093100000", con: "20" },
    ]);
    const evaluate = vi.fn().mockResolvedValue(undefined);
    const service = createRealtimePlatformMonitorService(client, {
      breathConditionContainer: "STATUS_CNT/BREATH_CONDITION_CNT",
      displayDataService: { savePredictedSession: vi.fn().mockResolvedValue({ fileName: "realtime.csv" }) },
      sleepStageTrainingService: {
        predictFromBreathingSamples: vi
          .fn()
          .mockResolvedValue([{ timestampMs: new Date(2026, 6, 20, 9, 31, 0).getTime(), respiratoryRate: 20, sleepStage: 1 }]),
      },
      alarmService: { evaluate },
    });

    await service.pollLatest();
    await service.pollLatest();
    await service.pollLatest();
    await service.refreshPredictions();

    expect(evaluate).toHaveBeenLastCalledWith({
      now: expect.any(Date),
      latestSleepStage: 1,
      sleepStageSamples: [{ timestampMs: new Date(2026, 6, 20, 9, 31, 0).getTime(), sleepStage: 1 }],
    });
  });

  it("saves the current realtime session as a display data csv", async () => {
    const client = createClient([
      { rn: "4-20260720090000000", con: "18" },
      { rn: "4-20260720090030000", con: "19" },
      { rn: "4-20260720093100000", con: "20" },
    ]);
    const predictFromBreathingSamples = vi.fn().mockResolvedValue([
      { timestampMs: new Date(2026, 6, 20, 9, 0, 30).getTime(), respiratoryRate: 19, sleepStage: 1 },
      { timestampMs: new Date(2026, 6, 20, 9, 31, 0).getTime(), respiratoryRate: 20, sleepStage: 2 },
    ]);
    const getSavedSessionSampleCount = vi.fn().mockResolvedValue(1);
    const savePredictedSession = vi.fn().mockResolvedValue({ fileName: "platform-breath-condition-2026-07-19.csv" });
    const service = createRealtimePlatformMonitorService(client, {
      breathConditionContainer: "STATUS_CNT/BREATH_CONDITION_CNT",
      displayDataService: { savePredictedSession, getSavedSessionSampleCount },
      sleepStageTrainingService: { predictFromBreathingSamples },
    });

    await service.pollLatest();
    await service.pollLatest();
    await service.pollLatest();

    await expect(service.saveCurrentSession()).resolves.toEqual({
      saved: true,
      fileName: "platform-breath-condition-2026-07-19.csv",
      sampleCount: 2,
    });
    expect(getSavedSessionSampleCount).toHaveBeenCalledWith("platform-breath-condition-2026-07-19.csv");
    expect(savePredictedSession).toHaveBeenCalledWith("platform-breath-condition-2026-07-19.csv", [
      { timestampMs: new Date(2026, 6, 20, 9, 0, 30).getTime(), respiratoryRate: 19, sleepStage: 1 },
      { timestampMs: new Date(2026, 6, 20, 9, 31, 0).getTime(), respiratoryRate: 20, sleepStage: 2 },
    ]);
  });

  it("keeps the existing platform-named realtime dataset when it already has at least as many samples", async () => {
    const client = createClient([
      { rn: "4-20260720090000000", con: "18" },
      { rn: "4-20260720090030000", con: "19" },
      { rn: "4-20260720093100000", con: "20" },
    ]);
    const predictFromBreathingSamples = vi.fn().mockResolvedValue([
      { timestampMs: new Date(2026, 6, 20, 9, 0, 30).getTime(), respiratoryRate: 19, sleepStage: 1 },
      { timestampMs: new Date(2026, 6, 20, 9, 31, 0).getTime(), respiratoryRate: 20, sleepStage: 2 },
    ]);
    const getSavedSessionSampleCount = vi.fn().mockResolvedValue(2);
    const savePredictedSession = vi.fn().mockResolvedValue({ fileName: "platform-breath-condition-2026-07-19.csv" });
    const service = createRealtimePlatformMonitorService(client, {
      breathConditionContainer: "STATUS_CNT/BREATH_CONDITION_CNT",
      displayDataService: { savePredictedSession, getSavedSessionSampleCount },
      sleepStageTrainingService: { predictFromBreathingSamples },
    });

    await service.pollLatest();
    await service.pollLatest();
    await service.pollLatest();

    await expect(service.saveCurrentSession()).resolves.toEqual({
      saved: true,
      fileName: "platform-breath-condition-2026-07-19.csv",
      sampleCount: 2,
    });
    expect(getSavedSessionSampleCount).toHaveBeenCalledWith("platform-breath-condition-2026-07-19.csv");
    expect(savePredictedSession).not.toHaveBeenCalled();
  });
  it("skips saving when only the baseline cin has been checked", async () => {
    const client = createClient([{ rn: "4-20260720090000000", con: "18" }]);
    const service = createRealtimePlatformMonitorService(client, {
      breathConditionContainer: "STATUS_CNT/BREATH_CONDITION_CNT",
    });

    await service.pollLatest();

    await expect(service.saveCurrentSession()).resolves.toEqual({
      saved: false,
      fileName: null,
      sampleCount: 0,
      reason: "no_data",
    });
  });
});
