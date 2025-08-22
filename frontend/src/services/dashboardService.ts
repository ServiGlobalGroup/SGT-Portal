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
  async getRecentActivity(limit = 20) {
    const res = await axios.get(`${API_BASE}/recent-activity`, { params: { limit }, headers: getAuthHeaders() });
    return res.data;
  },
  async getAvailableWorkers(date: string) {
    const res = await axios.get(`${API_BASE}/available-workers`, { params: { target_date: date }, headers: getAuthHeaders() });
    return res.data;
  },
};
