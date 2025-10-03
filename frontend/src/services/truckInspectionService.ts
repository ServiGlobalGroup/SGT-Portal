import { 
  TruckInspectionCreate,
  TruckInspectionResponse,
  TruckInspectionSummary,
  InspectionNeededResponse,
  InspectionStatsResponse,
  ImageUploadResponse,
  InspectionComponentType,
  MarkInspectionReviewedResponse,
  TruckInspectionRequestCreate,
  TruckInspectionRequestResult,
  AutoInspectionSettings,
  DirectInspectionOrderCreate,
  DirectInspectionOrderResponse,
  DirectInspectionOrderSummary,
  MarkDirectOrderReviewedRequest,
  MarkDirectOrderReviewedResponse,
} from '../types/truck-inspection';

const API_BASE_URL = '/api/truck-inspections';

class TruckInspectionService {
  /**
   * Verifica si el usuario actual necesita realizar una inspección
   */
  async checkInspectionNeeded(): Promise<InspectionNeededResponse> {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await fetch(`${API_BASE_URL}/check-needed`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized - Session expired');
      }
      throw new Error(`Error checking inspection needed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Crea una nueva inspección de camión
   */
  async createInspection(inspection: TruckInspectionCreate): Promise<TruckInspectionResponse> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inspection),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error creating inspection: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Obtiene el historial de inspecciones
   */
  async getInspections(params?: {
    user_id?: number;
    truck_license_plate?: string;
    has_issues?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<TruckInspectionSummary[]> {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    
    // Añadir cabecera X-Company para administradores que pueden cambiar de empresa
    try {
      const selectedCompany = localStorage.getItem('selected_company');
      if (selectedCompany === 'SERVIGLOBAL' || selectedCompany === 'EMATRA') {
        headers['X-Company'] = selectedCompany;
      }
    } catch { /* noop */ }
    
    const queryParams = new URLSearchParams();
    if (params?.user_id) queryParams.append('user_id', params.user_id.toString());
    if (params?.truck_license_plate) queryParams.append('truck_license_plate', params.truck_license_plate);
    if (params?.has_issues !== undefined) queryParams.append('has_issues', params.has_issues.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

  const url = `${API_BASE_URL}/${queryParams.toString() ? `?${queryParams}` : ''}`;
    
    const response = await fetch(url, {
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('No está autenticado. Por favor, inicie sesión nuevamente.');
      } else if (response.status === 403) {
        throw new Error('No tiene permisos para acceder a este recurso.');
      } else {
        const errorText = await response.text();
        let errorMessage = `Error fetching inspections: ${response.statusText}`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.detail) {
            errorMessage = `Error: ${errorData.detail}`;
          }
        } catch {
          // Si no es JSON válido, usar el mensaje por defecto
        }
        throw new Error(errorMessage);
      }
    }

    const data = await response.json();
    console.log('DEBUG: Service received data:', data);
    return data;
  }

  /**
   * Obtiene el detalle de una inspección específica
   */
  async getInspectionDetail(inspectionId: number): Promise<TruckInspectionResponse> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/${inspectionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching inspection detail: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Obtiene inspecciones con incidencias pendientes (solo para personal de taller)
   * Filtra por empresa para roles de administrador y administración
   */
  async getPendingIssues(): Promise<TruckInspectionSummary[]> {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      throw new Error('No hay token de autenticación. Por favor, inicie sesión.');
    }
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    
    // Añadir cabecera X-Company para administradores que pueden cambiar de empresa
    try {
      const selectedCompany = localStorage.getItem('selected_company');
      if (selectedCompany === 'SERVIGLOBAL' || selectedCompany === 'EMATRA') {
        headers['X-Company'] = selectedCompany;
      }
    } catch { /* noop */ }

    const response = await fetch(`${API_BASE_URL}/pending-issues/`, {
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('No está autenticado. Por favor, inicie sesión nuevamente.');
      } else if (response.status === 403) {
        throw new Error('No tiene permisos para acceder a este recurso.');
      } else {
        const errorText = await response.text();
        let errorMessage = `Error fetching pending issues: ${response.statusText}`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.detail) {
            errorMessage = `Error: ${errorData.detail}`;
          }
        } catch {
          // Si no es JSON válido, usar el mensaje por defecto
        }
        throw new Error(errorMessage);
      }
    }

    return response.json();
  }

  /**
   * Obtiene estadísticas de inspecciones (solo para personal de taller)
   */
  async getInspectionStats(days: number = 30): Promise<InspectionStatsResponse> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/stats/?days=${days}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching inspection stats: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Sube una imagen para un componente específico de la inspección
   */
  async uploadInspectionImage(
    inspectionId: number,
    component: InspectionComponentType,
    file: File
  ): Promise<ImageUploadResponse> {
    const token = localStorage.getItem('access_token');
    
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/${inspectionId}/upload-image?component=${component}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error uploading image: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Marca una inspección como revisada
   */
  async markInspectionReviewed(inspectionId: number, revisionNotes?: string): Promise<MarkInspectionReviewedResponse> {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

  const response = await fetch(`${API_BASE_URL}/${inspectionId}/mark-reviewed/?revision_notes=${encodeURIComponent(revisionNotes || '')}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error marking inspection as reviewed: ${response.statusText}`);
    }

    return response.json();
  }

  async createManualInspectionRequests(payload: TruckInspectionRequestCreate): Promise<TruckInspectionRequestResult> {
    const token = localStorage.getItem('access_token');

    if (!token) {
      throw new Error('No authentication token found');
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      const selectedCompany = localStorage.getItem('selected_company');
      if (selectedCompany === 'SERVIGLOBAL' || selectedCompany === 'EMATRA') {
        headers['X-Company'] = selectedCompany;
      }
    } catch {
      /* noop */
    }

    const response = await fetch(`${API_BASE_URL}/manual-requests`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error enviando solicitudes de inspección: ${response.statusText}`);
    }

    return response.json();
  }

  async getAutoInspectionSettings(): Promise<AutoInspectionSettings> {
    const token = localStorage.getItem('access_token');

    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/settings/auto-inspection`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }
      if (response.status === 403) {
        throw new Error('No tienes permisos para ver la configuración de inspecciones automáticas.');
      }
      throw new Error(`Error obteniendo la configuración automática: ${response.statusText}`);
    }

    return response.json();
  }

  async updateAutoInspectionSettings(enabled: boolean): Promise<AutoInspectionSettings> {
    const token = localStorage.getItem('access_token');

    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/settings/auto-inspection`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ auto_inspection_enabled: enabled }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }
      if (response.status === 403) {
        throw new Error('No cuentas con permisos para modificar la configuración automática.');
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error actualizando la configuración automática: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Función auxiliar para subir múltiples imágenes después de crear la inspección
   */
  async uploadMultipleImages(
    inspectionId: number,
    images: { component: InspectionComponentType; file: File }[]
  ): Promise<void> {
    const uploadPromises = images.map(({ component, file }) =>
      this.uploadInspectionImage(inspectionId, component, file)
    );

    await Promise.all(uploadPromises);
  }

  /**
   * Obtiene la URL completa para mostrar una imagen de inspección
   */
  getImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    
    // Si es una ruta absoluta, la devolvemos tal como está
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Si ya incluye /api, la devolvemos tal como está
    if (imagePath.startsWith('/api')) {
      return imagePath;
    }
    
    // Convertir backslashes a forward slashes para URLs web
    const cleanPath = imagePath.replace(/\\/g, '/');
    
    // Asegurar que la ruta sea relativa a la carpeta base del backend
    const relativePath = cleanPath.startsWith('files/truck_inspections/')
      ? cleanPath.replace(/^files\/truck_inspections\/?/, '')
      : cleanPath;

    // Construir la URL completa sin token (se enviará en header)
    return `${API_BASE_URL}/image/${relativePath}`;
  }

  /**
   * Obtiene una imagen con autenticación mediante fetch
   */
  async getImageWithAuth(imagePath: string): Promise<string> {
    const token = localStorage.getItem('access_token');
    const imageUrl = this.getImageUrl(imagePath);
    
    try {
      const response = await fetch(imageUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error fetching image:', error);
      throw error;
    }
  }

  /**
   * Crea una orden directa de inspección
   */
  async createDirectInspectionOrder(payload: DirectInspectionOrderCreate): Promise<DirectInspectionOrderResponse> {
    const token = localStorage.getItem('access_token');

    if (!token) {
      throw new Error('No authentication token found');
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      const selectedCompany = localStorage.getItem('selected_company');
      if (selectedCompany === 'SERVIGLOBAL' || selectedCompany === 'EMATRA') {
        headers['X-Company'] = selectedCompany;
      }
    } catch {
      /* noop */
    }

    const response = await fetch(`${API_BASE_URL}/direct-orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error al crear la orden directa: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Lista todas las órdenes directas, con filtro opcional por estado de revisión
   */
  async getDirectInspectionOrders(isReviewed?: boolean): Promise<DirectInspectionOrderSummary[]> {
    const token = localStorage.getItem('access_token');

    if (!token) {
      throw new Error('No authentication token found');
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
    };

    try {
      const selectedCompany = localStorage.getItem('selected_company');
      if (selectedCompany === 'SERVIGLOBAL' || selectedCompany === 'EMATRA') {
        headers['X-Company'] = selectedCompany;
      }
    } catch {
      /* noop */
    }

    const queryParams = isReviewed !== undefined ? `?is_reviewed=${isReviewed}` : '';
    const response = await fetch(`${API_BASE_URL}/direct-orders${queryParams}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error al obtener órdenes directas: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Obtiene el detalle completo de una orden directa
   */
  async getDirectInspectionOrderDetail(orderId: number): Promise<DirectInspectionOrderResponse> {
    const token = localStorage.getItem('access_token');

    if (!token) {
      throw new Error('No authentication token found');
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
    };

    try {
      const selectedCompany = localStorage.getItem('selected_company');
      if (selectedCompany === 'SERVIGLOBAL' || selectedCompany === 'EMATRA') {
        headers['X-Company'] = selectedCompany;
      }
    } catch {
      /* noop */
    }

    const response = await fetch(`${API_BASE_URL}/direct-orders/${orderId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error al obtener detalle de orden: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Marca una orden directa como revisada
   */
  async markDirectOrderReviewed(orderId: number, revisionNotes?: string): Promise<MarkDirectOrderReviewedResponse> {
    const token = localStorage.getItem('access_token');

    if (!token) {
      throw new Error('No authentication token found');
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      const selectedCompany = localStorage.getItem('selected_company');
      if (selectedCompany === 'SERVIGLOBAL' || selectedCompany === 'EMATRA') {
        headers['X-Company'] = selectedCompany;
      }
    } catch {
      /* noop */
    }

    const payload: MarkDirectOrderReviewedRequest = {
      revision_notes: revisionNotes || null,
    };

    const response = await fetch(`${API_BASE_URL}/direct-orders/${orderId}/mark-reviewed`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error al marcar orden como revisada: ${response.statusText}`);
    }

    return response.json();
  }
}

export const truckInspectionService = new TruckInspectionService();