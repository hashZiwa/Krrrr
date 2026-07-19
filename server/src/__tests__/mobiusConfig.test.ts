import { describe, expect, it } from "vitest";
import { getMobiusConfig } from "../config/mobiusConfig.js";

describe("getMobiusConfig", () => {
  it("keeps Mobius config optional until platform integration is used", () => {
    expect(getMobiusConfig({})).toBeNull();
  });

  it("requires all common platform values when any Mobius value is present", () => {
    expect(() =>
      getMobiusConfig({
        MOBIUS_BASE_URL: "https://onem2m.example.test",
      }),
    ).toThrow("Missing Mobius environment variables");
  });

  it("parses common platform values and per-feature container mappings", () => {
    const config = getMobiusConfig({
      MOBIUS_BASE_URL: "https://onem2m.example.test/",
      MOBIUS_AE_PATH: "Mobius/ae_Test",
      MOBIUS_X_M2M_RI: "123",
      MOBIUS_X_M2M_ORIGIN: "SOrigin_Test",
      MOBIUS_API_KEY: "secret",
      MOBIUS_AUTH_CUSTOM_CREATOR: "creator",
      MOBIUS_AUTH_CUSTOM_LECTURE: "lecture",
      MOBIUS_UPLOAD_CONTAINER_SLEEP_ANALYSIS: "ANALYSIS/SLEEP_CN",
      MOBIUS_UPLOAD_CONTAINER_EVENT_NOTE: "ANALYSIS/EVENT_NOTE_CN",
    });

    expect(config).toEqual({
      baseUrl: "https://onem2m.example.test",
      aePath: "Mobius/ae_Test",
      requestIdentifier: "123",
      origin: "SOrigin_Test",
      apiKey: "secret",
      creator: "creator",
      lecture: "lecture",
      uploadContainers: {
        eventNote: "ANALYSIS/EVENT_NOTE_CN",
        sleepAnalysis: "ANALYSIS/SLEEP_CN",
      },
    });
  });
});
