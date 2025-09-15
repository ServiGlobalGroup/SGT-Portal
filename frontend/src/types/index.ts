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
  dni_nie: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: 'MASTER_ADMIN' | 'ADMINISTRADOR' | 'ADMINISTRACION' | 'TRAFICO' | 'TRABAJADOR';
  department: string;
  position?: string;
  // Tipo de trabajador (dietas): antiguo / nuevo
  worker_type?: 'antiguo' | 'nuevo';
  hire_date?: string;
  birth_date?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
<<<<<<< HEAD
  status: 'ACTIVO' | 'INACTIVO' | 'BAJA';
  is_active: boolean; // Propiedad de compatibilidad
=======
  // Campos de estado
  status: 'ACTIVO' | 'INACTIVO' | 'BAJA';  // Nuevo sistema de estados
  is_active: boolean;  // Campo legacy para compatibilidad
>>>>>>> 66167b7fd64549b4bab8bfb1cbc32f377e50f9d7
  is_verified: boolean;
  avatar?: string;
  user_folder_path?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  full_name: string;
  initials: string;
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

// ---- Dietas ----
export interface DietaConcept {
  code: string;
  label: string;
  quantity: number;
  rate: number;
  subtotal: number;
}

export interface DietaRecord {
  id: number;
  user_id: number;
  worker_type: string;
  order_number?: string;
  month: string;
  total_amount: number;
  concepts: DietaConcept[];
  notes?: string;
  created_at: string;
  user_name?: string;
}
