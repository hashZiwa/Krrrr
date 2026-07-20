import cors from "cors";
import express from "express";
import { createMobiusClient } from "./clients/mobiusClient.js";
import { getServerEnv } from "./config/env.js";
import { loadEnvFile } from "./config/loadEnvFile.js";
import { getMobiusConfig } from "./config/mobiusConfig.js";
import { createSleepDataProvider } from "./providers/sleepDataProviderFactory.js";
import { createDisplayDataRouter } from "./routes/displayData.js";
import { createPlatformDataRouter } from "./routes/platformData.js";
import { createPlatformUploadRouter } from "./routes/platformUpload.js";
import { createAlarmRouter } from "./routes/alarm.js";
import { createRealtimePlatformMonitorRouter } from "./routes/realtimePlatformMonitor.js";
import { createSleepSessionRouter } from "./routes/sleepSessions.js";
import { createSleepStageTrainingRouter } from "./routes/sleepStageTraining.js";
import { createDisplayDataService } from "./services/displayDataService.js";
import { createPlatformDataService } from "./services/platformDataService.js";
import { createPlatformUploadService } from "./services/platformUploadService.js";
import { createAlarmService } from "./services/alarmService.js";
import { createRealtimePlatformMonitorService } from "./services/realtimePlatformMonitorService.js";
import { createSleepSessionService } from "./services/sleepSessionService.js";
import { createSleepStageTrainingService } from "./services/sleepStageTrainingService.js";

loadEnvFile();

const env = getServerEnv();
const mobiusConfig = getMobiusConfig();
const provider = createSleepDataProvider(env);
const service = createSleepSessionService(provider);
const displayDataService = createDisplayDataService();
const sleepStageTrainingService = createSleepStageTrainingService();
void sleepStageTrainingService.loadLatestModel();
const uploadService = mobiusConfig
  ? createPlatformUploadService(createMobiusClient(mobiusConfig), mobiusConfig.uploadContainers)
  : null;
const alarmContainers =
  mobiusConfig?.uploadContainers.alarmEnabled &&
  mobiusConfig.uploadContainers.alarmTime &&
  mobiusConfig.uploadContainers.alarmStatus
    ? {
        enabled: mobiusConfig.uploadContainers.alarmEnabled,
        time: mobiusConfig.uploadContainers.alarmTime,
        status: mobiusConfig.uploadContainers.alarmStatus,
      }
    : null;
const alarmService =
  mobiusConfig && alarmContainers ? createAlarmService(createMobiusClient(mobiusConfig), alarmContainers) : null;
const platformDataService = mobiusConfig
  ? createPlatformDataService(createMobiusClient(mobiusConfig), {
      breathConditionContainer: mobiusConfig.statusContainers.breathCondition,
      displayDataService,
      sleepStageTrainingService,
    })
  : null;
const realtimePlatformMonitorService = mobiusConfig
  ? createRealtimePlatformMonitorService(createMobiusClient(mobiusConfig), {
      breathConditionContainer: mobiusConfig.statusContainers.breathCondition,
      displayDataService,
      sleepStageTrainingService,
      alarmService: alarmService ?? undefined,
    })
  : null;

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use("/api/sleep-sessions", createSleepSessionRouter(service));
app.use("/api/display-data", createDisplayDataRouter(displayDataService));
app.use("/api/platform-data", createPlatformDataRouter(platformDataService));
app.use("/api/platform-upload", createPlatformUploadRouter(uploadService));
app.use("/api/alarm", createAlarmRouter(alarmService));
app.use("/api/realtime-platform", createRealtimePlatformMonitorRouter(realtimePlatformMonitorService));
app.use("/api/sleep-stage-training", createSleepStageTrainingRouter(sleepStageTrainingService));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", dataSource: env.sleepDataSource, platformUploadConfigured: uploadService !== null });
});

app.listen(env.port, () => {
  console.log(`Sleeper API listening on http://localhost:${env.port}`);
});
