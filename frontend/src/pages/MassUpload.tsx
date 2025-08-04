import React, { useState, useEffect, useCallback } from 'react';
import { PaginationComponent } from '../components/PaginationComponent';
import { usePagination } from '../hooks/usePagination';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Alert,
  CircularProgress,
  MenuItem,
  Fade,
  GlobalStyles,
  FormControl,
  InputLabel,
  Select,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  FormHelperText,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  CloudUpload,
  PictureAsPdf,
  Refresh,
  History as HistoryIcon,
  Assignment,
  CheckCircle,
  Error as ErrorIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Search,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { hasPermission, Permission } from '../utils/permissions';

// Interfaces
interface UploadState {
  isDragOver: boolean;
  isUploading: boolean;
  uploadProgress: number;
  file: File | null;
  documentType: 'multiple' | 'multiple-dietas' | 'documentos-generales' | '';
  month: string;
  year: string;
  error: string | null;
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

interface UploadHistoryItem {
  id: number;
  file_name: string;
  upload_date: string;
  user_dni: string;
  user_name: string;
  document_type: string;
  month: string;
  year: string;
  total_pages: number;
  successful_pages: number;
  failed_pages: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface UploadHistoryResponse {
  items: UploadHistoryItem[];
  total: number;
}

export const MassUpload: React.FC = () => {
  const { user } = useAuth();
  const [uploadState, setUploadState] = useState<UploadState>({
    isDragOver: false,
    isUploading: false,
    uploadProgress: 0,
    file: null,
    documentType: '',
    month: '',
    year: new Date().getFullYear().toString(),
    error: null,
  });

  const [processingResults, setProcessingResults] = useState<ProcessingResult | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Verificar permisos
  useEffect(() => {
    if (user && !hasPermission(user, Permission.MASS_UPLOAD)) {
      window.location.href = '/dashboard';
    }
  }, [user]);

  useEffect(() => {
    loadUploadHistory();
  }, []);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

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

  const loadUploadHistory = async () => {
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://127.0.0.1:8000/api/user-files/upload-history', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // El backend devuelve { items: [...], total: number }
        const historyArray = data.items || [];
        setUploadHistory(historyArray);
      } else {
        console.error('Error loading upload history:', response.statusText);
        setAlert({ type: 'error', message: 'Error al cargar el historial de subidas' });
      }
    } catch (error) {
      console.error('Error loading upload history:', error);
      setAlert({ type: 'error', message: 'Error al cargar el historial de subidas' });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState(prev => ({ ...prev, isDragOver: true }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState(prev => ({ ...prev, isDragOver: false }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState(prev => ({ ...prev, isDragOver: false }));
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        setUploadState(prev => ({ ...prev, file, error: null }));
      } else {
        setUploadState(prev => ({ ...prev, error: 'Solo se permiten archivos PDF' }));
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        setUploadState(prev => ({ ...prev, file, error: null }));
      } else {
        setUploadState(prev => ({ ...prev, error: 'Solo se permiten archivos PDF' }));
      }
    }
  };

  const handleUpload = async () => {
    const isYearValid = uploadState.year.length === 4 && 
                       parseInt(uploadState.year) >= 2000 && 
                       parseInt(uploadState.year) <= 2050;
    
    // Para documentos generales no requerimos mes/año
    const requiresMonthYear = uploadState.documentType !== 'documentos-generales';
    
    if (!uploadState.file || !uploadState.documentType || 
        (requiresMonthYear && (!uploadState.month || !uploadState.year || !isYearValid))) {
      const message = requiresMonthYear 
        ? 'Por favor, completa todos los campos requeridos y verifica que el año sea válido'
        : 'Por favor, selecciona un archivo y el tipo de documento';
      setAlert({ type: 'error', message });
      return;
    }

    setUploadState(prev => ({ ...prev, isUploading: true, uploadProgress: 0 }));

    try {
      const formData = new FormData();
      formData.append('file', uploadState.file);
      
      // Solo agregar month_year para nóminas y dietas
      if (uploadState.documentType !== 'documentos-generales') {
        const monthYear = `${uploadState.month}_${uploadState.year}`;
        formData.append('month_year', monthYear);
      }

      const endpoint = uploadState.documentType === 'multiple' 
        ? 'http://127.0.0.1:8000/api/payroll/process-multiple-payrolls'
        : uploadState.documentType === 'multiple-dietas'
        ? 'http://127.0.0.1:8000/api/payroll/process-multiple-dietas'
        : 'http://127.0.0.1:8000/api/documents/upload-general-documents';

      const token = localStorage.getItem('access_token');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setProcessingResults(result);
        setShowResultsModal(true);
        setUploadState(prev => ({ 
          ...prev, 
          file: null, 
          documentType: '', 
          month: '', 
          year: new Date().getFullYear().toString() 
        }));
        loadUploadHistory(); // Recargar historial después de subida exitosa
        setAlert({ type: 'success', message: 'Documentos procesados exitosamente' });
      } else {
        const errorData = await response.json();
        setAlert({ type: 'error', message: errorData.detail || 'Error al procesar documentos' });
      }
    } catch (error) {
      console.error('Error uploading:', error);
      setAlert({ type: 'error', message: 'Error de conexión al servidor' });
    } finally {
      setUploadState(prev => ({ ...prev, isUploading: false, uploadProgress: 0 }));
    }
  };

  const clearFile = () => {
    setUploadState(prev => ({ ...prev, file: null, error: null }));
  };

  const getStatusChip = (status: string, successfulPages: number, totalPages: number) => {
    if (status === 'processing') {
      return (
        <Chip
          icon={<CircularProgress size={16} />}
          label="Procesando"
          size="small"
          color="info"
          sx={{ borderRadius: 2, fontWeight: 600 }}
        />
      );
    }
    
    if (successfulPages === totalPages) {
      return (
        <Chip
          icon={<CheckCircle />}
          label="Completado"
          size="small"
          color="success"
          sx={{ borderRadius: 2, fontWeight: 600 }}
        />
      );
    } else if (successfulPages > 0) {
      return (
        <Chip
          icon={<WarningIcon />}
          label="Parcial"
          size="small"
          color="warning"
          sx={{ borderRadius: 2, fontWeight: 600 }}
        />
      );
    } else {
      return (
        <Chip
          icon={<ErrorIcon />}
          label="Error"
          size="small"
          color="error"
          sx={{ borderRadius: 2, fontWeight: 600 }}
        />
      );
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple':
        return '📄 Nóminas Múltiples';
      case 'multiple-dietas':
        return '🍽️ Dietas Múltiples';
      case 'documentos-generales':
        return '📚 Documentos Generales';
      default:
        return type;
    }
  };

  const filteredHistory = Array.isArray(uploadHistory) ? uploadHistory.filter(item =>
    item.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getDocumentTypeLabel(item.document_type).toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  // Estados para paginación del historial
  const historyPagination = usePagination({
    data: filteredHistory,
    initialItemsPerPage: 10,
    initialPage: 1
  });

  // Reset página cuando cambia el término de búsqueda
  useEffect(() => {
    historyPagination.setCurrentPage(1);
  }, [searchTerm, historyPagination.setCurrentPage]);

  // Reset página cuando cambia el historial
  useEffect(() => {
    historyPagination.setCurrentPage(1);
  }, [uploadHistory, historyPagination.setCurrentPage]);

  if (!user || !hasPermission(user, Permission.MASS_UPLOAD)) {
    return null;
  }

  return (
    <>
      <GlobalStyles
        styles={{
          body: {
            paddingRight: '0px !important',
            overflow: 'auto !important',
            overflowX: 'hidden !important',
          },
          '.MuiModal-root': {
            paddingRight: '0px !important',
          },
          '.MuiPopover-root': {
            paddingRight: '0px !important',
          },
          '.MuiSelect-select': {
            outline: 'none !important',
            '&:focus': {
              outline: 'none !important',
              boxShadow: 'none !important',
            },
          },
          '.MuiTableContainer-root': {
            overflowX: 'hidden !important',
          },
          '.MuiTable-root': {
            overflowX: 'hidden !important',
          },
        }}
      />
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', bgcolor: '#f5f5f5', minHeight: '100vh' }}>
        {/* Header Principal */}
        <Box sx={{ mb: 4 }}>
          <Fade in timeout={800}>
            <Paper 
              elevation={0}
              sx={{
                p: { xs: 3, sm: 4 },
                background: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 50%, #d4a574 100%)',
                color: 'white',
                borderRadius: 3,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Cpath d="m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                },
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: 2,
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <CloudUpload sx={{ fontSize: 32 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Subida Masiva
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
                      Procesamiento masivo de nóminas, dietas y documentos generales
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Fade>
        </Box>

        {/* Alertas */}
        {alert && (
          <Fade in timeout={400}>
            <Alert 
              severity={alert.type} 
              sx={{ 
                mb: 3,
                borderRadius: 2,
                '& .MuiAlert-icon': {
                  fontSize: 24
                }
              }} 
              onClose={() => setAlert(null)}
            >
              {alert.message}
            </Alert>
          </Fade>
        )}

        {/* Formulario de Subida */}
        <Fade in timeout={1000}>
          <Paper
            elevation={0}
            sx={{
              mb: 3,
              borderRadius: 2,
              overflow: 'hidden',
              border: '1px solid #e0e0e0',
              background: '#ffffff',
            }}
          >
            <Box sx={{ p: 3 }}>
              {/* Configuración de documentos */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3, mb: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Documento</InputLabel>
                  <Select
                    value={uploadState.documentType}
                    label="Tipo de Documento"
                    onChange={(e) => setUploadState(prev => ({ ...prev, documentType: e.target.value as any }))}
                    sx={{
                      borderRadius: 2,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(0, 0, 0, 0.15)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#501b36',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#501b36',
                      },
                    }}
                  >
                    <MenuItem value="multiple">📄 Nóminas Múltiples</MenuItem>
                    <MenuItem value="multiple-dietas">🍽️ Dietas Múltiples</MenuItem>
                    <MenuItem value="documentos-generales">📚 Documentos Generales</MenuItem>
                  </Select>
                  {uploadState.documentType === 'documentos-generales' && (
                    <FormHelperText sx={{ mt: 1, color: 'info.main' }}>
                      📚 Los documentos generales (manuales, guías, políticas) estarán disponibles para todos los trabajadores en la carpeta "Documentos".
                    </FormHelperText>
                  )}
                </FormControl>

                {(uploadState.documentType === 'multiple' || uploadState.documentType === 'multiple-dietas') && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <FormControl fullWidth>
                      <InputLabel>Mes</InputLabel>
                      <Select
                        value={uploadState.month}
                        label="Mes"
                        onChange={(e) => setUploadState(prev => ({ ...prev, month: e.target.value }))}
                        sx={{
                          borderRadius: 2,
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(0, 0, 0, 0.15)',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#501b36',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#501b36',
                          },
                        }}
                      >
                        {months.map((month) => (
                          <MenuItem key={month.value} value={month.value}>
                            {month.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      fullWidth
                      label="Año"
                      value={uploadState.year}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Solo permitir números y máximo 4 dígitos
                        if (/^\d{0,4}$/.test(value)) {
                          setUploadState(prev => ({ ...prev, year: value }));
                        }
                      }}
                      placeholder="Ej: 2025"
                      helperText={
                        uploadState.year && uploadState.year.length === 4 && 
                        (parseInt(uploadState.year) < 2000 || parseInt(uploadState.year) > 2050) 
                          ? "Año debe estar entre 2000 y 2050" 
                          : ""
                      }
                      error={
                        uploadState.year.length === 4 && 
                        (parseInt(uploadState.year) < 2000 || parseInt(uploadState.year) > 2050)
                      }
                      inputProps={{
                        inputMode: 'numeric',
                        pattern: '[0-9]*',
                        maxLength: 4
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '& fieldset': {
                            borderColor: 'rgba(0, 0, 0, 0.15)',
                          },
                          '&:hover fieldset': {
                            borderColor: '#501b36',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#501b36',
                          },
                        },
                      }}
                    />
                  </Box>
                )}
              </Box>

              {/* Zona de subida de archivos */}
              <Box
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                sx={{
                  border: uploadState.isDragOver ? '2px dashed #501b36' : '2px dashed #d0d0d0',
                  borderRadius: 3,
                  p: 4,
                  textAlign: 'center',
                  bgcolor: uploadState.isDragOver ? alpha('#501b36', 0.05) : '#fafafa',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  cursor: 'pointer',
                  mb: 3,
                  '&:hover': {
                    borderColor: '#501b36',
                    bgcolor: alpha('#501b36', 0.02),
                  },
                }}
              >
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                  }}
                />
                
                {uploadState.file ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <PictureAsPdf sx={{ fontSize: 48, color: '#d32f2f' }} />
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#501b36' }}>
                        {uploadState.file.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {(uploadState.file.size / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                    </Box>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFile();
                      }}
                      sx={{
                        color: '#d32f2f',
                        '&:hover': {
                          bgcolor: alpha('#d32f2f', 0.1),
                        },
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ) : (
                  <>
                    <CloudUpload sx={{ fontSize: 64, color: '#501b36', mb: 2 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#501b36', mb: 1 }}>
                      Arrastra tu archivo PDF aquí
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                      o haz clic para seleccionar desde tu dispositivo
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Solo archivos PDF • Máximo 50MB
                    </Typography>
                  </>
                )}
              </Box>

              {uploadState.error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {uploadState.error}
                </Alert>
              )}

              {uploadState.isUploading && (
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Procesando documentos...
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="indeterminate" 
                    sx={{ 
                      borderRadius: 2,
                      height: 8,
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 2,
                        bgcolor: '#501b36',
                      },
                    }} 
                  />
                </Box>
              )}

              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={
                  !uploadState.file || 
                  !uploadState.documentType || 
                  uploadState.isUploading ||
                  // Para documentos generales no requerimos mes/año
                  (uploadState.documentType !== 'documentos-generales' && (!uploadState.month || !uploadState.year)) ||
                  // Validar año solo si está presente
                  (uploadState.year.length > 0 && uploadState.year.length === 4 && (parseInt(uploadState.year) < 2000 || parseInt(uploadState.year) > 2050))
                }
                startIcon={<CloudUpload />}
                sx={{
                  borderRadius: 2,
                  px: 4,
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  backgroundColor: '#501b36',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: '#3d1429',
                  },
                  '&:disabled': {
                    backgroundColor: '#ccc',
                  },
                }}
              >
                {uploadState.isUploading ? 'Procesando...' : 'Procesar Documentos'}
              </Button>
            </Box>
          </Paper>
        </Fade>

        {/* Historial de Subidas */}
        <Fade in timeout={1200}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              border: '1px solid #e0e0e0',
              background: '#ffffff',
            }}
          >
            {/* Header del historial */}
            <Box sx={{ 
              p: 3, 
              borderBottom: 1, 
              borderColor: 'divider',
              background: alpha('#501b36', 0.02),
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <HistoryIcon sx={{ color: '#501b36', fontSize: 28 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#501b36' }}>
                    Historial de Subidas
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {filteredHistory.length} subida{filteredHistory.length !== 1 ? 's' : ''} realizada{filteredHistory.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={loadUploadHistory}
                  disabled={historyLoading}
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: '#501b36',
                    color: '#501b36',
                    '&:hover': {
                      borderColor: '#3d1429',
                      bgcolor: alpha('#501b36', 0.04),
                    },
                  }}
                >
                  {historyLoading ? 'Actualizando...' : 'Actualizar'}
                </Button>
              </Box>

              {/* Buscador */}
              <TextField
                placeholder="Buscar en historial..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
                sx={{ 
                  maxWidth: 400,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#501b36',
                      },
                    },
                  },
                }}
                size="small"
              />
            </Box>

            {/* Contenido del historial */}
            {historyLoading ? (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 6,
                gap: 2
              }}>
                <CircularProgress size={48} sx={{ color: '#501b36' }} />
                <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                  Cargando historial...
                </Typography>
              </Box>
            ) : filteredHistory.length === 0 ? (
              <Box sx={{ 
                p: 6, 
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2
              }}>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: '50%',
                    bgcolor: alpha('#501b36', 0.1),
                    mb: 2,
                  }}
                >
                  <Assignment sx={{ fontSize: 48, color: '#501b36' }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                  No hay subidas registradas
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, maxWidth: 400 }}>
                  {searchTerm 
                    ? `No se encontraron subidas que coincidan con "${searchTerm}"`
                    : 'Las subidas masivas que realices aparecerán aquí'
                  }
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer
                  sx={{
                    overflowX: 'hidden !important',
                    '&::-webkit-scrollbar': {
                      display: 'none',
                    },
                    '-ms-overflow-style': 'none',
                    'scrollbar-width': 'none',
                  }}
                >
                  <Table>
                    <TableHead>
                      <TableRow 
                        sx={{ 
                          bgcolor: alpha('#501b36', 0.02),
                          '& .MuiTableCell-head': {
                            fontWeight: 700,
                            color: '#501b36',
                            borderBottom: `2px solid ${alpha('#501b36', 0.1)}`,
                            py: 2,
                          }
                        }}
                      >
                        <TableCell>Archivo</TableCell>
                        <TableCell>Usuario</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Páginas Procesadas</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell>Fecha</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {historyPagination.paginatedData.map((item: any) => (
                        <TableRow 
                          key={item.id} 
                          hover
                          sx={{
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: alpha('#501b36', 0.02),
                              transform: 'translateX(4px)',
                            },
                            '& .MuiTableCell-root': {
                              borderBottom: `1px solid ${alpha('#501b36', 0.06)}`,
                              py: 2,
                            }
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Box
                                sx={{
                                  p: 1.5,
                                  borderRadius: 2,
                                  bgcolor: alpha('#d32f2f', 0.1),
                                }}
                              >
                                <PictureAsPdf sx={{ color: '#d32f2f' }} />
                              </Box>
                              <Box>
                                <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                                  {item.file_name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  ID: {item.id}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                {item.user_name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {item.user_dni}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getDocumentTypeLabel(item.document_type)}
                              size="small"
                              variant="outlined"
                              sx={{
                                borderRadius: 2,
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                borderColor: alpha('#501b36', 0.3),
                                color: '#501b36',
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {item.successful_pages} / {item.total_pages}
                            </Typography>
                            {item.failed_pages > 0 && (
                              <Typography variant="caption" sx={{ color: '#d32f2f' }}>
                                {item.failed_pages} fallidas
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusChip(item.status, item.successful_pages, item.total_pages)}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              {new Date(item.upload_date).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Paginación mejorada */}
                {filteredHistory.length > 0 && (
                  <Box sx={{ 
                    p: 3,
                    borderTop: `1px solid ${alpha('#501b36', 0.1)}`,
                    bgcolor: alpha('#501b36', 0.02)
                  }}>
                    {/* Información de resultados */}
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 2,
                      mb: 2
                    }}>
                      <PaginationComponent
                        currentPage={historyPagination.currentPage}
                        itemsPerPage={historyPagination.itemsPerPage}
                        totalItems={filteredHistory.length}
                        onPageChange={historyPagination.setCurrentPage}
                        onItemsPerPageChange={historyPagination.setItemsPerPage}
                      />
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Paper>
        </Fade>

        {/* Modal de Resultados */}
        <Dialog
          open={showResultsModal}
          onClose={() => setShowResultsModal(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
            }
          }}
        >
          <DialogTitle sx={{
            backgroundColor: processingResults?.success ? '#4caf50' : '#f44336',
            color: 'white',
            py: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}>
            {processingResults?.success ? <CheckCircle sx={{ fontSize: 28 }} /> : <ErrorIcon sx={{ fontSize: 28 }} />}
            <Box>
              <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                {processingResults?.success ? 'Procesamiento Completado' : 'Procesamiento con Errores'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {processingResults?.stats?.successful || 0} de {processingResults?.stats?.total_pages || 0} documentos procesados
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            {processingResults && (
              <Box>
                {/* Resumen */}
                <Box sx={{ p: 3, bgcolor: '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Resumen de Procesamiento
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2 }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#4caf50' }}>
                        {processingResults.stats?.successful || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Exitosos
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2 }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#f44336' }}>
                        {processingResults.stats?.failed || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Fallidos
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2 }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#501b36' }}>
                        {processingResults.stats?.total_pages || 0}
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
                    {processingResults.results?.assignment_details?.map((detail, index) => (
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
              onClick={() => setShowResultsModal(false)}
              variant="contained"
              sx={{
                borderRadius: 2,
                px: 4,
                textTransform: 'none',
                fontWeight: 600,
                backgroundColor: '#501b36',
                '&:hover': {
                  backgroundColor: '#3d1429',
                },
              }}
            >
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
};
