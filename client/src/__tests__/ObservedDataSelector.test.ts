import { describe, expect, it } from "vitest";
import { getObservedDataFileLabel } from "../components/ObservedDataSelector";

describe("ObservedDataSelector helpers", () => {
  it("formats platform breath condition file names as Korean dates", () => {
    expect(getObservedDataFileLabel("platform-breath-condition-2026-07-18.csv")).toBe("26년 07월 18일");
  });

  it("falls back to the file name for unknown display data files", () => {
    expect(getObservedDataFileLabel("sleep_respiratory_rate_20260718_20260719.csv")).toBe(
      "sleep_respiratory_rate_20260718_20260719.csv",
    );
  });
});
