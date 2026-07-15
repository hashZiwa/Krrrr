import { describe, expect, it } from "vitest";
import { createSleepDataProvider } from "../providers/sleepDataProviderFactory.js";

describe("createSleepDataProvider", () => {
  it("returns the mock provider when SLEEP_DATA_SOURCE is mock", () => {
    const provider = createSleepDataProvider({ port: 4000, sleepDataSource: "mock" });

    expect(provider).toHaveProperty("getLatestSession");
  });

  it("blocks the real platform provider until explicitly implemented", () => {
    expect(() =>
      createSleepDataProvider({ port: 4000, sleepDataSource: "mobius" }),
    ).toThrow("Real platform data source is not enabled yet.");
  });
});
