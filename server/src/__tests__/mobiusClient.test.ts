import { describe, expect, it, vi } from "vitest";
import { createMobiusClient } from "../clients/mobiusClient.js";
import type { MobiusConfig } from "../config/mobiusConfig.js";

const config: MobiusConfig = {
  baseUrl: "https://onem2m.example.test",
  aePath: "Mobius/ae_Test",
  requestIdentifier: "123",
  origin: "SOrigin_Test",
  apiKey: "secret",
  creator: "creator",
  lecture: "lecture",
  statusContainers: {},
  uploadContainers: {},
};

describe("createMobiusClient", () => {
  it("creates a content instance with oneM2M headers and body", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ "m2m:cin": { rn: "4-test", ri: "ri-1", con: "uploaded" } }),
    });
    const client = createMobiusClient(config, fetchImpl);

    const result = await client.createCin("ANALYSIS/SLEEP_CN", "uploaded");

    expect(fetchImpl).toHaveBeenCalledWith("https://onem2m.example.test/Mobius/ae_Test/ANALYSIS/SLEEP_CN", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json;ty=4",
        "X-API-KEY": "secret",
        "X-AUTH-CUSTOM-CREATOR": "creator",
        "X-AUTH-CUSTOM-LECTURE": "lecture",
        "X-M2M-Origin": "SOrigin_Test",
        "X-M2M-RI": "123",
      },
      body: expect.stringMatching(/"m2m:cin"/),
    });
    expect(result).toEqual({ rn: "4-test", ri: "ri-1", con: "uploaded" });
  });

  it("gets the latest content instance from a container", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ "m2m:cin": { rn: "la", ri: "ri-2", con: "latest" } }),
    });
    const client = createMobiusClient(config, fetchImpl);

    await client.getLatestCin("ANALYSIS/SLEEP_CN");

    expect(fetchImpl).toHaveBeenCalledWith("https://onem2m.example.test/Mobius/ae_Test/ANALYSIS/SLEEP_CN/la", {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-API-KEY": "secret",
        "X-AUTH-CUSTOM-CREATOR": "creator",
        "X-AUTH-CUSTOM-LECTURE": "lecture",
        "X-M2M-Origin": "SOrigin_Test",
        "X-M2M-RI": "123",
      },
    });
  });

  it("discovers child content instance URIs with a 500 item page", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        "m2m:uril": [
          "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260718180421712",
          "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260718175452835",
        ],
      }),
    });
    const client = createMobiusClient(config, fetchImpl);

    const result = await client.discoverCinUris("STATUS_CNT/BREATH_CONDITION_CNT", { offset: 0, limit: 500 });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://onem2m.example.test/Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT?fu=1&lvl=1&ty=4&ofst=0&lim=500&drt=2",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-API-KEY": "secret",
          "X-AUTH-CUSTOM-CREATOR": "creator",
          "X-AUTH-CUSTOM-LECTURE": "lecture",
          "X-M2M-Origin": "SOrigin_Test",
          "X-M2M-RI": "123",
        },
      },
    );
    expect(result).toEqual([
      "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260718180421712",
      "Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260718175452835",
    ]);
  });

  it("gets a content instance by discovered URI", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ "m2m:cin": { rn: "4-20260718180421712", ri: "ri-3", con: 17 } }),
    });
    const client = createMobiusClient(config, fetchImpl);

    const result = await client.getCinByUri("Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260718180421712");

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://onem2m.example.test/Mobius/ae_Test/STATUS_CNT/BREATH_CONDITION_CNT/4-20260718180421712",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-API-KEY": "secret",
          "X-AUTH-CUSTOM-CREATOR": "creator",
          "X-AUTH-CUSTOM-LECTURE": "lecture",
          "X-M2M-Origin": "SOrigin_Test",
          "X-M2M-RI": "123",
        },
      },
    );
    expect(result).toEqual({ rn: "4-20260718180421712", ri: "ri-3", con: 17 });
  });
});
