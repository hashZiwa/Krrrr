import type { SleepDataProvider } from "../providers/sleepDataProvider.js";

export function createSleepSessionService(provider: SleepDataProvider) {
  return {
    getLatestSession() {
      return provider.getLatestSession();
    },
  };
}
