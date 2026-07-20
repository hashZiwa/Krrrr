import { describe, expect, it, vi } from "vitest";
import type { MobiusClient } from "../clients/mobiusClient.js";
import { createPlatformDataService } from "../services/platformDataService.js";

function createClient(): MobiusClient {
  return {
    createCin: vi.fn(),
    getLatestCin: vi.fn(),
    discoverCinUris: vi.fn().mockResolvedValue([
      "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260719190000000",
      "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260719185000000",
      "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260718175959000",
      "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260718180000000",
      "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260718180500000",
      "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260719175959000",
      "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260719180000000",
    ]),
    getCinByUri: vi.fn(async (uri: string) => ({
      rn: uri.split("/").at(-1),
      con: uri.includes("19190000000")
        ? "17"
        : uri.includes("19185000000")
          ? "61"
          : uri.includes("180000000")
            ? "20"
            : "12",
    })),
  };
}

describe("platformDataService", () => {
  it("groups discovered breath condition cin entries by 18:00 day boundaries", async () => {
    const client = createClient();
    const service = createPlatformDataService(client, {
      breathConditionContainer: "STATUS_CNT/BREATH_CONDITION_CNT",
    });

    const result = await service.discoverBreathConditionGroups({ offset: 500 });

    expect(client.discoverCinUris).toHaveBeenCalledWith("STATUS_CNT/BREATH_CONDITION_CNT", {
      offset: 500,
      limit: 500,
    });
    expect(result).toMatchObject({ nextOffset: 1000, hasMore: false, itemCount: 7 });
    expect(result.groups).toEqual([
      {
        key: "2026-07-19",
        label: "2026-07-19 18:00 - 2026-07-20 18:00",
        startAt: "20260719180000",
        endAt: "20260720180000",
        count: 2,
        items: [
          {
            rn: "4-20260719190000000",
            uri: "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260719190000000",
          },
          {
            rn: "4-20260719180000000",
            uri: "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260719180000000",
          },
        ],
      },
      {
        key: "2026-07-18",
        label: "2026-07-18 18:00 - 2026-07-19 18:00",
        startAt: "20260718180000",
        endAt: "20260719180000",
        count: 3,
        items: [
          {
            rn: "4-20260719175959000",
            uri: "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260719175959000",
          },
          {
            rn: "4-20260718180500000",
            uri: "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260718180500000",
          },
          {
            rn: "4-20260718180000000",
            uri: "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260718180000000",
          },
        ],
      },
      {
        key: "2026-07-17",
        label: "2026-07-17 18:00 - 2026-07-18 18:00",
        startAt: "20260717180000",
        endAt: "20260718180000",
        count: 1,
        items: [
          {
            rn: "4-20260718175959000",
            uri: "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260718175959000",
          },
        ],
      },
    ]);
    expect(client.getCinByUri).toHaveBeenCalledTimes(7);
  });

  it("exports selected groups as csv by loading each discovered cin", async () => {
    const client = createClient();
    const service = createPlatformDataService(client, {
      breathConditionContainer: "STATUS_CNT/BREATH_CONDITION_CNT",
    });

    const csv = await service.exportBreathConditionCsv([
      {
        label: "2026-07-18 18:00 - 2026-07-19 18:00",
        items: [
          { rn: "4-20260718180000000", uri: "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260718180000000" },
          { rn: "4-20260719175959000", uri: "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260719175959000" },
          { rn: "4-20260719190000000", uri: "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260719190000000" },
        ],
      },
    ]);

    expect(csv).toContain("groupLabel,rn,measuredAt,con");
    expect(csv).toContain("2026-07-18 18:00 - 2026-07-19 18:00,4-20260718180000000,20260718180000,20");
    expect(csv).toContain("2026-07-18 18:00 - 2026-07-19 18:00,4-20260719175959000,20260719175959,12");
    expect(csv).toContain("2026-07-18 18:00 - 2026-07-19 18:00,4-20260719190000000,20260719190000,17");
    expect(csv).not.toContain("4-20260718175959000");
  });

  it("keeps pagination based on raw discovery count while grouping only valid numeric content", async () => {
    const rawUris = Array.from({ length: 500 }, (_, index) => {
      const second = String(index % 60).padStart(2, "0");
      return `Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-202607191900${second}000`;
    });
    const client = createClient();
    vi.mocked(client.discoverCinUris).mockResolvedValue(rawUris);
    vi.mocked(client.getCinByUri).mockImplementation(async (uri: string) => ({
      rn: uri.split("/").at(-1),
      con: uri.endsWith("000000") ? "-1" : "junk",
    }));
    const service = createPlatformDataService(client, {
      breathConditionContainer: "STATUS_CNT/BREATH_CONDITION_CNT",
    });

    const result = await service.discoverBreathConditionGroups();

    expect(result.hasMore).toBe(true);
    expect(result.itemCount).toBe(500);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].count).toBe(9);
  });

  it("saves selected platform data as display data with predicted sleep stages", async () => {
    const client = createClient();
    const savePredictedSession = vi.fn().mockResolvedValue({
      fileName: "platform-breath-condition-2026-07-18.csv",
    });
    const predictFromBreathingSamples = vi.fn().mockResolvedValue([
      { timestampMs: new Date(2026, 6, 18, 18, 0, 0).getTime(), respiratoryRate: 20, sleepStage: 1 },
      { timestampMs: new Date(2026, 6, 18, 18, 5, 0).getTime(), respiratoryRate: 12, sleepStage: 2 },
      { timestampMs: new Date(2026, 6, 19, 17, 59, 59).getTime(), respiratoryRate: 12, sleepStage: 3 },
    ]);
    const service = createPlatformDataService(client, {
      breathConditionContainer: "STATUS_CNT/BREATH_CONDITION_CNT",
      displayDataService: { savePredictedSession },
      sleepStageTrainingService: { predictFromBreathingSamples },
    });

    const result = await service.saveBreathConditionDisplayData([
      {
        label: "2026-07-18 18:00 - 2026-07-19 18:00",
        items: [
          { rn: "4-20260719175959000", uri: "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260719175959000" },
          { rn: "4-20260718180500000", uri: "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260718180500000" },
          { rn: "4-20260718180000000", uri: "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260718180000000" },
        ],
      },
    ]);

    expect(predictFromBreathingSamples).toHaveBeenCalledWith([
      { timestampMs: new Date(2026, 6, 18, 18, 0, 0).getTime(), respiratoryRate: 20 },
      { timestampMs: new Date(2026, 6, 18, 18, 5, 0).getTime(), respiratoryRate: 12 },
      { timestampMs: new Date(2026, 6, 19, 17, 59, 59).getTime(), respiratoryRate: 12 },
    ]);
    expect(savePredictedSession).toHaveBeenCalledWith("platform-breath-condition-2026-07-18.csv", [
      { timestampMs: new Date(2026, 6, 18, 18, 0, 0).getTime(), respiratoryRate: 20, sleepStage: 1 },
      { timestampMs: new Date(2026, 6, 18, 18, 5, 0).getTime(), respiratoryRate: 12, sleepStage: 2 },
      { timestampMs: new Date(2026, 6, 19, 17, 59, 59).getTime(), respiratoryRate: 12, sleepStage: 3 },
    ]);
    expect(result).toEqual({
      fileName: "platform-breath-condition-2026-07-18.csv",
      sampleCount: 3,
    });
  });
});
