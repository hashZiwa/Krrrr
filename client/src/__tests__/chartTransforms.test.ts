import { describe, expect, it } from "vitest";
import { parseMeasuredAt, toChartSamples } from "../data/chartTransforms";

describe("chartTransforms", () => {
  it("parses yyyyMMddHHmmss timestamps into local Date milliseconds", () => {
    const value = parseMeasuredAt("20260714230000");
    const date = new Date(value);

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(14);
    expect(date.getHours()).toBe(23);
  });

  it("adds numeric time and readable labels to samples", () => {
    const samples = toChartSamples([{ measuredAt: "20260714230000", value: 2 }]);

    expect(samples[0]).toMatchObject({
      measuredAt: "20260714230000",
      value: 2,
      timeLabel: "23:00",
    });
    expect(typeof samples[0].timeMs).toBe("number");
  });
});
