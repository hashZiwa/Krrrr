import { describe, expect, it } from "vitest";
import { shouldShowObservedDataSelector } from "../App";

describe("App helpers", () => {
  it("shows the observed data selector only when realtime tracking is off", () => {
    expect(shouldShowObservedDataSelector(false)).toBe(true);
    expect(shouldShowObservedDataSelector(true)).toBe(false);
  });
});
