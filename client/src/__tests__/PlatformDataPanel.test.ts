import { describe, expect, it } from "vitest";
import {
  getDownloadFileName,
  getPlatformDataGroupDisplayName,
  getPlatformDataLoadButtonText,
  getPlatformDataStatusText,
  getTotalDataText,
} from "../components/PlatformDataPanel";

describe("PlatformDataPanel helpers", () => {
  it("formats platform data status text", () => {
    expect(getPlatformDataStatusText("idle")).toBe("대기 중");
    expect(getPlatformDataStatusText("loading")).toBe("데이터 불러오는 중...");
    expect(getPlatformDataStatusText("success")).toBe("데이터 불러오기 완료");
    expect(getPlatformDataStatusText("error")).toBe("데이터 불러오기 실패");
  });

  it("formats total data counts", () => {
    expect(getTotalDataText(0)).toBe("총 0개 데이터");
    expect(getTotalDataText(23)).toBe("총 23개 데이터");
  });

  it("formats load button text by loaded state", () => {
    expect(getPlatformDataLoadButtonText(false)).toBe("데이터 불러오기");
    expect(getPlatformDataLoadButtonText(true)).toBe("데이터 새로고침");
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
    ).toBe("26년 07월 18일");
  });
});
