import axios from 'axios';

const API_BASE = '/api/dashboard';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const dashboardService = {
  async getStats() {
    const res = await axios.get(`${API_BASE}/stats`, { headers: getAuthHeaders() });
    return res.data;
  },
  async getAvailableWorkers(date?: string, position?: string) {
    const params: Record<string, string> = {};
    if (date) params.target_date = date; // se mantiene por compatibilidad backend (opcional)
    if (position && position !== '') params.position = position;
    const res = await axios.get(`${API_BASE}/available-workers`, { params, headers: getAuthHeaders() });
    return res.data;
  },
};
