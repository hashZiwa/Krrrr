import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPlatformDataRouter } from "../routes/platformData.js";

const servers: Array<{ close: () => void }> = [];

async function createTestServer(service: Parameters<typeof createPlatformDataRouter>[0]) {
  const app = express();
  app.use(express.json());
  app.use("/api/platform-data", createPlatformDataRouter(service));

  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a port");
  }

  return `http://127.0.0.1:${address.port}`;
}

describe("createPlatformDataRouter", () => {
  afterEach(() => {
    servers.splice(0).forEach((server) => server.close());
  });

  it("returns discovered breath condition groups", async () => {
    const service = {
      discoverBreathConditionGroups: vi.fn().mockResolvedValue({ groups: [{ key: "2026-07-18", count: 2 }] }),
      exportBreathConditionCsv: vi.fn(),
    };
    const baseUrl = await createTestServer(service);

    const response = await fetch(`${baseUrl}/api/platform-data/breath-condition/discovery`);

    await expect(response.json()).resolves.toEqual({ groups: [{ key: "2026-07-18", count: 2 }] });
    expect(response.status).toBe(200);
  });

  it("returns csv for selected group keys", async () => {
    const service = {
      discoverBreathConditionGroups: vi.fn(),
      exportBreathConditionCsv: vi.fn().mockResolvedValue("groupLabel,rn,measuredAt,con\n"),
    };
    const baseUrl = await createTestServer(service);

    const response = await fetch(`${baseUrl}/api/platform-data/breath-condition/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupKeys: ["2026-07-18"] }),
    });

    await expect(response.text()).resolves.toBe("groupLabel,rn,measuredAt,con\n");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(service.exportBreathConditionCsv).toHaveBeenCalledWith(["2026-07-18"]);
  });

  it("returns service unavailable when platform data is not configured", async () => {
    const baseUrl = await createTestServer(null);

    const response = await fetch(`${baseUrl}/api/platform-data/breath-condition/discovery`);

    await expect(response.json()).resolves.toMatchObject({ error: "platform_data_not_configured" });
    expect(response.status).toBe(503);
  });
});
