import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPlatformUploadRouter } from "../routes/platformUpload.js";

const servers: Array<{ close: () => void }> = [];

async function createTestServer(service: Parameters<typeof createPlatformUploadRouter>[0]) {
  const app = express();
  app.use(express.json());
  app.use("/api/platform-upload", createPlatformUploadRouter(service));

  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a port");
  }

  return `http://127.0.0.1:${address.port}`;
}

describe("createPlatformUploadRouter", () => {
  afterEach(() => {
    servers.splice(0).forEach((server) => server.close());
  });

  it("uploads content through the configured feature key", async () => {
    const service = {
      upload: vi.fn().mockResolvedValue({ ri: "ri-1", con: "1" }),
    };
    const baseUrl = await createTestServer(service);

    const response = await fetch(`${baseUrl}/api/platform-upload/alarmEnabled`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "1" }),
    });

    await expect(response.json()).resolves.toEqual({ cin: { ri: "ri-1", con: "1" } });
    expect(response.status).toBe(201);
    expect(service.upload).toHaveBeenCalledWith("alarmEnabled", "1");
  });

  it("returns a service unavailable response when Mobius upload is not configured", async () => {
    const baseUrl = await createTestServer(null);

    const response = await fetch(`${baseUrl}/api/platform-upload/alarmEnabled`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "1" }),
    });

    await expect(response.json()).resolves.toMatchObject({ error: "platform_upload_not_configured" });
    expect(response.status).toBe(503);
  });
});
