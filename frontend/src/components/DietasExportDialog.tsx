import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  PictureAsPdf,
  Description,
  GetApp,
} from '@mui/icons-material';
import { DietaRecord } from '../types';
import { DietasPDFExporter } from '../services/dietasPDFExportCompact';
import { usersAPI } from '../services/api';

interface DietasExportDialogProps {
  open: boolean;
  onClose: () => void;
  dietas: DietaRecord[];
  monthYear?: string;
}

interface User {
  id: number;
  dni_nie: string;
  full_name: string;
}

export const DietasExportDialog: React.FC<DietasExportDialogProps> = ({
  open,
  onClose,
  dietas,
  monthYear = new Date().toISOString().slice(0, 7)
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exporter = new DietasPDFExporter();

  const handleExport = async () => {
    if (dietas.length === 0) {
      setError('No hay dietas seleccionadas para exportar');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Enriquecer las dietas con información de DNI/NIE de los usuarios
      const enrichedDietas = await enrichDietasWithUserData(dietas);

      // Solo exportación continua (compatible con subida masiva)
      await exporter.exportContinuousPDF(enrichedDietas, monthYear);

      // Cerrar el diálogo después de una exportación exitosa
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (err) {
      console.error('Error exportando PDF:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido al exportar');
    } finally {
      setLoading(false);
    }
  };

  const enrichDietasWithUserData = async (dietasList: DietaRecord[]): Promise<DietaRecord[]> => {
    try {
      // Obtener todos los usuarios únicos de las dietas
      const uniqueUserIds = [...new Set(dietasList.map(d => d.user_id))];
      
      // Crear un mapa de usuarios con su DNI/NIE
      const usersMap = new Map<number, User>();
      
      // En una implementación real, deberías hacer una sola llamada para obtener todos los usuarios
      // Por ahora, haremos llamadas individuales (esto debería optimizarse)
      for (const userId of uniqueUserIds) {
        try {
          const userData = await usersAPI.getUserById(userId);
          if (userData && userData.dni_nie) {
            usersMap.set(userId, {
              id: userData.id,
              dni_nie: userData.dni_nie,
              full_name: userData.full_name || `${userData.first_name} ${userData.last_name}`.trim()
            });
          }
        } catch (error) {
          console.warn(`No se pudo obtener datos del usuario ${userId}:`, error);
        }
      }

      // Enriquecer las dietas con los datos de usuario
      return dietasList.map(dieta => {
        const userData = usersMap.get(dieta.user_id);
        return {
          ...dieta,
          user_dni_nie: userData?.dni_nie || `USER_${dieta.user_id}`,
          user_name: dieta.user_name || userData?.full_name || `Usuario ${dieta.user_id}`
        } as DietaRecord & { user_dni_nie: string };
      });
      
    } catch (error) {
      console.warn('Error enriqueciendo datos de usuario:', error);
      // Devolver las dietas originales con placeholders
      return dietasList.map(dieta => ({
        ...dieta,
        user_dni_nie: `USER_${dieta.user_id}`,
      } as DietaRecord & { user_dni_nie: string }));
    }
  };

  const formatMonthYear = (dateString: string): string => {
    try {
      const [year, month] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PictureAsPdf sx={{ color: '#d32f2f' }} />
          <Typography variant="h6" component="div">
            Exportar Dietas a PDF
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Se exportarán <strong>{dietas.length}</strong> dietas del período{' '}
              <strong>{formatMonthYear(monthYear)}</strong>
            </Typography>
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Description color="primary" />
              Exportar PDF Profesional
            </Typography>
            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="body2">
                <strong>PDF Compatible:</strong> Este PDF está diseñado para ser compatible con la funcionalidad 
                de "Subida Masiva de Dietas". Cada trabajador aparece en página nueva con su DNI/NIE 
                claramente visible para procesamiento automático.
              </Typography>
            </Alert>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Contenido del PDF:
        </Typography>
        <List dense>
          <ListItem sx={{ py: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Box sx={{ width: 6, height: 6, bgcolor: 'primary.main', borderRadius: '50%' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Logo de SGT"
              secondary="Incluye el logotipo corporativo"
            />
          </ListItem>
          <ListItem sx={{ py: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Box sx={{ width: 6, height: 6, bgcolor: 'primary.main', borderRadius: '50%' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Datos del trabajador"
              secondary="DNI/NIE, nombre y tipo de trabajador"
            />
          </ListItem>
          <ListItem sx={{ py: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Box sx={{ width: 6, height: 6, bgcolor: 'primary.main', borderRadius: '50%' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Desglose de conceptos"
              secondary="Detalle completo de todos los conceptos de dieta"
            />
          </ListItem>
          <ListItem sx={{ py: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Box sx={{ width: 6, height: 6, bgcolor: 'primary.main', borderRadius: '50%' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Información del viaje"
              secondary="Fechas, número de orden/albarán y observaciones"
            />
          </ListItem>
        </List>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <GetApp />}
          onClick={handleExport}
          disabled={loading || dietas.length === 0}
          sx={{ minWidth: 140 }}
        >
          {loading ? 'Exportando...' : 'Exportar PDF'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};