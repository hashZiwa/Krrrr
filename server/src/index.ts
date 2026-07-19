import cors from "cors";
import express from "express";
import { createMobiusClient } from "./clients/mobiusClient.js";
import { getServerEnv } from "./config/env.js";
import { loadEnvFile } from "./config/loadEnvFile.js";
import { getMobiusConfig } from "./config/mobiusConfig.js";
import { createSleepDataProvider } from "./providers/sleepDataProviderFactory.js";
import { createPlatformUploadRouter } from "./routes/platformUpload.js";
import { createSleepSessionRouter } from "./routes/sleepSessions.js";
import { createSleepStageTrainingRouter } from "./routes/sleepStageTraining.js";
import { createPlatformUploadService } from "./services/platformUploadService.js";
import { createSleepSessionService } from "./services/sleepSessionService.js";
import { createSleepStageTrainingService } from "./services/sleepStageTrainingService.js";

loadEnvFile();

const env = getServerEnv();
const mobiusConfig = getMobiusConfig();
const provider = createSleepDataProvider(env);
const service = createSleepSessionService(provider);
const sleepStageTrainingService = createSleepStageTrainingService();
const uploadService = mobiusConfig
  ? createPlatformUploadService(createMobiusClient(mobiusConfig), mobiusConfig.uploadContainers)
  : null;

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/sleep-sessions", createSleepSessionRouter(service));
app.use("/api/platform-upload", createPlatformUploadRouter(uploadService));
app.use("/api/sleep-stage-training", createSleepStageTrainingRouter(sleepStageTrainingService));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", dataSource: env.sleepDataSource, platformUploadConfigured: uploadService !== null });
});

app.listen(env.port, () => {
  console.log(`Sleeper API listening on http://localhost:${env.port}`);
});
