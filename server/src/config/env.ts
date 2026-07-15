export type SleepDataSource = "mock" | "mobius";

export type ServerEnv = {
  port: number;
  sleepDataSource: SleepDataSource;
};

export function getServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const rawPort = source.PORT ?? "4000";
  const port = Number.parseInt(rawPort, 10);

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid PORT value: ${rawPort}`);
  }

  const sleepDataSource = (source.SLEEP_DATA_SOURCE ?? "mock") as SleepDataSource;

  if (sleepDataSource !== "mock" && sleepDataSource !== "mobius") {
    throw new Error(`Invalid SLEEP_DATA_SOURCE value: ${sleepDataSource}`);
  }

  return { port, sleepDataSource };
}
