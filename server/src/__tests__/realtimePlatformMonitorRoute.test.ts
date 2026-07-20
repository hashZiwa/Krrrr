import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRealtimePlatformMonitorRouter } from "../routes/realtimePlatformMonitor.js";

const servers: Array<{ close: () => void }> = [];

async function createTestServer(service: Parameters<typeof createRealtimePlatformMonitorRouter>[0]) {
  const app = express();
  app.use(express.json());
  app.use("/api/realtime-platform", createRealtimePlatformMonitorRouter(service));

  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a port");
  }

  return `http://127.0.0.1:${address.port}`;
}

describe("createRealtimePlatformMonitorRouter", () => {
  afterEach(() => {
    servers.splice(0).forEach((server) => server.close());
  });

  it("starts and stops realtime monitoring", async () => {
    const service = {
      start: vi.fn(),
      stop: vi.fn(),
      pollLatest: vi.fn(),
      refreshPredictions: vi.fn(),
      getState: vi.fn().mockReturnValue({ running: true, breathingSamples: [], predictedSamples: [] }),
      getSession: vi.fn(),
    };
    const baseUrl = await createTestServer(service);

    const startResponse = await fetch(`${baseUrl}/api/realtime-platform/start`, { method: "POST" });
    const stopResponse = await fetch(`${baseUrl}/api/realtime-platform/stop`, { method: "POST" });

    expect(startResponse.status).toBe(200);
    expect(stopResponse.status).toBe(200);
    expect(service.start).toHaveBeenCalledOnce();
    expect(service.stop).toHaveBeenCalledOnce();
  });

  it("returns state and nullable session", async () => {
    const session = {
      id: "platform-realtime",
      startedAt: "20260720090030",
      endedAt: "20260720090100",
      intervalMinutes: 1,
      sleepStageSamples: [],
      breathingSamples: [{ measuredAt: "20260720090030", value: 19 }],
      summary: {
        averageBreathingRate: 19,
        movementCount: 0,
        apneaRecognitionFailureCount: 0,
        deepSleepRatio: 0,
      },
    };
    const service = {
      start: vi.fn(),
      stop: vi.fn(),
      pollLatest: vi.fn(),
      refreshPredictions: vi.fn(),
      getState: vi.fn().mockReturnValue({ running: true, breathingSamples: [], predictedSamples: [] }),
      getSession: vi.fn().mockReturnValue(session),
    };
    const baseUrl = await createTestServer(service);

    const response = await fetch(`${baseUrl}/api/realtime-platform/session`);

    await expect(response.json()).resolves.toEqual({
      state: { running: true, breathingSamples: [], predictedSamples: [] },
      session,
    });
  });

  it("returns service unavailable when realtime monitoring is not configured", async () => {
    const baseUrl = await createTestServer(null);

    const response = await fetch(`${baseUrl}/api/realtime-platform/session`);

    await expect(response.json()).resolves.toMatchObject({ error: "realtime_platform_not_configured" });
    expect(response.status).toBe(503);
  });
});
