import axios from 'axios';
import type { DashboardStats, TrafficData, VacationRequest, Document, Activity, TrafficFolder, TrafficDocument, PayrollDocument, PayrollStats, User } from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const dashboardAPI = {
  getStats: (): Promise<DashboardStats> => 
    api.get('/api/dashboard/stats').then(res => res.data),
  getRecentActivity: (): Promise<{ activities: Activity[] }> => 
    api.get('/api/dashboard/recent-activity').then(res => res.data),
};

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
    }
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
    role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
    department: string;
    position?: string;
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
    api.get('/api/users/stats').then(res => res.data),
};
