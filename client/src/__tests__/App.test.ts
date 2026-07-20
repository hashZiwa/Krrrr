import { describe, expect, it } from "vitest";
import { getInitialObservedDataSelection, shouldShowMonitorCharts, shouldShowObservedDataSelector } from "../App";

describe("App helpers", () => {
  it("shows the observed data selector only when realtime tracking is off", () => {
    expect(shouldShowObservedDataSelector(false)).toBe(true);
    expect(shouldShowObservedDataSelector(true)).toBe(false);
  });

  it("starts without an observed data selection", () => {
    expect(getInitialObservedDataSelection()).toBe("");
  });

  it("hides monitor charts when no observed data is selected outside realtime tracking", () => {
    expect(shouldShowMonitorCharts({ selectedDisplayFile: "", isRealtime: false, hasChartData: true })).toBe(false);
    expect(shouldShowMonitorCharts({ selectedDisplayFile: "sleep.csv", isRealtime: false, hasChartData: true })).toBe(true);
    expect(shouldShowMonitorCharts({ selectedDisplayFile: "", isRealtime: true, hasChartData: true })).toBe(true);
    expect(shouldShowMonitorCharts({ selectedDisplayFile: "sleep.csv", isRealtime: false, hasChartData: false })).toBe(false);
  });
});
