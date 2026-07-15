import type { ServerEnv } from "../config/env.js";
import type { SleepDataProvider } from "./sleepDataProvider.js";
import { mockSleepDataProvider } from "./mockSleepDataProvider.js";

export function createSleepDataProvider(env: ServerEnv): SleepDataProvider {
  if (env.sleepDataSource === "mock") {
    return mockSleepDataProvider;
  }

  throw new Error("Real platform data source is not enabled yet.");
}
