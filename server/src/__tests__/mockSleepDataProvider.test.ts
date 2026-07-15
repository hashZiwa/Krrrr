import { describe, expect, it } from "vitest";
import { mockSleepDataProvider } from "../providers/mockSleepDataProvider.js";

describe("mockSleepDataProvider", () => {
  it("generates 25 samples per signal across two hours", async () => {
    const session = await mockSleepDataProvider.getLatestSession();

    expect(session.startedAt).toBe("20260714230000");
    expect(session.endedAt).toBe("20260715010000");
    expect(session.intervalMinutes).toBe(5);
    expect(session.sleepStageSamples).toHaveLength(25);
    expect(session.breathingSamples).toHaveLength(25);
  });

  it("calculates breathing summary without non-positive breathing values", async () => {
    const session = await mockSleepDataProvider.getLatestSession();

    expect(session.summary.movementCount).toBe(2);
    expect(session.summary.apneaRecognitionFailureCount).toBe(2);
    expect(session.summary.averageBreathingRate).toBe(14.6);
    expect(session.summary.deepSleepRatio).toBe(0.36);
  });
});
