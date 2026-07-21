import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchRealtimePlatformSession,
  saveRealtimePlatformSession,
  startRealtimePlatformMonitoring,
  stopRealtimePlatformMonitoring,
} from "../api/realtimePlatformApi";

describe("realtimePlatformApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts realtime platform monitoring", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ state: { running: true } }),
    } as Response);

    await expect(startRealtimePlatformMonitoring()).resolves.toEqual({ state: { running: true } });
    expect(fetchMock).toHaveBeenCalledWith("/api/realtime-platform/start", { method: "POST" });
  });

  it("stops realtime platform monitoring", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ state: { running: false } }),
    } as Response);

    await expect(stopRealtimePlatformMonitoring()).resolves.toEqual({ state: { running: false } });
    expect(fetchMock).toHaveBeenCalledWith("/api/realtime-platform/stop", { method: "POST" });
  });

  it("loads realtime platform session state", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ state: { running: true }, session: null }),
    } as Response);

    await expect(fetchRealtimePlatformSession()).resolves.toEqual({ state: { running: true }, session: null });
    expect(fetchMock).toHaveBeenCalledWith("/api/realtime-platform/session", undefined);
  });

  it("saves the current realtime platform session", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        saved: true,
        fileName: "realtime-breath-condition-2026-07-20-090100.csv",
        sampleCount: 2,
      }),
    } as Response);

    await expect(saveRealtimePlatformSession()).resolves.toEqual({
      saved: true,
      fileName: "realtime-breath-condition-2026-07-20-090100.csv",
      sampleCount: 2,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/realtime-platform/save", { method: "POST" });
  });
});
