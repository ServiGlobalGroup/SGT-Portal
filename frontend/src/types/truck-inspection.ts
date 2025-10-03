// Tipos para inspecciones de camiones
export interface InspectionComponent {
  status: boolean;
  notes?: string;
  image_path?: string;
}

export interface TruckInspectionCreate {
  truck_license_plate: string;
  tires_status: boolean;
  tires_notes?: string;
  brakes_status: boolean;
  brakes_notes?: string;
  lights_status: boolean;
  lights_notes?: string;
  fluids_status: boolean;
  fluids_notes?: string;
  documentation_status: boolean;
  documentation_notes?: string;
  body_status: boolean;
  body_notes?: string;
  general_notes?: string;
}

export interface TruckInspectionResponse {
  id: number;
  user_id: number;
  user_name?: string;
  truck_license_plate: string;
  
  tires_status: boolean;
  tires_notes?: string;
  tires_image_path?: string;
  
  brakes_status: boolean;
  brakes_notes?: string;
  brakes_image_path?: string;
  
  lights_status: boolean;
  lights_notes?: string;
  lights_image_path?: string;
  
  fluids_status: boolean;
  fluids_notes?: string;
  fluids_image_path?: string;
  
  documentation_status: boolean;
  documentation_notes?: string;
  documentation_image_path?: string;
  
  body_status: boolean;
  body_notes?: string;
  body_image_path?: string;
  
  has_issues: boolean;
  general_notes?: string;
  inspection_date: string;
  is_reviewed?: boolean;
  reviewed_by?: number | string;
  reviewed_at?: string;
  revision_notes?: string;
  reviewer_name?: string;
  created_at: string;
  updated_at: string;
}

export interface MarkInspectionReviewedResponse {
  message: string;
  inspection_id: number;
  reviewed_by: string;
  reviewed_at: string;
}

export interface AutoInspectionSettings {
  auto_inspection_enabled: boolean;
  updated_at?: string | null;
  updated_by?: string | null;
  updated_by_id?: number | null;
}

export interface TruckInspectionSummary {
  id: number;
  user_id: number;
  user_name: string;
  truck_license_plate: string;
  has_issues: boolean;
  inspection_date: string;
  components_with_issues: string[];
  company?: string;
  is_reviewed?: boolean;
}

export interface ManualInspectionRequest {
  request_id: number;
  requested_by?: string | null;
  message?: string | null;
  created_at: string;
}

export interface InspectionNeededResponse {
  needs_inspection: boolean;
  last_inspection_date?: string;
  next_inspection_date?: string;
  days_since_last_inspection?: number;
  inspection_interval_days: number;
  message: string;
  manual_requests?: ManualInspectionRequest[];
  auto_inspection_enabled: boolean;
}

export interface TruckInspectionRequestRecipient {
  request_id: number;
  user_id: number;
  user_name: string;
}

export interface TruckInspectionRequestCreate {
  target_user_ids: number[];
  send_to_all: boolean;
  message?: string | null;
}

export interface TruckInspectionRequestResult {
  created_count: number;
  skipped_existing: number;
  recipients: TruckInspectionRequestRecipient[];
  message: string;
}


// ---------------- Órdenes directas de inspección (nueva funcionalidad) ----------------
export type VehicleKind = 'TRACTORA' | 'SEMIREMOLQUE';

export interface DirectInspectionOrderModule {
  temp_id?: string; // solo frontend para key
  title: string;    // Título del problema / módulo
  notes?: string;   // Observaciones / descripción ampliada
}

export interface DirectInspectionOrderCreate {
  truck_license_plate: string;     // Matrícula objetivo
  vehicle_kind: VehicleKind;       // Tractora o Semirremolque
  modules: DirectInspectionOrderModule[]; // Lista dinámica de bloques
}

export interface DirectInspectionOrderResponse {
  order_id: number;
  truck_license_plate: string;
  vehicle_kind: VehicleKind;
  modules: { id: number; title: string; notes?: string; created_at: string }[];
  created_at: string;
  created_by: string;
  created_by_id: number;
  is_reviewed: boolean;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  revision_notes?: string | null;
  message?: string; // Mensaje de confirmación opcional
}

export interface DirectInspectionOrderSummary {
  id: number;
  truck_license_plate: string;
  vehicle_kind: VehicleKind;
  created_at: string;
  created_by: string;
  company?: string | null;
  is_reviewed: boolean;
  modules_count: number;
}

export interface MarkDirectOrderReviewedRequest {
  revision_notes?: string | null;
}

export interface MarkDirectOrderReviewedResponse {
  message: string;
  order_id: number;
}



export interface InspectionStatsResponse {
  total_inspections: number;
  inspections_with_issues: number;
  inspections_ok: number;
  percentage_with_issues: number;
  most_common_issues: Record<string, number>;
  recent_inspections: TruckInspectionSummary[];
}

export interface ImageUploadResponse {
  success: boolean;
  image_path?: string;
  message: string;
}

// Enum para los componentes de inspección
export enum InspectionComponentType {
  TIRES = 'tires',
  BRAKES = 'brakes', 
  LIGHTS = 'lights',
  FLUIDS = 'fluids',
  DOCUMENTATION = 'documentation',
  BODY = 'body'
}

// Datos para cada paso del modal
export interface InspectionStep {
  id: InspectionComponentType;
  title: string;
  icon: string;
  description: string;
  status?: boolean;
  notes?: string;
  imageFile?: File;
}