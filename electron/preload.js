/**
 * Live Repair Tracking Board — Electron Preload Script
 *
 * The frontend communicates with the API server via HTTP (port 8004).
 * No IPC bridge is needed — this file is kept minimal for future use.
 */

// No contextBridge needed — all data flows through HTTP fetch to localhost:8004
