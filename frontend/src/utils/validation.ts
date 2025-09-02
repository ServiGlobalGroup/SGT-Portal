/**
 * Utilidades para validación de DNI/NIE con excepciones para usuarios del sistema
 */

/**
 * Lista de usuarios especiales del sistema que no requieren validación de formato DNI/NIE
 */
const SYSTEM_USERS = [
  'admin01',
  'sys_admin', 
  'root',
  'system'
];

/**
 * Verifica si un usuario es un usuario especial del sistema
 * @param username - Nombre de usuario a verificar
 * @returns true si es un usuario del sistema
 */
export const isSystemUser = (username: string): boolean => {
  return SYSTEM_USERS.some(user => user.toLowerCase() === username.toLowerCase());
};

/**
 * Valida el formato de DNI/NIE español
 * @param dniNie - DNI/NIE a validar
 * @returns true si el formato es válido
 */
export const validateDniNieFormat = (dniNie: string): boolean => {
  const dniRegex = /^\d{8}[A-Za-z]$/;
  const nieRegex = /^[XYZ]\d{7}[A-Za-z]$/;
  
  return dniRegex.test(dniNie) || nieRegex.test(dniNie);
};

/**
 * Validación completa de usuario (DNI/NIE o usuario del sistema)
 * @param username - Usuario a validar
 * @returns string vacío si es válido, mensaje de error si no lo es
 */
export const validateUsername = (username: string): string => {
  if (!username.trim()) {
    return 'Este campo es obligatorio';
  }
  
  // Los usuarios del sistema no necesitan validación de formato
  if (isSystemUser(username)) {
    return '';
  }
  
  // Validación normal para DNI/NIE
  if (!validateDniNieFormat(username)) {
    return 'Formato inválido. Use DNI o NIE';
  }
  
  return '';
};

/**
 * Sanitiza el nombre de usuario para login
 * @param username - Usuario a sanitizar
 * @returns Usuario sanitizado
 */
export const sanitizeUsername = (username: string): string => {
  // Para usuarios del sistema, mantener tal como está
  if (isSystemUser(username)) {
    return username.trim();
  }
  
  // Para DNI/NIE, convertir a mayúsculas
  return username.trim().toUpperCase();
};
