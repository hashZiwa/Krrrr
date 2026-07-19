import { describe, expect, it } from "vitest";
import { getAlarmStatusReadout, getUploadStatusText } from "../components/AlarmControlPanel";

describe("getAlarmStatusReadout", () => {
  it("shows a disabled status when the alarm feature is off", () => {
    expect(getAlarmStatusReadout(false, true)).toBe("알람 비활성화");
  });

  it("shows active or standby status when the alarm feature is on", () => {
    expect(getAlarmStatusReadout(true, true)).toBe("알람 작동됨!");
    expect(getAlarmStatusReadout(true, false)).toBe("알람 대기중");
  });
});

describe("getUploadStatusText", () => {
  it("returns empty text when no upload is active", () => {
    expect(getUploadStatusText("idle")).toBe("");
  });

  it("returns user-facing text for each upload state", () => {
    expect(getUploadStatusText("uploading")).toBe("업로드 중...");
    expect(getUploadStatusText("success")).toBe("업로드 완료!");
    expect(getUploadStatusText("error")).toBe("업로드 실패..!");
  });
});
