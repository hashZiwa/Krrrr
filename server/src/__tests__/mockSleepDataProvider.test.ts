import { describe, expect, it } from "vitest";
import { mockSleepDataProvider } from "../providers/mockSleepDataProvider.js";

describe("mockSleepDataProvider", () => {
  it("generates 49 samples per signal across four hours", async () => {
    const session = await mockSleepDataProvider.getLatestSession();

    expect(session.startedAt).toBe("20260714230000");
    expect(session.endedAt).toBe("20260715030000");
    expect(session.intervalMinutes).toBe(5);
    expect(session.sleepStageSamples).toHaveLength(49);
    expect(session.breathingSamples).toHaveLength(49);
    expect(new Set(session.sleepStageSamples.map((sample) => sample.value))).toEqual(new Set([0, 1, 2]));
  });

  it("calculates breathing summary without non-positive breathing values", async () => {
    const session = await mockSleepDataProvider.getLatestSession();

    expect(session.summary.movementCount).toBe(5);
    expect(session.summary.apneaRecognitionFailureCount).toBe(5);
    expect(session.summary.averageBreathingRate).toBe(14.4);
    expect(session.summary.deepSleepRatio).toBe(0.61);
  });
});
