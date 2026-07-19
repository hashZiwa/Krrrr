import { describe, expect, it, vi } from "vitest";
import type { MobiusClient } from "../clients/mobiusClient.js";
import { createPlatformDataService } from "../services/platformDataService.js";

function createClient(): MobiusClient {
  return {
    createCin: vi.fn(),
    getLatestCin: vi.fn(),
    discoverCinUris: vi.fn().mockResolvedValue([
      "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260718175959000",
      "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260718180000000",
      "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260719175959000",
      "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260719180000000",
    ]),
    getCinByUri: vi.fn(async (uri: string) => ({
      rn: uri.split("/").at(-1),
      con: uri.includes("180000000") ? 20 : 12,
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
    expect(result).toMatchObject({ nextOffset: 1000, hasMore: false, itemCount: 4 });
    expect(result.groups).toEqual([
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
      {
        key: "2026-07-18",
        label: "2026-07-18 18:00 - 2026-07-19 18:00",
        startAt: "20260718180000",
        endAt: "20260719180000",
        count: 2,
        items: [
          {
            rn: "4-20260718180000000",
            uri: "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260718180000000",
          },
          {
            rn: "4-20260719175959000",
            uri: "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260719175959000",
          },
        ],
      },
      {
        key: "2026-07-19",
        label: "2026-07-19 18:00 - 2026-07-20 18:00",
        startAt: "20260719180000",
        endAt: "20260720180000",
        count: 1,
        items: [
          {
            rn: "4-20260719180000000",
            uri: "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260719180000000",
          },
        ],
      },
    ]);
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
        ],
      },
    ]);

    expect(csv).toContain("groupLabel,rn,measuredAt,con");
    expect(csv).toContain("2026-07-18 18:00 - 2026-07-19 18:00,4-20260718180000000,20260718180000,20");
    expect(csv).toContain("2026-07-18 18:00 - 2026-07-19 18:00,4-20260719175959000,20260719175959,12");
    expect(csv).not.toContain("4-20260718175959000");
  });
});
