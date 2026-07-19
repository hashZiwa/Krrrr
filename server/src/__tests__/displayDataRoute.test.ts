import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDisplayDataRouter } from "../routes/displayData.js";

const servers: Array<{ close: () => void }> = [];

async function createTestServer(service: Parameters<typeof createDisplayDataRouter>[0]) {
  const app = express();
  app.use("/api/display-data", createDisplayDataRouter(service));

  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a port");
  }

  return `http://127.0.0.1:${address.port}`;
}

describe("createDisplayDataRouter", () => {
  afterEach(() => {
    servers.splice(0).forEach((server) => server.close());
  });

  it("returns display data files", async () => {
    const baseUrl = await createTestServer({
      listFiles: vi.fn().mockResolvedValue([{ name: "a.csv" }]),
      getSession: vi.fn(),
    });

    const response = await fetch(`${baseUrl}/api/display-data/files`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ files: [{ name: "a.csv" }] });
  });

  it("returns the selected display data session", async () => {
    const service = {
      listFiles: vi.fn(),
      getSession: vi.fn().mockResolvedValue({
        id: "displaydata-a.csv",
        startedAt: "20260719012017",
        endedAt: "20260719012517",
        intervalMinutes: 5,
        sleepStageSamples: [],
        breathingSamples: [],
        summary: {
          averageBreathingRate: null,
          movementCount: 0,
          apneaRecognitionFailureCount: 0,
          deepSleepRatio: 0,
        },
      }),
    };
    const baseUrl = await createTestServer(service);

    const response = await fetch(`${baseUrl}/api/display-data/session?file=a.csv`);

    expect(response.status).toBe(200);
    expect(service.getSession).toHaveBeenCalledWith("a.csv");
    await expect(response.json()).resolves.toMatchObject({ id: "displaydata-a.csv" });
  });

  it("rejects missing file parameters", async () => {
    const baseUrl = await createTestServer({
      listFiles: vi.fn(),
      getSession: vi.fn(),
    });

    const response = await fetch(`${baseUrl}/api/display-data/session`);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "display_data_file_required" });
  });
});
