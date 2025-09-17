import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { } from '../types';

// Definición de códigos de empresa soportados en frontend
export type CompanyCode = 'SERVIGLOBAL' | 'EMATRA';

// Base de API compartida con services/api.ts
const envUrl = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;
const API_BASE_URL = envUrl && envUrl.trim() !== ''
  ? envUrl
  : (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8001');

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mustChangePassword: boolean;
  login: (username: string, password: string) => Promise<void>;
  availableCompanies: CompanyCode[];
  selectedCompany: CompanyCode | null;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  updatePasswordChanged: () => void;
  selectCompany: (company: CompanyCode) => void;
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
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [availableCompanies, setAvailableCompanies] = useState<CompanyCode[]>(['SERVIGLOBAL', 'EMATRA']);
  const [selectedCompany, setSelectedCompany] = useState<CompanyCode | null>(null);
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
    localStorage.removeItem('selected_company');
    try { sessionStorage.removeItem('session_company_override'); } catch {}
    setToken(null);
    setUser(null);
    setSelectedCompany(null);
    setAvailableCompanies(['SERVIGLOBAL', 'EMATRA']);
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

  // Decodifica el payload del token (sin verificar firma), para leer claims como company
  const decodeTokenPayload = (jwtToken: string): any | null => {
    try {
      const base64 = jwtToken.split('.')[1];
      if (!base64) return null;
      return JSON.parse(atob(base64.replace(/-/g,'+').replace(/_/g,'/')));
    } catch {
      return null;
    }
  };

  // Normaliza valores de empresa provenientes del backend/JWT/objetos
  const normalizeCompanyValue = (val: any): CompanyCode | null => {
    try {
      if (!val) return null;
      if (typeof val === 'string') {
        const U = val.toUpperCase();
        if (U === 'SERVIGLOBAL' || U === 'EMATRA') return U as CompanyCode;
        if (U.includes('SERVIGLOBAL')) return 'SERVIGLOBAL';
        if (U.includes('EMATRA')) return 'EMATRA';
      } else if (typeof val === 'object') {
        const v = (val as any).value ?? (val as any).name ?? '';
        const U = String(v).toUpperCase();
        if (U === 'SERVIGLOBAL' || U === 'EMATRA') return U as CompanyCode;
        if (U.includes('SERVIGLOBAL')) return 'SERVIGLOBAL';
        if (U.includes('EMATRA')) return 'EMATRA';
      }
    } catch { /* noop */ }
    return null;
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
    const savedCompany = localStorage.getItem('selected_company');
    
    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(userData);
        setMustChangePassword(!!userData.must_change_password);

        // Normalizar rol y empresa del usuario (con respaldo al claim del token)
        const rawRole = (userData as any)?.role;
        const roleVal = ((): string => {
          try {
            if (!rawRole) return '';
            if (typeof rawRole === 'string') return rawRole.toUpperCase();
            const v = (rawRole as any).value ?? (rawRole as any).name ?? '';
            return String(v).toUpperCase();
          } catch { return ''; }
        })();
        const userCompany = normalizeCompanyValue((userData as any)?.company);
        const tokenPayload = decodeTokenPayload(savedToken);
        const tokenCompany = normalizeCompanyValue(tokenPayload?.company);
        const normalized: CompanyCode | null = userCompany || tokenCompany;

        const isAdminRole = ['ADMINISTRADOR','ADMINISTRACION','MASTER_ADMIN'].includes(roleVal);
        if (isAdminRole) {
          // Permitir override de sesión para admins (cambio temporal durante la sesión)
          let sessionOverride: CompanyCode | null = null;
          try {
            const ov = sessionStorage.getItem('session_company_override');
            if (ov === 'SERVIGLOBAL' || ov === 'EMATRA') sessionOverride = ov as CompanyCode;
          } catch { /* noop */ }

          if (sessionOverride) {
            setSelectedCompany(sessionOverride);
            localStorage.setItem('selected_company', sessionOverride);
          } else if (normalized) {
            // Si no hay override, arrancar con su empresa base
            setSelectedCompany(normalized);
            localStorage.setItem('selected_company', normalized);
          } else if (savedCompany === 'SERVIGLOBAL' || savedCompany === 'EMATRA') {
            // fallback si no hay company en usuario por algún motivo
            setSelectedCompany(savedCompany as CompanyCode);
          } else {
            // Último recurso: valor por defecto
            setSelectedCompany('SERVIGLOBAL');
            localStorage.setItem('selected_company', 'SERVIGLOBAL');
          }
        } else {
          // No admin: respetar localStorage si existe, si no usar la del usuario
          if (savedCompany === 'SERVIGLOBAL' || savedCompany === 'EMATRA') {
            setSelectedCompany(savedCompany as CompanyCode);
          } else if (normalized) {
            setSelectedCompany(normalized);
            localStorage.setItem('selected_company', normalized);
          }
        }
        
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

  const updatePasswordChanged = useCallback(() => {
    // Resetear flag después de cambiar contraseña
    setMustChangePassword(false);
    // Actualizar datos de usuario en localStorage
    if (user) {
      const updatedUser = { ...user, must_change_password: false };
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  }, [user]);

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
        
        // Mensajes más específicos según el código de error
        if (response.status === 401) {
          throw new Error('Usuario o contraseña incorrectos');
        } else if (response.status === 422) {
          throw new Error('Datos de login inválidos');
        } else if (response.status === 429) {
          throw new Error('Demasiados intentos. Intenta más tarde');
        } else {
          throw new Error(errorData.detail || 'Error de autenticación');
        }
      }

      const data = await response.json();
      
      // Guardar token y datos del usuario
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user_data', JSON.stringify(data.user));
      
      setToken(data.access_token);
      setUser(data.user);
      setMustChangePassword(!!data.user?.must_change_password);
      // Rol y empresa base del usuario
      const rawRole = (data.user as any)?.role;
      const roleVal = ((): string => {
        try {
          if (!rawRole) return '';
          if (typeof rawRole === 'string') return rawRole.toUpperCase();
          const v = (rawRole as any).value ?? (rawRole as any).name ?? '';
          return String(v).toUpperCase();
        } catch { return ''; }
      })();
      const userCompany = normalizeCompanyValue((data.user as any)?.company);
      const payload = decodeTokenPayload(data.access_token);
      const tokenCompany = normalizeCompanyValue(payload?.company);
      const normalized: CompanyCode | null = userCompany || tokenCompany;

      const isAdminRole = ['ADMINISTRADOR','ADMINISTRACION','MASTER_ADMIN'].includes(roleVal);
      // Al iniciar sesión, limpiar cualquier override de sesión previo
      try { sessionStorage.removeItem('session_company_override'); } catch {}
      if (isAdminRole) {
        // Admin: siempre arrancar con su empresa base
        if (normalized) {
          setSelectedCompany(normalized);
          localStorage.setItem('selected_company', normalized);
        } else {
          // Si no viene en el usuario, usar la previa si existe o un valor por defecto
          const savedCompany = localStorage.getItem('selected_company');
          if (savedCompany === 'SERVIGLOBAL' || savedCompany === 'EMATRA') {
            setSelectedCompany(savedCompany as CompanyCode);
          } else {
            setSelectedCompany('SERVIGLOBAL');
            localStorage.setItem('selected_company', 'SERVIGLOBAL');
          }
        }
      } else {
        // No admin: solo fijar si no hay una previa en localStorage
        try {
          const existingCompany = localStorage.getItem('selected_company');
          if (existingCompany !== 'SERVIGLOBAL' && existingCompany !== 'EMATRA' && normalized) {
            setSelectedCompany(normalized);
            localStorage.setItem('selected_company', normalized);
          }
        } catch { /* noop */ }
      }
      if (data.expires_in) scheduleRefresh(data.expires_in);
      if (data.access_token) scheduleTokenExpiryWatch(data.access_token);
      scheduleInactivityLogout();
      startHeartbeat();
    } catch (error) {
      // Limpiar cualquier dato previo en caso de error
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('selected_company');
      setToken(null);
      setUser(null);
      setSelectedCompany(null);
      setAvailableCompanies(['SERVIGLOBAL', 'EMATRA']);
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

  const selectCompany = useCallback((company: CompanyCode) => {
    // Roles permitidos a cambiar empresa: ADMINISTRADOR, ADMINISTRACION, MASTER_ADMIN
    const rawRole = (user as any)?.role;
    const isAdmin = (() => {
      try {
        if (!rawRole) return false;
        if (typeof rawRole === 'string') {
          const R = rawRole.toUpperCase();
          return R === 'ADMINISTRADOR' || R === 'ADMINISTRACION' || R === 'MASTER_ADMIN';
        }
        const v = (rawRole as any).value ?? (rawRole as any).name ?? '';
        const R = String(v).toUpperCase();
        return R === 'ADMINISTRADOR' || R === 'ADMINISTRACION' || R === 'MASTER_ADMIN';
      } catch { return false; }
    })();
    if (!isAdmin) return; // bloquear para TRABAJADOR, TRÁFICO u otros perfiles no admin
    if (selectedCompany === company) return; // no-op si no hay cambio

    setSelectedCompany(company);
    localStorage.setItem('selected_company', company);
    try { sessionStorage.setItem('session_company_override', company); } catch {}
    if (typeof window !== 'undefined') {
      window.setTimeout(() => window.location.reload(), 50);
    }
  }, [selectedCompany, user]);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    mustChangePassword,
    availableCompanies,
    selectedCompany,
    login,
    logout,
    checkAuth,
    updatePasswordChanged,
    selectCompany,
  };  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
