/**
 * Live Repair Tracking Board — Electron Main Process
 *
 * - Initializes SQLite database (sql.js) with 3 tables
 * - Starts HTTP API server on port 8004
 * - Opens Electron window pointing to Next.js dev server (port 3004)
 */

const { app, BrowserWindow } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");
const initSqlJs = require("sql.js");

// Allow siren audio to play without user interaction (Electron only)
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

// ─── Configuration ───────────────────────────────────────────────────────────
const API_PORT = 8004;
const DEV_URL = "http://localhost:3004";
const DB_PATH = path.join(app.getPath("userData"), "repair-dashboard.db");
const API_KEY = process.env.API_KEY || "LIVE-REPAIR-DASHBOARD-2026";

// ─── State ───────────────────────────────────────────────────────────────────
let db = null;
let mainWindow = null;
let apiServer = null;

// ─── Database ────────────────────────────────────────────────────────────────
async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing DB or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log(`[DB] Loaded existing database from ${DB_PATH}`);
  } else {
    db = new SQL.Database();
    console.log(`[DB] Created new in-memory database`);
  }

  // Enable WAL mode-like persistence: save after writes
  db.run("PRAGMA journal_mode=MEMORY");

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS repair_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date_in TEXT NOT NULL,
      customer TEXT NOT NULL,
      area TEXT DEFAULT '',
      drone_model TEXT NOT NULL,
      problem TEXT NOT NULL,
      technician TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      eta TEXT DEFAULT '',
      spare_status TEXT DEFAULT '',
      remarks TEXT DEFAULT '',
      is_urgent INTEGER DEFAULT 0,
      urgent_reason TEXT DEFAULT '',
      urgent_deadline TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS spare_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      model TEXT DEFAULT '',
      stock_level INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'available',
      notes TEXT DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ─── Migration: add columns for existing databases ──────────────
  function columnExists(table, column) {
    try {
      const info = db.exec(`PRAGMA table_info(${table})`);
      if (!info[0]) return false;
      return info[0].values.some((row) => row[1] === column);
    } catch { return false; }
  }

  if (!columnExists("repair_jobs", "is_urgent")) {
    console.log("[DB] Migrating repair_jobs: adding is_urgent, urgent_reason, urgent_deadline");
    db.run("ALTER TABLE repair_jobs ADD COLUMN is_urgent INTEGER DEFAULT 0");
    db.run("ALTER TABLE repair_jobs ADD COLUMN urgent_reason TEXT DEFAULT ''");
    db.run("ALTER TABLE repair_jobs ADD COLUMN urgent_deadline TEXT DEFAULT ''");
  }

  // ─── Triggers ──────────────────────────────────────────────────
  // Auto-flag urgent on INSERT if ETA is already 3+ days past
  db.run("DROP TRIGGER IF EXISTS trg_repair_urgent_insert");
  db.run(`
    CREATE TRIGGER trg_repair_urgent_insert
    AFTER INSERT ON repair_jobs
    FOR EACH ROW
    WHEN NEW.status != 'completed'
      AND NEW.eta != ''
      AND NEW.eta < date('now', '-3 days')
      AND (NEW.is_urgent = 0 OR NEW.is_urgent IS NULL)
    BEGIN
      UPDATE repair_jobs SET
        is_urgent = 1,
        urgent_reason = CASE
          WHEN NEW.urgent_reason IS NULL OR NEW.urgent_reason = ''
          THEN 'Auto-flagged — ETA passed'
          ELSE NEW.urgent_reason
        END
      WHERE id = NEW.id;
    END;
  `);

  // Auto-flag urgent when ETA updated to a past date
  db.run("DROP TRIGGER IF EXISTS trg_repair_urgent_update_eta");
  db.run(`
    CREATE TRIGGER trg_repair_urgent_update_eta
    AFTER UPDATE OF eta ON repair_jobs
    FOR EACH ROW
    WHEN NEW.eta != ''
      AND NEW.eta < date('now', '-3 days')
      AND NEW.status != 'completed'
      AND (OLD.is_urgent = 0 OR OLD.is_urgent IS NULL)
    BEGIN
      UPDATE repair_jobs SET
        is_urgent = 1,
        urgent_reason = CASE
          WHEN NEW.urgent_reason IS NULL OR NEW.urgent_reason = ''
          THEN 'Auto-flagged — ETA passed'
          ELSE NEW.urgent_reason
        END
      WHERE id = NEW.id;
    END;
  `);

  // Auto-clear urgent when job is completed
  db.run("DROP TRIGGER IF EXISTS trg_repair_completed_clear");
  db.run(`
    CREATE TRIGGER trg_repair_completed_clear
    AFTER UPDATE OF status ON repair_jobs
    FOR EACH ROW
    WHEN NEW.status = 'completed' AND OLD.status != 'completed'
    BEGIN
      UPDATE repair_jobs SET is_urgent = 0 WHERE id = NEW.id;
    END;
  `);

  console.log("[DB] Tables + triggers initialized");
  saveDatabase();
}

function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
  console.log("[DB] Saved to disk");
}

// ─── API Server ──────────────────────────────────────────────────────────────

/** Parse JSON body from incoming request — never rejects */
function parseBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve(null); // signals invalid JSON
      }
    });
    req.on("error", () => resolve(null));
  });
}

/** Send JSON response */
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

/** Verify x-api-key header */
function verifyApiKey(req) {
  // Dev mode: skip key check when running without Electron (pure Node.js)
  if (process.env.NODE_ENV === "development" || !app.isPackaged) {
    return true;
  }
  const key = req.headers["x-api-key"];
  if (!key) return false;
  // Constant-time comparison
  if (key.length !== API_KEY.length) return false;
  let result = 0;
  for (let i = 0; i < key.length; i++) {
    result |= key.charCodeAt(i) ^ API_KEY.charCodeAt(i);
  }
  return result === 0;
}

/** Extract ID from URL path — supports /api/resource/:id */
function extractId(url, prefix) {
  const match = url.match(new RegExp(`^${prefix}/(\\d+)$`));
  return match ? parseInt(match[1], 10) : null;
}

/** Run a SELECT query and map result rows to objects by column array */
function execRows(sql, columns) {
  const result = db.exec(sql);
  return result[0]?.values.map((row) => {
    const obj = {};
    columns.forEach((col, i) => (obj[col] = row[i]));
    return obj;
  }) || [];
}

/** GET /api/stats — compute dashboard statistics */
function handleGetStats() {
  const totalJobs = db.exec(
    "SELECT COUNT(*) as count FROM repair_jobs"
  )[0]?.values[0]?.[0] || 0;

  const pending = db.exec(
    "SELECT COUNT(*) as count FROM repair_jobs WHERE status = 'pending'"
  )[0]?.values[0]?.[0] || 0;

  const inProgress = db.exec(
    "SELECT COUNT(*) as count FROM repair_jobs WHERE status = 'in_progress'"
  )[0]?.values[0]?.[0] || 0;

  const testing = db.exec(
    "SELECT COUNT(*) as count FROM repair_jobs WHERE status = 'testing'"
  )[0]?.values[0]?.[0] || 0;

  const totalCompleted = db.exec(
    "SELECT COUNT(*) as count FROM repair_jobs WHERE status = 'completed'"
  )[0]?.values[0]?.[0] || 0;

  const completedToday = db.exec(`
    SELECT COUNT(*) as count FROM repair_jobs
    WHERE status = 'completed' AND date(updated_at) = date('now')
  `)[0]?.values[0]?.[0] || 0;

  const overdue = db.exec(
    "SELECT COUNT(*) as count FROM repair_jobs WHERE status != 'completed' AND eta != '' AND eta < datetime('now')"
  )[0]?.values[0]?.[0] || 0;

  // Avg turnaround time (completed jobs)
  const avgResult = db.exec(`
    SELECT AVG(
      julianday(updated_at) - julianday(created_at)
    ) as avg_days FROM repair_jobs WHERE status = 'completed'
  `);
  const avgTurnaround = avgResult[0]?.values[0]?.[0];
  const avgDays = avgTurnaround ? Math.round(parseFloat(avgTurnaround) * 10) / 10 : 0;

  // Today's received count
  const receivedToday = db.exec(`
    SELECT COUNT(*) as count FROM repair_jobs
    WHERE date(date_in) = date('now')
  `)[0]?.values[0]?.[0] || 0;

  // Pending from previous day
  const pendingPrevDay = db.exec(`
    SELECT COUNT(*) as count FROM repair_jobs
    WHERE status != 'completed' AND date(created_at) < date('now')
  `)[0]?.values[0]?.[0] || 0;

  return {
    totalJobs,
    pending,
    inProgress,
    testing,
    totalCompleted,
    completedToday,
    overdue,
    avgDays,
    receivedToday,
    pendingPrevDay,
    totalPending: pending + inProgress + testing,
  };
}

/** Handle API request routing */
async function handleRequest(req, res) {
  const { method, url } = req;
  const parsedUrl = new URL(url, `http://localhost:${API_PORT}`);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

  if (method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  try {
    // ── Public endpoints (no API key required) ──
    if (method === "GET" && pathname === "/api/stats") {
      return sendJson(res, 200, handleGetStats());
    }

    if (method === "GET" && pathname === "/api/repair-jobs") {
      const columns = ["id","date_in","customer","area","drone_model","problem","technician","status","eta","spare_status","remarks","is_urgent","urgent_reason","urgent_deadline","created_at","updated_at"];
      const rows = execRows("SELECT * FROM repair_jobs ORDER BY date_in DESC, id DESC LIMIT 50", columns);
      return sendJson(res, 200, rows);
    }

    // GET /api/repair-jobs/:id
    let jobId = extractId(pathname, "/api/repair-jobs");
    if (method === "GET" && jobId) {
      const stmt = db.prepare("SELECT * FROM repair_jobs WHERE id = ?");
      stmt.bind([jobId]);
      let row = null;
      if (stmt.step()) row = stmt.getAsObject();
      stmt.free();
      if (!row) return sendJson(res, 404, { error: "Repair job not found" });
      return sendJson(res, 200, row);
    }

    if (method === "GET" && pathname === "/api/spare-parts") {
      const columns = ["id","name","model","stock_level","status","notes","updated_at"];
      const rows = execRows("SELECT * FROM spare_parts ORDER BY id ASC", columns);
      return sendJson(res, 200, rows);
    }

    // GET /api/spare-parts/:id
    let partId = extractId(pathname, "/api/spare-parts");
    if (method === "GET" && partId) {
      const stmt = db.prepare("SELECT * FROM spare_parts WHERE id = ?");
      stmt.bind([partId]);
      let row = null;
      if (stmt.step()) row = stmt.getAsObject();
      stmt.free();
      if (!row) return sendJson(res, 404, { error: "Spare part not found" });
      return sendJson(res, 200, row);
    }

    if (method === "GET" && pathname === "/api/urgent-cases") {
      // Combines two sources:
      //   1. Manually flagged (is_urgent = 1)
      //   2. Auto-overdue (ETA passed by 3+ days, not completed)
      const columns = ["id","date_in","customer","area","drone_model","problem","technician","status","eta","spare_status","remarks","is_urgent","urgent_reason","urgent_deadline","created_at","updated_at"];
      const rows = execRows(`
        SELECT * FROM repair_jobs
        WHERE status != 'completed'
          AND (is_urgent = 1 OR (eta != '' AND eta < date('now', '-3 days')))
        ORDER BY is_urgent DESC, eta ASC
      `, columns);
      // Compute reason & deadline display for each row
      rows.forEach((obj) => {
        if (obj.is_urgent) {
          obj._reason = obj.urgent_reason || "Urgent — marked by staff";
          obj._deadline = obj.urgent_deadline || "ASAP";
          obj._isAutoOverdue = false;
        } else {
          const etaDate = new Date(obj.eta + "T00:00:00");
          const today = new Date();
          const daysOverdue = Math.floor((today - etaDate) / (1000 * 60 * 60 * 24));
          obj._reason = `⚠ Overdue by ${daysOverdue} day${daysOverdue > 1 ? "s" : ""}`;
          obj._deadline = obj.eta;
          obj._isAutoOverdue = true;
        }
      });
      return sendJson(res, 200, rows);
    }

    if (method === "GET" && pathname === "/api/notes") {
      const columns = ["id", "message", "created_at", "updated_at"];
      const rows = execRows("SELECT * FROM notes ORDER BY created_at DESC", columns);
      return sendJson(res, 200, rows);
    }

    // GET /api/notes/:id
    let noteId = extractId(pathname, "/api/notes");
    if (method === "GET" && noteId) {
      const stmt = db.prepare("SELECT * FROM notes WHERE id = ?");
      stmt.bind([noteId]);
      let row = null;
      if (stmt.step()) row = stmt.getAsObject();
      stmt.free();
      if (!row) return sendJson(res, 404, { error: "Note not found" });
      return sendJson(res, 200, row);
    }

    // ── Authenticated endpoints (x-api-key required) ──
    if (!verifyApiKey(req)) {
      return sendJson(res, 401, { error: "Unauthorized — invalid or missing x-api-key" });
    }

    // POST /api/repair-jobs
    if (method === "POST" && pathname === "/api/repair-jobs") {
      const body = await parseBody(req);
      if (!body) return sendJson(res, 400, { error: "Invalid JSON body" });
      const { date_in, customer, area, drone_model, problem, technician, status, eta, spare_status, remarks, is_urgent, urgent_reason, urgent_deadline } = body;

      if (!date_in || !customer || !drone_model || !problem || !technician) {
        return sendJson(res, 400, { error: "Missing required fields: date_in, customer, drone_model, problem, technician" });
      }

      // Use prepared statement with INSERT + RETURNING to reliably retrieve the new ID
      const insertStmt = db.prepare(
        `INSERT INTO repair_jobs (date_in, customer, area, drone_model, problem, technician, status, eta, spare_status, remarks, is_urgent, urgent_reason, urgent_deadline)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id`
      );
      insertStmt.bind([date_in, customer, area || "", drone_model, problem, technician, status || "pending", eta || "", spare_status || "", remarks || "", is_urgent ?? 0, urgent_reason ?? "", urgent_deadline ?? ""]);
      let newId = 0;
      while (insertStmt.step()) {
        const row = insertStmt.getAsObject();
        newId = Number(row.id);
      }
      insertStmt.free();
      saveDatabase();
      return sendJson(res, 201, { message: "Repair job created", id: newId });
    }

    // PUT /api/repair-jobs/:id
    if (method === "PUT" && jobId) {
      const body = await parseBody(req);
      if (!body) return sendJson(res, 400, { error: "Invalid JSON body" });
      const fields = [];
      const values = [];

      ["date_in", "customer", "area", "drone_model", "problem", "technician", "status", "eta", "spare_status", "remarks", "is_urgent", "urgent_reason", "urgent_deadline"].forEach((f) => {
        if (body[f] !== undefined) {
          fields.push(`${f} = ?`);
          values.push(body[f]);
        }
      });

      if (fields.length === 0) {
        return sendJson(res, 400, { error: "No fields to update" });
      }

      fields.push("updated_at = CURRENT_TIMESTAMP");
      values.push(jobId);
      db.run(`UPDATE repair_jobs SET ${fields.join(", ")} WHERE id = ?`, values);
      if (db.getRowsModified() === 0) {
        return sendJson(res, 404, { error: "Repair job not found" });
      }
      saveDatabase();
      return sendJson(res, 200, { message: "Repair job updated", id: jobId });
    }

    // DELETE /api/repair-jobs/:id
    if (method === "DELETE" && jobId) {
      db.run("DELETE FROM repair_jobs WHERE id = ?", [jobId]);
      if (db.getRowsModified() === 0) {
        return sendJson(res, 404, { error: "Repair job not found" });
      }
      saveDatabase();
      return sendJson(res, 200, { message: "Repair job deleted", id: jobId });
    }

    // POST /api/spare-parts
    if (method === "POST" && pathname === "/api/spare-parts") {
      const body = await parseBody(req);
      if (!body) return sendJson(res, 400, { error: "Invalid JSON body" });
      const { name, model, stock_level, status, notes } = body;

      if (!name) {
        return sendJson(res, 400, { error: "Missing required field: name" });
      }

      const partStmt = db.prepare(
        `INSERT INTO spare_parts (name, model, stock_level, status, notes)
         VALUES (?, ?, ?, ?, ?)
         RETURNING id`
      );
      partStmt.bind([name, model || "", stock_level || 0, status || "available", notes || ""]);
      let partId = 0;
      while (partStmt.step()) {
        const row = partStmt.getAsObject();
        partId = Number(row.id);
      }
      partStmt.free();
      saveDatabase();
      return sendJson(res, 201, { message: "Spare part added", id: partId });
    }

    // PUT /api/spare-parts/:id
    if (method === "PUT" && partId) {
      const body = await parseBody(req);
      if (!body) return sendJson(res, 400, { error: "Invalid JSON body" });
      const fields = [];
      const values = [];

      ["name", "model", "stock_level", "status", "notes"].forEach((f) => {
        if (body[f] !== undefined) {
          fields.push(`${f} = ?`);
          values.push(body[f]);
        }
      });

      if (fields.length === 0) {
        return sendJson(res, 400, { error: "No fields to update" });
      }

      fields.push("updated_at = CURRENT_TIMESTAMP");
      values.push(partId);
      db.run(`UPDATE spare_parts SET ${fields.join(", ")} WHERE id = ?`, values);
      if (db.getRowsModified() === 0) {
        return sendJson(res, 404, { error: "Spare part not found" });
      }
      saveDatabase();
      return sendJson(res, 200, { message: "Spare part updated", id: partId });
    }

    // DELETE /api/spare-parts/:id
    if (method === "DELETE" && partId) {
      db.run("DELETE FROM spare_parts WHERE id = ?", [partId]);
      if (db.getRowsModified() === 0) {
        return sendJson(res, 404, { error: "Spare part not found" });
      }
      saveDatabase();
      return sendJson(res, 200, { message: "Spare part deleted", id: partId });
    }

    // ── Notes endpoints ───────────────────────────────────────────

    // POST /api/notes
    if (method === "POST" && pathname === "/api/notes") {
      const body = await parseBody(req);
      if (!body) return sendJson(res, 400, { error: "Invalid JSON body" });
      if (!body.message) {
        return sendJson(res, 400, { error: "Missing required field: message" });
      }

      const stmt = db.prepare(
        "INSERT INTO notes (message) VALUES (?) RETURNING id"
      );
      stmt.bind([body.message]);
      let newId = 0;
      while (stmt.step()) {
        const row = stmt.getAsObject();
        newId = Number(row.id);
      }
      stmt.free();
      saveDatabase();
      return sendJson(res, 201, { message: "Note added", id: newId });
    }

    // PUT /api/notes/:id
    if (method === "PUT" && noteId) {
      const body = await parseBody(req);
      if (!body) return sendJson(res, 400, { error: "Invalid JSON body" });
      if (!body.message) {
        return sendJson(res, 400, { error: "Missing required field: message" });
      }

      db.run(
        "UPDATE notes SET message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [body.message, noteId]
      );
      if (db.getRowsModified() === 0) {
        return sendJson(res, 404, { error: "Note not found" });
      }
      saveDatabase();
      return sendJson(res, 200, { message: "Note updated", id: noteId });
    }

    // DELETE /api/notes/:id
    if (method === "DELETE" && noteId) {
      db.run("DELETE FROM notes WHERE id = ?", [noteId]);
      if (db.getRowsModified() === 0) {
        return sendJson(res, 404, { error: "Note not found" });
      }
      saveDatabase();
      return sendJson(res, 200, { message: "Note deleted", id: noteId });
    }

    // ── 404 ──
    return sendJson(res, 404, { error: "Not found" });

  } catch (err) {
    console.error("[API] Error:", err);
    return sendJson(res, 500, { error: "Internal server error" });
  }
}

function startApiServer() {
  apiServer = http.createServer(handleRequest);
  apiServer.listen(API_PORT, () => {
    console.log(`[API] Server running on http://localhost:${API_PORT}`);
    console.log(`[API] API Key: ${API_KEY}`);
  });
}

// ─── Auto-Flag Overdue Jobs ───────────────────────────────────────────────────
function runOverdueCheck() {
  if (!db) return;
  db.run(`
    UPDATE repair_jobs
    SET is_urgent = 1,
        urgent_reason = CASE
          WHEN urgent_reason IS NULL OR urgent_reason = ''
          THEN 'Auto-flagged — ETA passed'
          ELSE urgent_reason
        END
    WHERE status != 'completed'
      AND eta != ''
      AND eta < date('now', '-3 days')
      AND is_urgent = 0
  `);
  const count = db.getRowsModified();
  if (count > 0) {
    console.log(`[Auto] Flagged ${count} overdue job(s) as urgent`);
    saveDatabase();
  }
}

function startAutoFlagTimer() {
  // Run once at startup (catches any overdue jobs from when app was off)
  runOverdueCheck();

  // Then schedule for every midnight
  function scheduleMidnight() {
    const now = new Date();
    const next = new Date(now);
    next.setDate(now.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    const msUntilMidnight = next.getTime() - now.getTime();

    setTimeout(() => {
      runOverdueCheck();
      scheduleMidnight(); // Re-schedule for next midnight
    }, msUntilMidnight);
  }
  scheduleMidnight();
}

// ─── Electron Window ─────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    frame: true,
    fullscreen: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // In development, load Next.js dev server
  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load static export
    const staticPath = path.join(__dirname, "..", "out", "index.html");
    mainWindow.loadFile(staticPath);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─── App Lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    await initDatabase();
    startApiServer();
    startAutoFlagTimer();
    createWindow();
    console.log("[App] Ready — API on :8004, window loading :3004");
  } catch (err) {
    console.error("[App] Failed to initialize:", err);
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

let isQuitting = false;
app.on("before-quit", () => {
  if (isQuitting) return;
  isQuitting = true;
  saveDatabase();
  if (apiServer) apiServer.close();
});
