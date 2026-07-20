import { describe, expect, it } from "vitest";
import {
  getInitialObservedDataSelection,
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
});
