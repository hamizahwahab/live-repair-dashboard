# Live Repair Tracking Board (Dashboard 4)

A full-stack Electron + Next.js dashboard for tracking DJI Agriculture drone repairs in Bagan Serai. Designed for 1920x1080 TV display with live auto-scrolling, 30-second data polling, and an embedded SQLite API server.

![Dashboard Screenshot](screenshot.png)

## Tech Stack

- **Electron** 42 — Desktop shell with embedded HTTP API server
- **Next.js** 16 — Static export (`output: "export"`) frontend
- **SQLite** — via `sql.js` (WebAssembly) with disk persistence
- **TypeScript** — Strict mode throughout
- **Tailwind CSS** v4 — Dark TV-optimised theme

## Features

- **Live repair job table** with row-by-row auto-scroll (3 s per row, loops)
- **Status tracking** — pending, in_progress, testing, waiting_parts, completed
- **Urgent case detection** — manually flagged jobs + auto-overdue (3+ days past ETA)
- **Spare part inventory** — stock levels with low-stock / out-of-stock highlighting
- **Quick notes / announcements** panel
- **Dashboard statistics** — totals, averages, daily counts, overdue count
- **Colour-coded legend** for all job statuses
- **Automatic polling** every 30 seconds across all 5 list endpoints
- **Live clock** with last-updated timestamp
- **RESTful API** (17 endpoints) with API-key authentication for writes
- **Static export** for production distribution via Electron

## Project Structure

```
live-repair-dashboard/
├── electron/
│   ├── main.js            # Electron main process, HTTP API server (port 8004), SQLite
│   └── preload.js         # Context bridge for IPC channels
├── src/
│   ├── app/
│   │   ├── globals.css    # TV theme variables, shared component styles
│   │   ├── layout.tsx     # Root layout with metadata
│   │   └── page.tsx       # Dashboard main page (client component, polling logic)
│   ├── components/
│   │   ├── StatsRow.tsx       # 7-stat card row (total, pending, in_progress, etc.)
│   │   ├── RepairTable.tsx    # Main job table with auto-scroll
│   │   ├── UrgentPanel.tsx    # Urgent cases panel
│   │   ├── SparePartsPanel.tsx# Spare part stock panel
│   │   ├── NotesPanel.tsx     # Quick notes panel
│   │   ├── LegendPanel.tsx    # Status colour legend
│   │   └── FooterBar.tsx      # Footer with daily stats summary + clock
│   ├── config/
│   │   └── api.ts         # Fetch helpers for all 5 list endpoints
│   └── types/
│       └── index.ts       # TypeScript interfaces (RepairJob, SparePart, Note, etc.)
├── out/                   # Static export output (production)
├── next.config.ts         # Next.js config (static export, unoptimised images)
├── package.json           # Scripts, dependencies, electron-builder config
├── postcss.config.mjs     # PostCSS with Tailwind CSS v4
└── tsconfig.json          # TypeScript config
```

## Getting Started

### Prerequisites

- **Node.js** >= 18.18 (LTS recommended)
- **npm** >= 9

### Installation

```bash
npm install
```

### Development Mode

```bash
# Start Next.js dev server on port 3004
npm run dev
```

In development, the API server runs inside Electron. To start both simultaneously:

```bash
npm run electron:dev
```

This runs `next dev --port 3004` and, once the dev server is ready, launches Electron (which starts the API on port 8004 and loads the dashboard).

### Production Build

```bash
# Static export to out/
npm run build

# Serve the static export locally
npm run start
```

### Electron Production Build

```bash
npm run electron:build
```

This runs `next build` followed by `electron-builder`, producing a portable Windows executable in `dist/`.

## Configuration

| Variable   | Default                         | Description                              |
|-----------|---------------------------------|------------------------------------------|
| `API_KEY` | `LIVE-REPAIR-DASHBOARD-2026`    | API key sent via `x-api-key` header for write operations |

The API key can be overridden via the `API_KEY` environment variable. When running in development mode (`NODE_ENV=development` or unpackaged Electron), the API key check is bypassed for convenience.

## API Overview

The embedded HTTP API server runs on **port 8004**.

### Public Endpoints (no authentication)

| Method | Path                    | Description                  |
|--------|-------------------------|------------------------------|
| GET    | `/api/stats`            | Dashboard statistics         |
| GET    | `/api/urgent-cases`     | Urgent / overdue cases       |
| GET    | `/api/repair-jobs`      | List repair jobs             |
| GET    | `/api/repair-jobs/:id`  | Get single repair job        |
| GET    | `/api/spare-parts`      | List spare parts             |
| GET    | `/api/spare-parts/:id`  | Get single spare part        |
| GET    | `/api/notes`            | List notes                   |
| GET    | `/api/notes/:id`        | Get single note              |

### Authenticated Endpoints (x-api-key required)

| Method | Path                    | Description                  |
|--------|-------------------------|------------------------------|
| POST   | `/api/repair-jobs`      | Create repair job            |
| PUT    | `/api/repair-jobs/:id`  | Update repair job            |
| DELETE | `/api/repair-jobs/:id`  | Delete repair job            |
| POST   | `/api/spare-parts`      | Add spare part               |
| PUT    | `/api/spare-parts/:id`  | Update spare part            |
| DELETE | `/api/spare-parts/:id`  | Delete spare part            |
| POST   | `/api/notes`            | Add note                     |
| PUT    | `/api/notes/:id`        | Update note                  |
| DELETE | `/api/notes/:id`        | Delete note                  |

Full API documentation is available in [`API.md`](API.md).

## Database

SQLite with three tables:

- **repair_jobs** — 15 columns including customer info, drone model, status, ETA, urgency fields, timestamps
- **spare_parts** — 7 columns including stock level and status
- **notes** — 4 columns with message and timestamps

The database is persisted to the Electron user data directory (`repair-dashboard.db`). Timestamps are managed via `DEFAULT CURRENT_TIMESTAMP`. The API uses `RETURNING id` on INSERT and `getRowsModified()` on UPDATE/DELETE for reliable responses.

## Deployment

- **Frontend**: Static export via `next build` outputs to `out/`. Served by Electron's `loadFile()` in production.
- **Desktop**: `electron-builder` packages the app as a Windows portable executable (`.exe`).
- **API Server**: Embedded inside Electron — no separate server process needed.

## License

Proprietary — Aeros Geo Tech Sdn Bhd. All rights reserved.
