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
});
