import type { SleepSessionResponse } from "../types/sleep";

export type DisplayDataFile = {
  name: string;
};

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Display data request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchDisplayDataFiles(): Promise<DisplayDataFile[]> {
  const result = await requestJson<{ files: DisplayDataFile[] }>("/api/display-data/files");
  return result.files;
}

export function fetchDisplayDataSession(fileName: string): Promise<SleepSessionResponse> {
  const params = new URLSearchParams({ file: fileName });
  return requestJson<SleepSessionResponse>(`/api/display-data/session?${params.toString()}`);
}
