import axios from 'axios';
import type { TrafficData, VacationRequest, Document, TrafficFolder, TrafficDocument, PayrollDocument, PayrollStats, User, DietaRecord } from '../types';

// Usar variable de entorno en Vite para configurar el backend en dev/prod
const envUrl = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;
export const API_BASE_URL = envUrl && envUrl.trim() !== ''
  ? envUrl
  : (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8000');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token de autenticación
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const trafficAPI = {
  getTrafficData: (): Promise<TrafficData[]> => 
    api.get('/api/traffic/').then(res => res.data),
  getAnalytics: () => 
    api.get('/api/traffic/analytics').then(res => res.data),
  
  // Gestión de carpetas
  getFolders: (): Promise<TrafficFolder[]> => 
    api.get('/api/traffic/folders').then(res => res.data),
  createFolder: (folder: Partial<TrafficFolder>): Promise<TrafficFolder> => 
    api.post('/api/traffic/folders', folder).then(res => res.data),
  updateFolder: (id: number, folder: Partial<TrafficFolder>): Promise<TrafficFolder> => 
    api.put(`/api/traffic/folders/${id}`, folder).then(res => res.data),
  deleteFolder: (id: number) => 
    api.delete(`/api/traffic/folders/${id}`).then(res => res.data),
  
  // Gestión de documentos
  getDocuments: (folderId?: number): Promise<TrafficDocument[]> => 
    api.get(`/api/traffic/documents${folderId ? `?folder_id=${folderId}` : ''}`).then(res => res.data),
  uploadDocuments: (folderId: number, files: File[]): Promise<TrafficDocument[]> => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('folder_id', folderId.toString());
    return api.post('/api/traffic/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },
  deleteDocument: (id: number) => 
    api.delete(`/api/traffic/documents/${id}`).then(res => res.data),
};

export const vacationsAPI = {
  getVacationRequests: (): Promise<VacationRequest[]> => 
    api.get('/api/vacations/').then(res => res.data),
  createVacationRequest: (request: VacationRequest): Promise<VacationRequest> => 
    api.post('/api/vacations/', request).then(res => res.data),
  updateVacationStatus: (id: number, status: string) => 
    api.put(`/api/vacations/${id}/status`, { status }).then(res => res.data),
  getStats: () => 
    api.get('/api/vacations/stats').then(res => res.data),
};

export const documentsAPI = {
  getDocuments: (): Promise<Document[]> => 
    api.get('/api/documents/').then(res => res.data),
  createDocument: (document: Document): Promise<Document> => 
    api.post('/api/documents/', document).then(res => res.data),
  getDocument: (id: number): Promise<Document> => 
    api.get(`/api/documents/${id}`).then(res => res.data),
  deleteDocument: (id: number) => 
    api.delete(`/api/documents/${id}`).then(res => res.data),
  getDocumentsByCategory: (category: string): Promise<Document[]> => 
    api.get(`/api/documents/category/${category}`).then(res => res.data),
  getStats: () => 
    api.get('/api/documents/stats/summary').then(res => res.data),
  // Subir documentos generales (visibles para todos)
  uploadGeneralDocuments: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/documents/upload-general-documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  }
};

export const payrollAPI = {
  // Documentos de nómina del usuario actual
  getMyDocuments: (month?: string): Promise<PayrollDocument[]> => 
    api.get(`/api/payroll/my-documents${month ? `?month=${month}` : ''}`).then(res => res.data),
  
  // Subir documento (nómina o dieta)
  uploadDocument: (file: File, type: 'nomina' | 'dieta', month: string): Promise<PayrollDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('month', month);
    return api.post('/api/payroll/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },
  
  // Ver PDF
  viewDocument: (id: number): Promise<Blob> => 
    api.get(`/api/payroll/documents/${id}/view`, { responseType: 'blob' }).then(res => res.data),
  
  // Descargar PDF
  downloadDocument: (id: number): Promise<Blob> => 
    api.get(`/api/payroll/documents/${id}/download`, { responseType: 'blob' }).then(res => res.data),
  
  // Eliminar documento
  deleteDocument: (id: number) => 
    api.delete(`/api/payroll/documents/${id}`).then(res => res.data),
  
  // Estadísticas generales
  getStats: (): Promise<PayrollStats> => 
    api.get('/api/payroll/stats').then(res => res.data),
  
  // APIs de administrador
  admin: {
    // Obtener todos los usuarios
    getUsers: (): Promise<User[]> => 
      api.get('/api/payroll/admin/users').then(res => res.data),
    
    // Obtener documentos de un usuario específico
    getUserDocuments: (userId: number, month?: string): Promise<PayrollDocument[]> => 
      api.get(`/api/payroll/admin/users/${userId}/documents${month ? `?month=${month}` : ''}`).then(res => res.data),
    
    // Obtener todos los documentos
    getAllDocuments: (month?: string, type?: 'nomina' | 'dieta'): Promise<PayrollDocument[]> => {
      const params = new URLSearchParams();
      if (month) params.append('month', month);
      if (type) params.append('type', type);
      return api.get(`/api/payroll/admin/documents?${params.toString()}`).then(res => res.data);
    },
    
    // Subir documento para cualquier usuario (solo admin)
    uploadDocumentForUser: (userId: number, file: File, type: 'nomina' | 'dieta', month: string): Promise<PayrollDocument> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      formData.append('month', month);
      formData.append('user_id', userId.toString());
      return api.post('/api/payroll/admin/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then(res => res.data);
    },

    // Procesar PDF con múltiples nóminas (solo admin)
    processMultiplePayrolls: (file: File, monthYear: string) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('month_year', monthYear);
      return api.post('/api/payroll/process-multiple-payrolls', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then(res => res.data);
    }
  },

  // Procesar PDF con múltiples nóminas (solo admin)
  processPayrollPDF: (file: File, monthYear: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('month_year', monthYear);
    return api.post('/api/payroll/process-payroll-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },

  // Procesar PDF con múltiples dietas (solo admin)
  processDietasPDF: (file: File, monthYear: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('month_year', monthYear);
    return api.post('/api/payroll/process-multiple-dietas', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  }
};

export const ordersAPI = {
  // Obtener todas las órdenes
  getOrders: () => 
    api.get('/api/orders/').then(res => res.data),
  
  // Obtener orden específica
  getOrder: (id: number) => 
    api.get(`/api/orders/${id}`).then(res => res.data),
  
  // Obtener documentos de una orden
  getOrderDocuments: (orderId: number) => 
    api.get(`/api/orders/${orderId}/documents`).then(res => res.data),
  
  // Actualizar estado de orden
  updateOrderStatus: (orderId: number, status: string) => 
    api.put(`/api/orders/${orderId}/status`, null, { params: { status } }).then(res => res.data),
  
  // Obtener estadísticas
  getStats: () => 
    api.get('/api/orders/stats/summary').then(res => res.data),
  
  // Simular recepción de correo electrónico
  simulateEmail: () => 
    api.post('/api/orders/simulate-email').then(res => res.data),
  
  // Procesar correo electrónico con archivos
  processEmail: (senderEmail: string, subject: string, companyName: string, priority: string, files: File[]) => {
    const formData = new FormData();
    formData.append('sender_email', senderEmail);
    formData.append('subject', subject);
    formData.append('company_name', companyName);
    formData.append('priority', priority);
    files.forEach(file => formData.append('files', file));
    return api.post('/api/orders/process-email', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },
  
  // Ver documento PDF
  viewDocument: (documentId: number): Promise<Blob> => 
    api.get(`/api/orders/documents/${documentId}/view`, { responseType: 'blob' }).then(res => res.data),
  
  // Descargar documento
  downloadDocument: (documentId: number) => 
    api.get(`/api/orders/documents/download/${documentId}`).then(res => res.data),
};

export const settingsAPI = {
  // Obtener todas las configuraciones
  getAllSettings: () => 
    api.get('/api/settings').then(res => res.data),
  
  // Obtener configuración de una sección específica
  getSettingsSection: (section: string) => 
    api.get(`/api/settings/${section}`).then(res => res.data),
  
  // Actualizar configuración de una sección
  updateSettingsSection: (section: string, config: Record<string, unknown>) => 
    api.put(`/api/settings/${section}`, config).then(res => res.data),
  
  // Enviar email de prueba
  testEmail: () => 
    api.post('/api/settings/test-email').then(res => res.data),
  
  // Crear backup del sistema
  createBackup: () => 
    api.post('/api/settings/backup').then(res => res.data),
  
  // Limpiar caché del sistema
  clearCache: () => 
    api.post('/api/settings/clear-cache').then(res => res.data),
  
  // Restablecer configuración del sistema
  resetSettings: () => 
    api.post('/api/settings/reset').then(res => res.data),
  
  // Exportar configuración
  exportSettings: () => 
    api.get('/api/settings/export').then(res => res.data),
  
  // Obtener información del sistema
  getSystemInfo: () => 
    api.get('/api/settings/system-info').then(res => res.data),
};

// API de usuarios
export const usersAPI = {
  // Obtener lista de usuarios con paginación y filtros
  getUsers: (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    department?: string;
    role?: string;
    active_only?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.department) searchParams.append('department', params.department);
    if (params?.role) searchParams.append('role', params.role);
    if (params?.active_only !== undefined) searchParams.append('active_only', params.active_only.toString());
    
    return api.get(`/api/users?${searchParams.toString()}`).then(res => res.data);
  },

  // Crear nuevo usuario
  createUser: (userData: {
    dni_nie: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    role: 'ADMINISTRADOR' | 'TRAFICO' | 'TRABAJADOR';
    department: string;
    position?: string;
  worker_type?: 'antiguo' | 'nuevo';
    hire_date?: string;
    birth_date?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    password: string;
  }) => api.post('/api/users', userData).then(res => res.data),

  // Obtener usuario por ID
  getUserById: (id: number) => 
    api.get(`/api/users/${id}`).then(res => res.data),

  // Actualizar usuario
  updateUser: (id: number, userData: Partial<{
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    department: string;
    position: string;
    hire_date: string;
    birth_date: string;
    address: string;
    city: string;
    postal_code: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
  worker_type: 'antiguo' | 'nuevo';
  }>) => api.put(`/api/users/${id}`, userData).then(res => res.data),

  // Desactivar usuario (soft delete)
  deactivateUser: (id: number) => 
    api.delete(`/api/users/${id}`).then(res => res.data),

  // Eliminar usuario permanentemente (hard delete)
  deleteUserPermanently: (id: number) => 
    api.delete(`/api/users/${id}/permanent`).then(res => res.data),

  // Cambiar estado de usuario (activar/desactivar)
  toggleUserStatus: (id: number) => 
    api.patch(`/api/users/${id}/toggle-status`).then(res => res.data),

  // Cambiar contraseña de usuario
  changePassword: (id: number, passwordData: {
    new_password: string;
    confirm_password: string;
  }) => api.patch(`/api/users/${id}/password`, passwordData).then(res => res.data),

  // Obtener estadísticas de usuarios
  getUserStats: () => 
  // Endpoint corregido: el backend expone /api/users/stats/summary
  api.get('/api/users/stats/summary').then(res => res.data),
};

// API Dietas
export const dietasAPI = {
  createRecord: (data: {
    user_id: number;
    worker_type: string;
    order_number?: string;
    month: string;
    total_amount: number;
    concepts: { code: string; label: string; quantity: number; rate: number; subtotal: number; }[];
    notes?: string;
  }): Promise<DietaRecord> => api.post('/api/dietas/', data).then(r=>r.data),
  list: (params?: { user_id?: number; start_month?: string; end_month?: string; start_date?: string; end_date?: string; worker_type?: string; order_number?: string; }) => {
    const sp = new URLSearchParams();
    if (params?.user_id) sp.append('user_id', String(params.user_id));
    // Compatibilidad anterior
    if (params?.start_month) sp.append('start_date', params.start_month);
    if (params?.end_month) sp.append('end_date', params.end_month);
    if (params?.start_date) sp.append('start_date', params.start_date);
    if (params?.end_date) sp.append('end_date', params.end_date);
    if (params?.worker_type) sp.append('worker_type', params.worker_type);
    if (params?.order_number) sp.append('order_number', params.order_number);
    return api.get(`/api/dietas/?${sp.toString()}`).then(r=>r.data as DietaRecord[]);
  },
  get: (id: number): Promise<DietaRecord> => api.get(`/api/dietas/${id}`).then(r=>r.data)
};

// API Distancieros
export const distancierosAPI = {
  listGrouped: (active?: boolean) => {
    const sp = new URLSearchParams();
    if (active !== undefined) sp.append('active', String(active));
    return api.get(`/api/distancieros/grouped?${sp.toString()}`).then(r=>r.data as { client_name:string; total_routes:number; active_routes:number; min_km:number; max_km:number; }[]);
  },
  listRoutes: (clientName: string, params?: { onlyActive?: boolean; q?: string; limit?: number; offset?: number; }) => {
    const sp = new URLSearchParams();
    if (params?.onlyActive !== undefined) sp.append('only_active', String(params.onlyActive));
    if (params?.q) sp.append('q', params.q);
    if (params?.limit) sp.append('limit', String(params.limit));
    if (params?.offset) sp.append('offset', String(params.offset));
    return api.get(`/api/distancieros/${encodeURIComponent(clientName)}/routes?${sp.toString()}`).then(r=>r.data as { total:number; items:{ id:number; client_name:string; destination:string; destination_normalized:string; km:number; active:boolean; notes?:string; created_at:string; updated_at:string; }[]; limit:number; offset:number });
  },
  create: (data: { client_name:string; destination:string; km:number; active?:boolean; notes?:string; }) => api.post('/api/distancieros/', data).then(r=>r.data),
  update: (id:number, data: Partial<{ client_name:string; destination:string; km:number; active:boolean; notes:string; }>) => api.put(`/api/distancieros/${id}`, data).then(r=>r.data),
  remove: (id:number) => api.delete(`/api/distancieros/${id}`).then(r=>r.data)
};

// API para archivos de usuario
export const userFilesAPI = {
  // Obtener documentos de una carpeta específica
  getUserDocuments: (folderType: string) => 
    api.get(`/api/user-files/user-documents/${folderType}`).then(res => res.data),
    
  // Descargar un archivo
  downloadFile: (dniNie: string, folderType: string, filename: string) => 
    `${API_BASE_URL}/api/user-files/download/${dniNie}/${folderType}/${filename}`,

  // Descarga directa de archivo con autenticación
  downloadFileBlob: async (downloadUrl: string): Promise<Blob> => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Token de autenticación no encontrado');
    }

    const response = await fetch(`${API_BASE_URL}${downloadUrl}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Error al descargar el archivo');
    }

    return response.blob();
  },
    
  // Subir un archivo
  uploadFile: (folderType: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/api/user-files/upload/${folderType}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },
  
  // Eliminar un archivo
  deleteFile: (folderType: string, filename: string) => 
    api.delete(`/api/user-files/delete/${folderType}/${filename}`).then(res => res.data),
    
  // Obtener estadísticas de carpetas
  getFolderStats: () => 
    api.get('/api/user-files/folder-stats').then(res => res.data),

  // Historial de subidas
  getUploadHistory: (params?: {
    skip?: number;
    limit?: number;
    document_type?: string;
    status?: string;
    year?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.document_type) searchParams.append('document_type', params.document_type);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.year) searchParams.append('year', params.year);
    
    return api.get(`/api/user-files/upload-history?${searchParams.toString()}`).then(res => res.data);
  },

  createUploadHistory: (historyItem: any) => 
    api.post('/api/user-files/upload-history', historyItem).then(res => res.data),

  updateUploadHistory: (historyId: number, status: string, successfulPages?: number, failedPages?: number) => {
    const data: any = { status };
    if (successfulPages !== undefined) data.successful_pages = successfulPages;
    if (failedPages !== undefined) data.failed_pages = failedPages;
    return api.put(`/api/user-files/upload-history/${historyId}`, data).then(res => res.data);
  },

  // APIs de administrador
  admin: {
    // Obtener todos los usuarios y sus documentos
    getAllUsersDocuments: () => 
      api.get('/api/user-files/admin/all-users-documents').then(res => res.data),
    
    // Obtener documentos de un usuario específico
    getUserDocuments: (dniNie: string) => 
      api.get(`/api/user-files/admin/user/${dniNie}/documents`).then(res => res.data),
  }
};
