# Live Repair Tracking Board (Dashboard 4)

A full-stack Electron + Next.js dashboard for tracking DJI Agriculture drone repairs in Bagan Serai. Designed for 1920×1080 TV display with live auto-scrolling, 30-second data polling, and an embedded SQLite API server.

**GitHub**: https://github.com/hamizahwahab/live-repair-dashboard

## Quick Start

```bash
# Install dependencies
npm install

# Run in development (Next.js + Electron fullscreen, port 3004)
npm run electron:dev

# Build static export
npm run build

# Package portable .exe
npm run electron:build
```

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ HTTP Server  │  │ SQLite (sql) │  │   preload.js     │   │
│  │  port 8004   │  │ repair-db.db │  │  (minimal, fetch)│   │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────┘   │
│         │                 │                                   │
│         └─────────────────┼──────────────────────────────────┘
│                           │ loadFile()
└───────────────────────────┼──────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────┐
│                Next.js Renderer (Electron)                    │
│                           │                                   │
│  ┌──────────────┐  ┌─────┴──────┐  ┌────────────────────┐   │
│  │  page.tsx    │──│  api.ts    │  │  StatsRow          │   │
│  │  (Dashboard) │  │ (5 fetchers)│  │  RepairTable       │   │
│  └──────────────┘  └────────────┘  │  UrgentPanel       │   │
│         │                          │  SparePartsPanel   │   │
│         └── FooterBar ── NotesPanel│  LegendPanel       │   │
└──────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, static export) |
| Database | SQLite via sql.js 1.14 (WebAssembly, disk persistence) |
| Desktop | Electron 42 |
| Packaging | electron-builder (portable .exe) |
| Styling | Tailwind CSS v4 + custom CSS classes (TV-optimised dark theme) |
| Language | TypeScript (strict mode) |

## Layout

```
┌────────────────────────────────────────────────────────────┐
│              STATS ROW  (7 stat cards across)              │
├────────────────────────────────────────────────────────────┤
│                                                             │
│              REPAIR TABLE (10 columns, auto-scroll)         │
│                 3s per row, loops                           │
│                                                             │
├──────────────┬──────────────┬──────────────┬──────────────┤
│  URGENT      │  SPARE PART  │  QUICK NOTES │   LEGEND     │
│  CASES       │   STATUS     │  /ANNOUNCE   │  (5 colours) │
│ (manual +    │ (by shortage)│  (carousel)  │              │
│  auto 3+ d)  │              │              │              │
├──────────────┴──────────────┴──────────────┴──────────────┤
│          FOOTER BAR — badges · stats · clock               │
└────────────────────────────────────────────────────────────┘
```

## API Endpoints (Port 8004)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/stats` | Dashboard statistics | No |
| GET | `/api/urgent-cases` | Urgent / overdue cases | No |
| GET | `/api/repair-jobs` | List all repair jobs | No |
| GET | `/api/repair-jobs/:id` | Get single repair job | No |
| GET | `/api/spare-parts` | List all spare parts | No |
| GET | `/api/spare-parts/:id` | Get single spare part | No |
| GET | `/api/notes` | List all notes | No |
| GET | `/api/notes/:id` | Get single note | No |
| POST | `/api/repair-jobs` | Create repair job | x-api-key |
| PUT | `/api/repair-jobs/:id` | Update repair job | x-api-key |
| DELETE | `/api/repair-jobs/:id` | Delete repair job | x-api-key |
| POST | `/api/spare-parts` | Add spare part | x-api-key |
| PUT | `/api/spare-parts/:id` | Update spare part | x-api-key |
| DELETE | `/api/spare-parts/:id` | Delete spare part | x-api-key |
| POST | `/api/notes` | Add note | x-api-key |
| PUT | `/api/notes/:id` | Update note | x-api-key |
| DELETE | `/api/notes/:id` | Delete note | x-api-key |

Full API documentation is available in [`API.md`](API.md).

## Configuration

### API Key

Create a `.env` file in the project root:

```
API_KEY=your-secret-api-key-here
```

Generate a random key:
```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

In dev mode (`NODE_ENV=development` or unpackaged Electron), API key check is skipped.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Next.js dev server (port 3004) |
| `npm run build` | Static export to `out/` |
| `npm run start` | Serve static export locally |
| `npm run lint` | ESLint on `src/` |
| `npm run electron:dev` | Dev server (port 3004) + Electron fullscreen |
| `npm run electron:build` | Build + package portable `.exe` |
| `npm run electron:start` | Run Electron in production mode |
