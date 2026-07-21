import type { SleepSessionResponse } from "../types/sleep";

export type RealtimePlatformState = {
  running: boolean;
  primed: boolean;
  lastRn: string | null;
  lastError: string | null;
  breathingSamples: Array<{ timestampMs: number; respiratoryRate: number }>;
  predictedSamples: Array<{ timestampMs: number; respiratoryRate: number; sleepStage: number }>;
  lastPredictionAt: string | null;
};

export type RealtimePlatformSessionResponse = {
  state: RealtimePlatformState;
  session: SleepSessionResponse | null;
};

export type RealtimePlatformSaveResponse =
  | {
      saved: true;
      fileName: string;
      sampleCount: number;
    }
  | {
      saved: false;
      fileName: null;
      sampleCount: number;
      reason: "no_data";
    };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`Realtime platform request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function startRealtimePlatformMonitoring(): Promise<{ state: RealtimePlatformState }> {
  return requestJson("/api/realtime-platform/start", { method: "POST" });
}

export function stopRealtimePlatformMonitoring(): Promise<{ state: RealtimePlatformState }> {
  return requestJson("/api/realtime-platform/stop", { method: "POST" });
}

export function fetchRealtimePlatformSession(): Promise<RealtimePlatformSessionResponse> {
  return requestJson("/api/realtime-platform/session");
}

export function saveRealtimePlatformSession(): Promise<RealtimePlatformSaveResponse> {
  return requestJson("/api/realtime-platform/save", { method: "POST" });
}
