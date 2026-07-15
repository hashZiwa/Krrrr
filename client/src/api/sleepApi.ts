import type { SleepSessionResponse } from "../types/sleep";

export async function fetchLatestSleepSession(): Promise<SleepSessionResponse> {
  const response = await fetch("/api/sleep-sessions/latest");

  if (!response.ok) {
    throw new Error(`Failed to load sleep session: ${response.status}`);
  }

  return response.json() as Promise<SleepSessionResponse>;
}
