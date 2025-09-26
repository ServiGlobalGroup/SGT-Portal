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
  Badge,
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
} from '@mui/material';
import { alpha } from '@mui/material/styles';
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
} from '@mui/icons-material';
import { Settings, ToggleOff, ToggleOn } from '@mui/icons-material';
import { truckInspectionService } from '../services/truckInspectionService';
import { usersAPI } from '../services/api';
import {
  MarkInspectionReviewedResponse,
  TruckInspectionSummary,
  TruckInspectionResponse,
  TruckInspectionRequestCreate,
} from '../types/truck-inspection';
import { useAuth } from '../hooks/useAuth';
import { useAutoInspectionSettings } from '../hooks/useAutoInspectionSettings';

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
      
      <DialogContent>
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

export const TruckInspectionRevisions: React.FC = () => {
  const { selectedCompany, isAuthenticated, token, user } = useAuth();
  const { settings: autoSettings, loading: autoLoading, updateSettings: updateAutoSettings } = useAutoInspectionSettings();

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

  // Estado para el historial
  const [rawInspections, setRawInspections] = useState<TruckInspectionSummary[]>([]); // Datos sin filtrar del servidor
  const [allInspections, setAllInspections] = useState<TruckInspectionSummary[]>([]); // Datos filtrados para mostrar
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
      
      // Cargar más datos para filtrado del lado del cliente (50 registros para debug)
      const params = {
        limit: 50,
        offset: 0,
      };
      
      const inspections = await truckInspectionService.getInspections(params);
      console.log('DEBUG: Raw inspections loaded:', inspections.length, inspections);
      setRawInspections(inspections);
    } catch (err: any) {
      console.error('Error loading inspection history:', err);
      setHistoryError(err.message || 'Error al cargar el historial de inspecciones');
    } finally {
      setHistoryLoading(false);
    }
  };

  const refreshInspectionHistorySilently = useCallback(async () => {
    try {
      const params = {
        limit: 50,
        offset: 0,
      };
      const inspections = await truckInspectionService.getInspections(params);
      setRawInspections(inspections);
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
      let filteredInspections = [...rawInspections];

      // Solo filtrar si hay filtros con valores reales
      const hasActiveFilters = historyFilters.dateFrom || historyFilters.dateTo || 
                              historyFilters.conductor.trim() || historyFilters.truckLicense.trim();

      if (hasActiveFilters) {
        filteredInspections = rawInspections.filter(inspection => {
          const inspectionDate = new Date(inspection.inspection_date);
          const from = historyFilters.dateFrom ? new Date(historyFilters.dateFrom) : null;
          const to = historyFilters.dateTo ? new Date(historyFilters.dateTo + 'T23:59:59') : null;
          
          // Filtro por fecha
          if (from && inspectionDate < from) return false;
          if (to && inspectionDate > to) return false;
          
          // Filtro por conductor (usuario que hizo la revisión)
          if (historyFilters.conductor.trim()) {
            const conductorFilter = historyFilters.conductor.toLowerCase();
            const userName = inspection.user_name?.toLowerCase() || '';
            if (!userName.includes(conductorFilter)) return false;
          }

          // Filtro por matrícula
          if (historyFilters.truckLicense.trim()) {
            const licenseFilter = historyFilters.truckLicense.toLowerCase();
            const truckLicense = inspection.truck_license_plate?.toLowerCase() || '';
            if (!truckLicense.includes(licenseFilter)) return false;
          }
          
          return true;
        });
      }

      setAllInspections(filteredInspections);
      console.log('DEBUG: Filtered inspections:', filteredInspections.length, 'Raw:', rawInspections.length, 'Filters:', historyFilters);
      // Resetear página si el filtro reduce el número de elementos
      if (historyPage > Math.ceil(filteredInspections.length / historyLimit)) {
        setHistoryPage(1);
      }
    };

    applyFilters();
  }, [rawInspections, historyFilters, historyLimit, historyPage]);

  // Cargar opciones de usuarios al montar el componente
  // useEffect(() => {
  //   loadUserOptions();
  // }, []);

  const handleViewDetail = (inspection: TruckInspectionSummary) => {
    setSelectedInspection(inspection);
    setDetailModalOpen(true);
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
        <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', background: '#ffffff', p: 4, minHeight: 400 }}>
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
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#501b36', mb: 0.5 }}>
                  Centro de Revisiones - Inspecciones Pendientes
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Inspecciones de camiones con incidencias que requieren atención del taller
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              {canManageAutoSettings && autoSettings && (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <Tooltip
                    title={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                          Inspecciones Automáticas cada 15 días
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          {autoSettings.auto_inspection_enabled ? (
                            <>
                              <strong>Estado:</strong> ACTIVADAS ✅<br />
                              • Los trabajadores deben realizar una inspección cada 15 días<br />
                              • El sistema notifica automáticamente cuando es necesaria<br />
                              • Ayuda a mantener el mantenimiento preventivo al día
                            </>
                          ) : (
                            <>
                              <strong>Estado:</strong> DESACTIVADAS ⚠️<br />
                              • Los trabajadores NO reciben notificaciones automáticas<br />
                              • Solo se pueden enviar solicitudes manuales<br />
                              • Puede afectar el cumplimiento del mantenimiento preventivo
                            </>
                          )}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          Haz clic para {autoSettings.auto_inspection_enabled ? 'desactivar' : 'activar'}
                        </Typography>
                      </Box>
                    }
                    arrow
                    placement="top"
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1.5,
                      cursor: 'pointer',
                    }}
                    onClick={handleToggleAutoInspection}
                    >
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          color: autoSettings.auto_inspection_enabled ? '#4caf50' : '#64748b',
                        }}
                      >
                        Automática cada 15 días
                      </Typography>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          cursor: autoLoading ? 'default' : 'pointer',
                          opacity: autoLoading ? 0.6 : 1,
                          userSelect: 'none',
                          transition: 'opacity 0.2s ease',
                          '&:hover': {
                            opacity: autoLoading ? 0.6 : 0.8,
                          }
                        }}
                      >
                        <Box
                          sx={{
                            width: 44,
                            height: 24,
                            borderRadius: 2,
                            bgcolor: autoSettings.auto_inspection_enabled ? '#4caf50' : '#e0e0e0',
                            position: 'relative',
                            transition: 'background-color 0.3s ease',
                            cursor: 'pointer',
                          }}
                        >
                          <Box
                            sx={{
                              width: 20,
                              height: 20,
                              borderRadius: 1,
                              bgcolor: 'white',
                              position: 'absolute',
                              top: 2,
                              left: autoSettings.auto_inspection_enabled ? 22 : 2,
                              transition: 'left 0.3s ease',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            }}
                          />
                        </Box>
                      </Box>
                    </Box>
                  </Tooltip>
                </Box>
              )}

              {canSendManualRequests && (
                <Button
                  onClick={handleOpenManualModal}
                  variant="contained"
                  startIcon={<RateReview />}
                  sx={{
                    borderRadius: 999,
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 3,
                    py: 1.2,
                    background: 'linear-gradient(135deg, #501b36 0%, #7a2b54 100%)',
                    boxShadow: '0 6px 16px rgba(80, 27, 54, 0.25)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #3d1429 0%, #5a1f3d 100%)',
                      boxShadow: '0 10px 20px rgba(80, 27, 54, 0.3)',
                    },
                  }}
                >
                  Solicitar inspección manual
                </Button>
              )}
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {pendingInspections.length === 0 && !error ? (
            <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, bgcolor: '#f8f9fa', textAlign: 'center' }}>
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
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#501b36' }}>Matrícula</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#501b36' }}>Inspector</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#501b36' }}>Fecha</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#501b36' }}>Componentes con Problemas</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#501b36' }}>Urgencia</TableCell>
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
                              minute: '2-digit'
                            })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {inspection.components_with_issues.slice(0, 3).map((component: string, index: number) => (
                              <Chip 
                                key={index}
                                label={component}
                                size="small"
                                sx={{ 
                                  bgcolor: alpha('#f44336', 0.1),
                                  color: '#f44336',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  borderRadius: 999, // Estilo pill
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
                                  borderRadius: 999, // Estilo pill
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
                              borderRadius: 999, // Estilo pill
                              border: `1px solid ${alpha(urgency.color, 0.2)}`,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={pendingInspections.length}
                page={pendingPage}
                onPageChange={handlePendingPageChange}
                rowsPerPage={pendingRowsPerPage}
                onRowsPerPageChange={handlePendingRowsPerPageChange}
                rowsPerPageOptions={[5, 10, 15]}
                labelRowsPerPage="Por página"
                sx={{ borderTop: '1px solid rgba(80, 27, 54, 0.08)' }}
              />
            </TableContainer>
          )}
        </Paper>
      </Fade>

      {/* Historial de Inspecciones */}
      <Fade in timeout={1600}>
        <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', background: '#ffffff', p: 4, mt: 4 }}>
          {/* Header del historial */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <History sx={{ color: '#501b36', fontSize: 32 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#501b36', mb: 0.5 }}>
                Historial de Inspecciones
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Registro completo de todas las inspecciones realizadas
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
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: '#501b36' }}>Matrícula</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#501b36' }}>Inspector</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#501b36' }}>Fecha</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#501b36' }}>Estado</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#501b36' }}>Problemas</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#501b36' }}>Revisado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allInspections.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            No se encontraron inspecciones con los filtros aplicados
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedHistoryInspections.map((inspection: TruckInspectionSummary, index: number) => {
                        const baseBg = index % 2 === 0 ? alpha('#501b36', 0.03) : alpha('#501b36', 0.05);
                        const isConsideredReviewed = inspection.has_issues ? Boolean(inspection.is_reviewed) : true;
                        const rowBg = isConsideredReviewed ? alpha('#4caf50', 0.12) : baseBg;
                        const reviewChip = inspection.has_issues
                          ? inspection.is_reviewed
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
                            };
                        return (
                        <TableRow
                          key={inspection.id}
                          hover
                          onClick={() => handleViewDetail(inspection)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              handleViewDetail(inspection);
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
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={inspection.has_issues ? 'Con problemas' : 'Sin problemas'}
                              size="small"
                              sx={{
                                bgcolor: inspection.has_issues ? alpha('#f44336', 0.1) : alpha('#4caf50', 0.1),
                                color: inspection.has_issues ? '#f44336' : '#4caf50',
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                borderRadius: 999, // Estilo pill
                                border: `1px solid ${alpha(inspection.has_issues ? '#f44336' : '#4caf50', 0.2)}`,
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            {inspection.has_issues ? (
                              <Typography variant="body2" sx={{ color: '#f44336' }}>
                                {inspection.components_with_issues.length} componente(s)
                              </Typography>
                            ) : (
                              <Typography variant="body2" sx={{ color: '#4caf50' }}>
                                Ninguno
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
                                borderRadius: 999, // Estilo pill
                                border: `1px solid ${reviewChip.border}`,
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Paginación */}
              {allInspections.length > 0 && (
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
            variant="text"
            sx={{ textTransform: 'none', fontWeight: 600, color: '#501b36' }}
            disabled={manualSubmitting}
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
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 999,
              px: 3.5,
              py: 1.1,
              background: 'linear-gradient(135deg, #501b36 0%, #7a2b54 100%)',
              boxShadow: '0 6px 16px rgba(80, 27, 54, 0.25)',
              '&:hover': {
                background: 'linear-gradient(135deg, #3d1429 0%, #5a1f3d 100%)',
                boxShadow: '0 10px 20px rgba(80, 27, 54, 0.3)',
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

      {manualFeedback && (
        <Snackbar
          open
          autoHideDuration={3000}
          onClose={handleManualFeedbackClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            severity={manualFeedback.severity}
            onClose={handleManualFeedbackClose}
            sx={{ 
              width: '100%',
              borderRadius: 2,
              fontWeight: 600,
            }}
          >
            {manualFeedback.message}
          </Alert>
        </Snackbar>
      )}

      <InspectionDetailModal
        open={detailModalOpen}
        inspection={selectedInspection}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedInspection(null);
        }}
        onMarkReviewed={handleMarkReviewed}
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