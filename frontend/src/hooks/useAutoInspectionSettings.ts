import { useState, useEffect, useCallback } from 'react';
import { truckInspectionService } from '../services/truckInspectionService';
import { AutoInspectionSettings } from '../types/truck-inspection';
import { useAuth } from './useAuth';

interface UseAutoInspectionSettingsResult {
  settings: AutoInspectionSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (enabled: boolean) => Promise<void>;
  refetchSettings: () => Promise<void>;
}

/**
 * Hook para gestionar la configuración de inspecciones automáticas cada 15 días.
 * Solo funciona para roles con permisos de gestión (P_TALLER, ADMINISTRADOR, etc.)
 */
export const useAutoInspectionSettings = (): UseAutoInspectionSettingsResult => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AutoInspectionSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManageSettings = user?.role === 'P_TALLER' || 
                           user?.role === 'ADMINISTRADOR' || 
                           user?.role === 'ADMINISTRACION' ||
                           user?.role === 'TRAFICO' ||
                           user?.role === 'MASTER_ADMIN';

  const fetchSettings = useCallback(async () => {
    if (!canManageSettings) {
      setSettings(null);
      setError('No tienes permisos para gestionar esta configuración');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await truckInspectionService.getAutoInspectionSettings();
      setSettings(response);
    } catch (err: any) {
      console.error('Error fetching auto inspection settings:', err);
      setError(err.message || 'Error al obtener la configuración de inspecciones automáticas');
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, [canManageSettings]);

  const updateSettings = useCallback(async (enabled: boolean) => {
    if (!canManageSettings) {
      throw new Error('No tienes permisos para modificar esta configuración');
    }

    try {
      setLoading(true);
      setError(null);
      
      const updatedSettings = await truckInspectionService.updateAutoInspectionSettings(enabled);
      setSettings(updatedSettings);
    } catch (err: any) {
      console.error('Error updating auto inspection settings:', err);
      const errorMessage = err.message || 'Error al actualizar la configuración de inspecciones automáticas';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [canManageSettings]);

  useEffect(() => {
    if (user && canManageSettings) {
      fetchSettings();
    }
  }, [user, canManageSettings, fetchSettings]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    refetchSettings: fetchSettings,
  };
};