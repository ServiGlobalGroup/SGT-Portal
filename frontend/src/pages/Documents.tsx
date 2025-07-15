import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Menu,
  Alert,
} from '@mui/material';
import {
  Description,
  Download,
  Visibility,
  MoreVert,
  Search,
  FilterList,
  PictureAsPdf,
  AttachMoney,
  Restaurant,
} from '@mui/icons-material';
import { PdfPreview } from '../components/PdfPreview';

interface PayrollDocument {
  id: number;
  user_name: string;
  type: 'nomina' | 'dieta';
  month: string;
  file_name: string;
  file_size: number;
  upload_date: Date;
  status: 'active' | 'archived';
}

export const Documents: React.FC = () => {
  const [documents] = useState<PayrollDocument[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'nomina' | 'dieta'>('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDocument, setSelectedDocument] = useState<PayrollDocument | null>(null);
  const [success, setSuccess] = useState('');
  const [pdfPreview, setPdfPreview] = useState<{ open: boolean; fileUrl: string; fileName: string }>({
    open: false, fileUrl: '', fileName: ''
  });

  // Generar lista de meses disponibles
  const availableMonths = Array.from(new Set(documents.map(doc => doc.month))).sort().reverse();

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.month.includes(searchTerm);
    const matchesType = filterType === 'all' || doc.type === filterType;
    const matchesMonth = filterMonth === 'all' || doc.month === filterMonth;
    
    return matchesSearch && matchesType && matchesMonth;
  });

  const stats = {
    total: documents.length,
    nominas: documents.filter(d => d.type === 'nomina').length,
    dietas: documents.filter(d => d.type === 'dieta').length,
    totalSize: documents.reduce((sum, d) => sum + d.file_size, 0)
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const getTypeIcon = (type: string) => {
    return type === 'nomina' ? <AttachMoney color="success" /> : <Restaurant color="info" />;
  };

  const getTypeColor = (type: string) => {
    return type === 'nomina' ? 'success' : 'info';
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, document: PayrollDocument) => {
    setAnchorEl(event.currentTarget);
    setSelectedDocument(document);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDocument(null);
  };

  const handleDownload = () => {
    if (selectedDocument) {
      // Simular descarga
      setSuccess(`Descargando ${selectedDocument.file_name}...`);
      // En una aplicación real, aquí se haría una llamada al backend
      // window.open(`/api/payroll/download/${selectedDocument.id}`, '_blank');
    }
    handleMenuClose();
  };

  const handleView = () => {
    if (selectedDocument) {
      // Abrir preview de PDF
      setPdfPreview({
        open: true,
        fileUrl: "", // URL del archivo real
        fileName: selectedDocument.file_name
      });
    }
    handleMenuClose();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterMonth('all');
  };

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: { xs: '100%', sm: '100%', md: '1200px', lg: '1400px' },
      mx: 'auto',
      px: { xs: 0, sm: 1, md: 2 }
    }}>
      <Typography variant="h4" gutterBottom sx={{ 
        fontWeight: 700, 
        color: '#1565C0',
        fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
        mb: { xs: 2, sm: 3 }
      }}>
        Mis Documentos
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Estadísticas */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2, 
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' },
          textAlign: { xs: 'center', sm: 'left' }
        }}>
          <Description sx={{ fontSize: { xs: 32, sm: 40 }, color: '#1565C0' }} />
          <Box>
            <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
              Sistema de Documentación Personal
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Acceso a nóminas, dietas y documentos relacionados
            </Typography>
          </Box>
        </Box>

        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { 
            xs: 'repeat(2, 1fr)', 
            sm: 'repeat(2, 1fr)', 
            md: 'repeat(4, 1fr)' 
          }, 
          gap: { xs: 1.5, sm: 2 }
        }}>
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                flexDirection: { xs: 'column', sm: 'row' },
                textAlign: { xs: 'center', sm: 'left' }
              }}>
                <PictureAsPdf color="error" sx={{ fontSize: { xs: 24, sm: 'inherit' } }} />
                <Box>
                  <Typography variant="h4" color="primary.main" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                    {stats.total}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Total Documentos
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                flexDirection: { xs: 'column', sm: 'row' },
                textAlign: { xs: 'center', sm: 'left' }
              }}>
                <AttachMoney color="success" sx={{ fontSize: { xs: 24, sm: 'inherit' } }} />
                <Box>
                  <Typography variant="h4" color="success.main" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                    {stats.nominas}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Nóminas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                flexDirection: { xs: 'column', sm: 'row' },
                textAlign: { xs: 'center', sm: 'left' }
              }}>
                <Restaurant color="info" sx={{ fontSize: { xs: 24, sm: 'inherit' } }} />
                <Box>
                  <Typography variant="h4" color="info.main" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                    {stats.dietas}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Dietas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                flexDirection: { xs: 'column', sm: 'row' },
                textAlign: { xs: 'center', sm: 'left' }
              }}>
                <Description color="warning" sx={{ fontSize: { xs: 24, sm: 'inherit' } }} />
                <Box>
                  <Typography variant="h6" color="warning.main" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                    {formatFileSize(stats.totalSize)}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Tamaño Total
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Paper>

      {/* Filtros y búsqueda */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
          <FilterList sx={{ mr: 1, verticalAlign: 'middle' }} />
          Filtros y Búsqueda
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          flexWrap: 'wrap', 
          gap: 2, 
          alignItems: { xs: 'stretch', sm: 'center' }
        }}>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 300px' } }}>
            <TextField
              fullWidth
              size="small"
              label="Buscar documentos"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Box>
          
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 200px' } }}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de documento</InputLabel>
              <Select
                value={filterType}
                label="Tipo de documento"
                onChange={(e) => setFilterType(e.target.value as 'all' | 'nomina' | 'dieta')}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="nomina">Nóminas</MenuItem>
                <MenuItem value="dieta">Dietas</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 200px' } }}>
            <FormControl fullWidth size="small">
              <InputLabel>Mes</InputLabel>
              <Select
                value={filterMonth}
                label="Mes"
                onChange={(e) => setFilterMonth(e.target.value)}
              >
                <MenuItem value="all">Todos los meses</MenuItem>
                {availableMonths.map(month => (
                  <MenuItem key={month} value={month}>
                    {formatMonth(month)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={clearFilters}
              disabled={searchTerm === '' && filterType === 'all' && filterMonth === 'all'}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Limpiar Filtros
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Tabla de documentos / Cards en móvil */}
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" sx={{ 
          mb: 2,
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}>
          Documentos Disponibles ({filteredDocuments.length})
        </Typography>
        
        {/* Vista de tabla para desktop */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Tipo</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Archivo</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Mes</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Tamaño</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Fecha Subida</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDocuments.map((document) => (
                  <TableRow key={document.id} hover>
                    <TableCell>
                      <Chip
                        icon={getTypeIcon(document.type)}
                        label={document.type === 'nomina' ? 'Nómina' : 'Dieta'}
                        color={getTypeColor(document.type) as 'success' | 'info'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PictureAsPdf color="error" fontSize="small" />
                        <Typography variant="body2">{document.file_name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{formatMonth(document.month)}</TableCell>
                    <TableCell>{formatFileSize(document.file_size)}</TableCell>
                    <TableCell>{document.upload_date.toLocaleDateString('es-ES')}</TableCell>
                    <TableCell>
                      <Chip
                        label={document.status === 'active' ? 'Activo' : 'Archivado'}
                        color={document.status === 'active' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleView()}
                          title="Visualizar"
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleDownload()}
                          title="Descargar"
                        >
                          <Download />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuClick(e, document)}
                        >
                          <MoreVert />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Vista de cards para móvil y tablet */}
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          {filteredDocuments.map((document) => (
            <Card 
              key={document.id} 
              sx={{ 
                mb: 2, 
                border: '1px solid #e0e0e0',
                '&:hover': {
                  boxShadow: 3,
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s ease'
                }
              }}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                {/* Header de la card con tipo y acciones */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  mb: 2
                }}>
                  <Chip
                    icon={getTypeIcon(document.type)}
                    label={document.type === 'nomina' ? 'Nómina' : 'Dieta'}
                    color={getTypeColor(document.type) as 'success' | 'info'}
                    size="small"
                  />
                  <IconButton 
                    size="small"
                    onClick={(e) => handleMenuClick(e, document)}
                  >
                    <MoreVert />
                  </IconButton>
                </Box>

                {/* Información del archivo */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PictureAsPdf color="error" fontSize="small" />
                    <Typography variant="subtitle2" fontWeight={600}>
                      {document.file_name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    {formatFileSize(document.file_size)}
                  </Typography>
                </Box>

                {/* Mes y fecha */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mb: 2,
                  flexWrap: 'wrap',
                  gap: 1
                }}>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {formatMonth(document.month)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Subido: {document.upload_date.toLocaleDateString('es-ES')}
                    </Typography>
                  </Box>
                  <Chip
                    label={document.status === 'active' ? 'Activo' : 'Archivado'}
                    color={document.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                </Box>

                {/* Botones de acción */}
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1, 
                  pt: 2,
                  borderTop: '1px solid #e0e0e0',
                  flexDirection: { xs: 'column', sm: 'row' }
                }}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    startIcon={<Visibility />}
                    onClick={() => handleView()}
                    sx={{ 
                      flex: 1,
                      minHeight: { xs: 40, sm: 32 }
                    }}
                  >
                    Ver
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    startIcon={<Download />}
                    onClick={() => handleDownload()}
                    sx={{ 
                      flex: 1,
                      minHeight: { xs: 40, sm: 32 }
                    }}
                  >
                    Descargar
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {filteredDocuments.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary">
              No se encontraron documentos
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {searchTerm || filterType !== 'all' || filterMonth !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'No tienes documentos disponibles en este momento'
              }
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Menú contextual */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <Visibility sx={{ mr: 1 }} />
          Visualizar
        </MenuItem>
        <MenuItem onClick={handleDownload}>
          <Download sx={{ mr: 1 }} />
          Descargar
        </MenuItem>
      </Menu>

      {/* Componente de preview de PDF */}
      <PdfPreview
        open={pdfPreview.open}
        onClose={() => setPdfPreview({ open: false, fileUrl: '', fileName: '' })}
        fileUrl={pdfPreview.fileUrl}
        fileName={pdfPreview.fileName}
        title={`Vista previa: ${pdfPreview.fileName}`}
      />
    </Box>
  );
};