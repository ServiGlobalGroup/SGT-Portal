import { useState, useEffect } from 'react';
import { truckInspectionService } from '../services/truckInspectionService';
import { useAuth } from './useAuth';

interface UsePendingInspectionsResult {
  pendingCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para obtener el número de inspecciones pendientes
 * Solo funciona para roles que pueden gestionar las revisiones (ADMINISTRADOR, P_TALLER, TRAFICO)
 */
export const usePendingInspections = (): UsePendingInspectionsResult => {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canViewPendingInspections = user?.role === 'ADMINISTRADOR' || 
                                  user?.role === 'ADMINISTRACION' ||
                                  user?.role === 'P_TALLER' || 
                                  user?.role === 'TRAFICO' ||
                                  user?.role === 'MASTER_ADMIN';

  const fetchPendingInspections = async () => {
    if (!canViewPendingInspections) {
      setPendingCount(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const pendingInspections = await truckInspectionService.getPendingIssues();
      setPendingCount(pendingInspections.length);
    } catch (err: any) {
      console.error('Error fetching pending inspections:', err);
      setError(err.message || 'Error al obtener inspecciones pendientes');
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPendingInspections();

      // Actualizar cada 30 segundos si la pestaña está visible
      const intervalId = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchPendingInspections();
        }
      }, 30000); // 30 segundos

      return () => clearInterval(intervalId);
    }
  }, [user, canViewPendingInspections]);

  // Actualizar cuando la pestaña se vuelve visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && canViewPendingInspections) {
        fetchPendingInspections();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [canViewPendingInspections]);

  return {
    pendingCount,
    loading,
    error,
    refetch: fetchPendingInspections,
  };
};