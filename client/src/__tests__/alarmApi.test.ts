import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAlarmSettings, updateAlarmSetting } from "../api/alarmApi";

describe("alarmApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads alarm settings", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: true, time: "0730", active: false }),
    } as Response);

    await expect(fetchAlarmSettings()).resolves.toEqual({ enabled: true, time: "0730", active: false });
    expect(fetchMock).toHaveBeenCalledWith("/api/alarm/settings");
  });

  it("updates a single alarm setting", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: false, time: "1000", active: false }),
    } as Response);

    await expect(updateAlarmSetting("enabled", true)).resolves.toEqual({ enabled: false, time: "1000", active: false });
    expect(fetchMock).toHaveBeenCalledWith("/api/alarm/settings/enabled", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: true }),
    });
  });
});
