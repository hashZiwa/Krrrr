import { describe, expect, it } from "vitest";
import { createInitialTimeWindow, panTimeWindow } from "../data/timeWindow";

describe("timeWindow", () => {
  it("creates a two-hour initial window clamped to the full domain", () => {
    const start = new Date(2026, 6, 14, 23).getTime();
    const end = new Date(2026, 6, 15, 1).getTime();

    expect(createInitialTimeWindow(start, end, 120)).toEqual({ start, end });
  });

  it("pans without exceeding the full domain", () => {
    const domainStart = 0;
    const domainEnd = 10_000;
    const current = { start: 2_000, end: 6_000 };

    expect(panTimeWindow(current, -5_000, domainStart, domainEnd)).toEqual({
      start: 0,
      end: 4_000,
    });
    expect(panTimeWindow(current, 8_000, domainStart, domainEnd)).toEqual({
      start: 6_000,
      end: 10_000,
    });
  });
});
