import axios from 'axios';

const API_BASE = '/api/activity';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface ActivityItem {
  id: number;
  user_name: string;
  action: string;
  type: string; // mapped type (upload|approval|login|update)
  timestamp: string;
}

export interface ActivityResponse {
  items: ActivityItem[];
  total: number;
  limit: number;
  offset: number;
}

export const activityService = {
  async getRecent(limit = 20) : Promise<ActivityResponse> {
    const res = await axios.get(`${API_BASE}/recent`, { params: { limit }, headers: getAuthHeaders() });
    return res.data;
  }
};
