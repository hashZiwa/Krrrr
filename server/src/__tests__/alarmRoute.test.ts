import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAlarmRouter } from "../routes/alarm.js";

const servers: Array<{ close: () => void }> = [];

async function createTestServer(service: Parameters<typeof createAlarmRouter>[0]) {
  const app = express();
  app.use(express.json());
  app.use("/api/alarm", createAlarmRouter(service));

  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a port");
  }

  return `http://127.0.0.1:${address.port}`;
}

describe("createAlarmRouter", () => {
  afterEach(() => {
    servers.splice(0).forEach((server) => server.close());
  });

  it("returns loaded alarm settings", async () => {
    const service = {
      loadSettings: vi.fn().mockResolvedValue({ enabled: true, time: "0730", active: false }),
      getSettings: vi.fn(),
      updateEnabled: vi.fn(),
      updateTime: vi.fn(),
      updateStatus: vi.fn(),
      evaluate: vi.fn(),
    };
    const baseUrl = await createTestServer(service);

    const response = await fetch(`${baseUrl}/api/alarm/settings`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ enabled: true, time: "0730", active: false });
  });

  it("updates alarm enabled state", async () => {
    const service = {
      loadSettings: vi.fn(),
      getSettings: vi.fn(),
      updateEnabled: vi.fn().mockResolvedValue({ enabled: true, time: "1000", active: false }),
      updateTime: vi.fn(),
      updateStatus: vi.fn(),
      evaluate: vi.fn(),
    };
    const baseUrl = await createTestServer(service);

    const response = await fetch(`${baseUrl}/api/alarm/settings/enabled`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: true }),
    });

    expect(response.status).toBe(200);
    expect(service.updateEnabled).toHaveBeenCalledWith(true);
    await expect(response.json()).resolves.toEqual({ enabled: true, time: "1000", active: false });
  });
});
