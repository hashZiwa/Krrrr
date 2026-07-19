import { describe, expect, it } from "vitest";
import {
  formatTimeLabel,
  getTwentyMinuteTimeTicks,
  getSleepStageValueAtTime,
  parseMeasuredAt,
  toBreathingEventOverlays,
  toBreathingDisplaySamples,
  toChartSamples,
  toSleepStageOverlaySegments,
  toSleepStageOverlayTransitionSegments,
  toSleepStageSegments,
  toSleepStageTransitionSegments,
} from "../data/chartTransforms";

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

  it("finds the sleep stage value measured at the hovered time", () => {
    const samples = toChartSamples([
      { measuredAt: "20260714230000", value: 0 },
      { measuredAt: "20260714230500", value: 1 },
      { measuredAt: "20260714231000", value: 3 },
    ]);

    expect(getSleepStageValueAtTime(samples, samples[2].timeMs)).toBe(3);
    expect(getSleepStageValueAtTime(samples, samples[2].timeMs + 1)).toBeNull();
  });

  it("creates horizontal sleep stage segments without vertical transitions", () => {
    const samples = toChartSamples([
      { measuredAt: "20260714230000", value: 0 },
      { measuredAt: "20260714230500", value: 1 },
      { measuredAt: "20260714231000", value: 1 },
    ]);

    const segments = toSleepStageSegments(samples);

    expect(segments).toHaveLength(2);
    expect(segments[0].value).toBe(0);
    expect(segments[0].points).toEqual([
      { timeMs: samples[0].timeMs, value: 0 },
      { timeMs: samples[1].timeMs, value: 0 },
    ]);
    expect(segments[1].value).toBe(1);
    expect(segments[1].points).toEqual([
      { timeMs: samples[1].timeMs, value: 1 },
      { timeMs: samples[2].timeMs, value: 1 },
    ]);
  });

  it("creates vertical sleep stage transition segments at changed sample times", () => {
    const samples = toChartSamples([
      { measuredAt: "20260714230000", value: 0 },
      { measuredAt: "20260714230500", value: 1 },
      { measuredAt: "20260714231000", value: 1 },
      { measuredAt: "20260714231500", value: 2 },
    ]);

    const transitions = toSleepStageTransitionSegments(samples);

    expect(transitions).toEqual([
      {
        fromValue: 0,
        toValue: 1,
        timeMs: samples[1].timeMs,
      },
      {
        fromValue: 1,
        toValue: 2,
        timeMs: samples[3].timeMs,
      },
    ]);
  });

  it("creates x-axis ticks on 20-minute boundaries within the visible window", () => {
    const start = parseMeasuredAt("20260714231500");
    const end = parseMeasuredAt("20260715021500");

    const ticks = getTwentyMinuteTimeTicks(start, end);

    expect(ticks.map(formatTimeLabel)).toEqual([
      "23:20",
      "23:40",
      "00:00",
      "00:20",
      "00:40",
      "01:00",
      "01:20",
      "01:40",
      "02:00",
    ]);
  });

  it("creates breathing event overlays centered between adjacent samples", () => {
    const samples = toChartSamples([
      { measuredAt: "20260714230000", value: 14 },
      { measuredAt: "20260714230500", value: -1 },
      { measuredAt: "20260714231000", value: 15 },
      { measuredAt: "20260714231500", value: 0 },
      { measuredAt: "20260714232000", value: 16 },
    ]);

    const overlays = toBreathingEventOverlays(samples);

    expect(overlays).toEqual([
      {
        value: -1,
        timeMs: samples[1].timeMs,
        startMs: samples[0].timeMs + (samples[1].timeMs - samples[0].timeMs) / 2,
        endMs: samples[1].timeMs + (samples[2].timeMs - samples[1].timeMs) / 2,
      },
      {
        value: 0,
        timeMs: samples[3].timeMs,
        startMs: samples[2].timeMs + (samples[3].timeMs - samples[2].timeMs) / 2,
        endMs: samples[3].timeMs + (samples[4].timeMs - samples[3].timeMs) / 2,
      },
    ]);
  });

  it("interpolates breathing display values for consecutive abnormal events while keeping original values", () => {
    const samples = toChartSamples([
      { measuredAt: "20260714230000", value: 14 },
      { measuredAt: "20260714230500", value: -1 },
      { measuredAt: "20260714231000", value: 0 },
      { measuredAt: "20260714231500", value: 10 },
    ]);

    const displaySamples = toBreathingDisplaySamples(samples);

    expect(displaySamples.map((sample) => sample.value)).toEqual([14, -1, 0, 10]);
    expect(displaySamples[0].displayValue).toBe(14);
    expect(displaySamples[1].displayValue).toBeCloseTo(12.67, 2);
    expect(displaySamples[2].displayValue).toBeCloseTo(11.33, 2);
    expect(displaySamples[3].displayValue).toBe(10);
  });

  it("uses the nearest normal breathing value when an abnormal run has only one normal side", () => {
    const samples = toChartSamples([
      { measuredAt: "20260714230000", value: -1 },
      { measuredAt: "20260714230500", value: 12 },
      { measuredAt: "20260714231000", value: 15 },
      { measuredAt: "20260714231500", value: 0 },
    ]);

    const displaySamples = toBreathingDisplaySamples(samples);

    expect(displaySamples.map((sample) => sample.displayValue)).toEqual([12, 12, 15, 15]);
  });

  it("maps sleep stage overlay segments into the breathing y-axis range with awake at the top", () => {
    const samples = toChartSamples([
      { measuredAt: "20260714230000", value: 0 },
      { measuredAt: "20260714230500", value: 1 },
      { measuredAt: "20260714231000", value: 2 },
      { measuredAt: "20260714231500", value: 3 },
      { measuredAt: "20260714232000", value: 0 },
    ]);

    const segments = toSleepStageOverlaySegments(samples, [10, 20]);

    expect(segments).toEqual([
      {
        value: 0,
        points: [
          { timeMs: samples[0].timeMs, overlayValue: 18.5 },
          { timeMs: samples[1].timeMs, overlayValue: 18.5 },
        ],
      },
      {
        value: 1,
        points: [
          { timeMs: samples[1].timeMs, overlayValue: 16.166666666666664 },
          { timeMs: samples[2].timeMs, overlayValue: 16.166666666666664 },
        ],
      },
      {
        value: 2,
        points: [
          { timeMs: samples[2].timeMs, overlayValue: 13.833333333333332 },
          { timeMs: samples[3].timeMs, overlayValue: 13.833333333333332 },
        ],
      },
      {
        value: 3,
        points: [
          { timeMs: samples[3].timeMs, overlayValue: 11.5 },
          { timeMs: samples[4].timeMs, overlayValue: 11.5 },
        ],
      },
    ]);
  });

  it("maps sleep stage overlay transition segments into the breathing y-axis range", () => {
    const samples = toChartSamples([
      { measuredAt: "20260714230000", value: 0 },
      { measuredAt: "20260714230500", value: 1 },
      { measuredAt: "20260714231000", value: 1 },
      { measuredAt: "20260714231500", value: 3 },
    ]);

    const transitions = toSleepStageOverlayTransitionSegments(samples, [10, 20]);

    expect(transitions).toEqual([
      {
        fromValue: 0,
        toValue: 1,
        timeMs: samples[1].timeMs,
        fromOverlayValue: 18.5,
        toOverlayValue: 16.166666666666664,
      },
      {
        fromValue: 1,
        toValue: 3,
        timeMs: samples[3].timeMs,
        fromOverlayValue: 16.166666666666664,
        toOverlayValue: 11.5,
      },
    ]);
  });
});
