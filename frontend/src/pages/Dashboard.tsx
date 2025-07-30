import React, { useState, useCallback, useEffect } from 'react';
import {
  Paper,
  Typography,
  Card,
  Box,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  LinearProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
} from '@mui/material';
import {
  CloudUpload,
  PictureAsPdf,
  FileUpload,
  Check,
  Search,
  FilterList,
  AutoAwesome,
  CheckCircle,
  Error,
  AssignmentTurnedIn,
} from '@mui/icons-material';
import { payrollAPI, userFilesAPI } from '../services/api';

interface UploadHistoryItem {
  id: number;
  file_name: string;
  upload_date: string;
  user_dni: string;
  user_name: string;
  document_type: 'nominas' | 'dietas';
  month: string;
  year: string;
  total_pages: number;
  successful_pages: number;
  failed_pages: number;
  status: 'processing' | 'completed' | 'error';
}

interface UploadState {
  isDragOver: boolean;
  isUploading: boolean;
  uploadProgress: number;
  file: File | null;
  documentType: 'multiple' | 'multiple-dietas' | '';
  month: string;
  year: string;
  error: string;
  success: boolean;
}

interface ProcessingResult {
  page_number: number;
  dni_nie_found?: string;
  user_folder_exists: boolean;
  pdf_saved: boolean;
  saved_path?: string;
  success: boolean;
  error_message?: string;
}

interface ProcessingResponse {
  success: boolean;
  message: string;
  filename: string;
  month_year: string;
  stats: {
    total_pages: number;
    successful: number;
    failed: number;
    success_rate: number;
  };
  details: ProcessingResult[];
  errors: string[];
  processed_at: string;
}

interface PDFUploadComponentProps {
  onUploadSuccess: () => void;
}

const PDFUploadComponent: React.FC<PDFUploadComponentProps> = ({ onUploadSuccess }) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    isDragOver: false,
    isUploading: false,
    uploadProgress: 0,
    file: null,
    documentType: '',
    month: '',
    year: '',
    error: '',
    success: false,
  });

  const [processingResult, setProcessingResult] = useState<ProcessingResponse | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [currentProcessingType, setCurrentProcessingType] = useState<'nominas' | 'dietas' | null>(null);

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Función para agregar entrada al historial usando API
  const addToUploadHistory = async (filename: string, documentType: 'nominas' | 'dietas', result: ProcessingResponse) => {
    try {
      const historyItem = {
        file_name: filename,
        upload_date: new Date().toISOString(),
        user_dni: 'CURRENT_USER', // Se obtendrá automáticamente del token en el backend
        user_name: 'Admin', // Se obtendrá automáticamente del token en el backend
        document_type: documentType,
        month: uploadState.month,
        year: uploadState.year,
        total_pages: result.stats.total_pages,
        successful_pages: result.stats.successful,
        failed_pages: result.stats.failed,
        status: result.stats.failed === result.stats.total_pages ? 'error' : 'completed',
      };

      // Crear el registro en la base de datos
      await userFilesAPI.createUploadHistory(historyItem);
      
      // Llamar al callback para recargar el historial
      onUploadSuccess();
    } catch (error) {
      console.error('Error saving upload history:', error);
      // Si falla, mostrar error pero aun así llamar al callback
      onUploadSuccess();
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

  const validateFile = (file: File): string => {
    if (file.type !== 'application/pdf') {
      return 'Solo se permiten archivos PDF';
    }
    
    // Máximo 50MB para todos los documentos
    const maxSize = 50 * 1024 * 1024;
    
    if (file.size > maxSize) {
      return 'El archivo no puede superar los 50MB';
    }
    return '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState(prev => ({ ...prev, isDragOver: false, error: '', success: false }));
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 1) {
      setUploadState(prev => ({ ...prev, error: 'Solo se puede subir un archivo a la vez' }));
      return;
    }

    const file = files[0];
    const error = validateFile(file);
    if (error) {
      setUploadState(prev => ({ ...prev, error }));
      return;
    }

    setUploadState(prev => ({ ...prev, file }));
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const error = validateFile(file);
      if (error) {
        setUploadState(prev => ({ ...prev, error, file: null }));
        return;
      }
      setUploadState(prev => ({ ...prev, file, error: '', success: false }));
    }
  };

  const canUpload = uploadState.file && uploadState.documentType && uploadState.month && uploadState.year;

  const handleUpload = async () => {
    if (!canUpload) return;

    // Validar que el año sea válido
    const yearNum = parseInt(uploadState.year);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      setUploadState(prev => ({ ...prev, error: 'Por favor ingrese un año válido entre 1900 y 2100' }));
      return;
    }

    setUploadState(prev => ({ ...prev, isUploading: true, error: '', uploadProgress: 0 }));

    try {
      if (uploadState.documentType === 'multiple') {
        // Procesamiento de múltiples nóminas
        const monthYear = `${uploadState.month.toLowerCase()}_${uploadState.year}`;
        
        setUploadState(prev => ({ ...prev, uploadProgress: 20 }));
        
        const response = await payrollAPI.processPayrollPDF(uploadState.file!, monthYear);
        
        setUploadState(prev => ({ ...prev, uploadProgress: 100 }));
        
        // Mostrar resultados del procesamiento
        setCurrentProcessingType('nominas');
        setProcessingResult(response);
        setShowResultDialog(true);
        
        // Agregar al historial
        addToUploadHistory(uploadState.file!.name, 'nominas', response);
        
        setUploadState(prev => ({ 
          ...prev, 
          isUploading: false, 
          success: true,
          file: null,
          documentType: '',
          month: '',
          uploadProgress: 0,
        }));
        
      } else if (uploadState.documentType === 'multiple-dietas') {
        // Procesamiento de múltiples dietas
        const monthYear = `${uploadState.month.toLowerCase()}_${uploadState.year}`;
        
        setUploadState(prev => ({ ...prev, uploadProgress: 20 }));
        
        const response = await payrollAPI.processDietasPDF(uploadState.file!, monthYear);
        
        setUploadState(prev => ({ ...prev, uploadProgress: 100 }));
        
        // Mostrar resultados del procesamiento
        setCurrentProcessingType('dietas');
        setProcessingResult(response);
        setShowResultDialog(true);
        
        // Agregar al historial
        addToUploadHistory(uploadState.file!.name, 'dietas', response);
        
        setUploadState(prev => ({ 
          ...prev, 
          isUploading: false, 
          success: true,
          file: null,
          documentType: '',
          month: '',
          uploadProgress: 0,
        }));
        
      }

    } catch (error: any) {
      console.error('Error uploading file:', error);
      setUploadState(prev => ({ 
        ...prev, 
        isUploading: false, 
        error: error.response?.data?.detail || 'Error al procesar el archivo. Intenta de nuevo.',
        uploadProgress: 0,
      }));
    }
  };

  const resetUpload = () => {
    setUploadState({
      isDragOver: false,
      isUploading: false,
      uploadProgress: 0,
      file: null,
      documentType: '',
      month: '',
      year: new Date().getFullYear().toString(),
      error: '',
      success: false,
    });
  };

  return (
    <Card
      sx={{
        p: { xs: 3, sm: 4 },
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
        backdropFilter: 'blur(20px)',
        borderRadius: '8px',
        border: uploadState.isDragOver ? '2px dashed #722F37' : '1px solid rgba(255, 255, 255, 0.3)',
        transition: 'all 0.3s ease',
        minHeight: { xs: '350px', sm: '400px' },
      }}
    >
      {/* Área de drag and drop */}
      <Box
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          border: uploadState.isDragOver ? '2px dashed #722F37' : '2px dashed #ccc',
          borderRadius: '8px',
          p: { xs: 3, sm: 4 },
          textAlign: 'center',
          backgroundColor: uploadState.isDragOver ? 'rgba(114, 47, 55, 0.05)' : 'rgba(0, 0, 0, 0.02)',
          transition: 'all 0.3s ease',
          mb: 3,
          cursor: 'pointer',
          position: 'relative',
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
        
        <CloudUpload
          sx={{
            fontSize: { xs: 36, sm: 48 },
            color: uploadState.isDragOver ? '#722F37' : '#ccc',
            mb: 2,
          }}
        />
        
        {uploadState.file ? (
          <Box>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: 1, 
              mb: 1,
              flexDirection: { xs: 'column', sm: 'row' }
            }}>
              <PictureAsPdf sx={{ color: '#d32f2f' }} />
              <Typography 
                variant="h6" 
                sx={{ 
                  color: '#722F37', 
                  fontWeight: 600,
                  fontSize: { xs: '1rem', sm: '1.25rem' },
                  textAlign: 'center',
                  wordBreak: 'break-all'
                }}
              >
                {uploadState.file.name}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#6c757d' }}>
              {(uploadState.file.size / 1024 / 1024).toFixed(2)} MB
            </Typography>
          </Box>
        ) : (
          <Box>
            <Typography 
              variant="h6" 
              sx={{ 
                color: '#722F37', 
                mb: 1,
                fontSize: { xs: '1rem', sm: '1.25rem' },
                px: { xs: 1, sm: 0 }
              }}
            >
              {uploadState.documentType === 'multiple' 
                ? 'Arrastra un PDF con nóminas aquí o haz clic para seleccionar'
                : uploadState.documentType === 'multiple-dietas'
                ? 'Arrastra un PDF con dietas aquí o haz clic para seleccionar'
                : 'Selecciona el tipo de documento para continuar'
              }
            </Typography>
            <Typography variant="body2" sx={{ color: '#6c757d' }}>
              {uploadState.documentType === 'multiple' 
                ? 'Máximo 50MB • El sistema extraerá automáticamente cada nómina por DNI/NIE'
                : uploadState.documentType === 'multiple-dietas'
                ? 'Máximo 50MB • El sistema extraerá automáticamente cada dieta por DNI/NIE'
                : 'Solo archivos PDF'
              }
            </Typography>
          </Box>
        )}
      </Box>

      {/* Controles de selección */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(200px, 1fr))' }, 
        gap: 2, 
        mb: 3 
      }}>
        <FormControl fullWidth required>
          <InputLabel>Tipo de Documento</InputLabel>
          <Select
            value={uploadState.documentType}
            label="Tipo de Documento"
            onChange={(e) => setUploadState(prev => ({ ...prev, documentType: e.target.value as 'multiple' | 'multiple-dietas' }))}
          >
            <MenuItem value="multiple">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesome sx={{ fontSize: 16 }} />
                Nóminas (Procesamiento Automático)
              </Box>
            </MenuItem>
            <MenuItem value="multiple-dietas">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesome sx={{ fontSize: 16 }} />
                Dietas (Procesamiento Automático)
              </Box>
            </MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth required>
          <InputLabel>Mes</InputLabel>
          <Select
            value={uploadState.month}
            label="Mes"
            onChange={(e) => setUploadState(prev => ({ ...prev, month: e.target.value }))}
          >
            {months.map((month, index) => (
              <MenuItem key={index} value={(index + 1).toString().padStart(2, '0')}>
                {month}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          required
          label="Año"
          type="number"
          value={uploadState.year}
          onChange={(e) => setUploadState(prev => ({ ...prev, year: e.target.value }))}
          placeholder={new Date().getFullYear().toString()}
          inputProps={{
            min: 1900,
            max: 2100,
            step: 1
          }}
          helperText="Ingrese el año (ej: 2025)"
        />
      </Box>

      {/* Mensajes de error y éxito */}
      {uploadState.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {uploadState.error}
        </Alert>
      )}

      {uploadState.success && (
        <Alert severity="success" sx={{ mb: 2 }} action={
          <Button color="inherit" size="small" onClick={resetUpload}>
            Subir Otro
          </Button>
        }>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Check />
            Documento subido exitosamente
          </Box>
        </Alert>
      )}

      {/* Progreso de subida */}
      {uploadState.isUploading && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">
              Subiendo archivo... {uploadState.uploadProgress}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={uploadState.uploadProgress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              '& .MuiLinearProgress-bar': {
                background: '#1565C0',
                borderRadius: 4,
              },
            }}
          />
        </Box>
      )}

      {/* Botón de subida */}
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        justifyContent: 'flex-end',
        flexDirection: { xs: 'column-reverse', sm: 'row' }
      }}>
        {uploadState.file && !uploadState.success && (
          <Button
            variant="outlined"
            onClick={resetUpload}
            disabled={uploadState.isUploading}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Cancelar
          </Button>
        )}
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!canUpload || uploadState.isUploading}
          startIcon={uploadState.isUploading ? <CircularProgress size={20} /> : <FileUpload />}
          sx={{
            background: '#1565C0',
            width: { xs: '100%', sm: 'auto' },
            '&:hover': {
              background: '#0D47A1',
            },
            '&:disabled': {
              background: '#ccc',
            },
          }}
        >
          {uploadState.isUploading ? 'Procesando...' : (uploadState.documentType === 'multiple' ? 'Procesar Nóminas' : 'Subir Documento')}
        </Button>
      </Box>

      {/* Dialog de resultados del procesamiento */}
      <Dialog 
        open={showResultDialog} 
        onClose={() => setShowResultDialog(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 2
        }}>
          <AssignmentTurnedIn sx={{ fontSize: 28 }} />
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            Resultados del Procesamiento de {currentProcessingType === 'nominas' ? 'Nóminas' : 'Dietas'}
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3, backgroundColor: '#f8fafc' }}>
          {processingResult && (
            <Box sx={{ mt: 1 }}>
              {/* Estadísticas generales */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, 
                gap: 2, 
                mb: 3 
              }}>
                <Paper sx={{ 
                  p: 2.5, 
                  textAlign: 'center',
                  borderRadius: 2,
                  border: '1px solid #e3f2fd',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1976d2' }}>
                    {processingResult.stats.total_pages}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 500 }}>
                    Páginas Totales
                  </Typography>
                </Paper>
                
                <Paper sx={{ 
                  p: 2.5, 
                  textAlign: 'center',
                  borderRadius: 2,
                  border: '1px solid #e8f5e8',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#4caf50' }}>
                    {processingResult.stats.successful}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 500 }}>
                    Exitosas
                  </Typography>
                </Paper>
                
                <Paper sx={{ 
                  p: 2.5, 
                  textAlign: 'center',
                  borderRadius: 2,
                  border: '1px solid #ffebee',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#f44336' }}>
                    {processingResult.stats.failed}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 500 }}>
                    Fallidas
                  </Typography>
                </Paper>
                
                <Paper sx={{ 
                  p: 2.5, 
                  textAlign: 'center',
                  borderRadius: 2,
                  border: '1px solid #f3e5f5',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#9c27b0' }}>
                    {processingResult.stats.success_rate}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 500 }}>
                    Tasa de Éxito
                  </Typography>
                </Paper>
              </Box>

              {/* Detalles por página */}
              <Typography variant="h6" gutterBottom sx={{ 
                mb: 2, 
                fontWeight: 600, 
                color: '#1565c0',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                📄 Detalle por Página
              </Typography>
              
              <Box sx={{ 
                maxHeight: 350, 
                overflow: 'auto',
                border: '1px solid #e3f2fd',
                borderRadius: 2,
                backgroundColor: 'white',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
              }}>
                {processingResult.details.map((detail, index) => (
                  <Box key={index} sx={{ 
                    p: 3,
                    borderBottom: index < processingResult.details.length - 1 ? '1px solid #f5f5f5' : 'none',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 2.5,
                    '&:hover': {
                      backgroundColor: '#f8fafc',
                      transition: 'background-color 0.2s ease'
                    }
                  }}>
                    <Box sx={{ mt: 0.5 }}>
                      {detail.success ? (
                        <CheckCircle sx={{ fontSize: 24, color: '#4caf50' }} />
                      ) : (
                        <Error sx={{ fontSize: 24, color: '#f44336' }} />
                      )}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 700, mb: 1, color: '#1565c0' }}>
                        Página {detail.page_number}: {detail.dni_nie_found || 'DNI/NIE no encontrado'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ lineHeight: 1.6 }}>
                        {detail.success 
                          ? `✅ Guardado en: ${detail.saved_path}`
                          : `❌ ${detail.error_message}`
                        }
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* Errores generales */}
              {processingResult.errors && processingResult.errors.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ 
                    fontWeight: 600, 
                    color: '#d32f2f',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    ⚠️ Errores Generales
                  </Typography>
                  {processingResult.errors.map((error, index) => (
                    <Alert key={index} severity="error" sx={{ 
                      mb: 1.5,
                      borderRadius: 2,
                      '& .MuiAlert-message': {
                        fontWeight: 500
                      }
                    }}>
                      {error}
                    </Alert>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ 
          p: 3, 
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e3f2fd',
          gap: 2
        }}>
          <Button 
            onClick={() => {
              setShowResultDialog(false);
              setCurrentProcessingType(null);
            }}
            variant="outlined"
            sx={{ 
              borderRadius: 2,
              px: 3,
              py: 1,
              fontWeight: 600,
              borderColor: '#1976d2',
              color: '#1976d2',
              '&:hover': {
                borderColor: '#1565c0',
                backgroundColor: '#f3f9ff'
              }
            }}
          >
            Aceptar
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

interface UploadHistoryComponentProps {
  uploadHistory: UploadHistoryItem[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading: boolean;
}

const UploadHistoryComponent: React.FC<UploadHistoryComponentProps> = ({ 
  uploadHistory, 
  totalItems, 
  currentPage, 
  pageSize, 
  onPageChange, 
  loading 
}) => {
  // Estados para los filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'nominas' | 'dietas'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'processing' | 'error'>('all');

  // Datos filtrados (ahora se filtran en el servidor, pero mantenemos funcionalidad local)
  const filteredData = uploadHistory.filter((item) => {
    const matchesSearch = item.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.user_dni?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.document_type === filterType;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Calcular el total de páginas
  const totalPages = Math.ceil(totalItems / pageSize);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4caf50';
      case 'processing': return '#ff9800';
      case 'error': return '#f44336';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'processing': return 'Procesando';
      case 'error': return 'Error';
      default: return 'Desconocido';
    }
  };

  const getMonthName = (month: string) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[parseInt(month) - 1] || month;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterStatus('all');
  };

  return (
    <Paper
      sx={{
        p: 3,
        background: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
      }}
    >
      <Typography
        variant="h6"
        sx={{
          mb: 3,
          fontWeight: 700,
          color: '#1565C0',
        }}
      >
        Historial de Subidas
      </Typography>

      {/* Filtros */}
      <Box sx={{ mb: 3 }}>
        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: '2fr 1fr 1fr 1fr',
            },
            gap: 2,
            alignItems: 'center',
            mb: 2,
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar archivo o usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ color: '#6c757d', mr: 1 }} />,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
              },
            }}
          />
          
          <FormControl fullWidth size="small">
            <InputLabel>Tipo</InputLabel>
            <Select
              value={filterType}
              label="Tipo"
              onChange={(e) => setFilterType(e.target.value as 'all' | 'nominas' | 'dietas')}
              sx={{ borderRadius: '12px' }}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="nominas">Nóminas</MenuItem>
              <MenuItem value="dietas">Dietas</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Estado</InputLabel>
            <Select
              value={filterStatus}
              label="Estado"
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'completed' | 'processing' | 'error')}
              sx={{ borderRadius: '12px' }}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="completed">Completado</MenuItem>
              <MenuItem value="processing">Procesando</MenuItem>
              <MenuItem value="error">Error</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            onClick={clearFilters}
            startIcon={<FilterList />}
            sx={{
              borderRadius: '12px',
              height: '40px',
              textTransform: 'none',
            }}
          >
            Limpiar
          </Button>
        </Box>

        {/* Contador de resultados */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: '#6c757d' }}>
            Mostrando {filteredData.length} de {totalItems} documentos (Página {currentPage} de {totalPages})
          </Typography>
          {(searchTerm || filterType !== 'all' || filterStatus !== 'all') && (
            <Chip
              label="Filtros activos"
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
          )}
        </Box>
      </Box>

      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ minWidth: 800 }}>
          {/* Header */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '3fr 2fr 120px 140px 120px 120px',
              gap: 2,
              p: 2,
              borderBottom: '2px solid rgba(114, 47, 55, 0.1)',
              mb: 1,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#722F37' }}>
              Archivo
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#722F37' }}>
              Usuario
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#722F37' }}>
              Fecha
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#722F37' }}>
              Tipo/Período
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#722F37' }}>
              Páginas
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#722F37', textAlign: 'center' }}>
              Estado
            </Typography>
          </Box>

          {/* Rows */}
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={32} />
              <Typography variant="body2" sx={{ color: '#6c757d', mt: 2 }}>
                Cargando historial...
              </Typography>
            </Box>
          ) : filteredData.length > 0 ? (
            filteredData.map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '3fr 2fr 120px 140px 120px 120px',
                  gap: 2,
                  p: 2,
                  borderBottom: '1px solid rgba(114, 47, 55, 0.05)',
                  alignItems: 'center',
                  '&:hover': {
                    backgroundColor: 'rgba(114, 47, 55, 0.03)',
                  },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {item.file_name}
                </Typography>
                
                <Typography variant="body2" sx={{ color: '#6c757d' }}>
                  {item.user_name} ({item.user_dni})
                </Typography>
                
                <Typography variant="body2" sx={{ color: '#6c757d' }}>
                  {new Date(item.upload_date).toLocaleDateString()}
                </Typography>
                
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {item.document_type === 'nominas' ? 'Nóminas' : 'Dietas'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6c757d' }}>
                    {getMonthName(item.month)} {item.year}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" sx={{ color: '#6c757d' }}>
                    Total: {item.total_pages}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#4caf50' }}>
                    Exitosas: {item.successful_pages}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#f44336' }}>
                    Fallidas: {item.failed_pages}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', width: '100%', paddingLeft: 1 }}>
                  <Chip
                    label={getStatusText(item.status)}
                    size="small"
                    sx={{
                      backgroundColor: getStatusColor(item.status),
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.7rem',
                    }}
                  />
                </Box>
              </Box>
            ))
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" sx={{ color: '#6c757d' }}>
                No se encontraron documentos que coincidan con los filtros aplicados.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Paginación */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 1 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, page) => onPageChange(page)}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
            sx={{
              '& .MuiPaginationItem-root': {
                borderRadius: '8px',
                fontWeight: 500,
              },
              '& .Mui-selected': {
                backgroundColor: '#501b36 !important',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#3d1429 !important',
                },
              },
            }}
          />
        </Box>
      )}
    </Paper>
  );
};

export const Dashboard: React.FC = () => {
  // Estado para el historial desde la API
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([]);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15; // 15 elementos por página

  // Cargar historial desde la API
  const loadUploadHistory = async (page: number = 1) => {
    setLoading(true);
    try {
      const response = await userFilesAPI.getUploadHistory({
        limit: pageSize,
        skip: (page - 1) * pageSize
      });
      setUploadHistory(response.items);
      setTotalItems(response.total || response.items.length);
    } catch (error) {
      console.error('Error loading upload history:', error);
      setAlert({ 
        type: 'error', 
        message: 'Error al cargar el historial de subidas' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambio de página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadUploadHistory(page);
  };

  // Cargar historial al montar el componente
  useEffect(() => {
    loadUploadHistory();
  }, []);

  // Limpiar alerta después de 5 segundos
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Mostrar alerta si existe */}
      {alert && (
        <Alert severity={alert.type} sx={{ mb: 2 }}>
          {alert.message}
        </Alert>
      )}

      {/* Componente de subida de PDFs */}
      <Box sx={{ mb: 4 }}>
        <PDFUploadComponent 
          onUploadSuccess={() => loadUploadHistory(currentPage)}
        />
      </Box>

      {/* Historial de Subidas */}
      <Box sx={{ mb: 4 }}>
        <UploadHistoryComponent 
          uploadHistory={uploadHistory}
          totalItems={totalItems}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          loading={loading}
        />
      </Box>
    </Box>
  );
};
