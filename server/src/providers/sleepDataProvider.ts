import type { SleepSessionResponse } from "../models/sleep.js";

export type SleepDataProvider = {
  getLatestSession(): Promise<SleepSessionResponse>;
};
