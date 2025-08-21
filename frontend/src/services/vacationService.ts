import axios from 'axios';
import type { VacationRequest, VacationStats, VacationRequestCreate, VacationRequestUpdate } from '../types/vacation';

const API_BASE = '/api/vacations/';

// Configurar token de autorización
const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const vacationService = {
  // Obtener todas las solicitudes de vacaciones
  async getVacationRequests(params?: {
    status?: string;
    user_id?: number;
    year?: number;
  }): Promise<VacationRequest[]> {
    try {
      // Normalizar el filtro de estado a mayúsculas si viene definido (el backend espera PENDING/APPROVED/REJECTED)
      const normalizedParams = params?.status
        ? { ...params, status: params.status.toUpperCase() }
        : params;

      const response = await axios.get(API_BASE, {
        params: normalizedParams,
        headers: getAuthHeaders(),
      });
      
      // Convertir fechas string a Date objects
      return response.data.map((request: any) => ({
        ...request,
        // El backend devuelve status en mayúsculas (ENUM). Normalizamos a minúsculas para el frontend.
        status: (String(request.status || '')).toLowerCase() as VacationRequest['status'],
        start_date: new Date(request.start_date),
        end_date: new Date(request.end_date),
        created_at: request.created_at ? new Date(request.created_at) : undefined,
        updated_at: request.updated_at ? new Date(request.updated_at) : undefined,
        reviewed_at: request.reviewed_at ? new Date(request.reviewed_at) : undefined,
      }));
    } catch (error) {
      console.error('Error fetching vacation requests:', error);
      throw error;
    }
  },

  // Crear una nueva solicitud de vacaciones
  async createVacationRequest(request: VacationRequestCreate): Promise<VacationRequest> {
    try {
      // Convertir fechas a strings ISO para el backend
      const requestData = {
        start_date: request.start_date.toISOString().split('T')[0], // Solo la fecha, no la hora
        end_date: request.end_date.toISOString().split('T')[0],
        reason: request.reason
      };
      
      const response = await axios.post(API_BASE, requestData, {
        headers: getAuthHeaders(),
      });
      
      return {
        ...response.data,
        status: (String(response.data.status || '')).toLowerCase() as VacationRequest['status'],
        start_date: new Date(response.data.start_date),
        end_date: new Date(response.data.end_date),
        created_at: response.data.created_at ? new Date(response.data.created_at) : undefined,
        updated_at: response.data.updated_at ? new Date(response.data.updated_at) : undefined,
        reviewed_at: response.data.reviewed_at ? new Date(response.data.reviewed_at) : undefined,
      };
    } catch (error) {
      console.error('Error creating vacation request:', error);
      throw error;
    }
  },

  // Actualizar una solicitud de vacaciones
  async updateVacationRequest(id: number, update: VacationRequestUpdate): Promise<VacationRequest> {
    try {
      // Preparar payload: convertir fechas a YYYY-MM-DD y status a mayúsculas si viene definido
      const payload: any = { ...update };
      if (update.start_date instanceof Date) {
        payload.start_date = update.start_date.toISOString().split('T')[0];
      }
      if (update.end_date instanceof Date) {
        payload.end_date = update.end_date.toISOString().split('T')[0];
      }
      if (update.status) {
        payload.status = String(update.status).toUpperCase();
      }

  const response = await axios.put(`${API_BASE}${id}`, payload, {
        headers: getAuthHeaders(),
      });
      
      return {
        ...response.data,
        status: (String(response.data.status || '')).toLowerCase() as VacationRequest['status'],
        start_date: new Date(response.data.start_date),
        end_date: new Date(response.data.end_date),
        created_at: response.data.created_at ? new Date(response.data.created_at) : undefined,
        updated_at: response.data.updated_at ? new Date(response.data.updated_at) : undefined,
        reviewed_at: response.data.reviewed_at ? new Date(response.data.reviewed_at) : undefined,
      };
    } catch (error) {
      console.error('Error updating vacation request:', error);
      throw error;
    }
  },

  // Eliminar una solicitud de vacaciones
  async deleteVacationRequest(id: number): Promise<void> {
    try {
  await axios.delete(`${API_BASE}${id}`, {
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.error('Error deleting vacation request:', error);
      throw error;
    }
  },

  // Actualizar el estado de una solicitud (solo admins)
  async updateVacationStatus(
    id: number,
    status: 'approved' | 'rejected',
    admin_response?: string
  ): Promise<void> {
    try {
      // El backend espera 'status' como query param y en mayúsculas
      const params = { status: status.toUpperCase(), ...(admin_response ? { admin_response } : {}) };
      await axios.put(`${API_BASE}${id}/status`, null, {
        params,
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.error('Error updating vacation status:', error);
      throw error;
    }
  },

  // Obtener estadísticas de vacaciones
  async getVacationStats(year?: number): Promise<VacationStats> {
    try {
  const response = await axios.get(`${API_BASE}stats`, {
        params: year ? { year } : undefined,
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching vacation stats:', error);
      throw error;
    }
  },

  // Obtener solicitudes pendientes para admins
  async getPendingRequestsForAdmin(): Promise<VacationRequest[]> {
    try {
      const response = await axios.get(`${API_BASE}pending-for-admin`, {
        headers: getAuthHeaders(),
      });
      
      return response.data.map((request: any) => ({
        ...request,
        status: (String(request.status || '')).toLowerCase() as VacationRequest['status'],
        start_date: new Date(request.start_date),
        end_date: new Date(request.end_date),
        created_at: request.created_at ? new Date(request.created_at) : undefined,
        updated_at: request.updated_at ? new Date(request.updated_at) : undefined,
        reviewed_at: request.reviewed_at ? new Date(request.reviewed_at) : undefined,
      }));
    } catch (error) {
      console.error('Error fetching pending requests for admin:', error);
      throw error;
    }
  },
};
