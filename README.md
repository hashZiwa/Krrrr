# Sleeper

Mock-first sleep monitoring webapp.

## Data Source

The initial implementation uses mock data only. `SLEEP_DATA_SOURCE` defaults to `mock`.
Real Mobius/oneM2M communication is intentionally disabled until explicitly enabled later.

## Mobius Environment

Copy `.env.example` to `.env` and fill the Mobius values there. `.env` is ignored by git.

Common settings use `MOBIUS_BASE_URL`, `MOBIUS_AE_PATH`, `MOBIUS_X_M2M_RI`,
`MOBIUS_X_M2M_ORIGIN`, `MOBIUS_API_KEY`, `MOBIUS_AUTH_CUSTOM_CREATOR`, and
`MOBIUS_AUTH_CUSTOM_LECTURE`.

Upload containers are configured per feature with the `MOBIUS_UPLOAD_CONTAINER_` prefix.
For example, `MOBIUS_UPLOAD_CONTAINER_SLEEP_ANALYSIS=ANALYSIS/SLEEP_CN` is available
to the upload service as the `sleepAnalysis` feature key.

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

## Verification

Run:

```bash
npm run test
npm run typecheck
npm run build
```

The app intentionally starts in mock mode. The real Mobius data source is blocked until a later integration step.
