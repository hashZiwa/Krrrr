import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadSleepStageTrainingCsv } from "../api/sleepStageTrainingApi";

describe("sleepStageTrainingApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uploads a training CSV as JSON", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ file: "sleep.csv", files: ["sleep.csv"] }),
    } as Response);

    await expect(uploadSleepStageTrainingCsv("sleep.csv", "timestamp\n2026")).resolves.toEqual({
      file: "sleep.csv",
      files: ["sleep.csv"],
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/sleep-stage-training/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: "sleep.csv", content: "timestamp\n2026" }),
    });
  });
});
