import { describe, expect, it } from "vitest";
import {
  breathingEventOverlayLayers,
  breathingYAxisTicks,
  chartColors,
  getBreathingEventOverlayColor,
  getBreathingEventOverlayLegendItems,
  getBreathingEventOverlayOpacity,
  getBreathingEventOverlayRenderItems,
  getBreathingEventDotOpacity,
  getBreathingScrollableWidth,
  getBreathingYAxisConfig,
  getSleepStageDisplayValue,
  getSleepStageTransitionLineCoordinates,
  getSleepStageTooltipValue,
  getSleepStageSegmentClipPadding,
  getSleepStageScrollableWidth,
  shouldRenderSleepStageGlow,
  sleepStageLabels,
  sleepStageLineStyles,
  sleepStageTransitionGradientStops,
  sleepStageSegmentGlow,
  sleepStageTransitionGradientUnits,
  sleepStageTransitionLineStyle,
} from "../charts/chartConfig";

describe("chartConfig", () => {
  it("uses the requested sleep stage labels", () => {
    expect(sleepStageLabels).toEqual({
      0: "깸",
      1: "REM",
      2: "얕은 잠",
      3: "깊은 잠",
    });
  });

  it("configures one pulse line style per sleep stage", () => {
    expect(Object.keys(sleepStageLineStyles).map(Number)).toEqual([0, 1, 2, 3]);
    expect(new Set(Object.values(sleepStageLineStyles).map((style) => style.color)).size).toBe(4);
    expect(new Set(Object.values(sleepStageLineStyles).map((style) => style.strokeWidth)).size).toBe(4);
  });

  it("keeps horizontal sleep stage segment styles focused on color and stroke width", () => {
    expect(Object.values(sleepStageLineStyles).every((style) => "yOffsetPx" in style)).toBe(false);
  });

  it("uses the awake stroke width as the default sleep transition line width", () => {
    expect(sleepStageTransitionLineStyle.strokeWidth).toBe(sleepStageLineStyles[0].strokeWidth);
  });

  it("extends sleep transition lines by the connected horizontal segment stroke widths", () => {
    expect(getSleepStageTransitionLineCoordinates(20, 80, 10, 16)).toEqual({
      y1: 17,
      y2: 86,
      gradientY1: 17,
      gradientY2: 86,
    });
    expect(getSleepStageTransitionLineCoordinates(80, 20, 10, 16)).toEqual({
      y1: 83,
      y2: 14,
      gradientY1: 14,
      gradientY2: 83,
    });
  });

  it("uses user-space gradients for zero-width vertical transition lines", () => {
    expect(sleepStageTransitionGradientUnits).toBe("userSpaceOnUse");
  });

  it("keeps configurable from-to stops for sleep transition gradients", () => {
    expect(sleepStageTransitionGradientStops).toEqual([
      { offset: "0%", color: "from" },
      { offset: "3%", color: "from" },
      { offset: "30%", color: "to" },
      { offset: "100%", color: "to" },
    ]);
  });

  it("selects one valid sleep stage value from duplicated tooltip payload", () => {
    const payload = [
      { value: undefined },
      { value: 1 },
      { value: 1 },
      { value: 3 },
    ];

    expect(getSleepStageTooltipValue(payload)).toBe(1);
  });

  it("returns null when tooltip payload has no valid sleep stage", () => {
    expect(getSleepStageTooltipValue([{ value: undefined }, { value: "bad" }])).toBeNull();
  });

  it("maps sleep stages to reversed y-axis display positions", () => {
    expect(getSleepStageDisplayValue(0)).toBe(3);
    expect(getSleepStageDisplayValue(1)).toBe(2);
    expect(getSleepStageDisplayValue(2)).toBe(1);
    expect(getSleepStageDisplayValue(3)).toBe(0);
  });

  it("does not add glow overlays to sleep stage segments", () => {
    expect(shouldRenderSleepStageGlow(0)).toBe(false);
    expect(shouldRenderSleepStageGlow(1)).toBe(false);
    expect(shouldRenderSleepStageGlow(2)).toBe(false);
  });

  it("keeps sleep stage glow tuning in chart config", () => {
    expect(sleepStageSegmentGlow.stages).toEqual([]);
  });

  it("expands the sleep stage clip area beyond the thickest segment stroke", () => {
    const maxStrokeWidth = Math.max(...Object.values(sleepStageLineStyles).map((style) => style.strokeWidth));

    expect(getSleepStageSegmentClipPadding()).toBeGreaterThan(maxStrokeWidth / 2);
  });

  it("scales the sleep stage chart width by session duration", () => {
    const oneHourMs = 60 * 60 * 1000;

    expect(getSleepStageScrollableWidth(0, oneHourMs)).toBe(360);
    expect(getSleepStageScrollableWidth(0, 10 * oneHourMs)).toBe(1800);
  });

  it("uses the same scroll width rule for breathing charts", () => {
    const oneHourMs = 60 * 60 * 1000;

    expect(getBreathingScrollableWidth(0, oneHourMs)).toBe(360);
    expect(getBreathingScrollableWidth(0, 10 * oneHourMs)).toBe(1800);
  });

  it("keeps breathing y-axis ticks in config", () => {
    expect(breathingYAxisTicks).toEqual([0, 6, 12, 18]);
  });

  it("configures separate mask and event overlays for breathing events", () => {
    expect(Object.keys(breathingEventOverlayLayers)).toEqual(["mask", "event"]);
    expect(getBreathingEventOverlayColor(-1, "mask")).toBe("#ffffff");
    expect(getBreathingEventOverlayColor(0, "mask")).toBe("#ffffff");
    expect(getBreathingEventOverlayColor(-1, "event")).toBe(chartColors.movement);
    expect(getBreathingEventOverlayColor(0, "event")).toBe(chartColors.apnea);
  });

  it("keeps movement events partially visible while apnea remains masked", () => {
    expect(getBreathingEventOverlayOpacity(-1, "mask")).toBeGreaterThan(0);
    expect(getBreathingEventOverlayOpacity(-1, "mask")).toBeLessThan(1);
    expect(getBreathingEventOverlayOpacity(0, "mask")).toBe(1);
    expect(getBreathingEventDotOpacity(-1)).toBeGreaterThan(0);
    expect(getBreathingEventDotOpacity(-1)).toBeLessThan(1);
    expect(getBreathingEventDotOpacity(0)).toBe(0);
  });

  it("renders every mask overlay before any event overlay", () => {
    const renderItems = getBreathingEventOverlayRenderItems([
      { timeMs: 1 },
      { timeMs: 2 },
    ]);

    expect(renderItems.map((item) => `${item.layer}-${item.overlay.timeMs}`)).toEqual([
      "mask-1",
      "mask-2",
      "event-1",
      "event-2",
    ]);
  });

  it("uses current breathing event overlay colors for the legend", () => {
    expect(getBreathingEventOverlayLegendItems()).toEqual([
      { label: "뒤척임", color: chartColors.movement },
      { label: "무호흡", color: chartColors.apnea },
    ]);
  });
});

describe("breathing y-axis config", () => {
  it("sets breathing y-axis range from normal values with padding", () => {
    expect(getBreathingYAxisConfig([14, -1, 0, 16])).toEqual({
      domain: [12, 18],
      ticks: [12, 14, 16, 18],
    });
  });

  it("keeps a minimum breathing y-axis range when normal values are flat", () => {
    expect(getBreathingYAxisConfig([12, 12, -1])).toEqual({
      domain: [9, 15],
      ticks: [9, 11, 13, 15],
    });
  });
});
