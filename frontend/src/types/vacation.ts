export type AbsenceType = 'VACATION' | 'PERSONAL' | 'MOVING';

export interface VacationRequest {
  id?: number;
  user_id?: number;
  employee_name: string;
  start_date: Date;
  end_date: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  absence_type?: AbsenceType;
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

export interface VacationUsage {
  user_id: number;
  year: number;
  approved_days_used: number; // Días gastados (solo aprobados)
  pending_days_requested: number; // Días solicitados pendientes (informativo)
}

export interface VacationRequestCreate {
  start_date: Date;
  end_date: Date;
  reason: string;
  absence_type?: AbsenceType;
}

export interface VacationRequestUpdate {
  start_date?: Date;
  end_date?: Date;
  reason?: string;
  status?: 'pending' | 'approved' | 'rejected';
  admin_response?: string;
  absence_type?: AbsenceType;
}
