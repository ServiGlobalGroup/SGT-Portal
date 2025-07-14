import React, { useState, useCallback } from 'react';
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
} from '@mui/material';
import {
  CloudUpload,
  PictureAsPdf,
  FileUpload,
  Check,
  Search,
  FilterList,
} from '@mui/icons-material';

interface UploadHistoryItem {
  id: number;
  fileName: string;
  uploadDate: string;
  user: string;
  documentType: 'nomina' | 'dieta';
  month: string;
  year: string;
  totalPages: number;
  processedPages: number;
  status: 'processing' | 'completed' | 'error';
}

interface UploadState {
  isDragOver: boolean;
  isUploading: boolean;
  uploadProgress: number;
  file: File | null;
  documentType: 'nomina' | 'dieta' | '';
  month: string;
  year: string;
  error: string;
  success: boolean;
}

const PDFUploadComponent: React.FC = () => {
  const [uploadState, setUploadState] = useState<UploadState>({
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

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

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
    if (file.size > 10 * 1024 * 1024) { // 10MB
      return 'El archivo no puede superar los 10MB';
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

    setUploadState(prev => ({ ...prev, isUploading: true, error: '', uploadProgress: 0 }));

    try {
      // Simular progreso de subida
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadState(prev => ({ ...prev, uploadProgress: i }));
      }

      // Aquí iría la lógica real de subida al backend
      console.log('Uploading:', {
        file: uploadState.file,
        type: uploadState.documentType,
        month: uploadState.month,
        year: uploadState.year,
      });

      setUploadState(prev => ({ 
        ...prev, 
        isUploading: false, 
        success: true,
        file: null,
        documentType: '',
        month: '',
        uploadProgress: 0,
      }));

    } catch {
      setUploadState(prev => ({ 
        ...prev, 
        isUploading: false, 
        error: 'Error al subir el archivo. Intenta de nuevo.',
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
              Arrastra un archivo PDF aquí o haz clic para seleccionar
            </Typography>
            <Typography variant="body2" sx={{ color: '#6c757d' }}>
              Máximo 10MB • Solo archivos PDF
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
            onChange={(e) => setUploadState(prev => ({ ...prev, documentType: e.target.value as 'nomina' | 'dieta' }))}
          >
            <MenuItem value="nomina">Nómina</MenuItem>
            <MenuItem value="dieta">Dieta</MenuItem>
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

        <FormControl fullWidth required>
          <InputLabel>Año</InputLabel>
          <Select
            value={uploadState.year}
            label="Año"
            onChange={(e) => setUploadState(prev => ({ ...prev, year: e.target.value }))}
          >
            {years.map((year) => (
              <MenuItem key={year} value={year.toString()}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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
          {uploadState.isUploading ? 'Subiendo...' : 'Subir Documento'}
        </Button>
      </Box>
    </Card>
  );
};

const UploadHistoryComponent: React.FC = () => {
  // Datos de ejemplo del historial de uploads
  const [uploadHistory] = useState<UploadHistoryItem[]>([
    {
      id: 1,
      fileName: 'nomina_enero_2025.pdf',
      uploadDate: '2025-01-15T10:30:00Z',
      user: 'María García',
      documentType: 'nomina',
      month: '01',
      year: '2025',
      totalPages: 25,
      processedPages: 25,
      status: 'completed'
    },
    {
      id: 2,
      fileName: 'dietas_diciembre_2024.pdf',
      uploadDate: '2025-01-10T14:20:00Z',
      user: 'Carlos Rodríguez',
      documentType: 'dieta',
      month: '12',
      year: '2024',
      totalPages: 42,
      processedPages: 38,
      status: 'processing'
    },
    {
      id: 3,
      fileName: 'nomina_diciembre_2024.pdf',
      uploadDate: '2025-01-08T09:15:00Z',
      user: 'Ana López',
      documentType: 'nomina',
      month: '12',
      year: '2024',
      totalPages: 30,
      processedPages: 30,
      status: 'completed'
    },
    {
      id: 4,
      fileName: 'dietas_noviembre_2024.pdf',
      uploadDate: '2025-01-05T16:45:00Z',
      user: 'Pedro Martín',
      documentType: 'dieta',
      month: '11',
      year: '2024',
      totalPages: 18,
      processedPages: 0,
      status: 'error'
    },
    {
      id: 5,
      fileName: 'nomina_octubre_2024.pdf',
      uploadDate: '2024-11-03T12:30:00Z',
      user: 'María García',
      documentType: 'nomina',
      month: '10',
      year: '2024',
      totalPages: 22,
      processedPages: 22,
      status: 'completed'
    },
    {
      id: 6,
      fileName: 'dietas_octubre_2024.pdf',
      uploadDate: '2024-11-01T08:15:00Z',
      user: 'Ana López',
      documentType: 'dieta',
      month: '10',
      year: '2024',
      totalPages: 35,
      processedPages: 35,
      status: 'completed'
    }
  ]);

  // Estados para los filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'nomina' | 'dieta'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'processing' | 'error'>('all');
  const [filterUser, setFilterUser] = useState('all');

  // Datos filtrados
  const filteredData = uploadHistory.filter((item) => {
    const matchesSearch = item.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.user.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.documentType === filterType;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesUser = filterUser === 'all' || item.user === filterUser;
    
    return matchesSearch && matchesType && matchesStatus && matchesUser;
  });

  // Obtener usuarios únicos para el filtro
  const uniqueUsers = [...new Set(uploadHistory.map(item => item.user))];

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
    setFilterUser('all');
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
              md: '2fr 1fr 1fr 1fr 1fr',
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
              onChange={(e) => setFilterType(e.target.value as 'all' | 'nomina' | 'dieta')}
              sx={{ borderRadius: '12px' }}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="nomina">Nómina</MenuItem>
              <MenuItem value="dieta">Dieta</MenuItem>
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

          <FormControl fullWidth size="small">
            <InputLabel>Usuario</InputLabel>
            <Select
              value={filterUser}
              label="Usuario"
              onChange={(e) => setFilterUser(e.target.value)}
              sx={{ borderRadius: '12px' }}
            >
              <MenuItem value="all">Todos</MenuItem>
              {uniqueUsers.map((user) => (
                <MenuItem key={user} value={user}>
                  {user}
                </MenuItem>
              ))}
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
            Mostrando {filteredData.length} de {uploadHistory.length} documentos
          </Typography>
          {(searchTerm || filterType !== 'all' || filterStatus !== 'all' || filterUser !== 'all') && (
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
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 100px',
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
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#722F37' }}>
              Estado
            </Typography>
          </Box>

          {/* Rows */}
          {filteredData.length > 0 ? (
            filteredData.map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 100px',
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
                  {item.fileName}
                </Typography>
                
                <Typography variant="body2" sx={{ color: '#6c757d' }}>
                  {item.user}
                </Typography>
                
                <Typography variant="body2" sx={{ color: '#6c757d' }}>
                  {new Date(item.uploadDate).toLocaleDateString()}
                </Typography>
                
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {item.documentType === 'nomina' ? 'Nómina' : 'Dieta'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6c757d' }}>
                    {getMonthName(item.month)} {item.year}
                  </Typography>
                </Box>
                
                <Typography variant="body2" sx={{ color: '#6c757d' }}>
                  {item.processedPages}/{item.totalPages}
                </Typography>
                
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
    </Paper>
  );
};

export const Dashboard: React.FC = () => {
  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: { xs: '100%', sm: '100%', md: '1200px', lg: '1400px' },
      mx: 'auto',
      px: { xs: 0, sm: 1, md: 2 }
    }}>
      {/* Componente de subida de PDFs */}
      <Box sx={{ mb: 4 }}>
        <PDFUploadComponent />
      </Box>

      {/* Historial de Subidas */}
      <Box sx={{ mb: 4 }}>
        <UploadHistoryComponent />
      </Box>
    </Box>
  );
};
