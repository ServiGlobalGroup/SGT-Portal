export interface VacationRequest {
  id?: number;
  user_id?: number;
  employee_name: string;
  start_date: Date;
  end_date: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_response?: string;
  reviewed_by?: number;
  reviewed_at?: Date;
  created_at?: Date;
  updated_at?: Date;
  duration_days?: number;
  reviewer_name?: string;
}

export interface VacationStats {
  total_requests: number;
  pending: number;
  approved: number;
  rejected: number;
  current_year_total: number;
  current_year_approved: number;
}

export interface VacationRequestCreate {
  start_date: Date;
  end_date: Date;
  reason: string;
}

export interface VacationRequestUpdate {
  start_date?: Date;
  end_date?: Date;
  reason?: string;
  status?: 'pending' | 'approved' | 'rejected';
  admin_response?: string;
}
