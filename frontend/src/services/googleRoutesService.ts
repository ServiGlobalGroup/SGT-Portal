import { API_BASE_URL } from './api';
import axios from 'axios';

// Tipado básico para respuesta caché
export interface GoogleRouteCache {
  origin: string;
  destination: string;
  mode: string;
  km: number;
  duration_sec?: number;
  polyline?: string;
  cached: boolean;
  variant: 'NOTOLLS' | 'TOLLS';
  uses_tolls?: boolean | null;
}

const api = axios.create({ baseURL: API_BASE_URL });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access_token');
  if(token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
// Interceptor para suprimir logs de 404 en caché (es comportamiento normal)
api.interceptors.response.use(
  response => response,
  error => {
    if(error?.response?.status === 404 && error?.config?.url?.includes('/google/route')) {
      // Suprimir error de consola para 404 de caché, es comportamiento esperado
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

export const googleRoutesService = {
  async getCached(origin: string, destination: string, mode: string = 'DRIVING', variant: 'NOTOLLS' | 'TOLLS' = 'NOTOLLS'): Promise<GoogleRouteCache | null> {
    const params = new URLSearchParams({ origin, destination, mode, variant });
    try {
      const r = await api.get(`/api/distancieros/google/route?${params.toString()}`);
      return r.data as GoogleRouteCache;
    } catch(e:any){
      if(e?.response?.status === 404) return null;
      throw e;
    }
  },
  async save(route: { origin: string; destination: string; mode?: string; km: number; duration_sec?: number; polyline?: string; variant?: 'NOTOLLS' | 'TOLLS'; uses_tolls?: boolean; }): Promise<GoogleRouteCache> {
    const r = await api.post('/api/distancieros/google/route', route);
    return r.data as GoogleRouteCache;
  }
};
