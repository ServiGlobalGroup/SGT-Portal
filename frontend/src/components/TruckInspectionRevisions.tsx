import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
  Alert,
  Fade,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Checkbox,
  Autocomplete,
  Pagination,
  Collapse,
  Snackbar,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  FactCheck,
  Visibility,
  Close,
  LocalShipping,
  AccessTime,
  Person,
  ErrorOutline,
  CheckCircleOutline,
  History,
  FilterList,
  Search,
  RateReview,
  Done,
  Warning,
  Info,
  Add,
  Delete,
  Autorenew,
  Schedule,
  NoteAdd,
} from '@mui/icons-material';

import { truckInspectionService } from '../services/truckInspectionService';
import { usersAPI } from '../services/api';
import {
  MarkInspectionReviewedResponse,
  TruckInspectionSummary,
  TruckInspectionResponse,
  TruckInspectionRequestCreate,
  DirectInspectionOrderSummary,
} from '../types/truck-inspection';
import { useAuth } from '../hooks/useAuth';
import { useAutoInspectionSettings } from '../hooks/useAutoInspectionSettings';

// Tipo unificado para el historial (inspecciones y órdenes directas)
type HistoryItem = (TruckInspectionSummary | DirectInspectionOrderSummary) & {
  item_type: 'inspection' | 'direct_order';
};

const extractReviewNoteParts = (note?: string | null) => {
  if (!note) {
    return {
      baseNote: '',
      metadata: ''
    };
  }

  const metadataRegex = /\s*\[Revisado por:.*\]$/s;
  const metadataIndex = note.search(metadataRegex);

  if (metadataIndex !== -1) {
    const metadata = note.slice(metadataIndex).trim();
    const baseNote = note.slice(0, metadataIndex).trim();
    return { baseNote, metadata };
  }

  return {
    baseNote: note.trim(),
    metadata: ''
  };
};

type UserOptionSource = {
  id?: number;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
};

type UserOption = {
  id: number;
  label: string;
};


interface InspectionDetailModalProps {
  open: boolean;
  inspection: TruckInspectionSummary | null;
  onClose: () => void;
  onMarkReviewed: (inspectionId: number, notes: string) => Promise<MarkInspectionReviewedResponse>;
}

const InspectionDetailModal: React.FC<InspectionDetailModalProps> = ({ open, inspection, onClose, onMarkReviewed }) => {
  // Estado del modal
  const [detailData, setDetailData] = useState<TruckInspectionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [markingReviewed, setMarkingReviewed] = useState(false);
  
  // Estado para el previsualizador de imágenes
  const [imagePreview, setImagePreview] = useState<{
    open: boolean;
    url: string;
    title: string;
  }>({
    open: false,
    url: '',
    title: '',
  });

  // Estado para notificaciones
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorSnackbar, setErrorSnackbar] = useState<{
    open: boolean;
    message: string;
  }>({
    open: false,
    message: ''
  });
  
  // Obtener datos del usuario autenticado
  const { user } = useAuth();

  useEffect(() => {
    if (open && inspection) {
      loadInspectionDetail();
    }
  }, [open, inspection]);

  useEffect(() => {
    if (!open) {
      setReviewNotes('');
      return;
    }

    if (detailData?.is_reviewed) {
      const { baseNote } = extractReviewNoteParts(detailData.revision_notes);
      setReviewNotes(baseNote);
    } else if (detailData?.revision_notes) {
      setReviewNotes(detailData.revision_notes);
    } else {
      setReviewNotes('');
    }
  }, [open, detailData?.is_reviewed, detailData?.revision_notes, inspection?.id]);

  const handleMarkReviewed = async () => {
    if (!inspection || !user) return;

    try {
      setMarkingReviewed(true);

      const now = new Date();
      const formattedDate = now.toLocaleString('es-ES');
      const reviewerName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
        || user.full_name
        || user.email
        || 'Equipo de Taller';

      const trimmedNotes = reviewNotes.trim();
      const finalNotes = trimmedNotes
        ? `${trimmedNotes}\n\n[Revisado por: ${reviewerName} el ${formattedDate}]`
        : `[Revisado por: ${reviewerName} el ${formattedDate}]`;

      const result = await onMarkReviewed(inspection.id, finalNotes);

      setDetailData((prev) => prev ? {
        ...prev,
        is_reviewed: true,
        revision_notes: finalNotes,
        reviewer_name: reviewerName,
        reviewed_by: typeof user.id === 'number' ? user.id : prev.reviewed_by,
        reviewed_at: result?.reviewed_at ?? now.toISOString(),
      } : prev);

  setReviewNotes(trimmedNotes);
      setShowSuccess(true);

      setTimeout(() => {
        onClose();
        setShowSuccess(false);
      }, 2000);
    } catch (error: any) {
      console.error('Error marking inspection as reviewed:', error);
      setErrorSnackbar({
        open: true,
        message: error?.message || 'No se pudo marcar la inspección como revisada',
      });
    } finally {
      setMarkingReviewed(false);
    }
  };

  const handleImagePreviewWithAuth = async (imagePath: string, title: string) => {
    try {
      const blobUrl = await truckInspectionService.getImageWithAuth(imagePath);
      setImagePreview({
        open: true,
        url: blobUrl,
        title: title,
      });
    } catch (error) {
      console.error('Error loading image:', error);
      setErrorSnackbar({
        open: true,
        message: 'Error al cargar la imagen'
      });
    }
  };

  const handleCloseImagePreview = () => {
    // Limpiar la URL del blob para evitar memory leaks
    if (imagePreview.url && imagePreview.url.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview.url);
    }
    setImagePreview({
      open: false,
      url: '',
      title: '',
    });
  };

  const loadInspectionDetail = async () => {
    if (!inspection) return;
    
    try {
      setLoading(true);
      const detail = await truckInspectionService.getInspectionDetail(inspection.id);
      setDetailData(detail);
    } catch (error) {
      console.error('Error loading inspection detail:', error);
    } finally {
      setLoading(false);
    }
  };



  if (!inspection) return null;

  const reviewerDisplayName = detailData?.reviewer_name
    || (detailData?.reviewed_by !== undefined && detailData?.reviewed_by !== null
      ? (typeof detailData.reviewed_by === 'number'
        ? `ID ${detailData.reviewed_by}`
        : String(detailData.reviewed_by))
      : null);

  const reviewNoteParts = extractReviewNoteParts(detailData?.revision_notes);

  const dialogTitleId = `inspection-detail-dialog-title-${inspection.id}`;

  const requiresManualReview = (detailData?.has_issues ?? inspection.has_issues) === true;
  const isAlreadyReviewed = Boolean(detailData?.is_reviewed ?? inspection.is_reviewed);
  const showReviewForm = requiresManualReview && !isAlreadyReviewed;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth aria-labelledby={dialogTitleId}>
      <Box
        component="header"
        id={dialogTitleId}
        sx={{
          px: 3,
          py: 2.5,
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LocalShipping sx={{ color: '#501b36' }} />
            <Box>
              <Typography component="h2" variant="h6" sx={{ color: '#501b36', fontWeight: 600 }}>
                Inspección de Camión
              </Typography>
              <Typography component="p" variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {inspection.truck_license_plate} • {inspection.user_name}
              </Typography>
            </Box>
          </Box>
          <IconButton 
            onClick={onClose} 
            size="small"
            sx={{
              color: 'rgba(80, 27, 54, 0.7)',
              backgroundColor: 'rgba(80, 27, 54, 0.1)',
              borderRadius: 2,
              transition: 'all 0.2s ease',
              '&:hover': {
                color: '#fff',
                backgroundColor: '#501b36',
                transform: 'scale(1.1) rotate(90deg)',
                boxShadow: '0 4px 12px rgba(80, 27, 54, 0.3)',
              }
            }}
          >
            <Close />
          </IconButton>
        </Box>
      </Box>
      
      <DialogContent sx={{ mt: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : detailData ? (
          <Stack spacing={3}>
            {!requiresManualReview && (
              <Alert
                severity="success"
                icon={<CheckCircleOutline sx={{ fontSize: 20 }} />}
                sx={{ borderRadius: 2, alignItems: 'flex-start' }}
              >
                Esta inspección no registró problemas y se ha archivado automáticamente en el historial. No requiere revisión manual por parte del taller.
              </Alert>
            )}
            {/* Información general */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Fecha de inspección
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {new Date(inspection.inspection_date).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Inspector
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {inspection.user_name}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Estado de componentes */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: '#501b36', fontWeight: 600 }}>
                Estado de Componentes
              </Typography>
              <Stack spacing={2}>
                {[
                  { 
                    key: 'tires', 
                    label: 'Neumáticos',
                    icon: '🚙',
                    status: detailData.tires_status, 
                    notes: detailData.tires_notes,
                    imagePath: detailData.tires_image_path
                  },
                  { 
                    key: 'brakes', 
                    label: 'Frenos',
                    icon: '🛑',
                    status: detailData.brakes_status, 
                    notes: detailData.brakes_notes,
                    imagePath: detailData.brakes_image_path
                  },
                  { 
                    key: 'lights', 
                    label: 'Luces',
                    icon: '💡',
                    status: detailData.lights_status, 
                    notes: detailData.lights_notes,
                    imagePath: detailData.lights_image_path
                  },
                  { 
                    key: 'fluids', 
                    label: 'Fluidos',
                    icon: '🛢️',
                    status: detailData.fluids_status, 
                    notes: detailData.fluids_notes,
                    imagePath: detailData.fluids_image_path
                  },
                  { 
                    key: 'documentation', 
                    label: 'Documentación',
                    icon: '📋',
                    status: detailData.documentation_status, 
                    notes: detailData.documentation_notes,
                    imagePath: detailData.documentation_image_path
                  },
                  { 
                    key: 'body', 
                    label: 'Carrocería',
                    icon: '🚛',
                    status: detailData.body_status, 
                    notes: detailData.body_notes,
                    imagePath: detailData.body_image_path
                  },
                ].map((component) => {
                  const hasContent = component.notes || component.imagePath;
                  
                  return (
                    <Paper 
                      key={component.key}
                      variant="outlined" 
                      sx={{ 
                        borderRadius: '12px',
                        backgroundColor: component.status ? '#f8fff9' : '#fff5f5',
                        border: `1px solid ${component.status ? '#c8e6c9' : '#ffcdd2'}`,
                        overflow: 'hidden'
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 2
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography sx={{ fontSize: 20 }}>{component.icon}</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {component.label}
                          </Typography>
                        </Box>
                        <Chip
                          icon={component.status ? <CheckCircleOutline /> : <ErrorOutline />}
                          label={component.status ? 'OK' : 'PROBLEMA'}
                          color={component.status ? 'success' : 'error'}
                          size="small"
                        />
                      </Box>
                      
                      {hasContent && (
                        <Collapse in={true}>
                          <Box sx={{ px: 2, pb: 2, borderTop: '1px solid #f1f3f4' }}>
                            {component.notes && (
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" sx={{ 
                                  backgroundColor: 'white', 
                                  p: 2, 
                                  borderRadius: '8px',
                                  border: '1px solid #e9ecef',
                                  fontStyle: 'italic'
                                }}>
                                  "{component.notes}"
                                </Typography>
                              </Box>
                            )}
                            
                            {component.imagePath && (
                              <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                  Imagen:
                                </Typography>
                                <Button
                                  variant="outlined"
                                  startIcon={<Visibility />}
                                  onClick={() => component.imagePath && handleImagePreviewWithAuth(
                                    component.imagePath, 
                                    `${component.label} - ${inspection?.truck_license_plate}`
                                  )}
                                  size="small"
                                  sx={{
                                    textTransform: 'none',
                                    borderColor: '#501b36',
                                    color: '#501b36',
                                    '&:hover': {
                                      backgroundColor: 'rgba(80, 27, 54, 0.08)',
                                      borderColor: '#501b36',
                                    }
                                  }}
                                >
                                  Ver imagen
                                </Button>
                              </Box>
                            )}
                          </Box>
                        </Collapse>
                      )}
                    </Paper>
                  );
                })}
              </Stack>
            </Box>

            {/* Notas generales */}
            {detailData.general_notes && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#501b36' }}>
                  Observaciones generales
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                  "{detailData.general_notes}"
                </Typography>
              </Paper>
            )}

            {/* Información de revisión */}
            {detailData.is_reviewed && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: alpha('#4caf50', 0.05), borderColor: alpha('#4caf50', 0.3) }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Done sx={{ color: '#4caf50', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#4caf50' }}>
                    Inspección Revisada
                  </Typography>
                </Box>
                
                {reviewerDisplayName && (
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Revisado por:</strong> {reviewerDisplayName}
                  </Typography>
                )}
                
                {detailData.reviewed_at && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Fecha de revisión:</strong> {new Date(detailData.reviewed_at).toLocaleString('es-ES')}
                  </Typography>
                )}
                
                {reviewNoteParts.baseNote && (
                  <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                    <strong>Nota registrada:</strong> "{reviewNoteParts.baseNote}"
                  </Typography>
                )}
              </Paper>
            )}
          </Stack>
        ) : (
          <Alert severity="error">Error cargando detalles de la inspección</Alert>
        )}
      </DialogContent>
      
      <DialogActions
        sx={{
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 3,
          p: 3,
          backgroundColor: alpha('#501b36', 0.02),
          borderTop: '1px solid rgba(80, 27, 54, 0.08)'
        }}
      >
        {showReviewForm && (
          <Box
            sx={{
              width: '100%',
              borderRadius: 3,
              p: { xs: 1.5, sm: 2 },
              background: 'linear-gradient(135deg, rgba(80,27,54,0.07) 0%, rgba(80,27,54,0.02) 100%)',
              border: `1px solid ${alpha('#501b36', 0.12)}`,
              boxShadow: '0 8px 16px rgba(80, 27, 54, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.25
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <RateReview sx={{ color: '#501b36' }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#501b36', lineHeight: 1.2 }}>
                  Notas de revisión
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11.5 }}>
                  Se añadirá automáticamente tu nombre y la fecha al confirmar.
                </Typography>
              </Box>
              <Box sx={{ flexGrow: 1 }} />
            </Stack>

            <TextField
              fullWidth
              multiline
              minRows={2}
              maxRows={4}
              placeholder="Describe brevemente las comprobaciones o acciones realizadas."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  alignItems: 'flex-start',
                  backgroundColor: '#fff',
                  boxShadow: 'inset 0 0 0 1px rgba(80, 27, 54, 0.1)',
                  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                  '& fieldset': { border: 'none' },
                  '&:hover': {
                    boxShadow: 'inset 0 0 0 1px rgba(80, 27, 54, 0.2)',
                    transform: 'translateY(-1px)',
                  },
                  '&.Mui-focused': {
                    boxShadow: 'inset 0 0 0 2px rgba(80, 27, 54, 0.3)',
                  },
                },
                '& .MuiOutlinedInput-input': {
                  fontSize: 13.5,
                  lineHeight: 1.45,
                  padding: '8px 12px',
                },
              }}
            />

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: 11.5, lineHeight: 1.4, pt: 0.25 }}
            >
              Consejo: resume acciones, repuestos y seguimientos pendientes. El comentario se registra con la inspección.
            </Typography>
          </Box>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end">
          <Button 
            onClick={onClose} 
            variant="outlined"
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              borderColor: '#501b36',
              color: '#501b36',
              '&:hover': {
                borderColor: '#3d1429',
                backgroundColor: alpha('#501b36', 0.06),
              }
            }}
          >
            Cerrar
          </Button>
          
          {showReviewForm && (
            <Button 
              onClick={handleMarkReviewed}
              variant="contained"
              disabled={markingReviewed || showSuccess}
              startIcon={
                showSuccess ? <Done /> : 
                markingReviewed ? <CircularProgress size={16} /> : 
                <CheckCircleOutline />
              }
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                minWidth: 200,
                background: showSuccess 
                  ? 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)'
                  : markingReviewed 
                  ? 'linear-gradient(135deg, #ff9800 0%, #ffa726 100%)'
                  : 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                boxShadow: showSuccess || markingReviewed 
                  ? '0 6px 16px rgba(76, 175, 80, 0.35)' 
                  : '0 4px 12px rgba(76, 175, 80, 0.28)',
                '&:hover': {
                  background: showSuccess 
                    ? 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)'
                    : 'linear-gradient(135deg, #388e3c 0%, #4caf50 100%)',
                  boxShadow: showSuccess 
                    ? '0 6px 16px rgba(76, 175, 80, 0.35)' 
                    : '0 8px 20px rgba(76, 175, 80, 0.45)',
                  transform: showSuccess ? 'none' : 'translateY(-1px)',
                },
                '&:disabled': {
                  color: '#fff',
                  opacity: 0.85,
                }
              }}
            >
              {showSuccess ? '¡Revisada!' : 
               markingReviewed ? 'Marcando...' : 
               'Marcar como Revisada'}
            </Button>
          )}
        </Stack>
      </DialogActions>

      {/* Modal de previsualización de imágenes */}
      <ImagePreviewModal
        open={imagePreview.open}
        onClose={handleCloseImagePreview}
        imageUrl={imagePreview.url}
        title={imagePreview.title}
      />

      {/* Notificación de éxito */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity="success" 
          variant="filled"
          sx={{ 
            borderRadius: 2,
            '& .MuiAlert-icon': {
              fontSize: '1.2rem',
            }
          }}
        >
          ¡Inspección marcada como revisada correctamente!
        </Alert>
      </Snackbar>

      {/* Snackbar para errores */}
      <Snackbar
        open={errorSnackbar.open}
        autoHideDuration={4000}
        onClose={() => setErrorSnackbar({ open: false, message: '' })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity="error" 
          variant="filled"
          sx={{ 
            borderRadius: 2,
            '& .MuiAlert-icon': {
              fontSize: '1.2rem',
            }
          }}
        >
          {errorSnackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

// Modal para detalle de orden directa
interface DirectOrderDetailModalProps {
  open: boolean;
  order: DirectInspectionOrderSummary | null;
  onClose: () => void;
  onRefresh: () => void;
}

const DirectOrderDetailModal: React.FC<DirectOrderDetailModalProps> = ({ open, order, onClose, onRefresh }) => {
  const [detailData, setDetailData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [markingReviewed, setMarkingReviewed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorSnackbar, setErrorSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: ''
  });

  const { user } = useAuth();

  useEffect(() => {
    if (open && order) {
      loadOrderDetail();
    }
  }, [open, order]);

  useEffect(() => {
    if (!open) {
      setReviewNotes('');
    }
  }, [open]);

  const loadOrderDetail = async () => {
    if (!order) return;
    
    try {
      setLoading(true);
      const detail = await truckInspectionService.getDirectInspectionOrderDetail(order.id);
      setDetailData(detail);
    } catch (error) {
      console.error('Error loading order detail:', error);
      setErrorSnackbar({
        open: true,
        message: 'Error al cargar el detalle de la orden'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReviewed = async () => {
    if (!order || !user) return;

    try {
      setMarkingReviewed(true);

      await truckInspectionService.markDirectOrderReviewed(order.id, reviewNotes.trim() || undefined);

      setShowSuccess(true);

      setTimeout(() => {
        onClose();
        setShowSuccess(false);
        onRefresh(); // Recargar la lista de órdenes
      }, 2000);
    } catch (error: any) {
      console.error('Error marking order as reviewed:', error);
      setErrorSnackbar({
        open: true,
        message: error?.message || 'No se pudo marcar la orden como revisada',
      });
    } finally {
      setMarkingReviewed(false);
    }
  };

  const isAlreadyReviewed = Boolean(detailData?.is_reviewed);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
        }
      }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #501b36 0%, #6d2547 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 2.5,
          px: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FactCheck sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Orden Directa de Inspección
            </Typography>
            {order && (
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {order.truck_license_plate} - {order.vehicle_kind === 'TRACTORA' ? 'Tractora' : 'Semiremolque'}
              </Typography>
            )}
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: 'white',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#501b36' }} />
          </Box>
        ) : detailData ? (
          <Stack spacing={3} sx={{ mt: 2 }}>
            {/* Estado de revisión */}
            {isAlreadyReviewed && (
              <Alert severity="success" icon={<CheckCircleOutline />} sx={{ borderRadius: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Orden revisada
                </Typography>
                {detailData.reviewed_by && (
                  <Typography variant="caption" sx={{ display: 'block' }}>
                    Por {detailData.reviewed_by} el {new Date(detailData.reviewed_at).toLocaleString('es-ES')}
                  </Typography>
                )}
                {detailData.revision_notes && (
                  <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                    "{detailData.revision_notes}"
                  </Typography>
                )}
              </Alert>
            )}

            {/* Información general */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#501b36', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Info fontSize="small" />
                Información General
              </Typography>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <LocalShipping sx={{ color: '#666', fontSize: 20 }} />
                  <Typography variant="body2">
                    <strong>Matrícula:</strong> {detailData.truck_license_plate}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Person sx={{ color: '#666', fontSize: 20 }} />
                  <Typography variant="body2">
                    <strong>Creado por:</strong> {detailData.created_by}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <AccessTime sx={{ color: '#666', fontSize: 20 }} />
                  <Typography variant="body2">
                    <strong>Fecha:</strong> {new Date(detailData.created_at).toLocaleString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* Módulos */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#501b36', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ErrorOutline fontSize="small" />
                Módulos de Inspección ({detailData.modules?.length || 0})
              </Typography>
              
              {detailData.modules && detailData.modules.length > 0 ? (
                <Stack spacing={2}>
                  {detailData.modules.map((module: any, index: number) => (
                    <Paper
                      key={module.id}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        borderLeft: '4px solid #501b36',
                        bgcolor: alpha('#501b36', 0.02),
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#501b36', mb: module.notes ? 1 : 0 }}>
                        {index + 1}. {module.title}
                      </Typography>
                      {module.notes && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', pl: 2 }}>
                          {module.notes}
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                  No hay módulos registrados
                </Typography>
              )}
            </Box>

            {/* Formulario de revisión */}
            {!isAlreadyReviewed && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: alpha('#ffa726', 0.05), borderColor: '#ffa726' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#f57c00', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <RateReview fontSize="small" />
                  Marcar como Revisada
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Notas de revisión (opcional)..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  variant="outlined"
                  size="small"
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  onClick={handleMarkReviewed}
                  disabled={markingReviewed}
                  startIcon={markingReviewed ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <Done />}
                  sx={{
                    bgcolor: '#4caf50',
                    '&:hover': {
                      bgcolor: '#45a049',
                    },
                  }}
                >
                  {markingReviewed ? 'Marcando...' : 'Marcar como Revisada'}
                </Button>
              </Paper>
            )}
          </Stack>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: '#501b36' }}>
          Cerrar
        </Button>
      </DialogActions>

      {/* Snackbar de éxito */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={2000}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity="success" 
          variant="filled"
          icon={<CheckCircleOutline />}
          sx={{ borderRadius: 2 }}
        >
          ¡Orden marcada como revisada exitosamente!
        </Alert>
      </Snackbar>

      {/* Snackbar de error */}
      <Snackbar
        open={errorSnackbar.open}
        autoHideDuration={4000}
        onClose={() => setErrorSnackbar({ open: false, message: '' })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity="error" 
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {errorSnackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

interface InspectionActionsProps {
  canManageAutoSettings: boolean;
  autoSettingsEnabled?: boolean;
  autoLoading: boolean;
  onToggleAuto: () => void;
  canCreateDirectOrder: boolean;
  onCreateDirectOrder: () => void;
  canSendManualRequests: boolean;
  onOpenManualModal: () => void;
}

const InspectionActions: React.FC<InspectionActionsProps> = ({
  canManageAutoSettings,
  autoSettingsEnabled,
  autoLoading,
  onToggleAuto,
  canCreateDirectOrder,
  onCreateDirectOrder,
  canSendManualRequests,
  onOpenManualModal,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Icon styles (redondos y algo más grandes)
  const iconBtnBase = {
    width: isMobile ? 42 : isTablet ? 44 : 48,
    height: isMobile ? 42 : isTablet ? 44 : 48,
    borderRadius: '50%',
    background: '#ffffff',
    border: '1px solid #e0e0e0',
    boxShadow: '0 3px 6px rgba(0,0,0,0.10)',
    color: '#501b36',
    transition: 'all .25s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    '&:hover': {
      background: 'linear-gradient(135deg, #ffffff 0%, #f4eef2 100%)',
      transform: 'translateY(-3px)',
      boxShadow: '0 8px 18px rgba(80,27,54,0.28)',
      borderColor: '#d3c4cc'
    },
    '&:active': { transform: 'translateY(-1px)', boxShadow: '0 4px 10px rgba(80,27,54,0.22)' },
  } as const;

  const autoIcon = (
    <Tooltip
      arrow
      placement="top"
      title={autoSettingsEnabled ? 'Desactivar inspecciones automáticas (cada 15 días)' : 'Activar inspecciones automáticas (cada 15 días)'}
    >
      <IconButton
        aria-label={autoSettingsEnabled ? 'Desactivar inspecciones automáticas' : 'Activar inspecciones automáticas'}
        disabled={!canManageAutoSettings || autoLoading}
        onClick={() => canManageAutoSettings && onToggleAuto()}
        size="small"
        sx={{
          ...iconBtnBase,
          background: autoSettingsEnabled
            ? 'linear-gradient(135deg, rgba(76,175,80,0.15) 0%, rgba(76,175,80,0.05) 100%)'
            : iconBtnBase.background,
          borderColor: autoSettingsEnabled ? alpha('#4caf50',0.5) : iconBtnBase['border'],
          color: autoSettingsEnabled ? '#2e7d32' : '#501b36',
          position: 'relative',
          '&:after': autoLoading ? {
            content: '""',
            position: 'absolute',
            inset: 4,
            borderRadius: '50%',
            border: '2px solid rgba(80,27,54,0.3)',
            borderTopColor: 'transparent',
            animation: 'spin 0.9s linear infinite'
          } : undefined,
          '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } }
        }}
      >
        {autoSettingsEnabled ? <Autorenew fontSize="small" /> : <Schedule fontSize="small" />}
      </IconButton>
    </Tooltip>
  );

  const directOrderIcon = canCreateDirectOrder && (
    <Tooltip arrow placement="top" title="Crear orden directa">
      <IconButton
        aria-label="Crear orden directa"
        onClick={onCreateDirectOrder}
        size="small"
        sx={iconBtnBase}
      >
        <NoteAdd fontSize="small" />
      </IconButton>
    </Tooltip>
  );

  const requestIcon = canSendManualRequests && (
    <Tooltip arrow placement="top" title="Solicitar inspección">
      <IconButton
        aria-label="Solicitar inspección"
        onClick={onOpenManualModal}
        size="small"
        sx={{
          ...iconBtnBase,
          background: 'linear-gradient(135deg, #501b36 0%, #6d2548 70%)',
          color: '#fff',
          border: '1px solid #501b36',
          '&:hover': {
            background: 'linear-gradient(135deg, #3d1429 0%, #5a1d3a 70%)',
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 16px rgba(80,27,54,0.35)'
          }
        }}
      >
        <RateReview fontSize="small" />
      </IconButton>
    </Tooltip>
  );

  const items = [autoIcon, directOrderIcon, requestIcon].filter(Boolean);

  if (!items.length) return null;

  // Mobile / tablet: misma fila con pequeña separación y posibilidad de agrandar si se desea
  if (isMobile || isTablet) {
    return (
      <Box sx={{ display: 'flex', gap: 1.2 }}>
        {items.map((el, idx) => <Box key={idx}>{el}</Box>)}
      </Box>
    );
  }

  // Desktop: agrupar en cápsula
  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
      <Box
        sx={{
          p: 0.6,
          pr: 0.75,
            pl: 0.9,
          borderRadius: 999,
          background: 'linear-gradient(135deg, #fafafa 0%, #ececec 100%)',
          border: '2px solid #e0e0e0',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)',
          display: 'flex',
          gap: 0.85,
          alignItems: 'center'
        }}
      >
        {items.map((el, idx) => <Box key={idx}>{el}</Box>)}
      </Box>
    </Box>
  );
};

export const TruckInspectionRevisions: React.FC = () => {
  const { selectedCompany, isAuthenticated, token, user } = useAuth();
  const { settings: autoSettings, loading: autoLoading, updateSettings: updateAutoSettings } = useAutoInspectionSettings();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTabletOrBelow = useMediaQuery(theme.breakpoints.down('md'));
  const isCompactDesktop = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  // Si no está autenticado, no renderizar el componente
  if (!isAuthenticated || !token) {
    return (
      <Alert severity="error">
        Debe iniciar sesión para ver las inspecciones de camiones.
      </Alert>
    );
  }

  const [pendingInspections, setPendingInspections] = useState<TruckInspectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInspection, setSelectedInspection] = useState<TruckInspectionSummary | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [userOptionsLoading, setUserOptionsLoading] = useState(false);
  const [userOptionsError, setUserOptionsError] = useState<string | null>(null);
  const [conductorInput, setConductorInput] = useState('');
  const [pendingPage, setPendingPage] = useState(0);
  const [pendingRowsPerPage, setPendingRowsPerPage] = useState(5);

  // Estado para órdenes directas
  const [directOrders, setDirectOrders] = useState<DirectInspectionOrderSummary[]>([]);
  const [selectedDirectOrder, setSelectedDirectOrder] = useState<DirectInspectionOrderSummary | null>(null);
  const [directOrderDetailModalOpen, setDirectOrderDetailModalOpen] = useState(false);

  // Estado para el historial
  const [rawInspections, setRawInspections] = useState<TruckInspectionSummary[]>([]); // Datos sin filtrar del servidor
  const [rawDirectOrders, setRawDirectOrders] = useState<DirectInspectionOrderSummary[]>([]); // Órdenes directas revisadas
  const [allInspections, setAllInspections] = useState<HistoryItem[]>([]); // Datos filtrados para mostrar (unificados)
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(5);
  const [historyFilters, setHistoryFilters] = useState({
    dateFrom: '',
    dateTo: '',
    conductor: '',
    truckLicense: '',
  });
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualSendToAll, setManualSendToAll] = useState(false);
  const [manualSelectedUsers, setManualSelectedUsers] = useState<UserOption[]>([]);
  const [manualMessage, setManualMessage] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualFormError, setManualFormError] = useState<string | null>(null);
  const [manualFeedback, setManualFeedback] = useState<
    { severity: 'success' | 'error'; message: string } | null
  >(null);
  
  // Estado para el modal de advertencia de desactivación
  const [deactivationWarningOpen, setDeactivationWarningOpen] = useState(false);
  
  const canSendManualRequests = Boolean(
    user && ['P_TALLER', 'ADMINISTRADOR', 'ADMINISTRACION', 'TRAFICO'].includes(user.role)
  );
  const canManageAutoSettings = Boolean(
    user && ['P_TALLER', 'ADMINISTRADOR', 'ADMINISTRACION', 'TRAFICO', 'MASTER_ADMIN'].includes(user.role)
  );

  // Estado para orden directa a taller
  const [directOrderOpen, setDirectOrderOpen] = useState(false);
  const [directOrderSubmitting, setDirectOrderSubmitting] = useState(false);
  const [directOrderPlate, setDirectOrderPlate] = useState('');
  const [directOrderVehicleKind, setDirectOrderVehicleKind] = useState<'TRACTORA'|'SEMIREMOLQUE'>('TRACTORA');
  const [directOrderModules, setDirectOrderModules] = useState<{temp_id:string; title:string; notes:string}[]>([
    { temp_id: crypto.randomUUID(), title: '', notes: '' }
  ]);
  const [directOrderFeedback, setDirectOrderFeedback] = useState<{severity:'success'|'error'; message:string}|null>(null);

  const canCreateDirectOrder = Boolean(
    user && ['P_TALLER', 'ADMINISTRADOR', 'ADMINISTRACION', 'TRAFICO', 'MASTER_ADMIN'].includes(user.role)
  );

  const handleOpenDirectOrder = () => {
    setDirectOrderPlate('');
    setDirectOrderVehicleKind('TRACTORA');
    setDirectOrderModules([{ temp_id: crypto.randomUUID(), title:'', notes:'' }]);
    setDirectOrderOpen(true);
  };
  const handleCloseDirectOrder = () => {
    if (directOrderSubmitting) return; // evitar cerrar mientras envía
    setDirectOrderOpen(false);
  };
  const handleAddModule = () => {
    setDirectOrderModules(prev => [...prev, { temp_id: crypto.randomUUID(), title:'', notes:'' }]);
  };
  const handleRemoveModule = (id: string) => {
    setDirectOrderModules(prev => prev.length === 1 ? prev : prev.filter(m => m.temp_id !== id));
  };
  const handleModuleChange = (id: string, field: 'title'|'notes', value: string) => {
    setDirectOrderModules(prev => prev.map(m => m.temp_id === id ? { ...m, [field]: value } : m));
  };
  const handleSubmitDirectOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateDirectOrder) return;
    const cleanedModules = directOrderModules
      .map(m => ({ title: m.title.trim(), notes: m.notes.trim() }))
      .filter(m => m.title.length > 0 || m.notes.length > 0);
    if (!directOrderPlate.trim()) {
      setDirectOrderFeedback({severity:'error', message:'La matrícula es obligatoria.'});
      return;
    }
    if (cleanedModules.length === 0) {
      setDirectOrderFeedback({severity:'error', message:'Añade al menos un módulo con título u observaciones.'});
      return;
    }
    setDirectOrderSubmitting(true);
    try {
      await truckInspectionService.createDirectInspectionOrder({
        truck_license_plate: directOrderPlate.trim().toUpperCase(),
        vehicle_kind: directOrderVehicleKind,
        modules: cleanedModules
      });
      setDirectOrderFeedback({severity:'success', message:'Orden directa creada correctamente.'});
      setDirectOrderOpen(false);
      // Recargar las órdenes directas para mostrar la nueva
      loadDirectOrders();
    } catch (err:any) {
      setDirectOrderFeedback({severity:'error', message: err?.message || 'No se pudo crear la orden.'});
    } finally {
      setDirectOrderSubmitting(false);
    }
  };

  const resetManualForm = () => {
    setManualSendToAll(false);
    setManualSelectedUsers([]);
    setManualMessage('');
    setManualFormError(null);
  };

  const handleOpenManualModal = () => {
    resetManualForm();
    setManualModalOpen(true);
    if (!userOptions.length) {
      void loadUserOptions();
    }
  };

  const handleCloseManualModal = () => {
    setManualModalOpen(false);
    resetManualForm();
  };

  const handleSubmitManualRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSendManualRequests) {
      return;
    }

    const trimmedMessage = manualMessage.trim();

    if (!manualSendToAll && manualSelectedUsers.length === 0) {
      setManualFormError('Selecciona al menos un trabajador para enviar la solicitud.');
      return;
    }

    setManualSubmitting(true);
    setManualFormError(null);

    const payload: TruckInspectionRequestCreate = {
      send_to_all: manualSendToAll,
      target_user_ids: manualSendToAll
        ? []
        : manualSelectedUsers.map((userOption) => userOption.id),
      message: trimmedMessage || undefined,
    };

    try {
      const result = await truckInspectionService.createManualInspectionRequests(payload);
      setManualFeedback({ severity: 'success', message: result.message });
      setManualModalOpen(false);
      resetManualForm();
    } catch (err: any) {
      setManualFeedback({
        severity: 'error',
        message: err?.message || 'No se pudo enviar la solicitud de inspección.',
      });
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleManualFeedbackClose = () => {
    setManualFeedback(null);
  };

  const handleToggleAutoInspection = async () => {
    if (!canManageAutoSettings || !autoSettings || autoLoading) return;

    // Si está activado y se va a desactivar, mostrar modal de advertencia
    if (autoSettings.auto_inspection_enabled) {
      setDeactivationWarningOpen(true);
      return;
    }

    // Si está desactivado, activar directamente
    await performToggleAutoInspection();
  };

  const performToggleAutoInspection = async () => {
    if (!canManageAutoSettings || !autoSettings || autoLoading) return;

    try {
      await updateAutoSettings(!autoSettings.auto_inspection_enabled);
      setManualFeedback({
        severity: 'success',
        message: `Inspecciones automáticas ${!autoSettings.auto_inspection_enabled ? 'activadas' : 'desactivadas'} correctamente`,
      });
    } catch (error: any) {
      setManualFeedback({
        severity: 'error',
        message: error.message || 'Error al cambiar la configuración automática',
      });
    }
  };

  const handleConfirmDeactivation = async () => {
    setDeactivationWarningOpen(false);
    await performToggleAutoInspection();
  };

  const handleCancelDeactivation = () => {
    setDeactivationWarningOpen(false);
  };
  // const [userOptions, setUserOptions] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    // Solo cargar datos si el usuario está autenticado
    if (isAuthenticated && token) {
      loadPendingInspections();
      loadDirectOrders();
      loadInspectionHistory();
    }
  }, [selectedCompany, isAuthenticated, token]); // Recargar cuando cambie la empresa o el estado de autenticación

  useEffect(() => {
    if (pendingPage > 0 && pendingPage * pendingRowsPerPage >= pendingInspections.length) {
      const lastPage = Math.max(0, Math.ceil((pendingInspections.length || 1) / pendingRowsPerPage) - 1);
      setPendingPage(lastPage);
    }
  }, [pendingInspections, pendingPage, pendingRowsPerPage]);

  const loadPendingInspections = async () => {
    // Verificar autenticación antes de hacer la petición
    if (!isAuthenticated || !token) {
      console.warn('No se pueden cargar las inspecciones pendientes: usuario no autenticado');
      setError('Usuario no autenticado');
      return;
    }

    try {
      setLoading(true);
      setError(null);
  const inspections = await truckInspectionService.getPendingIssues();
  const inspectionsWithIssues = inspections.filter((inspection) => inspection.has_issues);
  setPendingInspections(inspectionsWithIssues);
      setPendingPage(0);
    } catch (err: any) {
      console.error('Error loading pending inspections:', err);
      setError(err.message || 'Error al cargar las inspecciones pendientes');
    } finally {
      setLoading(false);
    }
  };

  const loadDirectOrders = async () => {
    if (!isAuthenticated || !token) {
      return;
    }

    try {
      // Cargar solo las órdenes no revisadas
      const orders = await truckInspectionService.getDirectInspectionOrders(false);
      setDirectOrders(orders);
    } catch (err: any) {
      console.error('Error loading direct orders:', err);
    }
  };

  const loadInspectionHistory = async () => {
    // Verificar autenticación antes de hacer la petición
    if (!isAuthenticated || !token) {
      console.warn('No se puede cargar el historial: usuario no autenticado');
      setHistoryError('Usuario no autenticado');
      return;
    }

    try {
      setHistoryLoading(true);
      setHistoryError(null);
      
      // Cargar inspecciones regulares y órdenes directas revisadas en paralelo
      const [inspections, reviewedOrders] = await Promise.all([
        truckInspectionService.getInspections({ limit: 50, offset: 0 }),
        truckInspectionService.getDirectInspectionOrders(true) // true = solo revisadas
      ]);
      
      console.log('DEBUG: Raw inspections loaded:', inspections.length, inspections);
      console.log('DEBUG: Reviewed direct orders loaded:', reviewedOrders.length, reviewedOrders);
      
      setRawInspections(inspections);
      setRawDirectOrders(reviewedOrders);
    } catch (err: any) {
      console.error('Error loading inspection history:', err);
      setHistoryError(err.message || 'Error al cargar el historial de inspecciones');
    } finally {
      setHistoryLoading(false);
    }
  };

  const refreshInspectionHistorySilently = useCallback(async () => {
    try {
      const [inspections, reviewedOrders] = await Promise.all([
        truckInspectionService.getInspections({ limit: 50, offset: 0 }),
        truckInspectionService.getDirectInspectionOrders(true)
      ]);
      setRawInspections(inspections);
      setRawDirectOrders(reviewedOrders);
    } catch (err: any) {
      console.error('Error refreshing inspection history silently:', err);
    }
  }, []);

  const loadUserOptions = useCallback(async () => {
    if (!isAuthenticated || !token) return;
    try {
      setUserOptionsLoading(true);
      setUserOptionsError(null);
      const result = await usersAPI.getAllUsers({
        per_page: 100,
        role: 'TRABAJADOR',
        active_only: true,
        available_drivers_only: true,
      });
      const options: UserOption[] = (result?.users || []).map((user: UserOptionSource) => {
        const names = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
        const label = user?.full_name || names || user?.email || `Usuario ${user?.id ?? ''}`;
        return {
          id: typeof user?.id === 'number' ? user.id : 0,
          label,
        };
      }).sort((a: { label: string }, b: { label: string }) =>
        a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })
      );
      setUserOptions(options);
    } catch (err: any) {
      console.error('Error loading user options:', err);
      setUserOptionsError('No se pudieron cargar los conductores');
    } finally {
      setUserOptionsLoading(false);
    }
  }, [isAuthenticated, token, selectedCompany]);

  const handlePendingPageChange = (_event: unknown, newPage: number) => {
    setPendingPage(newPage);
  };

  const handlePendingRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseInt(event.target.value, 10) || 5;
    setPendingRowsPerPage(newSize);
    setPendingPage(0);
  };

  // const loadUserOptions = async () => {
  //   try {
  //     // Cargar usuarios disponibles para el filtro
  //     // Aquí asumo que tienes un servicio de usuarios, sino puedes extraer los usuarios únicos del historial
  //     // setUserOptions([
  //     //   { id: 1, name: 'Todos los usuarios' },
  //     //   // Se llenará dinámicamente con usuarios reales
  //     // ]);
  //   } catch (err: any) {
  //     console.error('Error loading user options:', err);
  //   }
  // };

  // Recargar historial solo cuando cambie la página o la empresa
  useEffect(() => {
    loadInspectionHistory();
  }, [historyPage, selectedCompany]);

  useEffect(() => {
    loadUserOptions();
  }, [loadUserOptions]);

  useEffect(() => {
    setConductorInput(historyFilters.conductor);
  }, [historyFilters.conductor]);

  // Aplicar filtros en el cliente (sin recargar del servidor)
  useEffect(() => {
    console.log('DEBUG: Applying filters...');
    const applyFilters = () => {
      // Convertir inspecciones y órdenes directas a HistoryItem
      const inspectionItems: HistoryItem[] = rawInspections.map(insp => ({
        ...insp,
        item_type: 'inspection' as const,
      }));
      
      const directOrderItems: HistoryItem[] = rawDirectOrders.map(order => ({
        ...order,
        item_type: 'direct_order' as const,
      }));
      
      // Combinar ambas listas
      let combinedItems: HistoryItem[] = [...inspectionItems, ...directOrderItems];

      // Solo filtrar si hay filtros con valores reales
      const hasActiveFilters = historyFilters.dateFrom || historyFilters.dateTo || 
                              historyFilters.conductor.trim() || historyFilters.truckLicense.trim();

      if (hasActiveFilters) {
        combinedItems = combinedItems.filter(item => {
          // Determinar el campo de fecha según el tipo
          const dateField = item.item_type === 'inspection' 
            ? (item as any).inspection_date 
            : (item as any).created_at;
          const itemDate = new Date(dateField);
          const from = historyFilters.dateFrom ? new Date(historyFilters.dateFrom) : null;
          const to = historyFilters.dateTo ? new Date(historyFilters.dateTo + 'T23:59:59') : null;
          
          // Filtro por fecha
          if (from && itemDate < from) return false;
          if (to && itemDate > to) return false;
          
          // Filtro por conductor/creador
          if (historyFilters.conductor.trim()) {
            const conductorFilter = historyFilters.conductor.toLowerCase();
            const userName = item.item_type === 'inspection'
              ? (item as any).user_name?.toLowerCase() || ''
              : (item as any).created_by?.toLowerCase() || '';
            if (!userName.includes(conductorFilter)) return false;
          }

          // Filtro por matrícula
          if (historyFilters.truckLicense.trim()) {
            const licenseFilter = historyFilters.truckLicense.toLowerCase();
            const truckLicense = item.truck_license_plate?.toLowerCase() || '';
            if (!truckLicense.includes(licenseFilter)) return false;
          }
          
          return true;
        });
      }

      // Ordenar por fecha descendente (más recientes primero)
      combinedItems.sort((a, b) => {
        const dateA = new Date(a.item_type === 'inspection' ? (a as any).inspection_date : (a as any).created_at);
        const dateB = new Date(b.item_type === 'inspection' ? (b as any).inspection_date : (b as any).created_at);
        return dateB.getTime() - dateA.getTime();
      });

      setAllInspections(combinedItems);
      console.log('DEBUG: Filtered items:', combinedItems.length, 'Raw inspections:', rawInspections.length, 'Raw orders:', rawDirectOrders.length, 'Filters:', historyFilters);
      // Resetear página si el filtro reduce el número de elementos
      if (historyPage > Math.ceil(combinedItems.length / historyLimit)) {
        setHistoryPage(1);
      }
    };

    applyFilters();
  }, [rawInspections, rawDirectOrders, historyFilters, historyLimit, historyPage]);

  // Cargar opciones de usuarios al montar el componente
  // useEffect(() => {
  //   loadUserOptions();
  // }, []);

  const handleViewDetail = (inspection: TruckInspectionSummary) => {
    setSelectedInspection(inspection);
    setDetailModalOpen(true);
  };

  const handleViewDirectOrderDetail = (order: DirectInspectionOrderSummary) => {
    setSelectedDirectOrder(order);
    setDirectOrderDetailModalOpen(true);
  };

  const handleCloseDirectOrderDetail = () => {
    setDirectOrderDetailModalOpen(false);
    setSelectedDirectOrder(null);
  };

  const handleRefreshDirectOrders = () => {
    // Recargar tanto las órdenes pendientes como el historial
    loadDirectOrders();
    loadInspectionHistory();
  };

  const handleMarkReviewed = async (
    inspectionId: number,
    notes: string
  ): Promise<MarkInspectionReviewedResponse> => {
    try {
      const response = await truckInspectionService.markInspectionReviewed(inspectionId, notes);
      setPendingInspections((prev) => prev.filter((inspection) => inspection.id !== inspectionId));

      setRawInspections((prev) => {
        const exists = prev.some((inspection) => inspection.id === inspectionId);
        if (!exists) return prev;
        return prev.map((inspection) =>
          inspection.id === inspectionId
            ? { ...inspection, is_reviewed: true }
            : inspection
        );
      });

      setAllInspections((prev) =>
        prev.map((inspection) =>
          inspection.id === inspectionId
            ? { ...inspection, is_reviewed: true }
            : inspection
        )
      );

      setSelectedInspection((prev) =>
        prev && prev.id === inspectionId ? { ...prev, is_reviewed: true } : prev
      );

      void refreshInspectionHistorySilently();

      console.log('Inspección marcada como revisada exitosamente');
      return response;
    } catch (error: any) {
      console.error('Error marking inspection as reviewed:', error);
      throw error; // Re-lanzar para que el modal maneje el error
    }
  };

  const getUrgencyLevel = (dateString: string): { level: 'low' | 'medium' | 'high', text: string, color: string } => {
    const daysAgo = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysAgo > 7) return { level: 'high', text: `Hace ${daysAgo} días`, color: '#d32f2f' };
    if (daysAgo > 3) return { level: 'medium', text: `Hace ${daysAgo} días`, color: '#ff9800' };
    return { level: 'low', text: `Hace ${daysAgo} días`, color: '#4caf50' };
  };

  const paginatedPendingInspections = pendingInspections.slice(
    pendingPage * pendingRowsPerPage,
    pendingPage * pendingRowsPerPage + pendingRowsPerPage
  );

  const paginatedHistoryInspections = allInspections.slice(
    (historyPage - 1) * historyLimit,
    historyPage * historyLimit
  );

  if (loading) {
    return (
      <Fade in timeout={1400}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            p: { xs: 2.5, sm: 3, lg: 4 },
            minHeight: { xs: 'auto', md: 400 },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress />
          </Box>
        </Paper>
      </Fade>
    );
  }

  return (
    <>
      <Fade in timeout={1400}>
        <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', background: '#ffffff', p: 4, minHeight: 400 }}>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'stretch', md: 'center' },
              justifyContent: 'space-between',
              gap: 2,
              mb: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FactCheck sx={{ color: '#501b36', fontSize: 32 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#501b36' }}>
                  Inspecciones Pendientes
                </Typography>
              </Box>
            </Box>

            <Box sx={{ width: '100%', maxWidth: { xs: '100%', md: 520 } }}>
              <InspectionActions
                canManageAutoSettings={canManageAutoSettings}
                autoSettingsEnabled={autoSettings?.auto_inspection_enabled}
                autoLoading={autoLoading}
                onToggleAuto={handleToggleAutoInspection}
                canCreateDirectOrder={canCreateDirectOrder}
                onCreateDirectOrder={handleOpenDirectOrder}
                canSendManualRequests={canSendManualRequests}
                onOpenManualModal={handleOpenManualModal}
              />
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {pendingInspections.length === 0 && !error ? (
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 2,
                bgcolor: '#f8f9fa',
                textAlign: 'center',
              }}
            >
              <CheckCircleOutline sx={{ fontSize: 64, color: '#4caf50', mb: 2, opacity: 0.7 }} />
              <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 600, mb: 1 }}>
                ¡Excelente trabajo!
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No hay inspecciones con incidencias pendientes en este momento.
                Todos los camiones están en buen estado.
              </Typography>
            </Paper>
          ) : (
            <>
              {isTabletOrBelow ? (
                <Stack spacing={2.5}>
                  {paginatedPendingInspections.map((inspection: TruckInspectionSummary) => {
                    const urgency = getUrgencyLevel(inspection.inspection_date);
                    return (
                      <Paper
                        key={inspection.id}
                        variant="outlined"
                        onClick={() => handleViewDetail(inspection)}
                        role="button"
                        aria-label={`Ver detalles de la inspección de ${inspection.truck_license_plate}`}
                        sx={{
                          p: 2.5,
                          borderRadius: 3,
                          borderColor: alpha(urgency.color, 0.2),
                          backgroundColor: alpha(urgency.color, 0.08),
                          cursor: 'pointer',
                          transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1.25,
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 12px 24px rgba(80, 27, 54, 0.18)',
                          },
                          '&:active': {
                            transform: 'translateY(0)',
                          },
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#501b36' }}>
                              {inspection.truck_license_plate}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                              <Person sx={{ color: '#666', fontSize: 18 }} />
                              <Typography variant="body2" color="text.secondary">
                                {inspection.user_name}
                              </Typography>
                            </Stack>
                          </Box>
                          <Chip
                            icon={<AccessTime sx={{ fontSize: 16 }} />}
                            label={urgency.text}
                            size="small"
                            sx={{
                              bgcolor: '#fff',
                              color: urgency.color,
                              fontWeight: 600,
                              borderRadius: 999,
                              border: `1px solid ${alpha(urgency.color, 0.4)}`,
                            }}
                          />
                        </Stack>

                        <Stack spacing={1}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <LocalShipping sx={{ color: '#666', fontSize: 18 }} />
                            <Typography variant="body2" color="text.secondary">
                              Inspectoría con incidencias
                            </Typography>
                          </Stack>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <AccessTime sx={{ color: '#666', fontSize: 16 }} />
                            <Typography variant="body2">
                              {new Date(inspection.inspection_date).toLocaleString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Typography>
                          </Stack>
                        </Stack>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                          {inspection.components_with_issues.slice(0, 4).map((component: string, index: number) => (
                            <Chip
                              key={`${inspection.id}-component-${index}`}
                              label={component}
                              size="small"
                              sx={{
                                bgcolor: '#fff',
                                color: '#f44336',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                borderRadius: 999,
                                border: `1px solid ${alpha('#f44336', 0.3)}`,
                              }}
                            />
                          ))}
                          {inspection.components_with_issues.length > 4 && (
                            <Chip
                              label={`+${inspection.components_with_issues.length - 4}`}
                              size="small"
                              sx={{
                                bgcolor: alpha('#501b36', 0.1),
                                color: '#501b36',
                                fontSize: '0.75rem',
                                borderRadius: 999,
                                border: `1px solid ${alpha('#501b36', 0.2)}`,
                              }}
                            />
                          )}
                        </Box>
                      </Paper>
                    );
                  })}
                </Stack>
              ) : (
                <TableContainer sx={{ borderRadius: 2, overflowX: 'auto' }}>
                  <Table size={isCompactDesktop ? 'small' : 'medium'}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, color: '#501b36', whiteSpace: 'nowrap' }}>Matrícula</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#501b36', whiteSpace: 'nowrap' }}>Inspector</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#501b36', whiteSpace: 'nowrap' }}>Fecha</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#501b36' }}>Componentes con Problemas</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#501b36', whiteSpace: 'nowrap' }}>Urgencia</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedPendingInspections.map((inspection: TruckInspectionSummary, index: number) => {
                        const urgency = getUrgencyLevel(inspection.inspection_date);
                        return (
                          <TableRow
                            key={inspection.id}
                            hover
                            sx={{
                              backgroundColor: index % 2 === 0 ? alpha('#501b36', 0.035) : alpha('#501b36', 0.05),
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                              cursor: 'pointer',
                              '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 6px 12px rgba(80, 27, 54, 0.12)',
                              },
                            }}
                            onClick={() => handleViewDetail(inspection)}
                            role="button"
                            aria-label={`Ver detalles de la inspección de ${inspection.truck_license_plate}`}
                          >
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LocalShipping sx={{ color: '#666', fontSize: 18 }} />
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {inspection.truck_license_plate}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Person sx={{ color: '#666', fontSize: 18 }} />
                                <Typography variant="body2">
                                  {inspection.user_name}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {new Date(inspection.inspection_date).toLocaleDateString('es-ES', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {inspection.components_with_issues.slice(0, 3).map((component: string, componentIndex: number) => (
                                  <Chip
                                    key={`${inspection.id}-table-component-${componentIndex}`}
                                    label={component}
                                    size="small"
                                    sx={{
                                      bgcolor: alpha('#f44336', 0.1),
                                      color: '#f44336',
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      borderRadius: 999,
                                      border: `1px solid ${alpha('#f44336', 0.2)}`,
                                    }}
                                  />
                                ))}
                                {inspection.components_with_issues.length > 3 && (
                                  <Chip
                                    label={`+${inspection.components_with_issues.length - 3}`}
                                    size="small"
                                    sx={{
                                      bgcolor: alpha('#666', 0.1),
                                      color: '#666',
                                      fontSize: '0.7rem',
                                      borderRadius: 999,
                                      border: `1px solid ${alpha('#666', 0.2)}`,
                                    }}
                                  />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                icon={<AccessTime sx={{ fontSize: 14 }} />}
                                label={urgency.text}
                                size="small"
                                sx={{
                                  bgcolor: alpha(urgency.color, 0.1),
                                  color: urgency.color,
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                  borderRadius: 999,
                                  border: `1px solid ${alpha(urgency.color, 0.2)}`,
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {pendingInspections.length > 0 && (
                <Box
                  sx={{
                    mt: 2.5,
                    display: 'flex',
                    justifyContent: { xs: 'center', sm: 'flex-end' },
                    px: { xs: 0.5, sm: 0 },
                  }}
                >
                  <TablePagination
                    component="div"
                    count={pendingInspections.length}
                    page={pendingPage}
                    onPageChange={handlePendingPageChange}
                    rowsPerPage={pendingRowsPerPage}
                    onRowsPerPageChange={handlePendingRowsPerPageChange}
                    rowsPerPageOptions={[5, 10, 15]}
                    labelRowsPerPage="Por página"
                    sx={{
                      borderTop: '1px solid rgba(80, 27, 54, 0.08)',
                      borderRadius: { xs: 2, sm: 0 },
                      width: '100%',
                      maxWidth: 480,
                      '& .MuiTablePagination-toolbar': {
                        flexWrap: { xs: 'wrap', sm: 'nowrap' },
                        justifyContent: { xs: 'center', sm: 'flex-end' },
                        gap: { xs: 1, sm: 0 },
                        py: { xs: 1.5, sm: 0 },
                      },
                      '& .MuiTablePagination-selectLabel, & .MuiTablePagination-input': {
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      },
                      '& .MuiTablePagination-displayedRows': {
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        mt: { xs: 0.5, sm: 0 },
                      },
                    }}
                  />
                </Box>
              )}
            </>
          )}
        </Paper>
      </Fade>

      {/* Órdenes Pendientes */}
      <Fade in timeout={1400}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            p: { xs: 2.5, sm: 3, lg: 4 },
            mt: { xs: 3, md: 4 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <FactCheck sx={{ color: '#501b36', fontSize: 32 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#501b36' }}>
                Órdenes Pendientes
              </Typography>
            </Box>
          </Box>

          {directOrders.length === 0 ? (
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 2,
                bgcolor: '#f8f9fa',
                textAlign: 'center',
              }}
            >
              <CheckCircleOutline sx={{ fontSize: 64, color: '#4caf50', mb: 2, opacity: 0.7 }} />
              <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 600, mb: 1 }}>
                ¡Todo en orden!
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No hay órdenes directas pendientes de revisión en este momento.
              </Typography>
            </Paper>
          ) : (
            <>
              {isTabletOrBelow ? (
                <Stack spacing={2.5}>
                  {directOrders.map((order) => (
                    <Paper
                      key={order.id}
                      variant="outlined"
                      onClick={() => handleViewDirectOrderDetail(order)}
                      role="button"
                      aria-label={`Ver detalles de la orden de ${order.truck_license_plate}`}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        borderColor: alpha('#501b36', 0.25),
                        background: 'linear-gradient(135deg, rgba(80,27,54,0.06) 0%, rgba(80,27,54,0.02) 100%)',
                        cursor: 'pointer',
                        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.25,
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 12px 24px rgba(80, 27, 54, 0.18)',
                        },
                        '&:active': {
                          transform: 'translateY(0)',
                        },
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" spacing={1.5} alignItems="flex-start">
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#501b36' }}>
                            {order.truck_license_plate}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                            <Person sx={{ color: '#666', fontSize: 18 }} />
                            <Typography variant="body2" color="text.secondary">
                              {order.created_by}
                            </Typography>
                          </Stack>
                        </Box>
                        <Chip
                          label={order.vehicle_kind === 'TRACTORA' ? 'Tractora' : 'Semiremolque'}
                          size="small"
                          sx={{
                            bgcolor: '#fff',
                            color: order.vehicle_kind === 'TRACTORA' ? '#1976d2' : '#ef6c00',
                            fontWeight: 600,
                            borderRadius: 999,
                            border: `1px solid ${alpha(order.vehicle_kind === 'TRACTORA' ? '#1976d2' : '#ef6c00', 0.4)}`,
                          }}
                        />
                      </Stack>

                      <Stack spacing={1}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <AccessTime sx={{ color: '#666', fontSize: 18 }} />
                          <Typography variant="body2">
                            {new Date(order.created_at).toLocaleString('es-ES', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <FactCheck sx={{ color: '#666', fontSize: 18 }} />
                          <Typography variant="body2" color="text.secondary">
                            {order.modules_count} módulo{order.modules_count !== 1 ? 's' : ''} registrados
                          </Typography>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <TableContainer sx={{ borderRadius: 2, overflowX: 'auto' }}>
                  <Table size={isCompactDesktop ? 'small' : 'medium'}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, color: '#501b36', whiteSpace: 'nowrap' }}>Matrícula</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#501b36', whiteSpace: 'nowrap' }}>Tipo</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#501b36', whiteSpace: 'nowrap' }}>Creado por</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#501b36', whiteSpace: 'nowrap' }}>Fecha</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#501b36', whiteSpace: 'nowrap' }}>Módulos</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {directOrders.map((order, index) => (
                        <TableRow
                          key={order.id}
                          hover
                          onClick={() => handleViewDirectOrderDetail(order)}
                          sx={{
                            backgroundColor: index % 2 === 0 ? alpha('#501b36', 0.035) : alpha('#501b36', 0.05),
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            cursor: 'pointer',
                            '&:hover': {
                              transform: 'translateY(-1px)',
                              boxShadow: '0 6px 12px rgba(80, 27, 54, 0.12)',
                            },
                          }}
                          role="button"
                          aria-label={`Ver detalles de la orden de ${order.truck_license_plate}`}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LocalShipping sx={{ color: '#666', fontSize: 18 }} />
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {order.truck_license_plate}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={order.vehicle_kind === 'TRACTORA' ? 'Tractora' : 'Semiremolque'}
                              size="small"
                              sx={{
                                bgcolor: order.vehicle_kind === 'TRACTORA' ? alpha('#2196f3', 0.1) : alpha('#ff9800', 0.1),
                                color: order.vehicle_kind === 'TRACTORA' ? '#2196f3' : '#ff9800',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                borderRadius: 999,
                                border: `1px solid ${alpha(order.vehicle_kind === 'TRACTORA' ? '#2196f3' : '#ff9800', 0.2)}`,
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Person sx={{ color: '#666', fontSize: 18 }} />
                              <Typography variant="body2">
                                {order.created_by}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AccessTime sx={{ color: '#666', fontSize: 18 }} />
                              <Typography variant="body2">
                                {new Date(order.created_at).toLocaleString('es-ES', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`${order.modules_count} módulo${order.modules_count !== 1 ? 's' : ''}`}
                              size="small"
                              sx={{
                                bgcolor: alpha('#4caf50', 0.1),
                                color: '#4caf50',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                borderRadius: 999,
                                border: `1px solid ${alpha('#4caf50', 0.2)}`,
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </Paper>
      </Fade>

      {/* Historial */}
      <Fade in timeout={1600}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            p: { xs: 2.5, sm: 3, lg: 4 },
            mt: { xs: 3, md: 4 },
          }}
        >
          {/* Header del historial */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <History sx={{ color: '#501b36', fontSize: 32 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#501b36' }}>
                Historial
              </Typography>
            </Box>
          </Box>

          {/* Filtros */}
          <Paper variant="outlined" sx={{ p: 3, mb: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FilterList sx={{ color: '#501b36', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#501b36' }}>
                Filtros de búsqueda
              </Typography>
            </Box>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3 }}>
              <TextField
                fullWidth
                label="Fecha desde"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={historyFilters.dateFrom}
                onChange={(e) => setHistoryFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 999,
                    '&:hover fieldset': { borderColor: '#501b36' },
                    '&.Mui-focused fieldset': { borderColor: '#501b36' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#501b36' },
                }}
              />
              
              <TextField
                fullWidth
                label="Fecha hasta"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={historyFilters.dateTo}
                onChange={(e) => setHistoryFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 999,
                    '&:hover fieldset': { borderColor: '#501b36' },
                    '&.Mui-focused fieldset': { borderColor: '#501b36' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#501b36' },
                }}
              />

              <TextField
                fullWidth
                label="Matrícula"
                size="small"
                placeholder="Ej: 1234ABC"
                value={historyFilters.truckLicense}
                onChange={(e) => setHistoryFilters(prev => ({ ...prev, truckLicense: e.target.value }))}
                InputProps={{
                  startAdornment: <Search sx={{ color: '#666', mr: 1, fontSize: 18 }} />
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 999,
                    '&:hover fieldset': { borderColor: '#501b36' },
                    '&.Mui-focused fieldset': { borderColor: '#501b36' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#501b36' },
                }}
              />

              <FormControl fullWidth size="small">
                <Autocomplete<UserOption, false, false, true>
                  options={userOptions}
                  fullWidth
                  freeSolo
                  value={userOptions.find((option) => option.label === historyFilters.conductor) ?? null}
                  inputValue={conductorInput}
                  onInputChange={(_event, newInputValue, reason) => {
                    setConductorInput(newInputValue);
                    if (reason === 'input') {
                      setHistoryFilters(prev => ({ ...prev, conductor: newInputValue }));
                    }
                    if (reason === 'clear') {
                      setHistoryFilters(prev => ({ ...prev, conductor: '' }));
                    }
                  }}
                  onChange={(_event, newValue) => {
                    const value = typeof newValue === 'string'
                      ? newValue
                      : newValue?.label ?? '';
                    setHistoryFilters(prev => ({ ...prev, conductor: value }));
                    setConductorInput(value);
                  }}
                  loading={userOptionsLoading}
                  loadingText="Cargando conductores..."
                  noOptionsText={
                    userOptionsLoading
                      ? 'Cargando conductores...'
                      : conductorInput.trim()
                        ? 'Sin coincidencias'
                        : 'No hay conductores disponibles'
                  }
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  ListboxProps={{ style: { maxHeight: 260 } }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Conductor"
                      size="small"
                      placeholder="Nombre del conductor"
                      error={Boolean(userOptionsError)}
                      helperText={userOptionsError ?? undefined}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <Search sx={{ color: '#666', mr: 1, fontSize: 18 }} />
                            {params.InputProps.startAdornment}
                          </>
                        ),
                        endAdornment: (
                          <>
                            {userOptionsLoading ? <CircularProgress color="inherit" size={16} sx={{ mr: 1 }} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 999,
                          '&:hover fieldset': { borderColor: '#501b36' },
                          '&.Mui-focused fieldset': { borderColor: '#501b36' },
                        },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#501b36' },
                      }}
                    />
                  )}
                />
              </FormControl>
            </Box>
          </Paper>

          {/* Tabla del historial */}
          {historyError && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {historyError}
            </Alert>
          )}

          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {allInspections.length === 0 ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: { xs: 3, md: 4 },
                    borderRadius: 2,
                    textAlign: 'center',
                    bgcolor: '#f8f9fa',
                  }}
                >
                  <History sx={{ fontSize: 52, color: '#501b36', mb: 1.5, opacity: 0.6 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#501b36', mb: 0.5 }}>
                    Sin resultados
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    No se encontraron inspecciones con los filtros aplicados.
                  </Typography>
                </Paper>
              ) : (
                <>
                  {isTabletOrBelow ? (
                    <Stack spacing={2.5}>
                      {paginatedHistoryInspections.map((item: HistoryItem) => {
                        const isInspection = item.item_type === 'inspection';
                        const inspection = isInspection ? (item as TruckInspectionSummary) : null;
                        const directOrder = !isInspection ? (item as DirectInspectionOrderSummary) : null;

                        const isConsideredReviewed = isInspection
                          ? (inspection!.has_issues ? Boolean(inspection!.is_reviewed) : true)
                          : true;

                        const reviewChip = isInspection
                          ? inspection!.has_issues
                            ? inspection!.is_reviewed
                              ? {
                                  label: 'Revisada',
                                  color: '#4caf50',
                                  bgcolor: alpha('#4caf50', 0.1),
                                  border: alpha('#4caf50', 0.2),
                                }
                              : {
                                  label: 'Pendiente',
                                  color: '#ff9800',
                                  bgcolor: alpha('#ff9800', 0.1),
                                  border: alpha('#ff9800', 0.2),
                                }
                            : {
                                label: 'Auto-OK',
                                color: '#1565c0',
                                bgcolor: alpha('#1976d2', 0.12),
                                border: alpha('#1976d2', 0.3),
                              }
                          : {
                              label: 'Revisada',
                              color: '#2e7d32',
                              bgcolor: alpha('#4caf50', 0.15),
                              border: alpha('#4caf50', 0.35),
                            };

                        const typeChip = isInspection
                          ? {
                              label: inspection!.has_issues ? 'Con incidencias' : 'Sin incidencias',
                              color: inspection!.has_issues ? '#d32f2f' : '#388e3c',
                              bgcolor: inspection!.has_issues ? alpha('#f44336', 0.12) : alpha('#4caf50', 0.12),
                            }
                          : {
                              label: 'Orden directa',
                              color: '#501b36',
                              bgcolor: alpha('#501b36', 0.12),
                            };

                        const handleClick = () => {
                          if (isInspection) {
                            handleViewDetail(inspection!);
                          } else {
                            setSelectedDirectOrder(directOrder!);
                            setDirectOrderDetailModalOpen(true);
                          }
                        };

                        return (
                          <Paper
                            key={`${item.item_type}-${item.id}`}
                            variant="outlined"
                            onClick={handleClick}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                handleClick();
                              }
                            }}
                            tabIndex={0}
                            role="button"
                            aria-label={`Ver detalles de ${isInspection ? 'la inspección' : 'la orden directa'} de ${item.truck_license_plate}`}
                            sx={{
                              p: 2.5,
                              borderRadius: 3,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 1.5,
                              borderColor: isConsideredReviewed ? alpha('#4caf50', 0.35) : alpha('#501b36', 0.2),
                              background: isConsideredReviewed
                                ? alpha('#4caf50', 0.08)
                                : 'linear-gradient(135deg, rgba(80,27,54,0.05) 0%, rgba(80,27,54,0.02) 100%)',
                              cursor: 'pointer',
                              transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 12px 24px rgba(80, 27, 54, 0.18)',
                              },
                              '&:focus-visible': {
                                outline: `2px solid ${alpha('#501b36', 0.5)}`,
                                outlineOffset: 3,
                              },
                            }}
                          >
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                              <Stack direction="row" spacing={1.25} alignItems="center">
                                {isInspection ? (
                                  <LocalShipping sx={{ color: '#666', fontSize: 20 }} />
                                ) : (
                                  <RateReview sx={{ color: '#501b36', fontSize: 20 }} />
                                )}
                                <Box>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#501b36' }}>
                                    {item.truck_license_plate}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {isInspection ? 'Inspección registrada' : 'Orden directa revisada'}
                                  </Typography>
                                </Box>
                              </Stack>
                              <Chip
                                label={typeChip.label}
                                size="small"
                                sx={{
                                  bgcolor: typeChip.bgcolor,
                                  color: typeChip.color,
                                  fontWeight: 600,
                                  borderRadius: 999,
                                  border: `1px solid ${alpha(typeChip.color, 0.25)}`,
                                }}
                              />
                            </Stack>

                            <Stack spacing={1}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Person sx={{ color: '#666', fontSize: 18 }} />
                                <Typography variant="body2" color="text.secondary">
                                  {isInspection ? inspection!.user_name : directOrder!.created_by}
                                </Typography>
                              </Stack>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <AccessTime sx={{ color: '#666', fontSize: 18 }} />
                                <Typography variant="body2">
                                  {new Date(isInspection ? inspection!.inspection_date : directOrder!.created_at).toLocaleDateString('es-ES', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </Typography>
                              </Stack>
                              {isInspection ? (
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Warning sx={{ color: inspection!.has_issues ? '#d32f2f' : '#4caf50', fontSize: 18 }} />
                                  <Typography variant="body2" sx={{ color: inspection!.has_issues ? '#d32f2f' : '#4caf50' }}>
                                    {inspection!.has_issues
                                      ? `${inspection!.components_with_issues.length} componente(s) con incidencias`
                                      : 'Sin incidencias registradas'}
                                  </Typography>
                                </Stack>
                              ) : (
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <FactCheck sx={{ color: '#501b36', fontSize: 18 }} />
                                  <Typography variant="body2" color="text.secondary">
                                    {directOrder!.modules_count} módulo(s) registrados
                                  </Typography>
                                </Stack>
                              )}
                            </Stack>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}
                              alignItems={{ xs: 'stretch', sm: 'center' }}
                              justifyContent="space-between"
                            >
                              {isInspection && inspection!.has_issues && (
                                <Typography variant="body2" color="text.secondary">
                                  {inspection!.is_reviewed
                                    ? 'Cierre registrado por taller'
                                    : 'Revisión del taller pendiente'}
                                </Typography>
                              )}
                              <Chip
                                label={reviewChip.label}
                                size="small"
                                sx={{
                                  alignSelf: { xs: 'flex-start', sm: 'center' },
                                  bgcolor: reviewChip.bgcolor,
                                  color: reviewChip.color,
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  borderRadius: 999,
                                  border: `1px solid ${reviewChip.border}`,
                                }}
                              />
                            </Stack>
                          </Paper>
                        );
                      })}
                    </Stack>
                  ) : (
                    <TableContainer sx={{ borderRadius: 2, overflowX: 'auto' }}>
                      <Table size={isCompactDesktop ? 'small' : 'medium'}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, color: '#501b36', whiteSpace: 'nowrap' }}>Matrícula</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#501b36', whiteSpace: 'nowrap' }}>Inspector</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#501b36', whiteSpace: 'nowrap' }}>Fecha</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#501b36', whiteSpace: 'nowrap' }}>Estado</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#501b36', whiteSpace: 'nowrap' }}>Problemas</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#501b36', whiteSpace: 'nowrap' }}>Revisado</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {paginatedHistoryInspections.map((item: HistoryItem, index: number) => {
                            const baseBg = index % 2 === 0 ? alpha('#501b36', 0.03) : alpha('#501b36', 0.05);
                            const isInspection = item.item_type === 'inspection';
                            const inspection = isInspection ? (item as TruckInspectionSummary) : null;
                            const directOrder = !isInspection ? (item as DirectInspectionOrderSummary) : null;

                            const isConsideredReviewed = isInspection
                              ? (inspection!.has_issues ? Boolean(inspection!.is_reviewed) : true)
                              : true;
                            const rowBg = isConsideredReviewed ? alpha('#4caf50', 0.12) : baseBg;

                            const reviewChip = isInspection
                              ? inspection!.has_issues
                                ? inspection!.is_reviewed
                                  ? {
                                      label: 'Sí',
                                      color: '#4caf50',
                                      bgcolor: alpha('#4caf50', 0.1),
                                      border: alpha('#4caf50', 0.2),
                                    }
                                  : {
                                      label: 'Pendiente',
                                      color: '#ff9800',
                                      bgcolor: alpha('#ff9800', 0.1),
                                      border: alpha('#ff9800', 0.2),
                                    }
                                : {
                                    label: 'No requerido',
                                    color: '#1976d2',
                                    bgcolor: alpha('#1976d2', 0.15),
                                    border: alpha('#1976d2', 0.3),
                                  }
                              : {
                                  label: 'Sí',
                                  color: '#4caf50',
                                  bgcolor: alpha('#4caf50', 0.1),
                                  border: alpha('#4caf50', 0.2),
                                };

                            const handleClick = () => {
                              if (isInspection) {
                                handleViewDetail(inspection!);
                              } else {
                                setSelectedDirectOrder(directOrder!);
                                setDirectOrderDetailModalOpen(true);
                              }
                            };

                            return (
                              <TableRow
                                key={`${item.item_type}-${item.id}`}
                                hover
                                onClick={handleClick}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    handleClick();
                                  }
                                }}
                                sx={{
                                  backgroundColor: rowBg,
                                  cursor: 'pointer',
                                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                  '&:hover': {
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 6px 12px rgba(80, 27, 54, 0.12)',
                                  },
                                  '&:focus-visible': {
                                    outline: `2px solid ${alpha('#501b36', 0.5)}`,
                                    outlineOffset: 2,
                                  },
                                }}
                                tabIndex={0}
                                role="button"
                                aria-label={`Ver detalles de ${isInspection ? 'la inspección' : 'la orden directa'} de ${item.truck_license_plate}`}
                              >
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {isInspection ? (
                                      <LocalShipping sx={{ color: '#666', fontSize: 18 }} />
                                    ) : (
                                      <RateReview sx={{ color: '#501b36', fontSize: 18 }} />
                                    )}
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {item.truck_license_plate}
                                    </Typography>
                                    {!isInspection && (
                                      <Chip
                                        label="Orden directa"
                                        size="small"
                                        sx={{
                                          ml: 1,
                                          height: 20,
                                          fontSize: '0.65rem',
                                          bgcolor: alpha('#501b36', 0.1),
                                          color: '#501b36',
                                          fontWeight: 600,
                                        }}
                                      />
                                    )}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Person sx={{ color: '#666', fontSize: 18 }} />
                                    <Typography variant="body2">
                                      {isInspection ? inspection!.user_name : directOrder!.created_by}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">
                                    {new Date(isInspection ? inspection!.inspection_date : directOrder!.created_at).toLocaleDateString('es-ES', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  {isInspection ? (
                                    <Chip
                                      label={inspection!.has_issues ? 'Con problemas' : 'Sin problemas'}
                                      size="small"
                                      sx={{
                                        bgcolor: inspection!.has_issues ? alpha('#f44336', 0.1) : alpha('#4caf50', 0.1),
                                        color: inspection!.has_issues ? '#f44336' : '#4caf50',
                                        fontWeight: 600,
                                        fontSize: '0.7rem',
                                        borderRadius: 999,
                                        border: `1px solid ${alpha(inspection!.has_issues ? '#f44336' : '#4caf50', 0.2)}`,
                                      }}
                                    />
                                  ) : (
                                    <Chip
                                      label="Orden directa"
                                      size="small"
                                      sx={{
                                        bgcolor: alpha('#501b36', 0.1),
                                        color: '#501b36',
                                        fontWeight: 600,
                                        fontSize: '0.7rem',
                                        borderRadius: 999,
                                        border: `1px solid ${alpha('#501b36', 0.2)}`,
                                      }}
                                    />
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isInspection ? (
                                    inspection!.has_issues ? (
                                      <Typography variant="body2" sx={{ color: '#f44336' }}>
                                        {inspection!.components_with_issues.length} componente(s)
                                      </Typography>
                                    ) : (
                                      <Typography variant="body2" sx={{ color: '#4caf50' }}>
                                        Ninguno
                                      </Typography>
                                    )
                                  ) : (
                                    <Typography variant="body2" sx={{ color: '#501b36' }}>
                                      {directOrder!.modules_count} módulo(s)
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={reviewChip.label}
                                    size="small"
                                    sx={{
                                      bgcolor: reviewChip.bgcolor,
                                      color: reviewChip.color,
                                      fontWeight: 600,
                                      fontSize: '0.7rem',
                                      borderRadius: 999,
                                      border: `1px solid ${reviewChip.border}`,
                                    }}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={Math.ceil(allInspections.length / historyLimit)}
                      page={historyPage}
                      onChange={(_, page) => setHistoryPage(page)}
                      color="primary"
                      size="small"
                      sx={{
                        '& .MuiPaginationItem-root': {
                          borderRadius: 999,
                        },
                        '& .MuiPaginationItem-root.Mui-selected': {
                          backgroundColor: '#501b36',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: alpha('#501b36', 0.8),
                          },
                        },
                      }}
                    />
                  </Box>
                </>
              )}
            </>
          )}
        </Paper>
      </Fade>

      <Dialog
        open={manualModalOpen}
        onClose={handleCloseManualModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, overflow: 'hidden' },
          component: 'form',
          onSubmit: handleSubmitManualRequest,
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pr: 3,
            backgroundColor: alpha('#501b36', 0.08),
          }}
        >
          <Box>
            <Typography component="h2" variant="h6" sx={{ fontWeight: 700, color: '#501b36' }}>
              Solicitar inspección manual
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Envía un recordatorio a los trabajadores para que realicen la revisión del camión.
            </Typography>
          </Box>
          <IconButton onClick={handleCloseManualModal} edge="end" aria-label="Cerrar">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 3 }}>
          <Stack spacing={2.5}>
            <Alert
              severity="info"
              icon={<FactCheck fontSize="small" />}
              sx={{ borderRadius: 2, alignItems: 'flex-start' }}
            >
              Las solicitudes duplicadas se omiten automáticamente. El sistema solo creará nuevas
              solicitudes para los trabajadores que no tengan una pendiente.
            </Alert>

            <FormControlLabel
              control={
                <Checkbox
                  checked={manualSendToAll}
                  onChange={(_event, checked) => {
                    setManualSendToAll(checked);
                    if (checked) {
                      setManualSelectedUsers([]);
                      setManualFormError(null);
                    }
                  }}
                />
              }
              label="Enviar a todos los trabajadores activos de la empresa"
            />

            <FormControl
              fullWidth
              disabled={manualSendToAll}
              error={!manualSendToAll && Boolean(manualFormError)}
            >
              <Autocomplete<UserOption, true, false, false>
                multiple
                options={userOptions}
                value={manualSelectedUsers}
                onChange={(_event, newValue) => {
                  setManualSelectedUsers(newValue);
                  setManualFormError(null);
                }}
                getOptionLabel={(option) => option.label}
                loading={userOptionsLoading}
                disabled={manualSendToAll}
                noOptionsText={
                  userOptionsLoading
                    ? 'Cargando trabajadores...'
                    : userOptionsError || 'No se encontraron trabajadores'
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Selecciona trabajadores"
                    placeholder="Busca por nombre o email"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {userOptionsLoading ? (
                            <CircularProgress color="inherit" size={18} sx={{ mr: 1 }} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
              {!manualSendToAll && manualFormError && (
                <FormHelperText>{manualFormError}</FormHelperText>
              )}
            </FormControl>

            <TextField
              label="Mensaje (opcional)"
              multiline
              minRows={3}
              value={manualMessage}
              onChange={(event) => setManualMessage(event.target.value)}
              placeholder="Añade instrucciones o contexto adicional para el trabajador"
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2.5, gap: 1.5 }}>
          <Button
            onClick={handleCloseManualModal}
            variant="outlined"
            disabled={manualSubmitting}
            sx={{
              textTransform:'none',
              fontWeight:600,
              borderRadius:999,
              px:3,
              borderColor:'#c8b1bd',
              color:'#501b36',
              background:'linear-gradient(#ffffff,#faf7f9)',
              '&:hover':{
                borderColor:'#501b36',
                background:'linear-gradient(#fff,#f3eaef)'
              },
              '&:disabled':{
                opacity:0.5,
                background:'linear-gradient(#ffffff,#faf7f9)'
              }
            }}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={manualSubmitting || (!manualSendToAll && manualSelectedUsers.length === 0)}
            startIcon={
              manualSubmitting ? <CircularProgress size={18} color="inherit" /> : <Done />
            }
            sx={{
              borderRadius:999,
              px:3,
              py:1.1,
              fontWeight:600,
              background: 'linear-gradient(135deg, #501b36 0%, #7a2b54 100%)',
              boxShadow: '0 6px 16px rgba(80,27,54,0.25)',
              '&:hover': {
                background: 'linear-gradient(135deg, #3d1429 0%, #5a1d3a 30%, #6b2545 70%, #3d1429 100%)',
                boxShadow: '0 10px 20px rgba(80,27,54,0.35)',
              },
              '&:disabled': {
                background: alpha('#501b36', 0.2),
                boxShadow: 'none',
              },
            }}
          >
            Enviar solicitudes
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!directOrderFeedback}
        autoHideDuration={3000}
        onClose={()=>setDirectOrderFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={directOrderFeedback?.severity || 'info'} onClose={()=>setDirectOrderFeedback(null)} sx={{ fontWeight:600 }}>
          {directOrderFeedback?.message || ''}
        </Alert>
      </Snackbar>

      {/* Modal creación de orden directa */}
      <Dialog
        open={directOrderOpen}
        onClose={handleCloseDirectOrder}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          component: 'form',
          onSubmit: handleSubmitDirectOrder,
          sx: { borderRadius: 3, overflow: 'hidden' }
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pr: 2,
            background: 'linear-gradient(135deg, #501b36 0%, #6d2547 100%)',
            color: 'white'
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Crear orden directa
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              Registra una orden manual para revisión en taller.
            </Typography>
          </Box>
          <IconButton onClick={handleCloseDirectOrder} aria-label="Cerrar" sx={{ color: 'white' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 3 }}>
          <Stack spacing={2.5}>
            <Alert severity="info" icon={<FactCheck fontSize="small" />} sx={{ borderRadius: 2 }}>
              Esta orden aparecerá como pendiente hasta que sea revisada y marcada como completada.
            </Alert>
            <TextField
              label="Matrícula"
              value={directOrderPlate}
              onChange={(e)=>setDirectOrderPlate(e.target.value.toUpperCase())}
              placeholder="Ej: 1234ABC"
              required
              inputProps={{ maxLength: 10 }}
              fullWidth
            />
            <Autocomplete
              options={[{label:'Tractora', value:'TRACTORA'},{label:'Semiremolque', value:'SEMIREMOLQUE'}]}
              value={directOrderVehicleKind === 'TRACTORA' ? {label:'Tractora', value:'TRACTORA'} : {label:'Semiremolque', value:'SEMIREMOLQUE'}}
              onChange={(_e, val)=> val && setDirectOrderVehicleKind(val.value as 'TRACTORA'|'SEMIREMOLQUE')}
              renderInput={(params)=>(<TextField {...params} label="Tipo de vehículo" />)}
            />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight:600, mb:1 }}>Módulos / puntos a revisar</Typography>
              <Stack spacing={1.5}>
                {directOrderModules.map(module => (
                  <Paper 
                    key={module.temp_id} 
                    variant="outlined" 
                    sx={{ 
                      p:1.5, 
                      pt: directOrderModules.length > 1 ? 1 : 1.5,
                      borderRadius:2, 
                      display:'flex', 
                      flexDirection:'column', 
                      gap:1
                    }}
                  >
                    {directOrderModules.length > 1 && (
                      <Box sx={{ display:'flex', justifyContent:'flex-end', mb:0.5 }}>
                        <IconButton
                          size="small"
                          onClick={()=>handleRemoveModule(module.temp_id)}
                          aria-label="Eliminar módulo"
                          sx={{
                            width:26,
                            height:26,
                            color:'#7a2b54',
                            border:'1px solid rgba(122,43,84,0.25)',
                            background:'transparent',
                            borderRadius: '8px',
                            transition:'all .2s',
                            boxShadow:'none',
                            '&:hover':{
                              background:'rgba(122,43,84,0.08)',
                              color:'#501b36'
                            },
                            '&:active':{
                              transform:'scale(.95)'
                            }
                          }}
                        >
                          <Delete sx={{ fontSize:16 }} />
                        </IconButton>
                      </Box>
                    )}
                    <Stack spacing={1}>
                      <TextField
                        label="Título" size="small" value={module.title}
                        onChange={(e)=>handleModuleChange(module.temp_id,'title', e.target.value)}
                        placeholder="Ej: Frenos, Neumáticos..."
                      />
                      <TextField
                        label="Notas" size="small" multiline minRows={2} value={module.notes}
                        onChange={(e)=>handleModuleChange(module.temp_id,'notes', e.target.value)}
                        placeholder="Observaciones específicas a revisar"
                      />
                    </Stack>
                  </Paper>
                ))}
                <Button
                  type="button"
                  startIcon={<Add />}
                  onClick={handleAddModule}
                  variant="outlined"
                  sx={{ alignSelf:'flex-start', borderRadius:999 }}
                >
                  Añadir módulo
                </Button>
              </Stack>
            </Box>
            {directOrderFeedback && directOrderFeedback.severity==='error' && (
              <Alert severity="error" onClose={()=>setDirectOrderFeedback(null)} sx={{ borderRadius:2 }}>
                {directOrderFeedback.message}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px:3, py:2.5, gap:1 }}>
          <Button
            onClick={handleCloseDirectOrder}
            type="button"
            disabled={directOrderSubmitting}
            variant="outlined"
            sx={{ textTransform:'none', borderRadius:2 }}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={directOrderSubmitting}
            variant="contained"
            startIcon={directOrderSubmitting ? <CircularProgress size={18} color="inherit" /> : <FactCheck />}
            sx={{ textTransform:'none', borderRadius:2, fontWeight:600, background:'linear-gradient(135deg,#501b36,#6d2547)' }}
          >
            {directOrderSubmitting ? 'Creando...' : 'Crear orden'}
          </Button>
        </DialogActions>
      </Dialog>

      <InspectionDetailModal
        open={detailModalOpen}
        inspection={selectedInspection}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedInspection(null);
        }}
        onMarkReviewed={handleMarkReviewed}
      />

      {/* Modal de detalle de orden directa */}
      <DirectOrderDetailModal
        open={directOrderDetailModalOpen}
        order={selectedDirectOrder}
        onClose={handleCloseDirectOrderDetail}
        onRefresh={handleRefreshDirectOrders}
      />

      {/* Modal de advertencia para desactivación */}
      <Dialog
        open={deactivationWarningOpen}
        onClose={handleCancelDeactivation}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
        }}>
          <Warning sx={{ color: '#ff5722', fontSize: 24 }} />
          <Typography variant="h6">
            Desactivar Inspecciones Automáticas
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Estás a punto de desactivar las inspecciones automáticas cada 15 días.
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 1 }}>
            Esto significa que:
          </Typography>
          
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
              Los trabajadores NO recibirán notificaciones automáticas
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
              Solo podrás enviar solicitudes manuales
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
              Puede afectar el cumplimiento del mantenimiento preventivo
            </Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            ¿Estás seguro de que quieres continuar?
          </Typography>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCancelDeactivation} variant="outlined">
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmDeactivation} 
            variant="contained" 
            color="error"
          >
            Sí, Desactivar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// Componente para previsualizar imágenes
const ImagePreviewModal: React.FC<{
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
}> = ({ open, onClose, imageUrl, title }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const imageDialogTitleId = 'image-preview-dialog-title';

  const handleImageLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleImageError = () => {
    setLoading(false);
    setError(true);
  };

  React.useEffect(() => {
    if (open) {
      setLoading(true);
      setError(false);
    }
  }, [open, imageUrl]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby={imageDialogTitleId}
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'hidden'
        }
      }}
    >
      <Box
        component="header"
        id={imageDialogTitleId}
        sx={{ 
          backgroundColor: '#501b36',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 3,
          py: 2.5
        }}
      >
        <Typography component="h2" variant="h6" sx={{ fontSize: '1.25rem', fontWeight: 500, color: 'inherit' }}>
          {title || 'Vista previa de imagen'}
        </Typography>
        <IconButton 
          onClick={onClose}
          sx={{ 
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              transform: 'scale(1.1)'
            },
            transition: 'all 0.2s ease'
          }}
        >
          <Close />
        </IconButton>
      </Box>
      <DialogContent sx={{ p: 0, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 4 }}>
            <CircularProgress size={24} sx={{ color: '#501b36' }} />
            <Typography color="text.secondary">Cargando imagen...</Typography>
          </Box>
        )}
        
        {error && (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <ErrorOutline sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
            <Typography color="text.secondary">
              Error al cargar la imagen
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              URL: {imageUrl}
            </Typography>
          </Box>
        )}
        
        <Box
          component="img"
          src={imageUrl}
          alt="Vista previa"
          sx={{
            width: '100%',
            height: 'auto',
            display: loading || error ? 'none' : 'block',
            maxHeight: '70vh',
            objectFit: 'contain'
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </DialogContent>
    </Dialog>
  );
};