import { useState, useEffect, useCallback } from 'react';
import { InspectionNeededResponse, ManualInspectionRequest } from '../types/truck-inspection';
import { truckInspectionService } from '../services/truckInspectionService';
import { useAuth } from './useAuth';

interface UseTruckInspectionResult {
  needsInspection: boolean;
  lastInspectionDate: string | null;
  nextInspectionDate: string | null;
  daysSinceLastInspection: number | null;
  message: string;
  manualRequests: ManualInspectionRequest[];
  hasManualRequests: boolean;
  loading: boolean;
  error: string | null;
  checkInspectionNeeded: () => Promise<void>;
  inspectionIntervalDays: number;
  autoInspectionEnabled: boolean;
}

/**
 * Hook para verificar si un trabajador necesita realizar una inspección de camión
 */
export const useTruckInspection = (): UseTruckInspectionResult => {
  const { user } = useAuth();
  const [inspectionStatus, setInspectionStatus] = useState<InspectionNeededResponse>({
    needs_inspection: false,
    last_inspection_date: undefined,
    next_inspection_date: undefined,
    days_since_last_inspection: undefined,
    message: '',
    manual_requests: [],
    inspection_interval_days: 15,
    auto_inspection_enabled: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Eliminado: actualización de preferencia desde UI

  const checkInspectionNeeded = useCallback(async () => {
    // Solo verificar si es trabajador
    if (!user || user.role !== 'TRABAJADOR') {
      setInspectionStatus({
        needs_inspection: false,
        last_inspection_date: undefined,
        next_inspection_date: undefined,
        days_since_last_inspection: undefined,
        message: 'Solo los trabajadores necesitan realizar inspecciones',
        manual_requests: [],
        inspection_interval_days: 15,
        auto_inspection_enabled: true,
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await truckInspectionService.checkInspectionNeeded();
      setInspectionStatus({
        ...response,
        manual_requests: response.manual_requests ?? [],
        inspection_interval_days: response.inspection_interval_days ?? inspectionStatus.inspection_interval_days,
        auto_inspection_enabled: response.auto_inspection_enabled ?? true,
      });
    } catch (err: any) {
      // Manejar específicamente errores de autenticación
      if (err?.message?.includes('Unauthorized') || err?.message?.includes('401')) {
        console.warn('Usuario no autenticado para verificar inspecciones');
        setError('Sesión expirada. Por favor, inicia sesión nuevamente.');
        setInspectionStatus({
          needs_inspection: false,
          last_inspection_date: undefined,
          next_inspection_date: undefined,
          days_since_last_inspection: undefined,
          message: 'Sesión no válida',
          manual_requests: [],
          inspection_interval_days: 15,
          auto_inspection_enabled: true,
        });
      } else {
        setError(err?.message || 'Error verificando estado de inspección');
        console.error('Error checking inspection needed:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [user, inspectionStatus.inspection_interval_days]);

  // setAutoInspectionEnabled eliminado

  // Verificar automáticamente y con sondeo periódico mientras el trabajador esté activo
  useEffect(() => {
    if (!user || user.role !== 'TRABAJADOR') {
      return;
    }

    let isMounted = true;

    const runCheck = async () => {
      if (!isMounted) return;
      await checkInspectionNeeded();
    };

    void runCheck();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void runCheck();
      }
    }, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void runCheck();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, checkInspectionNeeded]);

  return {
    needsInspection: inspectionStatus.needs_inspection,
    lastInspectionDate: inspectionStatus.last_inspection_date || null,
    nextInspectionDate: inspectionStatus.next_inspection_date || null,
    daysSinceLastInspection: inspectionStatus.days_since_last_inspection || null,
    message: inspectionStatus.message,
    manualRequests: inspectionStatus.manual_requests ?? [],
    hasManualRequests: (inspectionStatus.manual_requests ?? []).length > 0,
  loading,
    error,
    checkInspectionNeeded,
    inspectionIntervalDays: inspectionStatus.inspection_interval_days,
    autoInspectionEnabled: inspectionStatus.auto_inspection_enabled,
  };
};