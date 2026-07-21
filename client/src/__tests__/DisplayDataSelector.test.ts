import { describe, expect, it } from "vitest";
import {
  getRealtimeStatusTone,
  getRealtimeTrackingConfirmation,
  getRealtimeTrackingSwitchText,
} from "../components/DisplayDataSelector";

describe("DisplayDataSelector realtime tracking helpers", () => {
  it("labels the realtime tracking switch by current state", () => {
    expect(getRealtimeTrackingSwitchText(false)).toEqual({ state: "OFF", action: "실시간 트래킹 켜기" });
    expect(getRealtimeTrackingSwitchText(true)).toEqual({ state: "ON", action: "실시간 트래킹 끄기" });
  });

  it("returns confirmation copy for enabling and disabling tracking", () => {
    expect(getRealtimeTrackingConfirmation(false)).toEqual({
      title: "실시간 트래킹을 켜시겠습니까?",
      body: "",
      confirmLabel: "확인",
      cancelLabel: "취소",
    });
    expect(getRealtimeTrackingConfirmation(true)).toEqual({
      title: "실시간 트래킹을 끄시겠습니까?",
      body: "수면 데이터는 저장되나, 지금까지의 실시간 그래프 작성은 중단됩니다.",
      confirmLabel: "끄기",
      cancelLabel: "취소",
    });
    expect(getRealtimeTrackingConfirmation(false, "missing-model")).toEqual({
      title: "학습 모델이 필요합니다",
      body: "실시간 트래킹을 시작하려면 먼저 수면 단계 학습 패널에서 모델을 학습해 주세요.",
      confirmLabel: "확인",
      cancelLabel: null,
    });
  });

  it("maps realtime status text to a display tone", () => {
    expect(getRealtimeStatusTone("실시간 모니터링 시작 중...")).toBe("uploading");
    expect(getRealtimeStatusTone("실시간 수집 중 · 호흡 1개 · 수면 1개")).toBe("success");
    expect(getRealtimeStatusTone("실시간 오류: 실패")).toBe("error");
    expect(getRealtimeStatusTone("")).toBe("idle");
  });
});
