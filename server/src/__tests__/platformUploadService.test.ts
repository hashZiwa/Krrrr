import { describe, expect, it, vi } from "vitest";
import { createPlatformUploadService } from "../services/platformUploadService.js";

describe("createPlatformUploadService", () => {
  it("uploads content to the container configured for the requested feature", async () => {
    const client = {
      createCin: vi.fn().mockResolvedValue({ ri: "ri-1", con: "done" }),
    };
    const service = createPlatformUploadService(client, {
      sleepAnalysis: "ANALYSIS/SLEEP_CN",
    });

    const result = await service.upload("sleepAnalysis", "done");

    expect(client.createCin).toHaveBeenCalledWith("ANALYSIS/SLEEP_CN", "done");
    expect(result).toEqual({ ri: "ri-1", con: "done" });
  });

  it("fails clearly when a feature container is not configured", async () => {
    const service = createPlatformUploadService({ createCin: vi.fn() }, {});

    await expect(service.upload("eventNote", "done")).rejects.toThrow(
      "No Mobius upload container configured for feature: eventNote",
    );
  });
});
