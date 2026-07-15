# Sleep Monitoring Webapp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first mock-data-only full-stack sleep monitoring webapp with a React dashboard, Express API, deterministic sleep/breathing samples, and synchronized draggable time-window charts.

**Architecture:** Use a monorepo-style project with separate `server` and `client` folders. The Express server exposes `/api/sleep-sessions/latest` through a provider interface whose initial factory only enables mock data. The React client fetches that API, transforms timestamps into chart-friendly values, and renders two synchronized Recharts charts sharing one visible time window.

**Tech Stack:** React, Vite, TypeScript, Express, Recharts, Vitest, tsx, npm workspaces.

## Global Constraints

- Initial implementation uses mock data only.
- Real Mobius/oneM2M platform communication must not run by default.
- Use `SLEEP_DATA_SOURCE=mock` as the default and only enabled initial data source.
- Generate mock samples every five minutes across a two-hour design-validation window.
- Keep chart code easy to revise by separating chart config, data transforms, and components.
- Support variable-length sessions and synchronized horizontal time-window movement.
- Frontend calls only this service's Express API, not the IoT platform directly.
- API keys and Mobius credentials must not appear in browser code.
- Sleep stage values are `0`, `1`, `2`; higher means deeper sleep.
- Breathing values use `-1` for movement, `0` for apnea recognition failure, positive integers for breaths per minute.

---

## File Structure

Root:

- Create `package.json`: npm workspace scripts for server and client.
- Create `.gitignore`: excludes dependencies, builds, logs, env files.
- Create `README.md`: local run instructions and mock-only data-source note.

Server:

- Create `server/package.json`: server dependencies and scripts.
- Create `server/tsconfig.json`: TypeScript settings.
- Create `server/src/index.ts`: Express bootstrap and API mount.
- Create `server/src/config/env.ts`: server config with mock-only data-source validation.
- Create `server/src/models/sleep.ts`: server-side sleep domain types.
- Create `server/src/utils/time.ts`: timestamp parsing/formatting helpers.
- Create `server/src/providers/sleepDataProvider.ts`: provider interface.
- Create `server/src/providers/mockSleepDataProvider.ts`: deterministic mock samples and summaries.
- Create `server/src/providers/sleepDataProviderFactory.ts`: mock-only provider selection and platform guard.
- Create `server/src/services/sleepSessionService.ts`: latest session service wrapper.
- Create `server/src/routes/sleepSessions.ts`: `/api/sleep-sessions/latest`.
- Create `server/src/__tests__/mockSleepDataProvider.test.ts`: mock generation and summary tests.
- Create `server/src/__tests__/sleepDataProviderFactory.test.ts`: provider guard tests.

Client:

- Create `client/package.json`: client dependencies and scripts.
- Create `client/tsconfig.json`: TypeScript settings.
- Create `client/tsconfig.node.json`: Vite config typing.
- Create `client/vite.config.ts`: Vite dev server with `/api` proxy.
- Create `client/index.html`: app mount point.
- Create `client/src/main.tsx`: React entry.
- Create `client/src/App.tsx`: dashboard composition and data loading.
- Create `client/src/api/sleepApi.ts`: API client.
- Create `client/src/types/sleep.ts`: frontend response types.
- Create `client/src/data/chartTransforms.ts`: timestamp and chart transformation helpers.
- Create `client/src/data/timeWindow.ts`: visible range math and pan clamping.
- Create `client/src/charts/chartConfig.ts`: chart labels, colors, tooltip helpers.
- Create `client/src/charts/SleepStageChart.tsx`: stepped sleep stage chart.
- Create `client/src/charts/BreathingChart.tsx`: breathing line chart with event handling.
- Create `client/src/components/SummaryMetric.tsx`: compact metric.
- Create `client/src/components/TimeWindowController.tsx`: shared range controls and drag affordance.
- Create `client/src/styles.css`: dashboard visual system.
- Create `client/src/__tests__/chartTransforms.test.ts`: chart transform tests.
- Create `client/src/__tests__/timeWindow.test.ts`: time-window tests.

---

### Task 1: Project Scaffolding And Server Data Contract

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `README.md`
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/models/sleep.ts`
- Create: `server/src/config/env.ts`
- Create: `server/src/providers/sleepDataProvider.ts`
- Create: `server/src/providers/sleepDataProviderFactory.ts`
- Test: `server/src/__tests__/sleepDataProviderFactory.test.ts`

**Interfaces:**
- Produces: `SleepSessionResponse`, `SensorSample`, `SleepDataProvider`, `getServerEnv()`, `createSleepDataProvider(env)`.
- Consumes: No earlier task output.

- [ ] **Step 1: Create root workspace files**

Create `package.json`:

```json
{
  "name": "sleeper",
  "private": true,
  "workspaces": [
    "client",
    "server"
  ],
  "scripts": {
    "dev": "npm-run-all --parallel dev:server dev:client",
    "dev:server": "npm --workspace server run dev",
    "dev:client": "npm --workspace client run dev",
    "build": "npm --workspace server run build && npm --workspace client run build",
    "test": "npm --workspace server run test && npm --workspace client run test",
    "typecheck": "npm --workspace server run typecheck && npm --workspace client run typecheck"
  },
  "devDependencies": {
    "npm-run-all": "^4.1.5"
  }
}
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
coverage/
.env
.env.*
!.env.example
npm-debug.log*
```

Create `README.md`:

```markdown
# Sleeper

Mock-first sleep monitoring webapp.

## Data Source

The initial implementation uses mock data only. `SLEEP_DATA_SOURCE` defaults to `mock`.
Real Mobius/oneM2M communication is intentionally disabled until explicitly enabled later.

## Local Development

Install dependencies:

```bash
npm install
```

Run both server and client:

```bash
npm run dev
```

Server: `http://localhost:4000`
Client: `http://localhost:5173`
```

- [ ] **Step 2: Create server package and TypeScript config**

Create `server/package.json`:

```json
{
  "name": "@sleeper/server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.3"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.30",
    "tsx": "^4.7.1",
    "typescript": "^5.4.2",
    "vitest": "^1.4.0"
  }
}
```

Create `server/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create sleep domain types**

Create `server/src/models/sleep.ts`:

```ts
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
```

- [ ] **Step 4: Create server env parsing**

Create `server/src/config/env.ts`:

```ts
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
```

- [ ] **Step 5: Create provider interface and mock-only factory guard**

Create `server/src/providers/sleepDataProvider.ts`:

```ts
import type { SleepSessionResponse } from "../models/sleep.js";

export type SleepDataProvider = {
  getLatestSession(): Promise<SleepSessionResponse>;
};
```

Create `server/src/providers/sleepDataProviderFactory.ts`:

```ts
import type { ServerEnv } from "../config/env.js";
import type { SleepDataProvider } from "./sleepDataProvider.js";
import { mockSleepDataProvider } from "./mockSleepDataProvider.js";

export function createSleepDataProvider(env: ServerEnv): SleepDataProvider {
  if (env.sleepDataSource === "mock") {
    return mockSleepDataProvider;
  }

  throw new Error("Real platform data source is not enabled yet.");
}
```

- [ ] **Step 6: Write provider factory tests**

Create `server/src/__tests__/sleepDataProviderFactory.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createSleepDataProvider } from "../providers/sleepDataProviderFactory.js";

describe("createSleepDataProvider", () => {
  it("returns the mock provider when SLEEP_DATA_SOURCE is mock", () => {
    const provider = createSleepDataProvider({ port: 4000, sleepDataSource: "mock" });

    expect(provider).toHaveProperty("getLatestSession");
  });

  it("blocks the real platform provider until explicitly implemented", () => {
    expect(() =>
      createSleepDataProvider({ port: 4000, sleepDataSource: "mobius" }),
    ).toThrow("Real platform data source is not enabled yet.");
  });
});
```

- [ ] **Step 7: Run test to verify current missing implementation fails**

Run: `npm --workspace server run test -- sleepDataProviderFactory`

Expected: FAIL because `mockSleepDataProvider.ts` has not been created yet.

- [ ] **Step 8: Commit scaffolding once Task 2 creates the mock provider and tests pass**

Run after Task 2 passes:

```bash
git add package.json .gitignore README.md server
git commit -m "feat: scaffold mock-only server contract"
```

---

### Task 2: Deterministic Mock Sleep Session API

**Files:**
- Create: `server/src/utils/time.ts`
- Create: `server/src/providers/mockSleepDataProvider.ts`
- Create: `server/src/services/sleepSessionService.ts`
- Create: `server/src/routes/sleepSessions.ts`
- Create: `server/src/index.ts`
- Test: `server/src/__tests__/mockSleepDataProvider.test.ts`

**Interfaces:**
- Consumes: `SleepSessionResponse`, `SensorSample`, `SleepDataProvider`, `createSleepDataProvider(env)`.
- Produces: `formatTimestamp(date)`, `addMinutes(date, minutes)`, `mockSleepDataProvider`, `createSleepSessionRouter(service)`.

- [ ] **Step 1: Create timestamp utilities**

Create `server/src/utils/time.ts`:

```ts
const pad = (value: number, width = 2) => String(value).padStart(width, "0");

export function formatTimestamp(date: Date): string {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}
```

- [ ] **Step 2: Create failing mock provider tests**

Create `server/src/__tests__/mockSleepDataProvider.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mockSleepDataProvider } from "../providers/mockSleepDataProvider.js";

describe("mockSleepDataProvider", () => {
  it("generates 25 samples per signal across two hours", async () => {
    const session = await mockSleepDataProvider.getLatestSession();

    expect(session.startedAt).toBe("20260714230000");
    expect(session.endedAt).toBe("20260715010000");
    expect(session.intervalMinutes).toBe(5);
    expect(session.sleepStageSamples).toHaveLength(25);
    expect(session.breathingSamples).toHaveLength(25);
  });

  it("calculates breathing summary without non-positive breathing values", async () => {
    const session = await mockSleepDataProvider.getLatestSession();

    expect(session.summary.movementCount).toBe(2);
    expect(session.summary.apneaRecognitionFailureCount).toBe(2);
    expect(session.summary.averageBreathingRate).toBe(14.6);
    expect(session.summary.deepSleepRatio).toBe(0.36);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm --workspace server run test -- mockSleepDataProvider`

Expected: FAIL because `mockSleepDataProvider.ts` does not exist.

- [ ] **Step 4: Implement deterministic mock provider**

Create `server/src/providers/mockSleepDataProvider.ts`:

```ts
import type { SensorSample, SleepSessionResponse, SleepSessionSummary } from "../models/sleep.js";
import type { SleepDataProvider } from "./sleepDataProvider.js";
import { addMinutes, formatTimestamp } from "../utils/time.js";

const START = new Date(2026, 6, 14, 23, 0, 0);
const INTERVAL_MINUTES = 5;

const sleepStages = [
  0, 0, 1, 1, 1,
  2, 2, 2, 1, 2,
  2, 2, 1, 1, 2,
  2, 2, 1, 1, 1,
  0, 1, 0, 0, 0,
];

const breathingValues = [
  13, 14, 14, 15, -1,
  15, 14, 13, 0, 14,
  15, 16, 15, 14, 14,
  -1, 13, 14, 15, 0,
  16, 15, 14, 14, 13,
];

function buildSamples(values: number[]): SensorSample[] {
  return values.map((value, index) => ({
    measuredAt: formatTimestamp(addMinutes(START, index * INTERVAL_MINUTES)),
    value,
  }));
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function summarize(sleepStageSamples: SensorSample[], breathingSamples: SensorSample[]): SleepSessionSummary {
  const validBreathing = breathingSamples
    .map((sample) => sample.value)
    .filter((value) => value > 0);

  const averageBreathingRate =
    validBreathing.length === 0
      ? null
      : roundTo(validBreathing.reduce((sum, value) => sum + value, 0) / validBreathing.length, 1);

  const deepSleepCount = sleepStageSamples.filter((sample) => sample.value === 2).length;

  return {
    averageBreathingRate,
    movementCount: breathingSamples.filter((sample) => sample.value === -1).length,
    apneaRecognitionFailureCount: breathingSamples.filter((sample) => sample.value === 0).length,
    deepSleepRatio: roundTo(deepSleepCount / sleepStageSamples.length, 2),
  };
}

export const mockSleepDataProvider: SleepDataProvider = {
  async getLatestSession(): Promise<SleepSessionResponse> {
    const sleepStageSamples = buildSamples(sleepStages);
    const breathingSamples = buildSamples(breathingValues);

    return {
      id: "mock-session-20260714",
      startedAt: sleepStageSamples[0].measuredAt,
      endedAt: sleepStageSamples[sleepStageSamples.length - 1].measuredAt,
      intervalMinutes: INTERVAL_MINUTES,
      sleepStageSamples,
      breathingSamples,
      summary: summarize(sleepStageSamples, breathingSamples),
    };
  },
};
```

- [ ] **Step 5: Create service, route, and Express app**

Create `server/src/services/sleepSessionService.ts`:

```ts
import type { SleepDataProvider } from "../providers/sleepDataProvider.js";

export function createSleepSessionService(provider: SleepDataProvider) {
  return {
    getLatestSession() {
      return provider.getLatestSession();
    },
  };
}
```

Create `server/src/routes/sleepSessions.ts`:

```ts
import { Router } from "express";
import type { createSleepSessionService } from "../services/sleepSessionService.js";

type SleepSessionService = ReturnType<typeof createSleepSessionService>;

export function createSleepSessionRouter(service: SleepSessionService): Router {
  const router = Router();

  router.get("/latest", async (_req, res) => {
    try {
      const session = await service.getLatestSession();
      res.json(session);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "sleep_session_load_failed", message });
    }
  });

  return router;
}
```

Create `server/src/index.ts`:

```ts
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
```

- [ ] **Step 6: Run server tests and typecheck**

Run: `npm --workspace server run test`

Expected: PASS for provider factory and mock provider tests.

Run: `npm --workspace server run typecheck`

Expected: PASS with no TypeScript errors.

- [ ] **Step 7: Manually verify API response**

Run: `npm --workspace server run dev`

Open or request: `http://localhost:4000/api/sleep-sessions/latest`

Expected: JSON response includes `sleepStageSamples` length `25`, `breathingSamples` length `25`, and `summary.averageBreathingRate` equal to `14.6`.

- [ ] **Step 8: Commit server implementation**

```bash
git add server
git commit -m "feat: add mock sleep session api"
```

---

### Task 3: Client Scaffolding, API Client, And Data Transforms

**Files:**
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/tsconfig.node.json`
- Create: `client/vite.config.ts`
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `client/src/types/sleep.ts`
- Create: `client/src/api/sleepApi.ts`
- Create: `client/src/data/chartTransforms.ts`
- Create: `client/src/data/timeWindow.ts`
- Test: `client/src/__tests__/chartTransforms.test.ts`
- Test: `client/src/__tests__/timeWindow.test.ts`

**Interfaces:**
- Consumes: API response shape from Task 2.
- Produces: `fetchLatestSleepSession()`, `parseMeasuredAt()`, `toChartSamples()`, `createInitialTimeWindow()`, `panTimeWindow()`.

- [ ] **Step 1: Create client package and Vite config**

Create `client/package.json`:

```json
{
  "name": "@sleeper/client",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc -p tsconfig.json && vite build",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "recharts": "^2.12.3",
    "vite": "^5.1.6",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@testing-library/react": "^14.2.1",
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "jsdom": "^24.0.0",
    "typescript": "^5.4.2",
    "vitest": "^1.4.0"
  }
}
```

Create `client/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `client/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

Create `client/vite.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
  test: {
    environment: "jsdom",
  },
});
```

- [ ] **Step 2: Create HTML and React entry**

Create `client/index.html`:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sleeper</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `client/src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 3: Create frontend types and API client**

Create `client/src/types/sleep.ts`:

```ts
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
```

Create `client/src/api/sleepApi.ts`:

```ts
import type { SleepSessionResponse } from "../types/sleep";

export async function fetchLatestSleepSession(): Promise<SleepSessionResponse> {
  const response = await fetch("/api/sleep-sessions/latest");

  if (!response.ok) {
    throw new Error(`Failed to load sleep session: ${response.status}`);
  }

  return response.json() as Promise<SleepSessionResponse>;
}
```

- [ ] **Step 4: Create transform tests**

Create `client/src/__tests__/chartTransforms.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseMeasuredAt, toChartSamples } from "../data/chartTransforms";

describe("chartTransforms", () => {
  it("parses yyyyMMddHHmmss timestamps into local Date milliseconds", () => {
    const value = parseMeasuredAt("20260714230000");
    const date = new Date(value);

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(14);
    expect(date.getHours()).toBe(23);
  });

  it("adds numeric time and readable labels to samples", () => {
    const samples = toChartSamples([{ measuredAt: "20260714230000", value: 2 }]);

    expect(samples[0]).toMatchObject({
      measuredAt: "20260714230000",
      value: 2,
      timeLabel: "23:00",
    });
    expect(typeof samples[0].timeMs).toBe("number");
  });
});
```

Create `client/src/__tests__/timeWindow.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createInitialTimeWindow, panTimeWindow } from "../data/timeWindow";

describe("timeWindow", () => {
  it("creates a two-hour initial window clamped to the full domain", () => {
    const start = new Date(2026, 6, 14, 23).getTime();
    const end = new Date(2026, 6, 15, 1).getTime();

    expect(createInitialTimeWindow(start, end, 120)).toEqual({ start, end });
  });

  it("pans without exceeding the full domain", () => {
    const domainStart = 0;
    const domainEnd = 10_000;
    const current = { start: 2_000, end: 6_000 };

    expect(panTimeWindow(current, -5_000, domainStart, domainEnd)).toEqual({
      start: 0,
      end: 4_000,
    });
    expect(panTimeWindow(current, 8_000, domainStart, domainEnd)).toEqual({
      start: 6_000,
      end: 10_000,
    });
  });
});
```

- [ ] **Step 5: Run tests to verify transform files are missing**

Run: `npm --workspace client run test -- chartTransforms timeWindow`

Expected: FAIL because `chartTransforms.ts` and `timeWindow.ts` do not exist.

- [ ] **Step 6: Implement chart transforms and time-window math**

Create `client/src/data/chartTransforms.ts`:

```ts
import type { ChartSample, SensorSample } from "../types/sleep";

const pad = (value: number) => String(value).padStart(2, "0");

export function parseMeasuredAt(value: string): number {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6)) - 1;
  const day = Number(value.slice(6, 8));
  const hour = Number(value.slice(8, 10));
  const minute = Number(value.slice(10, 12));
  const second = Number(value.slice(12, 14));

  return new Date(year, month, day, hour, minute, second).getTime();
}

export function formatTimeLabel(timeMs: number): string {
  const date = new Date(timeMs);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toChartSamples(samples: SensorSample[]): ChartSample[] {
  return samples.map((sample) => {
    const timeMs = parseMeasuredAt(sample.measuredAt);

    return {
      ...sample,
      timeMs,
      timeLabel: formatTimeLabel(timeMs),
    };
  });
}
```

Create `client/src/data/timeWindow.ts`:

```ts
export type TimeWindow = {
  start: number;
  end: number;
};

const minutesToMs = (minutes: number) => minutes * 60_000;

export function createInitialTimeWindow(domainStart: number, domainEnd: number, visibleMinutes: number): TimeWindow {
  const visibleMs = minutesToMs(visibleMinutes);
  const domainWidth = domainEnd - domainStart;

  if (domainWidth <= visibleMs) {
    return { start: domainStart, end: domainEnd };
  }

  return {
    start: domainStart,
    end: domainStart + visibleMs,
  };
}

export function panTimeWindow(
  current: TimeWindow,
  deltaMs: number,
  domainStart: number,
  domainEnd: number,
): TimeWindow {
  const width = current.end - current.start;
  let nextStart = current.start + deltaMs;
  let nextEnd = current.end + deltaMs;

  if (nextStart < domainStart) {
    nextStart = domainStart;
    nextEnd = domainStart + width;
  }

  if (nextEnd > domainEnd) {
    nextEnd = domainEnd;
    nextStart = domainEnd - width;
  }

  return { start: nextStart, end: nextEnd };
}

export function filterByTimeWindow<T extends { timeMs: number }>(samples: T[], window: TimeWindow): T[] {
  return samples.filter((sample) => sample.timeMs >= window.start && sample.timeMs <= window.end);
}
```

- [ ] **Step 7: Run client transform tests and typecheck**

Run: `npm --workspace client run test -- chartTransforms timeWindow`

Expected: PASS.

Run: `npm --workspace client run typecheck`

Expected: FAIL until `App.tsx` exists in Task 4.

- [ ] **Step 8: Commit client data layer once Task 4 adds App and typecheck passes**

```bash
git add client
git commit -m "feat: add client data transforms"
```

---

### Task 4: Dashboard UI, Charts, And Shared Time Window

**Files:**
- Create: `client/src/App.tsx`
- Create: `client/src/charts/chartConfig.ts`
- Create: `client/src/charts/SleepStageChart.tsx`
- Create: `client/src/charts/BreathingChart.tsx`
- Create: `client/src/components/SummaryMetric.tsx`
- Create: `client/src/components/TimeWindowController.tsx`
- Create: `client/src/styles.css`

**Interfaces:**
- Consumes: `fetchLatestSleepSession()`, `toChartSamples()`, `createInitialTimeWindow()`, `panTimeWindow()`, `filterByTimeWindow()`.
- Produces: First complete dashboard UI.

- [ ] **Step 1: Create chart config**

Create `client/src/charts/chartConfig.ts`:

```ts
export const chartColors = {
  sleepLine: "#276b7a",
  sleepFill: "#b9dde3",
  breathingLine: "#4f6f52",
  movement: "#c87941",
  apnea: "#b94a48",
  grid: "#d9e3e5",
  axis: "#66777b",
};

export const sleepStageLabels: Record<number, string> = {
  0: "얕음",
  1: "중간",
  2: "깊음",
};

export function formatBreathingValue(value: number): string {
  if (value === -1) return "뒤척임";
  if (value === 0) return "무호흡 인식 실패";
  return `${value}회/분`;
}
```

- [ ] **Step 2: Create summary metric component**

Create `client/src/components/SummaryMetric.tsx`:

```tsx
type SummaryMetricProps = {
  label: string;
  value: string;
  tone?: "default" | "alert";
};

export function SummaryMetric({ label, value, tone = "default" }: SummaryMetricProps) {
  return (
    <div className={`summary-metric summary-metric--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
```

- [ ] **Step 3: Create time window controller**

Create `client/src/components/TimeWindowController.tsx`:

```tsx
import { useRef, useState, type PointerEvent } from "react";
import type { TimeWindow } from "../data/timeWindow";
import { formatTimeLabel } from "../data/chartTransforms";

type TimeWindowControllerProps = {
  window: TimeWindow;
  domainStart: number;
  domainEnd: number;
  onPan: (deltaMs: number) => void;
};

const STEP_MS = 30 * 60_000;

export function TimeWindowController({ window, domainStart, domainEnd, onPan }: TimeWindowControllerProps) {
  const dragStartX = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const canPanLeft = window.start > domainStart;
  const canPanRight = window.end < domainEnd;
  const domainWidth = domainEnd - domainStart;
  const windowWidth = window.end - window.start;
  const trackWidthPercent = Math.max(8, (windowWidth / domainWidth) * 100);
  const trackOffsetPercent = domainWidth === 0 ? 0 : ((window.start - domainStart) / domainWidth) * 100;

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragStartX.current = event.clientX;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const deltaPx = event.clientX - dragStartX.current;
    const deltaMs = (deltaPx / rect.width) * domainWidth;

    onPan(deltaMs);
    dragStartX.current = event.clientX;
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    dragStartX.current = null;
    setIsDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className="time-window-controller" aria-label="표시 시간 구간">
      <button type="button" onClick={() => onPan(-STEP_MS)} disabled={!canPanLeft} aria-label="이전 시간 구간">
        ←
      </button>
      <span>
        {formatTimeLabel(window.start)} - {formatTimeLabel(window.end)}
      </span>
      <button type="button" onClick={() => onPan(STEP_MS)} disabled={!canPanRight} aria-label="다음 시간 구간">
        →
      </button>
      <div
        className={`time-window-track ${isDragging ? "time-window-track--dragging" : ""}`}
        role="slider"
        aria-valuemin={domainStart}
        aria-valuemax={domainEnd}
        aria-valuenow={window.start}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div
          className="time-window-track__thumb"
          style={{
            width: `${trackWidthPercent}%`,
            left: `${trackOffsetPercent}%`,
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create sleep stage chart**

Create `client/src/charts/SleepStageChart.tsx`:

```tsx
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartSample } from "../types/sleep";
import type { TimeWindow } from "../data/timeWindow";
import { chartColors, sleepStageLabels } from "./chartConfig";
import { formatTimeLabel } from "../data/chartTransforms";

type SleepStageChartProps = {
  data: ChartSample[];
  window: TimeWindow;
};

export function SleepStageChart({ data, window }: SleepStageChartProps) {
  return (
    <section className="chart-panel">
      <div className="chart-panel__header">
        <h2>수면 단계</h2>
        <span>높을수록 깊은 수면</span>
      </div>
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 12, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={chartColors.grid} strokeDasharray="4 4" />
            <XAxis
              dataKey="timeMs"
              type="number"
              domain={[window.start, window.end]}
              tickFormatter={formatTimeLabel}
              stroke={chartColors.axis}
            />
            <YAxis
              domain={[0, 2]}
              ticks={[0, 1, 2]}
              tickFormatter={(value) => sleepStageLabels[Number(value)]}
              stroke={chartColors.axis}
              width={56}
            />
            <Tooltip
              labelFormatter={(value) => formatTimeLabel(Number(value))}
              formatter={(value) => [sleepStageLabels[Number(value)], "단계"]}
            />
            <Area
              type="stepAfter"
              dataKey="value"
              stroke={chartColors.sleepLine}
              fill={chartColors.sleepFill}
              strokeWidth={3}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create breathing chart**

Create `client/src/charts/BreathingChart.tsx`:

```tsx
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartSample } from "../types/sleep";
import type { TimeWindow } from "../data/timeWindow";
import { formatTimeLabel } from "../data/chartTransforms";
import { chartColors, formatBreathingValue } from "./chartConfig";

type BreathingChartProps = {
  data: ChartSample[];
  window: TimeWindow;
};

export function BreathingChart({ data, window }: BreathingChartProps) {
  const eventPoints = data.filter((sample) => sample.value <= 0);

  return (
    <section className="chart-panel">
      <div className="chart-panel__header">
        <h2>호흡</h2>
        <span>양수는 분당 호흡 횟수</span>
      </div>
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 12, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={chartColors.grid} strokeDasharray="4 4" />
            <XAxis
              dataKey="timeMs"
              type="number"
              domain={[window.start, window.end]}
              tickFormatter={formatTimeLabel}
              stroke={chartColors.axis}
            />
            <YAxis stroke={chartColors.axis} width={48} />
            <Tooltip
              labelFormatter={(value) => formatTimeLabel(Number(value))}
              formatter={(value) => [formatBreathingValue(Number(value)), "호흡"]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={chartColors.breathingLine}
              strokeWidth={3}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
            {eventPoints.map((sample) => (
              <ReferenceDot
                key={`${sample.measuredAt}-${sample.value}`}
                x={sample.timeMs}
                y={sample.value}
                r={6}
                fill={sample.value === -1 ? chartColors.movement : chartColors.apnea}
                stroke="white"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Create App dashboard**

Create `client/src/App.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import { fetchLatestSleepSession } from "./api/sleepApi";
import { BreathingChart } from "./charts/BreathingChart";
import { SleepStageChart } from "./charts/SleepStageChart";
import { TimeWindowController } from "./components/TimeWindowController";
import { SummaryMetric } from "./components/SummaryMetric";
import { filterByTimeWindow, createInitialTimeWindow, panTimeWindow, type TimeWindow } from "./data/timeWindow";
import { formatTimeLabel, parseMeasuredAt, toChartSamples } from "./data/chartTransforms";
import type { SleepSessionResponse } from "./types/sleep";

const INITIAL_VISIBLE_MINUTES = 120;

export default function App() {
  const [session, setSession] = useState<SleepSessionResponse | null>(null);
  const [timeWindow, setTimeWindow] = useState<TimeWindow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLatestSleepSession()
      .then((nextSession) => {
        const domainStart = parseMeasuredAt(nextSession.startedAt);
        const domainEnd = parseMeasuredAt(nextSession.endedAt);
        setSession(nextSession);
        setTimeWindow(createInitialTimeWindow(domainStart, domainEnd, INITIAL_VISIBLE_MINUTES));
      })
      .catch((nextError: unknown) => {
        setError(nextError instanceof Error ? nextError.message : "수면 데이터를 불러올 수 없습니다.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const chartData = useMemo(() => {
    if (!session) return null;

    return {
      sleepStages: toChartSamples(session.sleepStageSamples),
      breathing: toChartSamples(session.breathingSamples),
    };
  }, [session]);

  if (isLoading) {
    return <main className="app-shell">Loading sleep data</main>;
  }

  if (error) {
    return <main className="app-shell app-message">{error}</main>;
  }

  if (!session || !chartData || !timeWindow) {
    return <main className="app-shell app-message">사용 가능한 수면 세션이 없습니다.</main>;
  }

  const domainStart = parseMeasuredAt(session.startedAt);
  const domainEnd = parseMeasuredAt(session.endedAt);
  const visibleSleepStages = filterByTimeWindow(chartData.sleepStages, timeWindow);
  const visibleBreathing = filterByTimeWindow(chartData.breathing, timeWindow);

  const handlePan = (deltaMs: number) => {
    setTimeWindow((current) => {
      if (!current) return current;
      return panTimeWindow(current, deltaMs, domainStart, domainEnd);
    });
  };

  return (
    <main className="app-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Mock monitoring session</p>
          <h1>Sleeper</h1>
        </div>
        <div className="session-window">
          {formatTimeLabel(domainStart)} - {formatTimeLabel(domainEnd)}
        </div>
      </header>

      <section className="summary-grid" aria-label="수면 요약">
        <SummaryMetric
          label="평균 호흡"
          value={session.summary.averageBreathingRate === null ? "-" : `${session.summary.averageBreathingRate}회/분`}
        />
        <SummaryMetric label="뒤척임" value={`${session.summary.movementCount}회`} tone="alert" />
        <SummaryMetric label="무호흡 인식 실패" value={`${session.summary.apneaRecognitionFailureCount}회`} tone="alert" />
        <SummaryMetric label="깊은 수면 비율" value={`${Math.round(session.summary.deepSleepRatio * 100)}%`} />
      </section>

      <TimeWindowController
        window={timeWindow}
        domainStart={domainStart}
        domainEnd={domainEnd}
        onPan={handlePan}
      />

      <div className="chart-grid">
        <SleepStageChart data={visibleSleepStages} window={timeWindow} />
        <BreathingChart data={visibleBreathing} window={timeWindow} />
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Create dashboard styles**

Create `client/src/styles.css`:

```css
:root {
  color: #172326;
  background: #f4f7f6;
  font-family: Inter, "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background: #f4f7f6;
}

button {
  font: inherit;
}

.app-shell {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0;
}

.app-message {
  min-height: 100vh;
  display: grid;
  place-items: center;
  color: #526367;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 20px;
  margin-bottom: 20px;
}

.eyebrow {
  margin: 0 0 6px;
  color: #607276;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 42px;
  line-height: 1;
}

.session-window {
  color: #3c565c;
  font-weight: 700;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-metric {
  background: #ffffff;
  border: 1px solid #d9e3e5;
  border-radius: 8px;
  padding: 14px 16px;
}

.summary-metric span {
  display: block;
  color: #607276;
  font-size: 13px;
  margin-bottom: 6px;
}

.summary-metric strong {
  font-size: 22px;
}

.summary-metric--alert strong {
  color: #a9562d;
}

.time-window-controller {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 16px;
  color: #3c565c;
  font-weight: 700;
}

.time-window-controller button {
  width: 36px;
  height: 36px;
  border: 1px solid #bfd0d4;
  border-radius: 8px;
  background: #ffffff;
  color: #1f4d57;
  cursor: pointer;
}

.time-window-controller button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.time-window-track {
  position: relative;
  width: min(320px, 40vw);
  height: 12px;
  border-radius: 999px;
  background: #d9e3e5;
  touch-action: none;
  cursor: grab;
}

.time-window-track--dragging {
  cursor: grabbing;
}

.time-window-track__thumb {
  position: absolute;
  top: 2px;
  bottom: 2px;
  border-radius: 999px;
  background: #276b7a;
}

.chart-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.chart-panel {
  background: #ffffff;
  border: 1px solid #d9e3e5;
  border-radius: 8px;
  padding: 18px;
}

.chart-panel__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.chart-panel h2 {
  margin: 0;
  font-size: 20px;
}

.chart-panel span {
  color: #607276;
  font-size: 13px;
}

.chart-frame {
  width: 100%;
  min-height: 280px;
}

@media (max-width: 760px) {
  .dashboard-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  h1 {
    font-size: 34px;
  }
}
```

- [ ] **Step 8: Run client build checks**

Run: `npm --workspace client run typecheck`

Expected: PASS.

Run: `npm --workspace client run build`

Expected: PASS and Vite writes `client/dist`.

- [ ] **Step 9: Commit dashboard UI**

```bash
git add client
git commit -m "feat: add sleep monitoring dashboard"
```

---

### Task 5: End-To-End Verification And Polish

**Files:**
- Modify: `README.md`
- Verify: server and client runtime behavior.

**Interfaces:**
- Consumes: Complete server and client from Tasks 1-4.
- Produces: Verified local app with documented run commands.

- [ ] **Step 1: Install dependencies**

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 2: Run all automated checks**

Run: `npm run test`

Expected: server and client tests pass.

Run: `npm run typecheck`

Expected: server and client typechecks pass.

Run: `npm run build`

Expected: server and client builds pass.

- [ ] **Step 3: Run the full app locally**

Run: `npm run dev`

Expected:

- Server prints `Sleeper API listening on http://localhost:4000`.
- Client prints a Vite local URL, usually `http://localhost:5173`.
- `http://localhost:5173` shows the Sleeper dashboard.
- Summary cards show average breathing `14.6회/분`, movement `2회`, apnea recognition failure `2회`, deep sleep ratio `36%`.
- Sleep stage chart appears as a stepped pulse.
- Breathing chart appears as a line chart with event markers for `-1` and `0`.
- Time-window controls are visible and disabled at both ends for the two-hour mock session.

- [ ] **Step 4: Verify mock-only guard**

Run with the real provider requested:

```bash
$env:SLEEP_DATA_SOURCE="mobius"; npm --workspace server run dev
```

Expected: server fails fast with `Real platform data source is not enabled yet.`

Then clear the environment variable:

```bash
Remove-Item Env:SLEEP_DATA_SOURCE
```

- [ ] **Step 5: Update README verification notes**

Modify `README.md` so it contains:

```markdown
## Verification

Run:

```bash
npm run test
npm run typecheck
npm run build
```

The app intentionally starts in mock mode. The real Mobius data source is blocked until a later integration step.
```

- [ ] **Step 6: Final commit**

```bash
git add README.md package-lock.json
git commit -m "docs: add local verification notes"
```
