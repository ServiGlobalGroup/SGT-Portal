export interface DashboardStats {
  total_users: number;
  active_sessions: number;
  total_documents: number;
  pending_requests: number;
}

export interface TrafficData {
  id: number;
  timestamp: string;
  page: string;
  visitors: number;
  duration: number;
}

export interface VacationRequest {
  id?: number;
  employee_name: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Document {
  id?: number;
  title: string;
  description: string;
  file_url: string;
  category: string;
  uploaded_date: string;
  size: number;
}

export interface Activity {
  id: number;
  user: string;
  action: string;
  timestamp: string;
  type: string;
}

export interface TrafficFolder {
  id: number;
  name: string;
  type: 'company' | 'vehicle_type' | 'vehicle';
  parent_id: number | null;
  created_date: string;
  children?: TrafficFolder[];
}

export interface TrafficDocument {
  id: number;
  name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  folder_id: number;
  uploaded_date: string;
  uploaded_by: string;
}

export interface PayrollDocument {
  id: number;
  user_id: number;
  user_name: string;
  type: 'nomina' | 'dieta';
  month: string; // YYYY-MM format
  file_url: string;
  file_name: string;
  file_size: number;
  upload_date: string;
  status: 'active' | 'archived';
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  department: string;
  is_active: boolean;
}

export interface UserProfile {
  id: number;
  dni_nie: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'employee';
  department: string;
  position: string;
  hire_date: string;
  birth_date: string;
  address: string;
  city: string;
  postal_code: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  avatar?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PayrollStats {
  total_documents: number;
  users_with_documents: number;
  current_month_uploads: number;
  total_size: number;
  by_type: {
    nomina: number;
    dieta: number;
  };
}

export interface Order {
  id: number;
  order_number: string;
  company_name: string;
  email_received_from: string;
  subject: string;
  received_date: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface OrderDocument {
  id: number;
  order_id: number;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  uploaded_date: string;
  email_attachment_name: string;
}
