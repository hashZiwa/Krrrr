import cors from "cors";
import express from "express";
import { getServerEnv } from "./config/env.js";
import { createSleepDataProvider } from "./providers/sleepDataProviderFactory.js";
import { createSleepSessionRouter } from "./routes/sleepSessions.js";
import { createSleepSessionService } from "./services/sleepSessionService.js";

const env = getServerEnv();
const provider = createSleepDataProvider(env);
const service = createSleepSessionService(provider);

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/sleep-sessions", createSleepSessionRouter(service));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", dataSource: env.sleepDataSource });
});

app.listen(env.port, () => {
  console.log(`Sleeper API listening on http://localhost:${env.port}`);
});
