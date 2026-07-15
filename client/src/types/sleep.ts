export type SensorSample = {
  measuredAt: string;
  value: number;
};

export type SleepSessionSummary = {
  averageBreathingRate: number | null;
  movementCount: number;
  apneaRecognitionFailureCount: number;
  deepSleepRatio: number;
};

export type SleepSessionResponse = {
  id: string;
  startedAt: string;
  endedAt: string;
  intervalMinutes: number;
  sleepStageSamples: SensorSample[];
  breathingSamples: SensorSample[];
  summary: SleepSessionSummary;
};

export type ChartSample = SensorSample & {
  timeMs: number;
  timeLabel: string;
};
