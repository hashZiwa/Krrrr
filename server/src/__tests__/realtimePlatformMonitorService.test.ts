import { describe, expect, it, vi } from "vitest";
import type { MobiusClient } from "../clients/mobiusClient.js";
import { createRealtimePlatformMonitorService } from "../services/realtimePlatformMonitorService.js";

function createClient(cins: Array<{ rn: string; con: string }>): Pick<MobiusClient, "getLatestCin"> {
  let index = 0;

  return {
    getLatestCin: vi.fn(async () => cins[Math.min(index++, cins.length - 1)]),
  };
}

describe("createRealtimePlatformMonitorService", () => {
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

  it("predicts sleep stages and backs up a display data csv on refresh", async () => {
    const client = createClient([
      { rn: "4-20260720090000000", con: "18" },
      { rn: "4-20260720090030000", con: "19" },
      { rn: "4-20260720090100000", con: "20" },
    ]);
    const predictFromBreathingSamples = vi.fn().mockResolvedValue([
      { timestampMs: new Date(2026, 6, 20, 9, 0, 30).getTime(), respiratoryRate: 19, sleepStage: 1 },
      { timestampMs: new Date(2026, 6, 20, 9, 1, 0).getTime(), respiratoryRate: 20, sleepStage: 2 },
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
    await service.refreshPredictions();

    expect(predictFromBreathingSamples).toHaveBeenCalledWith([
      { timestampMs: new Date(2026, 6, 20, 9, 0, 30).getTime(), respiratoryRate: 19 },
      { timestampMs: new Date(2026, 6, 20, 9, 1, 0).getTime(), respiratoryRate: 20 },
    ]);
    expect(savePredictedSession).toHaveBeenCalledWith("realtime-breath-condition.csv", [
      { timestampMs: new Date(2026, 6, 20, 9, 0, 30).getTime(), respiratoryRate: 19, sleepStage: 1 },
      { timestampMs: new Date(2026, 6, 20, 9, 1, 0).getTime(), respiratoryRate: 20, sleepStage: 2 },
    ]);
    expect(service.getSession()).toMatchObject({
      id: "platform-realtime",
      startedAt: "20260720090030",
      endedAt: "20260720090100",
    });
    expect(service.getSession().sleepStageSamples.map((sample) => sample.value)).toEqual([1, 2]);
    expect(service.getSession().breathingSamples.map((sample) => sample.value)).toEqual([19, 20]);
  });

  it("evaluates alarm state after refreshing sleep stage predictions", async () => {
    const client = createClient([
      { rn: "4-20260720090000000", con: "18" },
      { rn: "4-20260720090030000", con: "19" },
    ]);
    const evaluate = vi.fn().mockResolvedValue(undefined);
    const service = createRealtimePlatformMonitorService(client, {
      breathConditionContainer: "STATUS_CNT/BREATH_CONDITION_CNT",
      displayDataService: { savePredictedSession: vi.fn().mockResolvedValue({ fileName: "realtime.csv" }) },
      sleepStageTrainingService: {
        predictFromBreathingSamples: vi
          .fn()
          .mockResolvedValue([{ timestampMs: new Date(2026, 6, 20, 9, 0, 30).getTime(), respiratoryRate: 19, sleepStage: 1 }]),
      },
      alarmService: { evaluate },
    });

    await service.pollLatest();
    await service.pollLatest();
    await service.refreshPredictions();

    expect(evaluate).toHaveBeenCalledWith({ latestSleepStage: 1 });
  });

  it("saves the current realtime session as a display data csv", async () => {
    const client = createClient([
      { rn: "4-20260720090000000", con: "18" },
      { rn: "4-20260720090030000", con: "19" },
      { rn: "4-20260720090100000", con: "20" },
    ]);
    const predictFromBreathingSamples = vi.fn().mockResolvedValue([
      { timestampMs: new Date(2026, 6, 20, 9, 0, 30).getTime(), respiratoryRate: 19, sleepStage: 1 },
      { timestampMs: new Date(2026, 6, 20, 9, 1, 0).getTime(), respiratoryRate: 20, sleepStage: 2 },
    ]);
    const savePredictedSession = vi.fn().mockResolvedValue({ fileName: "realtime-breath-condition-2026-07-20-090100.csv" });
    const service = createRealtimePlatformMonitorService(client, {
      breathConditionContainer: "STATUS_CNT/BREATH_CONDITION_CNT",
      displayDataService: { savePredictedSession },
      sleepStageTrainingService: { predictFromBreathingSamples },
    });

    await service.pollLatest();
    await service.pollLatest();
    await service.pollLatest();

    await expect(service.saveCurrentSession()).resolves.toEqual({
      saved: true,
      fileName: "realtime-breath-condition-2026-07-20-090100.csv",
      sampleCount: 2,
    });
    expect(savePredictedSession).toHaveBeenCalledWith("realtime-breath-condition-2026-07-20-090100.csv", [
      { timestampMs: new Date(2026, 6, 20, 9, 0, 30).getTime(), respiratoryRate: 19, sleepStage: 1 },
      { timestampMs: new Date(2026, 6, 20, 9, 1, 0).getTime(), respiratoryRate: 20, sleepStage: 2 },
    ]);
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
