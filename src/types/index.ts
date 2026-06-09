/** Live Repair Tracking Board — TypeScript interfaces */

export interface RepairJob {
  id: number;
  date_in: string;
  customer: string;
  area: string;
  drone_model: string;
  problem: string;
  technician: string;
  status: JobStatus;
  eta: string;
  spare_status: string;
  remarks: string;
  is_urgent: number;
  urgent_reason: string;
  urgent_deadline: string;
  created_at: string;
  updated_at: string;
}

/** Urgent case derived from RepairJob (via GET /api/urgent-cases) */
export interface UrgentCase {
  id: number;
  date_in: string;
  customer: string;
  area: string;
  drone_model: string;
  problem: string;
  technician: string;
  status: JobStatus;
  eta: string;
  spare_status: string;
  remarks: string;
  is_urgent: number;
  urgent_reason: string;
  urgent_deadline: string;
  created_at: string;
  updated_at: string;
  /** Computed display reason */
  _reason: string;
  /** Computed display deadline */
  _deadline: string;
  /** True if auto-detected (3+ days past ETA), false if manually flagged */
  _isAutoOverdue: boolean;
}

export type JobStatus = "pending" | "in_progress" | "testing" | "waiting_parts" | "completed";

export interface SparePart {
  id: number;
  name: string;
  model: string;
  stock_level: number;
  status: "available" | "low" | "out_of_stock";
  notes: string;
  updated_at: string;
}

export interface Note {
  id: number;
  message: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalJobs: number;
  pending: number;
  inProgress: number;
  testing: number;
  totalCompleted: number;
  completedToday: number;
  overdue: number;
  avgDays: number;
  receivedToday: number;
  pendingPrevDay: number;
  totalPending: number;
}
