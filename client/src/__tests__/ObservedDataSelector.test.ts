import { describe, expect, it } from "vitest";
import {
  getObservedDataFileLabel,
  getObservedDataSelectedLabel,
  isObservedDataFileSelected,
} from "../components/ObservedDataSelector";

describe("ObservedDataSelector helpers", () => {
  it("formats platform breath condition file names as Korean dates", () => {
    expect(getObservedDataFileLabel("platform-breath-condition-2026-07-18.csv")).toBe("26년 07월 18일");
  });

  it("falls back to the file name for unknown display data files", () => {
    expect(getObservedDataFileLabel("sleep_respiratory_rate_20260718_20260719.csv")).toBe(
      "sleep_respiratory_rate_20260718_20260719.csv",
    );
  });

  it("checks selected file identity for custom listbox options", () => {
    expect(isObservedDataFileSelected("a.csv", "a.csv")).toBe(true);
    expect(isObservedDataFileSelected("a.csv", "b.csv")).toBe(false);
  });

  it("uses none as the default selected label", () => {
    expect(getObservedDataSelectedLabel("")).toBe("없음");
    expect(getObservedDataSelectedLabel("platform-breath-condition-2026-07-18.csv")).toBe("26년 07월 18일");
  });
});
