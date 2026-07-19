import { describe, expect, it } from "vitest";
import { getDownloadFileName, getPlatformDataStatusText, getSelectedGroupCountText } from "../components/PlatformDataPanel";

describe("PlatformDataPanel helpers", () => {
  it("formats platform data status text", () => {
    expect(getPlatformDataStatusText("idle")).toBe("대기 중");
    expect(getPlatformDataStatusText("loading")).toBe("플랫폼 확인 중...");
    expect(getPlatformDataStatusText("success")).toBe("플랫폼 데이터 확인 완료");
    expect(getPlatformDataStatusText("error")).toBe("플랫폼 데이터 확인 실패");
  });

  it("formats selected group counts", () => {
    expect(getSelectedGroupCountText(0)).toBe("선택된 묶음 없음");
    expect(getSelectedGroupCountText(2)).toBe("2개 묶음 선택됨");
  });

  it("creates a csv download file name from selected date keys", () => {
    expect(getDownloadFileName(["2026-07-18"])).toBe("breath-condition-2026-07-18.csv");
    expect(getDownloadFileName(["2026-07-19", "2026-07-18"])).toBe(
      "breath-condition-2026-07-18_to_2026-07-19.csv",
    );
  });
});
