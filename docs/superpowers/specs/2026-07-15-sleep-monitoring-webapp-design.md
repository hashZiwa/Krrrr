# Sleep Monitoring Webapp Design

## Goal

Build a full-stack web service that helps a user monitor sleep sensor data collected from an IoT platform. The first implementation will use generated mock data, but the architecture must make it straightforward to replace mock data with a real IoT platform integration and to add analysis or platform upload features later.

## Scope

The initial product will provide one focused dashboard:

- Show a recent two-hour sleep session.
- Generate mock samples every five minutes.
- Render sleep stage samples as a square pulse, or stepped, chart.
- Render breathing samples as a line chart.
- Support variable session lengths in the chart model, with real sessions expected to reach roughly ten hours or more.
- Let users drag horizontally through longer sessions while both charts keep the same visible time window.
- Keep the chart implementation easy to revise because graph style and layout are expected to change often.

The initial product will not include authentication, persistent storage, historical session browsing, real IoT credentials, or upload workflows. Those concerns should be anticipated through clean module boundaries, not implemented yet.

## Recommended Stack

- Frontend: React, Vite, TypeScript
- Server: Express, TypeScript
- Charts: Recharts
- Styling: local CSS files with design tokens and component-level class names

React and Vite give a fast UI development loop. Express provides a small but explicit API layer that can later call IoT platform clients, analysis services, or storage adapters. Recharts is suitable for both stepped charts and standard line charts while keeping chart configuration readable.

## Server Architecture

The server will expose an API that already resembles the future production contract:

- `GET /api/sleep-sessions/latest`

The endpoint returns one latest sleep session with metadata, raw samples, and lightweight summary values. The initial implementation will use a mock provider, but route handlers should depend on a provider/service interface rather than directly generating data inside the route.

Recommended server modules:

- `server/src/index.ts`: Express app bootstrap and middleware.
- `server/src/routes/sleepSessions.ts`: API route definitions.
- `server/src/services/sleepSessionService.ts`: session retrieval and summary orchestration.
- `server/src/providers/mockSleepDataProvider.ts`: mock sample generation.
- `server/src/providers/mobiusSleepDataProvider.ts`: future Mobius/oneM2M platform data retrieval.
- `server/src/clients/mobiusClient.ts`: low-level Mobius HTTP GET/POST wrapper.
- `server/src/models/sleep.ts`: shared server-side data types.
- `server/src/config/env.ts`: validated server-side platform credentials and base URLs.
- `server/src/utils/time.ts`: timestamp formatting and sample interval helpers.

Future provider modules can include:

- `iotSleepDataProvider` or `mobiusSleepDataProvider`: fetches data from the real IoT platform.
- `sleepAnalysisService`: computes sleep quality, apnea suspicion, movement frequency, and deep sleep ratio.
- `platformUploadService`: uploads derived events or annotations back to the IoT platform.

## IoT Platform Communication

The sample Vue file shows a Mobius/oneM2M-style communication pattern. This project should adapt that pattern on the Express server, not in the React frontend. The frontend should call only this service's own API, while the server owns platform credentials, request headers, response parsing, polling, and upload behavior.

Observed platform pattern:

- Latest content instance lookup: `GET /{aePath}/{containerName}/la`
- Content instance creation: `POST /{aePath}/{containerName}`
- Request body shape for uploads:

```json
{
  "m2m:cin": {
    "rn": "4-yyyyMMddHHmmssSSS",
    "con": "value"
  }
}
```

Required headers should be supplied by the server from environment variables:

- `X-M2M-RI`
- `X-M2M-Origin`
- `Accept: application/json`
- `X-API-KEY`
- `X-AUTH-CUSTOM-CREATOR`
- `X-AUTH-CUSTOM-LECTURE`
- `Content-Type: application/json;ty=4` for POST requests

The server should store these values in environment variables rather than source code. The sample file contains credentials directly in frontend code, but this project should avoid exposing API keys or platform identity values to the browser.

The Mobius client should expose small, platform-shaped methods:

```ts
type MobiusCin = {
  rn?: string;
  ri?: string;
  con?: string | number;
};

type MobiusClient = {
  getLatestCin(containerName: string): Promise<MobiusCin>;
  createCin(containerName: string, content: string | number): Promise<MobiusCin>;
};
```

The provider layer should translate platform containers into this service's domain model. For example, sleep stage and breathing containers should be fetched, parsed, sorted by measurement time, and returned as `SensorSample[]`. If platform data arrives as packed strings or mixed event formats, parsing should happen inside the provider or a parser module, not inside chart components.

Polling should also remain server-owned. The Vue sample polls several containers every two seconds. For this service, the first production version can either fetch on demand when `/api/sleep-sessions/latest` is called or add a server-side polling/cache layer later. If polling is introduced, use `Promise.allSettled(containers.map(...))` so independent container failures do not block the whole session response.

Platform upload features should be added behind `platformUploadService`. Candidate uploads include derived analysis results, event annotations, or user-reviewed sleep flags. Upload payload creation should reuse the same `createCin` helper so oneM2M formatting stays in one place.

## Data Model

Raw sensor samples share a simple shape:

```ts
type SensorSample = {
  measuredAt: string; // yyyyMMddHHmmss
  value: number;
};
```

The session response should use separate arrays because the two signals have different value semantics:

```ts
type SleepSessionResponse = {
  id: string;
  startedAt: string;
  endedAt: string;
  intervalMinutes: number;
  sleepStageSamples: SensorSample[];
  breathingSamples: SensorSample[];
  summary: {
    averageBreathingRate: number | null;
    movementCount: number;
    apneaRecognitionFailureCount: number;
    deepSleepRatio: number;
  };
};
```

Sleep stage values:

- `0`: shallow or awake-like stage
- `1`: intermediate stage
- `2`: deeper sleep stage

Breathing values:

- `-1`: movement or tossing signal
- `0`: apnea recognition failure
- Positive integer: breaths per minute

Summary calculations should ignore non-positive breathing values when calculating average breathing rate.

## Mock Data

The first mock provider will generate 25 samples per signal: one sample every five minutes across a two-hour window, including both the start and end timestamps. This two-hour dataset exists only to validate the initial design and graph behavior. It must not be treated as the production session length.

The chart and API design should allow much longer sessions. A real session may contain roughly ten hours of samples, and future data may vary further by user, device, sleep duration, and platform delivery behavior.

The start time can be fixed for reproducibility. A reasonable first value is `20260714230000`, which produces data from 23:00 to 01:00. The generated sequence should include plausible variation:

- Sleep stage starts lighter, reaches deeper sleep in the middle, then becomes lighter near the end.
- Breathing values mostly stay in a realistic adult sleeping range, with a small number of `-1` and `0` events.

Mock generation should be deterministic, not random per request, so the UI remains stable while designing.

## Frontend Architecture

The frontend will fetch the latest session from the Express API and render a compact dashboard.

Recommended frontend modules:

- `client/src/App.tsx`: dashboard composition.
- `client/src/api/sleepApi.ts`: API call and response typing.
- `client/src/types/sleep.ts`: frontend data contracts.
- `client/src/data/chartTransforms.ts`: timestamp and chart data transformations.
- `client/src/data/timeWindow.ts`: visible time-window calculations for long sessions.
- `client/src/charts/chartConfig.ts`: colors, labels, axis behavior, tooltip formatting.
- `client/src/charts/SleepStageChart.tsx`: stepped sleep stage chart.
- `client/src/charts/BreathingChart.tsx`: line breathing chart.
- `client/src/components/TimeWindowController.tsx`: shared horizontal drag or range control for moving through longer sessions.
- `client/src/components/SummaryMetric.tsx`: compact metric display.
- `client/src/styles.css`: visual system and layout.

The chart components should be deliberately thin. They should receive transformed data and read visual choices from `chartConfig`, so future graph changes mostly happen in config or transform files.

Both charts should share one visible time-window state. The UI can default to a two-hour view for readability, but the underlying session may be longer. Horizontal drag gestures, and optionally a compact range control, should update the visible time domain for both charts together. This avoids each chart drifting to a different time range while monitoring the same sleep session.

## UI Design Direction

The first screen should feel like a clear monitoring dashboard, not a marketing page. It should prioritize scanability, calm contrast, and readable charts.

Layout:

- Top bar with service name and session window.
- Small summary row with average breathing rate, movement count, apnea recognition failures, and deep sleep ratio.
- Two chart panels stacked vertically on narrow screens and arranged clearly on larger screens if space allows.

Visual direction:

- Use a quiet clinical palette with a dark ink text color, soft off-white background, muted blue-green sleep accents, and a warm alert accent for special breathing events.
- Use restrained card surfaces only for individual dashboard panels.
- Use compact labels and clear axis formatting.
- Avoid decorative hero sections, excessive copy, and unrelated visual elements.

## Chart Behavior

Sleep stage chart:

- Use a stepped line or area style to create a square pulse effect.
- Y-axis domain is fixed to `[0, 2]`.
- X-axis domain is controlled by the shared visible time window, not hardcoded to two hours.
- Show labels for 0, 1, and 2 instead of raw unlabeled ticks.
- Tooltip displays human-readable time and stage label.

Breathing chart:

- Use a standard line chart for positive breathing values.
- X-axis domain is controlled by the same shared visible time window as the sleep stage chart.
- Preserve `-1` and `0` as visible events, either as points on the baseline or highlighted markers.
- Tooltip explains `-1` as movement and `0` as apnea recognition failure.
- Average breathing summary excludes `-1` and `0`.

Long-session navigation:

- Convert `yyyyMMddHHmmss` timestamps into numeric time values before charting.
- Keep the full dataset in memory for the current session, but render the currently visible time range.
- Default visible range can be two hours for the mock UI, while the full domain comes from `startedAt` and `endedAt`.
- Horizontal dragging pans the visible range left and right while clamping to the full session domain.
- If a chart library feature such as a brush is used, it should be wrapped behind the same `TimeWindowController` boundary so it can be replaced later without rewriting chart components.

## Error And Loading States

The frontend should include basic states:

- Loading: simple dashboard skeleton or a concise "Loading sleep data" message.
- Error: clear message that sleep data could not be loaded.
- Empty data: message that no sleep session is available.

The server should return structured JSON errors for unexpected failures. The first mock endpoint is expected to be stable, but keeping the response shape clear makes later IoT failures easier to handle.

## Testing And Verification

Initial verification should include:

- Type checking for server and client.
- A successful local run of both server and frontend.
- Manual browser verification that both charts render, timestamps are readable, and summary values match mock data semantics.

Useful future tests:

- Unit tests for mock generation count and timestamp interval.
- Unit tests for summary calculations, especially handling of `-1` and `0`.
- Component tests for chart transform functions.

## Implementation Notes

Use a monorepo-style structure with separate `client` and `server` folders. The root `package.json` can provide convenience scripts for installing, developing, and building both sides.

Keep API response types mirrored between client and server for now. If the project grows, introduce a shared package or schema validation layer.
