import { describe, expect, it, vi } from "vitest";
import { createAlarmService } from "../services/alarmService.js";

describe("createAlarmService", () => {
  it("loads alarm settings from platform cins", async () => {
    const client = {
      getLatestCin: vi
        .fn()
        .mockResolvedValueOnce({ con: "1" })
        .mockResolvedValueOnce({ con: "0730" })
        .mockResolvedValueOnce({ con: "0" }),
      createCin: vi.fn(),
    };
    const service = createAlarmService(client, {
      enabled: "ALARM_ENABLED",
      time: "ALARM_TIME",
      status: "ALARM_STATUS",
    });

    await expect(service.loadSettings()).resolves.toEqual({
      enabled: true,
      time: "0730",
      active: false,
    });
  });

  it("turns alarm on during the pre-alarm window when REM or wake is predicted", async () => {
    const client = { getLatestCin: vi.fn(), createCin: vi.fn().mockResolvedValue({ con: "1" }) };
    const service = createAlarmService(client, {
      enabled: "ALARM_ENABLED",
      time: "ALARM_TIME",
      status: "ALARM_STATUS",
    });
    await service.updateEnabled(true);
    await service.updateTime("1000");

    await service.evaluate({
      now: new Date(2026, 6, 20, 9, 40, 0),
      latestSleepStage: 1,
    });

    expect(client.createCin).toHaveBeenLastCalledWith("ALARM_STATUS", "1");
    expect(service.getSettings().active).toBe(true);
  });

  it("turns alarm on at alarm time if sleep stays deeper", async () => {
    const client = { getLatestCin: vi.fn(), createCin: vi.fn().mockResolvedValue({ con: "1" }) };
    const service = createAlarmService(client, {
      enabled: "ALARM_ENABLED",
      time: "ALARM_TIME",
      status: "ALARM_STATUS",
    });
    await service.updateEnabled(true);
    await service.updateTime("1000");

    await service.evaluate({
      now: new Date(2026, 6, 20, 9, 40, 0),
      latestSleepStage: 2,
    });
    await service.evaluate({
      now: new Date(2026, 6, 20, 10, 0, 0),
      latestSleepStage: 2,
    });

    expect(client.createCin).toHaveBeenLastCalledWith("ALARM_STATUS", "1");
    expect(service.getSettings().active).toBe(true);
  });

  it("turns alarm off after the configured alarm time passes", async () => {
    const client = { getLatestCin: vi.fn(), createCin: vi.fn().mockResolvedValue({ con: "0" }) };
    const service = createAlarmService(client, {
      enabled: "ALARM_ENABLED",
      time: "ALARM_TIME",
      status: "ALARM_STATUS",
    });
    await service.updateEnabled(true);
    await service.updateTime("1000");
    await service.updateStatus(true);

    await service.evaluate({
      now: new Date(2026, 6, 20, 10, 1, 0),
      latestSleepStage: 1,
    });

    expect(client.createCin).toHaveBeenLastCalledWith("ALARM_STATUS", "0");
    expect(service.getSettings().active).toBe(false);
  });
});
