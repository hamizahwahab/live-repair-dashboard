# Live Repair Tracking Board — API Documentation

This document describes all HTTP endpoints exposed by the embedded API server of the Live Repair Tracking Board (Dashboard 4).

---

## Overview

- **Base URL**: `http://localhost:8004`
- **API Server**: Embedded in the Electron main process (Node.js `http` module)
- **Database**: SQLite via `sql.js` (WebAssembly) with disk persistence
- **Port**: `8004`
- **Total Endpoints**: 17 (8 public read, 9 authenticated write)

---

## Authentication

All write endpoints (POST, PUT, DELETE) require an API key passed via the `x-api-key` request header.

| Header       | Value                               | Required For     |
|-------------|-------------------------------------|------------------|
| `x-api-key` | `LIVE-REPAIR-DASHBOARD-2026`        | POST / PUT / DELETE |

- The default key is `LIVE-REPAIR-DASHBOARD-2026`.
- Override via the `API_KEY` environment variable when starting Electron.
- The check uses constant-time comparison to prevent timing attacks.
- **Development mode**: When `NODE_ENV=development` or Electron is not packaged (`!app.isPackaged`), the API key check is skipped entirely.

**Example header:**

```
x-api-key: LIVE-REPAIR-DASHBOARD-2026
```

---

## Common Headers

| Header           | Value                  | Notes                        |
|-----------------|------------------------|------------------------------|
| `Content-Type`  | `application/json`     | Required for POST / PUT      |
| `x-api-key`     | (API key)              | Required for write operations |

All responses use `Content-Type: application/json`. CORS headers allow any origin:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, x-api-key
```

---

## Error Response Format

All errors return a JSON object with a single `error` field:

```json
{
  "error": "Description of the error"
}
```

### HTTP Status Codes

| Code | Meaning                        |
|------|--------------------------------|
| 200  | Success                        |
| 201  | Created (POST)                 |
| 400  | Bad request (invalid JSON or missing fields) |
| 401  | Unauthorized (invalid/missing API key) |
| 404  | Resource not found             |
| 500  | Internal server error          |

---

## Endpoints: Repair Jobs

### GET /api/repair-jobs

List all repair jobs (max 50, ordered by `date_in` DESC then `id` DESC).

- **Authentication**: None (public)
- **Query parameters**: None

**Example request:**

```bash
curl http://localhost:8004/api/repair-jobs
```

**Example response (200):**

```json
[
  {
    "id": 1,
    "date_in": "2026-06-01",
    "customer": "Ali Hassan",
    "area": "Parit Buntar",
    "drone_model": "DJI Agras T50",
    "problem": "Motor not spinning",
    "technician": "Amir (CTO)",
    "status": "in_progress",
    "eta": "2026-06-05",
    "spare_status": "Waiting for motor",
    "remarks": "Ordered replacement motor",
    "is_urgent": 0,
    "urgent_reason": "",
    "urgent_deadline": "",
    "created_at": "2026-06-01 08:30:00",
    "updated_at": "2026-06-02 10:15:00"
  }
]
```

---

### GET /api/repair-jobs/:id

Retrieve a single repair job by ID.

- **Authentication**: None (public)
- **Path parameters**: `id` (integer, required)

**Example request:**

```bash
curl http://localhost:8004/api/repair-jobs/1
```

**Example response (200):**

```json
{
  "id": 1,
  "date_in": "2026-06-01",
  "customer": "Ali Hassan",
  "area": "Parit Buntar",
  "drone_model": "DJI Agras T50",
  "problem": "Motor not spinning",
  "technician": "Amir (CTO)",
  "status": "in_progress",
  "eta": "2026-06-05",
  "spare_status": "Waiting for motor",
  "remarks": "Ordered replacement motor",
  "is_urgent": 0,
  "urgent_reason": "",
  "urgent_deadline": "",
  "created_at": "2026-06-01 08:30:00",
  "updated_at": "2026-06-02 10:15:00"
}
```

**Error response (404):**

```json
{
  "error": "Repair job not found"
}
```

---

### POST /api/repair-jobs

Create a new repair job.

- **Authentication**: `x-api-key` required
- **Content-Type**: `application/json`

**Request body schema:**

| Field          | Type    | Required | Default   | Description                     |
|---------------|---------|----------|-----------|---------------------------------|
| `date_in`     | string  | yes      | —         | Date received (YYYY-MM-DD)      |
| `customer`    | string  | yes      | —         | Customer name                   |
| `drone_model` | string  | yes      | —         | Drone model                     |
| `problem`     | string  | yes      | —         | Issue description               |
| `technician`  | string  | yes      | —         | Assigned technician             |
| `area`        | string  | no       | `""`      | Customer area / location        |
| `status`      | string  | no       | `"pending"` | Job status (see below)        |
| `eta`         | string  | no       | `""`      | Estimated completion date       |
| `spare_status`| string  | no       | `""`      | Spare part status               |
| `remarks`     | string  | no       | `""`      | Additional notes                |

**Valid status values:** `pending`, `in_progress`, `testing`, `waiting_parts`, `completed`

**Example request:**

```bash
curl -X POST http://localhost:8004/api/repair-jobs \
  -H "Content-Type: application/json" \
  -H "x-api-key: LIVE-REPAIR-DASHBOARD-2026" \
  -d '{
    "date_in": "2026-06-09",
    "customer": "Muthu Kaliappan",
    "area": "Tanjung Piandang",
    "drone_model": "DJI Agras T30",
    "problem": "RTK module not locking",
    "technician": "Razif"
  }'
```

**Example response (201):**

```json
{
  "message": "Repair job created",
  "id": 11
}
```

**Error response (400) — missing fields:**

```json
{
  "error": "Missing required fields: date_in, customer, drone_model, problem, technician"
}
```

**Error response (400) — invalid JSON:**

```json
{
  "error": "Invalid JSON body"
}
```

---

### PUT /api/repair-jobs/:id

Update an existing repair job. Only the fields provided in the body are updated (partial update / PATCH-like behaviour).

- **Authentication**: `x-api-key` required
- **Content-Type**: `application/json`
- **Path parameters**: `id` (integer, required)

**Request body schema:** All fields are optional. Sending an empty body returns a 400 error.

| Field             | Type    | Description                     |
|------------------|---------|---------------------------------|
| `date_in`        | string  | Date received                   |
| `customer`       | string  | Customer name                   |
| `area`           | string  | Area / location                 |
| `drone_model`    | string  | Drone model                     |
| `problem`        | string  | Issue description               |
| `technician`     | string  | Assigned technician             |
| `status`         | string  | Job status                      |
| `eta`            | string  | Estimated completion            |
| `spare_status`   | string  | Spare part status               |
| `remarks`        | string  | Additional notes                |
| `is_urgent`      | integer | Urgency flag (0 or 1)           |
| `urgent_reason`  | string  | Reason for urgency              |
| `urgent_deadline`| string  | Urgency deadline                |

**Example request:**

```bash
curl -X PUT http://localhost:8004/api/repair-jobs/1 \
  -H "Content-Type: application/json" \
  -H "x-api-key: LIVE-REPAIR-DASHBOARD-2026" \
  -d '{
    "status": "completed",
    "remarks": "Job finished, customer notified"
  }'
```

**Example response (200):**

```json
{
  "message": "Repair job updated",
  "id": 1
}
```

**Error response (400):**

```json
{
  "error": "No fields to update"
}
```

**Error response (404):**

```json
{
  "error": "Repair job not found"
}
```

---

### DELETE /api/repair-jobs/:id

Delete a repair job by ID.

- **Authentication**: `x-api-key` required
- **Path parameters**: `id` (integer, required)

**Example request:**

```bash
curl -X DELETE http://localhost:8004/api/repair-jobs/1 \
  -H "x-api-key: LIVE-REPAIR-DASHBOARD-2026"
```

**Example response (200):**

```json
{
  "message": "Repair job deleted",
  "id": 1
}
```

**Error response (404):**

```json
{
  "error": "Repair job not found"
}
```

---

## Endpoints: Spare Parts

### GET /api/spare-parts

List all spare parts (ordered by `id` ASC).

- **Authentication**: None (public)

**Example request:**

```bash
curl http://localhost:8004/api/spare-parts
```

**Example response (200):**

```json
[
  {
    "id": 1,
    "name": "Motor - 4015",
    "model": "T50",
    "stock_level": 3,
    "status": "low",
    "notes": "Ordered 10 units, ETA 3 days",
    "updated_at": "2026-06-08 14:00:00"
  }
]
```

---

### GET /api/spare-parts/:id

Retrieve a single spare part by ID.

- **Authentication**: None (public)
- **Path parameters**: `id` (integer, required)

**Example request:**

```bash
curl http://localhost:8004/api/spare-parts/1
```

**Example response (200):**

```json
{
  "id": 1,
  "name": "Motor - 4015",
  "model": "T50",
  "stock_level": 3,
  "status": "low",
  "notes": "Ordered 10 units, ETA 3 days",
  "updated_at": "2026-06-08 14:00:00"
}
```

**Error response (404):**

```json
{
  "error": "Spare part not found"
}
```

---

### POST /api/spare-parts

Add a new spare part.

- **Authentication**: `x-api-key` required
- **Content-Type**: `application/json`

**Request body schema:**

| Field         | Type    | Required | Default       | Description                    |
|--------------|---------|----------|---------------|--------------------------------|
| `name`       | string  | yes      | —             | Part name                      |
| `model`      | string  | no       | `""`          | Compatible drone model         |
| `stock_level`| integer | no       | `0`           | Current stock count            |
| `status`     | string  | no       | `"available"` | Stock status (see below)       |
| `notes`      | string  | no       | `""`          | Additional notes               |

**Valid status values:** `available`, `low`, `out_of_stock`, `on_order`

**Example request:**

```bash
curl -X POST http://localhost:8004/api/spare-parts \
  -H "Content-Type: application/json" \
  -H "x-api-key: LIVE-REPAIR-DASHBOARD-2026" \
  -d '{
    "name": "Propeller Set - T50",
    "model": "T50",
    "stock_level": 15,
    "status": "available"
  }'
```

**Example response (201):**

```json
{
  "message": "Spare part added",
  "id": 7
}
```

**Error response (400):**

```json
{
  "error": "Missing required field: name"
}
```

---

### PUT /api/spare-parts/:id

Update an existing spare part. Partial update — only provided fields are modified.

- **Authentication**: `x-api-key` required
- **Content-Type**: `application/json`
- **Path parameters**: `id` (integer, required)

**Request body schema:** All fields optional.

| Field         | Type    | Description                    |
|--------------|---------|--------------------------------|
| `name`       | string  | Part name                      |
| `model`      | string  | Compatible drone model         |
| `stock_level`| integer | Stock count                    |
| `status`     | string  | Stock status                   |
| `notes`      | string  | Additional notes               |

**Example request:**

```bash
curl -X PUT http://localhost:8004/api/spare-parts/1 \
  -H "Content-Type: application/json" \
  -H "x-api-key: LIVE-REPAIR-DASHBOARD-2026" \
  -d '{
    "stock_level": 8,
    "status": "available"
  }'
```

**Example response (200):**

```json
{
  "message": "Spare part updated",
  "id": 1
}
```

**Error responses:** Same format as repair jobs (400 for no fields / invalid JSON, 404 for not found).

---

### DELETE /api/spare-parts/:id

Delete a spare part by ID.

- **Authentication**: `x-api-key` required
- **Path parameters**: `id` (integer, required)

**Example request:**

```bash
curl -X DELETE http://localhost:8004/api/spare-parts/1 \
  -H "x-api-key: LIVE-REPAIR-DASHBOARD-2026"
```

**Example response (200):**

```json
{
  "message": "Spare part deleted",
  "id": 1
}
```

---

## Endpoints: Notes

### GET /api/notes

List all notes (ordered by `created_at` DESC).

- **Authentication**: None (public)

**Example request:**

```bash
curl http://localhost:8004/api/notes
```

**Example response (200):**

```json
[
  {
    "id": 1,
    "message": "Service centre will be closed on Friday for maintenance.",
    "created_at": "2026-06-09 09:00:00",
    "updated_at": "2026-06-09 09:00:00"
  }
]
```

---

### GET /api/notes/:id

Retrieve a single note by ID.

- **Authentication**: None (public)
- **Path parameters**: `id` (integer, required)

**Example request:**

```bash
curl http://localhost:8004/api/notes/1
```

**Example response (200):**

```json
{
  "id": 1,
  "message": "Service centre will be closed on Friday for maintenance.",
  "created_at": "2026-06-09 09:00:00",
  "updated_at": "2026-06-09 09:00:00"
}
```

**Error response (404):**

```json
{
  "error": "Note not found"
}
```

---

### POST /api/notes

Add a new note.

- **Authentication**: `x-api-key` required
- **Content-Type**: `application/json`

**Request body schema:**

| Field     | Type   | Required | Description      |
|----------|--------|----------|------------------|
| `message` | string | yes      | Note content     |

**Example request:**

```bash
curl -X POST http://localhost:8004/api/notes \
  -H "Content-Type: application/json" \
  -H "x-api-key: LIVE-REPAIR-DASHBOARD-2026" \
  -d '{
    "message": "Reminder: Monthly stock check this Friday."
  }'
```

**Example response (201):**

```json
{
  "message": "Note added",
  "id": 2
}
```

**Error response (400):**

```json
{
  "error": "Missing required field: message"
}
```

---

### PUT /api/notes/:id

Update a note's message.

- **Authentication**: `x-api-key` required
- **Content-Type**: `application/json`
- **Path parameters**: `id` (integer, required)

**Request body schema:**

| Field     | Type   | Required | Description      |
|----------|--------|----------|------------------|
| `message` | string | yes      | New note content |

**Example request:**

```bash
curl -X PUT http://localhost:8004/api/notes/1 \
  -H "Content-Type: application/json" \
  -H "x-api-key: LIVE-REPAIR-DASHBOARD-2026" \
  -d '{
    "message": "Updated: Maintenance rescheduled to Saturday."
  }'
```

**Example response (200):**

```json
{
  "message": "Note updated",
  "id": 1
}
```

**Error responses:** Same format as other resources (400 for missing message / invalid JSON, 404 for not found).

---

### DELETE /api/notes/:id

Delete a note by ID.

- **Authentication**: `x-api-key` required
- **Path parameters**: `id` (integer, required)

**Example request:**

```bash
curl -X DELETE http://localhost:8004/api/notes/1 \
  -H "x-api-key: LIVE-REPAIR-DASHBOARD-2026"
```

**Example response (200):**

```json
{
  "message": "Note deleted",
  "id": 1
}
```

---

## Endpoints: Dashboard

### GET /api/stats

Returns computed dashboard statistics.

- **Authentication**: None (public)

**Example request:**

```bash
curl http://localhost:8004/api/stats
```

**Example response (200):**

```json
{
  "totalJobs": 10,
  "pending": 2,
  "inProgress": 3,
  "testing": 1,
  "totalCompleted": 4,
  "completedToday": 1,
  "overdue": 2,
  "avgDays": 3.5,
  "receivedToday": 1,
  "pendingPrevDay": 5,
  "totalPending": 6
}
```

**Response fields:**

| Field            | Type   | Description                                            |
|-----------------|--------|--------------------------------------------------------|
| `totalJobs`     | number | Total repair jobs in the database                      |
| `pending`       | number | Jobs with status `pending`                             |
| `inProgress`    | number | Jobs with status `in_progress`                         |
| `testing`       | number | Jobs with status `testing`                             |
| `totalCompleted`| number | Jobs with status `completed`                           |
| `completedToday`| number | Jobs completed today (based on `updated_at`)           |
| `overdue`       | number | Incomplete jobs past their ETA                         |
| `avgDays`       | number | Average turnaround time (completed jobs, in days)      |
| `receivedToday` | number | Jobs received today (based on `date_in`)               |
| `pendingPrevDay`| number | Incomplete jobs created before today                   |
| `totalPending`  | number | Sum of pending + in_progress + testing                 |

---

### GET /api/urgent-cases

Returns urgent repair jobs from two sources:

1. **Manually flagged** — jobs where `is_urgent = 1`
2. **Auto-overdue** — jobs where ETA has passed by 3 or more days and status is not `completed`

Results are ordered by `is_urgent` DESC (flagged first), then `eta` ASC.

- **Authentication**: None (public)

**Example request:**

```bash
curl http://localhost:8004/api/urgent-cases
```

**Example response (200):**

```json
[
  {
    "id": 3,
    "date_in": "2026-06-01",
    "customer": "Siti Nordin",
    "area": "Kuala Kurau",
    "drone_model": "DJI Agras T50",
    "problem": "Battery not charging",
    "technician": "Hafiz",
    "status": "waiting_parts",
    "eta": "2026-06-03",
    "spare_status": "",
    "remarks": "",
    "is_urgent": 1,
    "urgent_reason": "Customer complaint — escalation",
    "urgent_deadline": "2026-06-10",
    "created_at": "2026-06-01 09:00:00",
    "updated_at": "2026-06-08 16:30:00",
    "_reason": "Customer complaint — escalation",
    "_deadline": "2026-06-10",
    "_isAutoOverdue": false
  },
  {
    "id": 7,
    "date_in": "2026-05-20",
    "customer": "Ah Chong",
    "area": "Bagan Serai",
    "drone_model": "DJI Agras T30",
    "problem": "Spraying system clogged",
    "technician": "Razif",
    "status": "pending",
    "eta": "2026-05-25",
    "spare_status": "",
    "remarks": "",
    "is_urgent": 0,
    "urgent_reason": "",
    "urgent_deadline": "",
    "created_at": "2026-05-20 10:00:00",
    "updated_at": "2026-05-20 10:00:00",
    "_reason": "Overdue by 15 days",
    "_deadline": "2026-05-25",
    "_isAutoOverdue": true
  }
]
```

The `_reason`, `_deadline`, and `_isAutoOverdue` fields are computed by the API and not stored in the database.

---

## Database Schema

### Table: `repair_jobs`

| Column            | Type    | Default                  | Notes                                    |
|------------------|---------|--------------------------|------------------------------------------|
| `id`             | INTEGER | PRIMARY KEY AUTOINCREMENT |                                          |
| `date_in`        | TEXT    | NOT NULL                 | Date received                            |
| `customer`       | TEXT    | NOT NULL                 | Customer name                            |
| `area`           | TEXT    | `''`                     | Area / location                          |
| `drone_model`    | TEXT    | NOT NULL                 | Drone model                              |
| `problem`        | TEXT    | NOT NULL                 | Issue description                        |
| `technician`     | TEXT    | NOT NULL                 | Assigned technician                      |
| `status`         | TEXT    | `'pending'`              | One of: pending, in_progress, testing, waiting_parts, completed |
| `eta`            | TEXT    | `''`                     | Estimated completion (date or datetime)   |
| `spare_status`   | TEXT    | `''`                     | Spare parts status                        |
| `remarks`        | TEXT    | `''`                     | Additional notes                          |
| `is_urgent`      | INTEGER | `0`                      | Urgency flag (0 or 1)                     |
| `urgent_reason`  | TEXT    | `''`                     | Reason for urgency                        |
| `urgent_deadline`| TEXT    | `''`                     | Deadline for urgent jobs                  |
| `created_at`     | DATETIME| `CURRENT_TIMESTAMP`      | Auto-set on insert                        |
| `updated_at`     | DATETIME| `CURRENT_TIMESTAMP`      | Updated on every write via PUT            |

### Table: `spare_parts`

| Column        | Type    | Default                  | Notes                                    |
|--------------|---------|--------------------------|------------------------------------------|
| `id`         | INTEGER | PRIMARY KEY AUTOINCREMENT |                                          |
| `name`       | TEXT    | NOT NULL                 | Part name                                |
| `model`      | TEXT    | `''`                     | Compatible drone model                   |
| `stock_level`| INTEGER | `0`                      | Current stock count                      |
| `status`     | TEXT    | `'available'`            | available, low, out_of_stock, on_order    |
| `notes`      | TEXT    | `''`                     | Additional notes                         |
| `updated_at` | DATETIME| `CURRENT_TIMESTAMP`      | Auto-set on insert and update            |

### Table: `notes`

| Column       | Type    | Default                  | Notes                        |
|-------------|---------|--------------------------|-------------------------------|
| `id`        | INTEGER | PRIMARY KEY AUTOINCREMENT |                               |
| `message`   | TEXT    | NOT NULL                 | Note content                  |
| `created_at`| DATETIME| `CURRENT_TIMESTAMP`      | Auto-set on insert            |
| `updated_at`| DATETIME| `CURRENT_TIMESTAMP`      | Updated on PUT                |

---

## Seed Data

A Postman collection is provided with 18 seed requests:

- **10 repair jobs** covering various statuses (pending, in_progress, testing, waiting_parts, completed), including 2 urgent cases
- **6 spare parts** with different stock statuses
- **1 note** (announcement)
- **1 PUT request** to flag a job as urgent

Execute the collection in order before first use to populate the dashboard.

---

## Postman Collection

A Postman collection is available for testing all API endpoints. Import the collection file into Postman and set the `x-api-key` header variable to `LIVE-REPAIR-DASHBOARD-2026` for write operations.

---

## IPC Channels (Electron)

In addition to the HTTP API, the Electron main process exposes the following IPC channels via `preload.js`:

| Channel                  | Returns                    | Description                    |
|-------------------------|----------------------------|--------------------------------|
| `db:get-repair-jobs`    | `RepairJob[]`              | List all repair jobs           |
| `db:get-stats`          | `DashboardStats`           | Dashboard statistics           |
| `db:get-spare-parts`    | `SparePart[]`              | List all spare parts           |
| `db:get-urgent-cases`   | `UrgentCase[]`             | List urgent / overdue cases    |

These are used by the renderer process via the `window.api` bridge and are functionally identical to the corresponding HTTP GET endpoints.
