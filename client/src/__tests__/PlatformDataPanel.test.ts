import { describe, expect, it } from "vitest";
import {
  getDownloadFileName,
  getPlatformDataGroupDisplayName,
  getPlatformDataStatusText,
  getSelectedGroupCountText,
} from "../components/PlatformDataPanel";

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

  it("formats a compact Korean label for a platform data group", () => {
    expect(
      getPlatformDataGroupDisplayName({
        key: "2026-07-18",
        label: "2026-07-18 18:00 - 2026-07-19 18:00",
        startAt: "20260718180000",
        endAt: "20260719180000",
        count: 12,
        items: [],
      }),
    ).toBe("26년 07월 18일 오후 6시 ~ 익일 오후 6시");
  });
});
