import { describe, expect, it } from "vitest";
import {
  getInitialObservedDataSelection,
  shouldBlockRealtimeStartForMissingModel,
  shouldPromptRealtimeSessionSave,
  shouldUseEmptyMonitorGraph,
  shouldShowMonitorCharts,
  shouldShowObservedDataSelector,
} from "../App";

describe("App helpers", () => {
  it("shows the observed data selector only when realtime tracking is off", () => {
    expect(shouldShowObservedDataSelector(false)).toBe(true);
    expect(shouldShowObservedDataSelector(true)).toBe(false);
  });

  it("starts without an observed data selection", () => {
    expect(getInitialObservedDataSelection()).toBe("");
  });

  it("keeps monitor charts visible when chart data exists", () => {
    expect(shouldShowMonitorCharts({ hasChartData: true })).toBe(true);
    expect(shouldShowMonitorCharts({ hasChartData: false })).toBe(false);
  });

  it("uses empty monitor graphs when no observed data is selected outside realtime tracking", () => {
    expect(shouldUseEmptyMonitorGraph({ selectedDisplayFile: "", isRealtime: false })).toBe(true);
    expect(shouldUseEmptyMonitorGraph({ selectedDisplayFile: "sleep.csv", isRealtime: false })).toBe(false);
    expect(shouldUseEmptyMonitorGraph({ selectedDisplayFile: "", isRealtime: true })).toBe(false);
  });

  it("blocks realtime tracking when no sleep stage model is trained", () => {
    expect(shouldBlockRealtimeStartForMissingModel({ trained: false })).toBe(true);
    expect(
      shouldBlockRealtimeStartForMissingModel({
        trained: true,
        version: 1,
        trainingMode: "full",
        trainingExamples: 12,
        trainedAt: "2026-07-21T00:00:00.000Z",
        stageCounts: {},
      }),
    ).toBe(false);
  });

  it("prompts to save realtime data only when collected samples exist", () => {
    expect(
      shouldPromptRealtimeSessionSave({
        running: false,
        primed: true,
        lastRn: "4-20260720090000000",
        lastError: null,
        breathingSamples: [],
        predictedSamples: [],
        lastPredictionAt: null,
      }),
    ).toBe(false);
    expect(
      shouldPromptRealtimeSessionSave({
        running: false,
        primed: true,
        lastRn: "4-20260720090030000",
        lastError: null,
        breathingSamples: [{ timestampMs: 1, respiratoryRate: 19 }],
        predictedSamples: [],
        lastPredictionAt: null,
      }),
    ).toBe(true);
  });
});
