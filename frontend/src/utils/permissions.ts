import type { User } from '../types';

// Tipos de permisos
export enum Permission {
  // Módulo Dashboard
  VIEW_DASHBOARD = 'view_dashboard',
  
  // Módulo Documentos
  VIEW_DOCUMENTS = 'view_documents',
  UPLOAD_DOCUMENTS = 'upload_documents',
  MANAGE_DOCUMENTS = 'manage_documents',
  
  // Módulo Órdenes
  VIEW_ORDERS = 'view_orders',
  MANAGE_ORDERS = 'manage_orders',
  
  // Módulo Vacaciones
  VIEW_VACATIONS = 'view_vacations',
  MANAGE_VACATIONS = 'manage_vacations',
  
  // Módulo Tráfico
  VIEW_TRAFFIC = 'view_traffic',
  MANAGE_TRAFFIC = 'manage_traffic',
  
  // Módulo Usuarios
  VIEW_USERS = 'view_users',
  MANAGE_USERS = 'manage_users',
  
  // Panel de Documentación
  VIEW_GESTOR = 'view_gestor',
  
  // Subida Masiva (solo administradores)
  MASS_UPLOAD = 'mass_upload',
  
  // Configuración
  VIEW_SETTINGS = 'view_settings',
  MANAGE_SETTINGS = 'manage_settings',
}

// Permisos por rol
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  TRABAJADOR: [
    Permission.VIEW_DOCUMENTS,
    Permission.UPLOAD_DOCUMENTS,
    Permission.VIEW_ORDERS, // Solo los trabajadores (conductores) ven las órdenes
    Permission.VIEW_VACATIONS,
  ],
  TRAFICO: [
    Permission.VIEW_DOCUMENTS,
    Permission.UPLOAD_DOCUMENTS,
    // Permission.VIEW_ORDERS - REMOVIDO: Tráfico no ve órdenes
    Permission.VIEW_VACATIONS,
    Permission.VIEW_TRAFFIC,
    Permission.MANAGE_TRAFFIC,
  ],
  ADMINISTRADOR: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_DOCUMENTS,
    Permission.UPLOAD_DOCUMENTS,
    Permission.MANAGE_DOCUMENTS,
    // Permission.VIEW_ORDERS - REMOVIDO: Administradores no ven órdenes
    // Permission.MANAGE_ORDERS - REMOVIDO: Administradores no gestionan órdenes
    Permission.VIEW_VACATIONS,
    Permission.MANAGE_VACATIONS,
    Permission.VIEW_TRAFFIC,
    Permission.MANAGE_TRAFFIC,
    Permission.VIEW_USERS,
    Permission.MANAGE_USERS,
    Permission.VIEW_GESTOR,
    Permission.MASS_UPLOAD,
    Permission.VIEW_SETTINGS,
    Permission.MANAGE_SETTINGS,
  ],
};

// Función para verificar si un usuario tiene un permiso específico
export const hasPermission = (user: User | null, permission: Permission): boolean => {
  if (!user || !user.role) return false;
  
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  return userPermissions.includes(permission);
};

// Función para verificar si un usuario tiene alguno de varios permisos
export const hasAnyPermission = (user: User | null, permissions: Permission[]): boolean => {
  return permissions.some(permission => hasPermission(user, permission));
};

// Función para obtener todos los permisos de un usuario
export const getUserPermissions = (user: User | null): Permission[] => {
  if (!user || !user.role) return [];
  return ROLE_PERMISSIONS[user.role] || [];
};

// Función para verificar si un usuario puede acceder a una ruta específica
export const canAccessRoute = (user: User | null, route: string): boolean => {
  if (!user) return false;
  
  switch (route) {
    case '/':
      return hasPermission(user, Permission.VIEW_DASHBOARD);
    case '/mass-upload':
      return hasPermission(user, Permission.MASS_UPLOAD);
    case '/documents':
      return hasPermission(user, Permission.VIEW_DOCUMENTS);
    case '/orders':
      return hasPermission(user, Permission.VIEW_ORDERS);
    case '/vacations':
      return hasPermission(user, Permission.VIEW_VACATIONS);
    case '/traffic':
      return hasPermission(user, Permission.VIEW_TRAFFIC);
    case '/users':
      return hasPermission(user, Permission.VIEW_USERS);
    case '/gestor':
      return hasPermission(user, Permission.VIEW_GESTOR);
    case '/settings':
      return hasPermission(user, Permission.VIEW_SETTINGS);
    case '/profile':
      return true; // Todos pueden ver su perfil
    default:
      return false;
  }
};

// Función para obtener el texto de un rol en español
export const getRoleText = (role: string): string => {
  switch (role) {
    case 'ADMINISTRADOR':
      return 'Administrador';
    case 'TRAFICO':
      return 'Tráfico';
    case 'TRABAJADOR':
      return 'Trabajador';
    default:
      return 'Usuario';
  }
};

// Función para obtener la primera ruta permitida para un usuario
export const getDefaultRoute = (user: User | null): string => {
  if (!user) return '/login';
  
  // Verificar rutas en orden de prioridad
  if (hasPermission(user, Permission.VIEW_DASHBOARD)) return '/';
  if (hasPermission(user, Permission.VIEW_DOCUMENTS)) return '/documents';
  if (hasPermission(user, Permission.VIEW_ORDERS)) return '/orders';
  if (hasPermission(user, Permission.VIEW_VACATIONS)) return '/vacations';
  if (hasPermission(user, Permission.VIEW_TRAFFIC)) return '/traffic';
  if (hasPermission(user, Permission.VIEW_USERS)) return '/users';
  if (hasPermission(user, Permission.VIEW_GESTOR)) return '/gestor';
  
  return '/profile'; // Fallback a perfil que todos pueden ver
};

// Función para obtener el color de un rol
export const getRoleColor = (role: string): string => {
  switch (role) {
    case 'ADMINISTRADOR':
      return '#d32f2f'; // Rojo
    case 'TRAFICO':
      return '#1976d2'; // Azul
    case 'TRABAJADOR':
      return '#388e3c'; // Verde
    default:
      return '#666666'; // Gris
  }
};
