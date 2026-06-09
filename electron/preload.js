/**
 * Live Repair Tracking Board — Electron Preload Script
 *
 * Exposes a safe `api` bridge to the renderer process via contextBridge.
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Database read operations (IPC)
  getRepairJobs: () => ipcRenderer.invoke("db:get-repair-jobs"),
  getStats: () => ipcRenderer.invoke("db:get-stats"),
  getSpareParts: () => ipcRenderer.invoke("db:get-spare-parts"),
  getUrgentCases: () => ipcRenderer.invoke("db:get-urgent-cases"),

  // API URL for direct fetch calls
  apiUrl: "http://localhost:8004",
});
