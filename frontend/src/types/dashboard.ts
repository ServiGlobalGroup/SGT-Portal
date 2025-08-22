export interface DashboardStats {
  total_users: number;
  active_sessions?: number;
  total_documents?: number;
  pending_requests?: number;
}

export interface UserStatsSummary {
  total_users: number;
  active_users: number;
  inactive_users?: number;
  roles: Record<string, number>;
}

export interface AvailableWorkersResponse {
  date: string; // YYYY-MM-DD
  available: { id: number; full_name: string; dni_nie: string }[];
}

export interface RecentActivityItem {
  id: number;
  user_name: string;
  action: string;
  timestamp: string;
  type: 'upload' | 'approval' | 'login' | 'update' | string;
}

export interface DashboardDataState {
  stats: DashboardStats | null;
  userStats: UserStatsSummary | null;
  available: AvailableWorkersResponse | null;
  activity: RecentActivityItem[];
  pendingVacation: any[]; // TODO: refine to vacation type subset
  loading: boolean;
  error: string | null;
}

export const PENDING_POLL_MS = 30000;
