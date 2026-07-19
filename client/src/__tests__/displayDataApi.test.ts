import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchDisplayDataFiles, fetchDisplayDataSession } from "../api/displayDataApi";

describe("displayDataApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads display data files", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ files: [{ name: "a.csv" }] }),
    } as Response);

    await expect(fetchDisplayDataFiles()).resolves.toEqual([{ name: "a.csv" }]);
    expect(fetchMock).toHaveBeenCalledWith("/api/display-data/files");
  });

  it("loads a selected display data session", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ id: "displaydata-a.csv" }),
    } as Response);

    await expect(fetchDisplayDataSession("a file.csv")).resolves.toEqual({ id: "displaydata-a.csv" });
    expect(fetchMock).toHaveBeenCalledWith("/api/display-data/session?file=a+file.csv");
  });
});
