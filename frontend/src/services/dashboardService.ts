import axios from 'axios';

const API_BASE = '/api/dashboard';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  // Añadir cabecera de empresa seleccionada para admins
  try {
    const selected = localStorage.getItem('selected_company');
    if (selected === 'SERVIGLOBAL' || selected === 'EMATRA') {
      headers['X-Company'] = selected;
    }
  } catch { /* noop */ }
  return headers;
};

export const dashboardService = {
  async getStats() {
    const res = await axios.get(`${API_BASE}/stats`, { headers: getAuthHeaders() });
    return res.data;
  },
  async getAvailableWorkers(date?: string) {
    const params: Record<string, string> = {};
    if (date) params.target_date = date; // se mantiene por compatibilidad backend (opcional)
    const res = await axios.get(`${API_BASE}/available-workers`, { params, headers: getAuthHeaders() });
    return res.data;
  },
};
