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

## Verification

Run:

```bash
npm run test
npm run typecheck
npm run build
```

The app intentionally starts in mock mode. The real Mobius data source is blocked until a later integration step.
