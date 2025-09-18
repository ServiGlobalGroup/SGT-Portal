import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { 
  PictureAsPdf, 
  Upload, 
  Assignment,
  CheckCircle,
  Error as ErrorIcon,
  Warning as WarningIcon,
  GetApp,
  CloudUpload,
} from '@mui/icons-material';
import { DietaRecord } from '../types';
import { DietasPDFExporter } from '../services/dietasPDFExportCompact';
import { useAuth } from '../hooks/useAuth';
import { hasPermission, Permission } from '../utils/permissions';
import { payrollAPI, usersAPI } from '../services/api';

interface DietasExportDialogProps {
  open: boolean;
  onClose: () => void;
  dietas: DietaRecord[];
  monthYear?: string;
}

interface ProcessingResult {
  success: boolean;
  message: string;
  filename: string;
  month_year: string;
  document_type?: string;
  stats: {
    total_pages: number;
    successful: number;
    failed: number;
    success_rate: number;
  };
  details: any[];
  errors: string[];
  summary: string;
  results: {
    processed_pages: number;
    successful_assignments: number;
    failed_assignments: number;
    total_pages: number;
    assignment_details: Array<{
      page_number: number;
      dni_nie_found: string;
      user_folder_exists: boolean;
      pdf_saved: boolean;
      saved_path: string | null;
      success: boolean;
      error_message: string | null;
    }>;
    errors: string[];
  };
  processed_at: string;
  warning?: string;
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoUpload, setAutoUpload] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMonth, setUploadMonth] = useState('');
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear().toString());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<ProcessingResult | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);

  const exporter = new DietasPDFExporter();

  // Calcular estadísticas de trabajadores únicos
  const uniqueWorkers = React.useMemo(() => {
    const uniqueUserIds = new Set(dietas.map(d => d.user_id));
    return Array.from(uniqueUserIds).length;
  }, [dietas]);

  const months = [
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];

  // Resetear estados al abrir el modal
  useEffect(() => {
    if (open) {
      setAutoUpload(false);
      setShowUploadModal(false);
      setIsUploading(false);
      setUploadResults(null);
      setShowResultsModal(false);
      setError(null);
      setLoading(false);
    }
  }, [open]);

  const formatMonthYear = (dateString: string): string => {
    try {
      const [year, month] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
    } catch {
      return dateString;
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

  const handleExport = async () => {
    if (dietas.length === 0) {
      setError('No hay dietas seleccionadas para exportar');
      return;
    }

    if (autoUpload) {
      setShowUploadModal(true);
    } else {
      // Exportar normalmente
      await performExport();
    }
  };

  const performExport = async () => {
    setLoading(true);
    setError(null);

    try {
      // Enriquecer las dietas con información de DNI/NIE de los usuarios
      const enrichedDietas = await enrichDietasWithUserData(dietas);

      // Exportar PDF
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

  const handleUploadConfirm = async () => {
    if (!uploadMonth || !uploadYear) {
      setError('Por favor, selecciona el mes y año para la subida');
      return;
    }

    setIsUploading(true);
    setShowUploadModal(false);
    setError(null);

    try {
      // Enriquecer las dietas con información de DNI/NIE
      const enrichedDietas = await enrichDietasWithUserData(dietas);

      // Generar PDF en memoria (sin descargarlo)
      const pdfBlob = await generatePdfBlob(enrichedDietas);

      // Crear archivo File del blob
      const fileName = `dietas_registro_${monthYear}_${new Date().toISOString().slice(0, 10)}.pdf`;
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Procesar el archivo con la API de subida masiva
      const monthYearForUpload = `${uploadMonth}_${uploadYear}`;
      const result = await payrollAPI.processDietasPDF(pdfFile, monthYearForUpload);

      setUploadResults(result);
      setShowResultsModal(true);
      setIsUploading(false);

    } catch (err) {
      console.error('Error en la subida masiva:', err);
      setError('Error durante la subida masiva del PDF');
      setIsUploading(false);
    }
  };

  const generatePdfBlob = async (enrichedDietas: DietaRecord[]): Promise<Blob> => {
    // Usar la misma instancia del exporter para consistencia
    const pdfBuffer = await exporter.exportContinuousPDFAsBlob(enrichedDietas, monthYear);
    return pdfBuffer;
  };

  const handleCloseAll = () => {
    setShowUploadModal(false);
    setShowResultsModal(false);
    setIsUploading(false);
    onClose();
  };

  const canUpload = user && hasPermission(user, Permission.MASS_UPLOAD);

  return (
    <>
      {/* Modal principal de exportación */}
      <Dialog
        open={open && !showUploadModal && !showResultsModal && !isUploading}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 55%, #d4a574 100%)',
          color: 'white',
          p: 4,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width=\\"60\\" height=\\"60\\" viewBox=\\"0 0 60 60\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cg fill=\\"none\\" fill-rule=\\"evenodd\\"%3E%3Cg fill=\\"%23ffffff\\" fill-opacity=\\"0.05\\"%3E%3Cpath d=\\"m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            opacity: 0.1,
          },
        }}>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 2,
                  backdropFilter: 'blur(10px)',
                }}
              >
                <PictureAsPdf sx={{ fontSize: 24 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Exportar Dietas a PDF
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Formato profesional optimizado
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
            <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
              <Typography variant="body1">
                Se exportarán <strong>{dietas.length}</strong> dietas del período{' '}
                <strong>{formatMonthYear(monthYear)}</strong> de{' '}
                <strong>{uniqueWorkers}</strong> {uniqueWorkers === 1 ? 'trabajador' : 'trabajadores'}
              </Typography>
            </Alert>

            <Box sx={{ 
              p: 2, 
              bgcolor: 'rgba(76, 175, 80, 0.08)', 
              borderRadius: 2, 
              border: '1px solid rgba(76, 175, 80, 0.2)',
              mb: 3
            }}>
              <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                ✓ Formato compatible con sistema de reconocimiento automático
                <br />
                ✓ Encabezados con logos corporativos y datos completos
                <br />
                ✓ Separación por trabajador en páginas individuales
              </Typography>
            </Box>

            {/* Opción de subida automática */}
            {canUpload && (
              <Box sx={{ 
                p: 2, 
                bgcolor: 'rgba(33, 150, 243, 0.05)', 
                borderRadius: 2, 
                border: '1px solid rgba(33, 150, 243, 0.2)'
              }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={autoUpload}
                      onChange={(e) => setAutoUpload(e.target.checked)}
                      sx={{
                        color: '#2196f3',
                        '&.Mui-checked': {
                          color: '#2196f3',
                        },
                      }}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CloudUpload fontSize="small" color="primary" />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                          Hacer subida masiva automáticamente
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Procesará automáticamente el PDF para asignar dietas a trabajadores
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

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
                  primary="Logo de SGT y EMATRA (si aplica)"
                  secondary="Incluye los logotipos corporativos según el perfil"
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
                  primary="Paginación y footer"
                  secondary="Numeración automática y footer corporativo"
                />
              </ListItem>
            </List>
        </DialogContent>

        <DialogActions sx={{ 
          p: 3, 
          bgcolor: '#f8f9fa',
          borderTop: '1px solid #e0e0e0'
        }}>
          <Button 
            onClick={onClose}
            disabled={loading}
            sx={{ 
              borderRadius: 2,
              px: 3,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleExport}
            variant="contained"
            disabled={loading || dietas.length === 0}
            startIcon={loading ? <CircularProgress size={20} /> : (autoUpload ? <Upload /> : <GetApp />)}
            sx={{
              borderRadius: 2,
              px: 4,
              textTransform: 'none',
              fontWeight: 600,
              backgroundColor: autoUpload ? '#2196f3' : '#501b36',
              '&:hover': {
                backgroundColor: autoUpload ? '#1976d2' : '#3d1429',
              },
            }}
          >
            {loading ? 'Exportando...' : (autoUpload ? 'Exportar y Subir' : 'Exportar PDF')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de configuración de subida */}
      <Dialog
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 30%, #1565c0 70%, #0d47a1 100%)',
          color: 'white',
          p: 4,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width=\\"60\\" height=\\"60\\" viewBox=\\"0 0 60 60\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cg fill=\\"none\\" fill-rule=\\"evenodd\\"%3E%3Cg fill=\\"%23ffffff\\" fill-opacity=\\"0.08\\"%3E%3Cpath d=\\"m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            opacity: 0.1,
          },
        }}>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 2,
                  backdropFilter: 'blur(10px)',
                }}
              >
                <Upload sx={{ fontSize: 24 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Subida Masiva Automática
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Configura el período para procesar las dietas
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {/* Información destacada */}
          <Box sx={{ p: 4, bgcolor: '#e3f2fd', borderBottom: '1px solid rgba(33, 150, 243, 0.1)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: 'rgba(33, 150, 243, 0.1)',
                  borderRadius: 2,
                }}
              >
                <Assignment sx={{ color: '#2196f3', fontSize: 24 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1565c0' }}>
                Procesamiento Automático
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              El PDF se generará y procesará automáticamente. Las dietas se asignarán 
              a los trabajadores correspondientes según el período seleccionado.
            </Typography>
          </Box>

          {/* Selección de fecha */}
          <Box sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: '#1565c0' }}>
              Seleccionar Período de Procesamiento
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Mes</InputLabel>
                <Select
                  value={uploadMonth}
                  label="Mes"
                  onChange={(e) => setUploadMonth(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  {months.map((month) => (
                    <MenuItem key={month.value} value={month.value}>
                      {month.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Año</InputLabel>
                <Select
                  value={uploadYear}
                  label="Año"
                  onChange={(e) => setUploadYear(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return (
                      <MenuItem key={year} value={year.toString()}>
                        {year}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Box>

            {/* Preview del período seleccionado */}
            {uploadMonth && uploadYear && (
              <Box sx={{ 
                p: 3, 
                bgcolor: 'rgba(76, 175, 80, 0.08)', 
                borderRadius: 2, 
                border: '2px solid rgba(76, 175, 80, 0.2)',
                mb: 3,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CheckCircle sx={{ color: '#4caf50', fontSize: 24 }} />
                  <Box>
                    <Typography variant="body1" sx={{ color: '#2e7d32', fontWeight: 700, mb: 0.5 }}>
                      Período seleccionado: {months.find(m => m.value === uploadMonth)?.label} {uploadYear}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#388e3c', fontWeight: 500 }}>
                      Las dietas se procesarán para este período específico
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Advertencia importante */}
            <Box sx={{ 
              p: 3, 
              bgcolor: 'rgba(255, 152, 0, 0.1)',
              borderRadius: 2, 
              border: '2px solid rgba(255, 152, 0, 0.2)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <WarningIcon sx={{ color: '#f57c00', fontSize: 24, mt: 0.5 }} />
                <Box>
                  <Typography variant="body1" sx={{ color: '#f57c00', fontWeight: 700, mb: 0.5 }}>
                    Importante a considerar
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ef6c00' }}>
                    • El procesamiento puede tardar varios minutos dependiendo del número de dietas
                    <br />
                    • Se crearán carpetas y archivos para cada trabajador identificado
                    <br />
                    • Los resultados se mostrarán al finalizar el procesamiento
                  </Typography>
                </Box>
              </Box>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ 
          p: 3, 
          bgcolor: '#f8f9fa',
          borderTop: '1px solid #e0e0e0',
          gap: 2,
        }}>
          <Button 
            onClick={() => setShowUploadModal(false)}
            sx={{ 
              borderRadius: 2,
              px: 4,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleUploadConfirm}
            variant="contained"
            disabled={!uploadMonth || !uploadYear}
            startIcon={<Upload />}
            sx={{
              borderRadius: 2,
              px: 5,
              textTransform: 'none',
              fontWeight: 600,
              backgroundColor: uploadMonth && uploadYear ? '#2196f3' : '#ccc',
              '&:hover': {
                backgroundColor: uploadMonth && uploadYear ? '#1976d2' : '#ccc',
              },
              '&:disabled': {
                color: 'rgba(255,255,255,0.6)',
              },
            }}
          >
            Procesar Dietas Automáticamente
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de progreso */}
      <Dialog
        open={isUploading}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }
        }}
      >
        <DialogContent sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ color: '#667eea', mb: 3 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Procesando Dietas
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
            Generando PDF profesional y procesando automáticamente las dietas 
            para asignarlas a los trabajadores correspondientes...
          </Typography>
          <LinearProgress sx={{ borderRadius: 2, height: 8, mb: 2 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            Este proceso puede tomar unos minutos...
          </Typography>
        </DialogContent>
      </Dialog>

      {/* Modal de resultados */}
      <Dialog
        open={showResultsModal}
        onClose={handleCloseAll}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }
        }}
      >
        <DialogTitle sx={{
          backgroundColor: uploadResults?.success ? '#4caf50' : '#f44336',
          color: 'white',
          py: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}>
          {uploadResults?.success ? <CheckCircle sx={{ fontSize: 28 }} /> : <ErrorIcon sx={{ fontSize: 28 }} />}
          <Box>
            <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
              {uploadResults?.success ? 'Procesamiento Completado' : 'Procesamiento con Errores'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {uploadResults?.stats?.successful || 0} de {uploadResults?.stats?.total_pages || 0} documentos procesados
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {uploadResults && (
            <Box>
              {/* Resumen */}
              <Box sx={{ p: 3, bgcolor: '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Resumen de Procesamiento
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#4caf50' }}>
                      {uploadResults.stats?.successful || 0}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Exitosos
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#f44336' }}>
                      {uploadResults.stats?.failed || 0}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Fallidos
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196f3' }}>
                      {uploadResults.stats?.total_pages || 0}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Total
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Detalles */}
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Detalles por Documento
                </Typography>
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {uploadResults.results?.assignment_details?.map((detail, index) => (
                    <ListItem
                      key={index}
                      sx={{
                        bgcolor: detail.success ? alpha('#4caf50', 0.05) : alpha('#f44336', 0.05),
                        borderRadius: 2,
                        mb: 1,
                        border: `1px solid ${detail.success ? alpha('#4caf50', 0.2) : alpha('#f44336', 0.2)}`,
                      }}
                    >
                      <ListItemIcon>
                        {detail.success ? (
                          <CheckCircle sx={{ color: '#4caf50' }} />
                        ) : (
                          <ErrorIcon sx={{ color: '#f44336' }} />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={`Página ${detail.page_number} - ${detail.dni_nie_found}`}
                        secondary={detail.error_message || `Guardado en: ${detail.saved_path}`}
                        primaryTypographyProps={{ fontWeight: 600 }}
                        secondaryTypographyProps={{ 
                          color: detail.success ? '#4caf50' : '#f44336',
                          fontWeight: 500 
                        }}
                      />
                    </ListItem>
                  )) || []}
                </List>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          p: 3, 
          bgcolor: '#f8f9fa',
          borderTop: '1px solid #e0e0e0',
        }}>
          <Button 
            onClick={handleCloseAll}
            variant="contained"
            sx={{
              borderRadius: 2,
              px: 4,
              textTransform: 'none',
              fontWeight: 600,
              backgroundColor: '#2196f3',
              '&:hover': {
                backgroundColor: '#1976d2',
              },
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};