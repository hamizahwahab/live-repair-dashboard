/**
 * API configuration and fetch helpers for the Live Repair Tracking Board.
 * All requests go to the Electron API server on port 8004.
 */

const API_BASE = "http://localhost:8004";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

export async function getRepairJobs() {
  return fetchJson<import("@/types").RepairJob[]>(`${API_BASE}/api/repair-jobs`);
}

export async function getStats() {
  return fetchJson<import("@/types").DashboardStats>(`${API_BASE}/api/stats`);
}

export async function getSpareParts() {
  return fetchJson<import("@/types").SparePart[]>(`${API_BASE}/api/spare-parts`);
}

export async function getUrgentCases() {
  return fetchJson<import("@/types").UrgentCase[]>(`${API_BASE}/api/urgent-cases`);
}

export async function getNotes() {
  return fetchJson<import("@/types").Note[]>(`${API_BASE}/api/notes`);
}
