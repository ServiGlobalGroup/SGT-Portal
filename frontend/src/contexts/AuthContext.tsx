import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { } from '../types';

// Base de API compartida con services/api.ts
const envUrl = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;
const API_BASE_URL = envUrl && envUrl.trim() !== ''
  ? envUrl
  : (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8000');

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<number | null>(null);
  const inactivityTimerRef = useRef<number | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const tokenExpiryTimerRef = useRef<number | null>(null);

  const lastActivityRef = useRef<number>(Date.now());
  const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000; // 2 minutos
  const MAX_INACTIVITY_MS = 60 * 60 * 1000; // 60 minutos (configurable)

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    setToken(null);
    setUser(null);
    if (token) {
      fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }).catch(()=>{});
    }
    [refreshTimerRef, inactivityTimerRef, heartbeatRef, tokenExpiryTimerRef].forEach(ref => {
      if (ref.current) {
        window.clearTimeout(ref.current);
        (ref as any).current = null;
      }
    });
  }, [token]);

  const decodeTokenExp = (jwtToken: string): number | null => {
    try {
      const base64 = jwtToken.split('.')[1];
      if (!base64) return null;
      const payload = JSON.parse(atob(base64.replace(/-/g,'+').replace(/_/g,'/')));
      if (payload && typeof payload.exp === 'number') return payload.exp * 1000; // ms
      return null;
    } catch {
      return null;
    }
  };

  const scheduleTokenExpiryWatch = useCallback((jwtToken: string) => {
    if (tokenExpiryTimerRef.current) {
      window.clearTimeout(tokenExpiryTimerRef.current);
      tokenExpiryTimerRef.current = null;
    }
    const expMs = decodeTokenExp(jwtToken);
    if (!expMs) return;
    const now = Date.now();
    const delta = expMs - now;
    if (delta <= 0) {
      logout();
      return;
    }
    // Un pequeño margen de 1s
    tokenExpiryTimerRef.current = window.setTimeout(() => {
      // Al expirar cerramos inmediatamente, sin esperar interacción
      logout();
      if (window.location.pathname !== '/login') {
        window.location.replace('/login?reason=expired');
      }
    }, delta + 1000);
  }, [logout]);

  const isAuthenticated = !!user && !!token;

  // logout ya definido arriba

  useEffect(() => {
    // Verificar si hay un token guardado al cargar la aplicación
    const savedToken = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user_data');
    
    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(userData);
        
        // Verificar si el token sigue siendo válido
        verifyToken(savedToken).then((valid) => {
          if (!valid) {
            logout();
          }
        });
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        logout();
      }
    }
    
    setIsLoading(false);
  }, [logout]);

  // Escuchar cambios de storage (otra pestaña cerró sesión) y pérdida de token local
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'access_token' && !e.newValue) {
        logout();
        if (window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [logout]);

  // Si token desaparece por cualquier razón en esta misma pestaña, redirigir inmediatamente
  useEffect(() => {
    if (!token && !isLoading) {
      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }
  }, [token, isLoading]);

  const verifyToken = async (tokenToVerify: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-token`, {
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`,
        },
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error verifying token:', error);
      return false;
    }
  };

  const scheduleRefresh = useCallback((expiresInSeconds: number) => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    // Refrescar 1 minuto antes de expirar (o a los 5 min si el tiempo es mayor)
    const refreshIn = Math.max(30, expiresInSeconds - 60); // al menos 30s de margen
    refreshTimerRef.current = window.setTimeout(async () => {
      try {
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('user_data', JSON.stringify(data.user));
          setToken(data.access_token);
          setUser(data.user);
          // Reprogramar siguiente refresh
          scheduleRefresh(data.expires_in || 3600);
        } else {
          // Si falla, efectuar logout silencioso
          logout();
        }
      } catch {
        logout();
      }
    }, refreshIn * 1000);
  }, [token, logout]);

  const scheduleInactivityLogout = useCallback(() => {
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = window.setTimeout(() => {
      // Si no hubo actividad real, cerrar sesión
      if (Date.now() - lastActivityRef.current >= MAX_INACTIVITY_MS) {
        logout();
      } else {
        scheduleInactivityLogout(); // reprogramar si hubo actividad registrada pero no reiniciada
      }
    }, MAX_INACTIVITY_MS + 5_000); // pequeño buffer
  }, [logout]);

  const registerActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Heartbeat para renovar token si se acerca expiración aunque no se hagan peticiones manuales
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
    heartbeatRef.current = window.setInterval(async () => {
      // Si no se ha superado tiempo máximo de inactividad seguimos manteniendo la sesión viva
      if (token && Date.now() - lastActivityRef.current < MAX_INACTIVITY_MS) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('user_data', JSON.stringify(data.user));
            setToken(data.access_token);
            setUser(data.user);
            scheduleTokenExpiryWatch(data.access_token);
          }
        } catch {
          // Ignorar error puntual, se manejará al siguiente request
        }
      }
    }, HEARTBEAT_INTERVAL_MS) as unknown as number;
  }, [token, MAX_INACTIVITY_MS, scheduleTokenExpiryWatch]);

  const login = async (username: string, password: string): Promise<void> => {
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error de autenticación');
      }

      const data = await response.json();
      
      // Guardar token y datos del usuario
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user_data', JSON.stringify(data.user));
      
      setToken(data.access_token);
      setUser(data.user);
  if (data.expires_in) scheduleRefresh(data.expires_in);
  if (data.access_token) scheduleTokenExpiryWatch(data.access_token);
  scheduleInactivityLogout();
  startHeartbeat();
    } catch (error) {
      // Limpiar cualquier dato previo en caso de error
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');
      setToken(null);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const checkAuth = async (): Promise<boolean> => {
    if (!token) return false;
    
    const isValid = await verifyToken(token);
    if (!isValid) {
      logout();
      return false;
    }
    
    return true;
  };

  // Registrar eventos de actividad del usuario
  useEffect(() => {
    const events = ['click','keydown','mousemove','scroll','touchstart'] as const;
    const handler = () => {
      registerActivity();
      scheduleInactivityLogout();
    };
    events.forEach(ev => window.addEventListener(ev, handler, { passive: true }));
    return () => {
      events.forEach(ev => window.removeEventListener(ev, handler));
    };
  }, [registerActivity, scheduleInactivityLogout]);

  // Reprogramar watcher de expiración al cambiar token
  useEffect(() => {
    if (token) scheduleTokenExpiryWatch(token);
  }, [token, scheduleTokenExpiryWatch]);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
