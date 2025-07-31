import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  LinearProgress,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  PictureAsPdf as PictureAsPdfIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

interface UploadState {
  isDragOver: boolean;
  isUploading: boolean;
  uploadProgress: number;
  file: File | null;
  documentType: 'multiple' | 'multiple-dietas' | '';
  month: string;
  year: string;
  employee: string;
  error: string | null;
  success: boolean;
}

interface UploadHistory {
  id: number;
  filename: string;
  original_filename: string;
  file_type: string;
  document_type: string;
  dni?: string;
  month?: string;
  year?: string;
  upload_date: string;
  uploaded_by: string;
  upload_type: string;
}

const PDFUploadComponent: React.FC = () => {
  const [uploadState, setUploadState] = useState<UploadState>({
    isDragOver: false,
    isUploading: false,
    uploadProgress: 0,
    file: null,
    documentType: '',
    month: '',
    year: '',
    employee: '',
    error: null,
    success: false
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 5}, (_, i) => currentYear - i);
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
    { value: '12', label: 'Diciembre' }
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setUploadState(prev => ({ ...prev, isDragOver: true }));
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setUploadState(prev => ({ ...prev, isDragOver: false }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setUploadState(prev => ({ ...prev, isDragOver: false }));
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        setUploadState(prev => ({ ...prev, file }));
      } else {
        setUploadState(prev => ({ ...prev, error: 'Solo se permiten archivos PDF' }));
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        setUploadState(prev => ({ ...prev, file, error: null }));
      } else {
        setUploadState(prev => ({ ...prev, error: 'Solo se permiten archivos PDF' }));
      }
    }
  };

  const handleUpload = async () => {
    const { file, documentType, month, year, employee } = uploadState;
    
    if (!file) {
      setUploadState(prev => ({ ...prev, error: 'Por favor selecciona un archivo' }));
      return;
    }

    if (!documentType) {
      setUploadState(prev => ({ ...prev, error: 'Por favor selecciona el tipo de documento' }));
      return;
    }

    if ((documentType === 'multiple' || documentType === 'multiple-dietas') && (!month || !year)) {
      setUploadState(prev => ({ ...prev, error: 'Por favor selecciona mes y año' }));
      return;
    }

    setUploadState(prev => ({ 
      ...prev, 
      isUploading: true, 
      uploadProgress: 0, 
      error: null, 
      success: false 
    }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_type', documentType);
      
      if (month) formData.append('month', month);
      if (year) formData.append('year', year);
      if (employee) formData.append('dni', employee);

      let endpoint = '';
      if (documentType === 'multiple') {
        endpoint = '/api/payroll/upload';
      } else if (documentType === 'multiple-dietas') {
        endpoint = '/api/user-files/upload-dietas';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (response.ok) {
        setUploadState(prev => ({ 
          ...prev, 
          success: true, 
          file: null, 
          documentType: '', 
          month: '', 
          year: '', 
          employee: '' 
        }));
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || 'Error al subir el archivo');
      }
    } catch (error: any) {
      setUploadState(prev => ({ 
        ...prev, 
        error: error.message || 'Error al subir el archivo' 
      }));
    } finally {
      setUploadState(prev => ({ ...prev, isUploading: false, uploadProgress: 0 }));
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
      year: '',
      employee: '',
      error: null,
      success: false
    });
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        border: uploadState.isDragOver ? '2px dashed #1976d2' : '2px dashed #ccc',
        backgroundColor: uploadState.isDragOver ? '#f3f7ff' : 'white',
        transition: 'all 0.3s ease',
        mb: 3
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Box textAlign="center">
        <CloudUploadIcon sx={{ fontSize: 48, color: '#1976d2', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Subir Archivo PDF
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Arrastra y suelta un archivo PDF aquí, o haz clic para seleccionar
        </Typography>

        <input
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          id="file-upload"
        />
        <label htmlFor="file-upload">
          <Button
            variant="outlined"
            component="span"
            startIcon={<CloudUploadIcon />}
            sx={{ mb: 3 }}
          >
            Seleccionar Archivo
          </Button>
        </label>

        {uploadState.file && (
          <Box sx={{ mt: 2, mb: 3 }}>
            <Chip
              icon={<PictureAsPdfIcon />}
              label={uploadState.file.name}
              variant="outlined"
              onDelete={() => setUploadState(prev => ({ ...prev, file: null }))}
            />
          </Box>
        )}

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Tipo de Documento</InputLabel>
          <Select
            value={uploadState.documentType}
            label="Tipo de Documento"
            onChange={(e) => setUploadState(prev => ({ ...prev, documentType: e.target.value }))}
          >
            <MenuItem value="multiple">Nóminas Múltiples</MenuItem>
            <MenuItem value="multiple-dietas">Dietas Múltiples</MenuItem>
          </Select>
        </FormControl>

        {(uploadState.documentType === 'multiple' || uploadState.documentType === 'multiple-dietas') && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Mes</InputLabel>
                <Select
                  value={uploadState.month}
                  label="Mes"
                  onChange={(e) => setUploadState(prev => ({ ...prev, month: e.target.value }))}
                >
                  {months.map((month) => (
                    <MenuItem key={month.value} value={month.value}>
                      {month.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth>
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
            </Grid>
          </Grid>
        )}

        {uploadState.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {uploadState.error}
          </Alert>
        )}

        {uploadState.success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Archivo subido correctamente
          </Alert>
        )}

        {uploadState.isUploading && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress variant="indeterminate" />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Subiendo archivo...
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!uploadState.file || uploadState.isUploading}
            startIcon={<CloudUploadIcon />}
          >
            {uploadState.isUploading ? 'Subiendo...' : 'Subir Archivo'}
          </Button>
          
          {(uploadState.file || uploadState.success || uploadState.error) && (
            <Button
              variant="outlined"
              onClick={resetUpload}
              disabled={uploadState.isUploading}
            >
              Limpiar
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

const UploadHistoryComponent: React.FC<{
  uploadHistory: UploadHistory[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading: boolean;
}> = ({ uploadHistory, totalItems, currentPage, pageSize, onPageChange, loading }) => {
  const totalPages = Math.ceil(totalItems / pageSize);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple':
        return 'Nóminas Múltiples';
      case 'multiple-dietas':
        return 'Dietas Múltiples';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HistoryIcon />
        Historial de Subidas
      </Typography>

      {uploadHistory.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography variant="body1" color="text.secondary">
            No hay archivos subidos aún
          </Typography>
        </Box>
      ) : (
        <>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Archivo</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Mes/Año</TableCell>
                  <TableCell>DNI</TableCell>
                  <TableCell>Fecha Subida</TableCell>
                  <TableCell>Subido por</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {uploadHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <PictureAsPdfIcon color="error" />
                        <Tooltip title={item.original_filename}>
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {item.original_filename}
                          </Typography>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getDocumentTypeLabel(item.document_type)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {item.month && item.year ? `${item.month}/${item.year}` : '-'}
                    </TableCell>
                    <TableCell>{item.dni || '-'}</TableCell>
                    <TableCell>{formatDate(item.upload_date)}</TableCell>
                    <TableCell>{item.uploaded_by}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_, page) => onPageChange(page)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Paper>
  );
};

export const MassUpload: React.FC = () => {
  const { user } = useAuth();
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(true);

  const fetchUploadHistory = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/payroll/upload-history?page=${page}&pageSize=${pageSize}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUploadHistory(data.items || []);
        setTotalItems(data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching upload history:', error);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    fetchUploadHistory(currentPage);
  }, [currentPage, fetchUploadHistory]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CloudUploadIcon />
        Subida Masiva de Documentos
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Sube archivos PDF de nóminas y dietas de forma masiva
      </Typography>

      <Box sx={{ mb: 4 }}>
        <PDFUploadComponent />
      </Box>

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
