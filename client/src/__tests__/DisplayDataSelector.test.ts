import { describe, expect, it } from "vitest";
import { getRealtimeTrackingConfirmation, getRealtimeTrackingSwitchText } from "../components/DisplayDataSelector";

describe("DisplayDataSelector realtime tracking helpers", () => {
  it("labels the realtime tracking switch by current state", () => {
    expect(getRealtimeTrackingSwitchText(false)).toEqual({ state: "OFF", action: "실시간 트래킹 켜기" });
    expect(getRealtimeTrackingSwitchText(true)).toEqual({ state: "ON", action: "실시간 트래킹 끄기" });
  });

  it("returns confirmation copy for enabling and disabling tracking", () => {
    expect(getRealtimeTrackingConfirmation(false)).toEqual({
      title: "실시간 트래킹을 켜시겠습니까?",
      body: "",
      confirmLabel: "켜기",
    });
    expect(getRealtimeTrackingConfirmation(true)).toEqual({
      title: "실시간 트래킹을 끄시겠습니까?",
      body: "수면 데이터는 저장되나, 지금까지의 실시간 그래프 작성은 중단됩니다.",
      confirmLabel: "끄기",
    });
  });
});
