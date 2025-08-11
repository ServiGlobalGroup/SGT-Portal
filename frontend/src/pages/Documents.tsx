import React, { useState, useEffect } from 'react';
import { PaginationComponent } from '../components/PaginationComponent';
import { usePagination } from '../hooks/usePagination';
import { useDeviceType } from '../hooks/useDeviceType';
import { MobileMisDocumentos } from './mobile/MobileMisDocumentos';
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
  IconButton,
  Menu,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tabs,
  Tab,
  MenuItem,
  Stack,
  Fade,
  GlobalStyles,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Description,
  Visibility,
  MoreVert,
  Search,
  PictureAsPdf,
  Upload,
  Refresh,
  CloudDownload,
  CloudUpload,
  InsertDriveFile,
  FolderOpen,
  FilePresent,
  Info,
} from '@mui/icons-material';
import { PdfPreview } from '../components/PdfPreview';
import { userFilesAPI, API_BASE_URL } from '../services/api';

interface UserDocument {
  id: number;
  name: string;
  size: number;
  type: string;
  created_date: string;
  modified_date: string;
  download_url: string;
}

interface FolderData {
  documents: UserDocument[];
  folder_type: string;
  total_files: number;
  total_size: number;
}

export const Documents: React.FC = () => {
  const { useMobileVersion } = useDeviceType();
  
  // Si es dispositivo móvil, usar la versión optimizada
  if (useMobileVersion) {
    return <MobileMisDocumentos />;
  }

  const [currentFolder, setCurrentFolder] = useState('informacion');
  const [folderData, setFolderData] = useState<FolderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ open: boolean; fileUrl: string; fileName: string }>({
    open: false, fileUrl: '', fileName: ''
  });

  // Cargar documentos del usuario actual
  useEffect(() => {
    loadDocuments();
  }, [currentFolder]);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      console.log('Loading documents for folder:', currentFolder);
      // Si es "informacion", enviar "documentos" al backend
      const folderType = currentFolder === 'informacion' ? 'documentos' : currentFolder;
      const data = await userFilesAPI.getUserDocuments(folderType);
      console.log('Documents loaded successfully:', data);
      setFolderData(data);
    } catch (error: any) {
      console.error('Error loading documents:', error);
      console.error('Error details:', error.response?.data || error.message);
      setAlert({ type: 'error', message: 'Error al cargar los documentos' });
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = folderData?.documents.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Estados para paginación de documentos
  const documentsPagination = usePagination({
    data: filteredDocuments,
    initialItemsPerPage: 15,
    initialPage: 1
  });

  // Reset página cuando cambia el término de búsqueda
  useEffect(() => {
    documentsPagination.setCurrentPage(1);
  }, [searchTerm, documentsPagination.setCurrentPage]);

  const getFileIcon = (fileType: string) => {
    if (fileType === '.pdf') return <PictureAsPdf color="error" />;
    return <Description color="primary" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setCurrentFolder(newValue);
    setSearchTerm('');
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, document: UserDocument) => {
    setAnchorEl(event.currentTarget);
    setSelectedDocument(document);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedDocument(null);
  };

  const handleDownload = async (document: UserDocument) => {
    try {
      // Usar el método del API para descarga directa
      const blob = await userFilesAPI.downloadFileBlob(document.download_url);
      
      // Crear un enlace temporal para la descarga
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.name;
      window.document.body.appendChild(link);
      link.click();
      
      // Limpiar
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setAlert({ type: 'success', message: 'Archivo descargado exitosamente' });
    } catch (error) {
      console.error('Error downloading file:', error);
      setAlert({ type: 'error', message: 'Error al descargar el archivo' });
    }
    handleCloseMenu();
  };

  const handleView = (document: UserDocument) => {
    if (document.type === '.pdf') {
      // Para documentos generales (información)
      if (currentFolder === 'informacion') {
        // Extraer el nombre del archivo de la download_url
        const fileName = document.download_url.split('/').pop();
        const previewUrl = `/api/documents/preview/general/${fileName}`;
        const fullUrl = previewUrl.startsWith('http') 
          ? previewUrl 
          : `${API_BASE_URL}${previewUrl}`;
        
        setPdfPreview({
          open: true,
          fileUrl: fullUrl,
          fileName: document.name
        });
      } else {
        // Para documentos personales (nóminas, dietas)
        const token = localStorage.getItem('access_token');
        if (!token) {
          setAlert({ type: 'error', message: 'No se puede mostrar el archivo. Por favor, inicia sesión nuevamente.' });
          return;
        }
        
        // Construir URL de preview con token
        const previewUrl = document.download_url.replace('/download/', '/preview/') + `?token=${token}`;
        const fullUrl = previewUrl.startsWith('http') 
          ? previewUrl 
          : `${API_BASE_URL}${previewUrl}`;
        
        setPdfPreview({
          open: true,
          fileUrl: fullUrl,
          fileName: document.name
        });
      }
    } else {
      window.open(document.download_url, '_blank');
    }
    handleCloseMenu();
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    // Deshabilitar upload para documentos generales de información
    if (currentFolder === 'informacion') {
      setAlert({ type: 'error', message: 'No se pueden subir archivos a la carpeta de información' });
      return;
    }

    setUploading(true);
    try {
      await userFilesAPI.uploadFile(currentFolder, uploadFile);
      setAlert({ type: 'success', message: 'Archivo subido exitosamente' });
      setUploadDialog(false);
      setUploadFile(null);
      loadDocuments();
    } catch (error) {
      console.error('Error uploading file:', error);
      setAlert({ type: 'error', message: 'Error al subir el archivo' });
    } finally {
      setUploading(false);
    }
  };

  const getFolderDisplayName = (folder: string) => {
    const folderNames: { [key: string]: string } = {
      'nominas': 'Nóminas', 
      'dietas': 'Dietas',
      'informacion': 'Información'
    };
    return folderNames[folder] || folder;
  };

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
          '.MuiTab-root': {
            outline: 'none !important',
            '&:focus': {
              outline: 'none !important',
              boxShadow: 'none !important',
            },
            '&:focus-visible': {
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
                  <FilePresent sx={{ fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Mis Documentos
                  </Typography>
                  <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
                    Gestiona tus nóminas, dietas e información de forma organizada
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

      {/* Navegación por Carpetas */}
      <Fade in timeout={1000}>
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid #e0e0e0',
          }}
        >
          <Tabs
            value={currentFolder}
            onChange={handleTabChange}
            variant="fullWidth"
            indicatorColor="primary"
            textColor="primary"
            sx={{
              '& .MuiTab-root': {
                minHeight: 72,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                color: '#6c757d',
                outline: 'none !important',
                border: 'none !important',
                '&:focus': {
                  outline: 'none !important',
                  boxShadow: 'none !important',
                },
                '&:focus-visible': {
                  outline: 'none !important',
                  boxShadow: 'none !important',
                },
                '&:hover': {
                  bgcolor: alpha('#501b36', 0.04),
                  color: '#501b36',
                },
                '&.Mui-selected': {
                  color: '#501b36 !important',
                  bgcolor: alpha('#501b36', 0.08),
                },
              },
              '& .MuiTabs-indicator': {
                display: 'none !important',
                height: '0px !important',
                opacity: '0 !important',
                visibility: 'hidden !important',
              },
            }}
          >
            <Tab
              icon={<PictureAsPdf sx={{ fontSize: 24 }} />}
              label="Nóminas"
              value="nominas"
              iconPosition="start"
              sx={{
                gap: 1,
                flexDirection: 'row',
              }}
            />
            <Tab
              icon={<Description sx={{ fontSize: 24 }} />}
              label="Dietas"
              value="dietas"
              iconPosition="start"
              sx={{
                gap: 1,
                flexDirection: 'row',
              }}
            />
            <Tab
              icon={<Info sx={{ fontSize: 24 }} />}
              label="Información"
              value="informacion"
              iconPosition="start"
              sx={{
                gap: 1,
                flexDirection: 'row',
              }}
            />
          </Tabs>
        </Paper>
      </Fade>

      {/* Panel de Control */}
      <Fade in timeout={1200}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
            border: '1px solid #e0e0e0',
            background: '#ffffff',
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            alignItems: 'center',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between'
          }}>
            <TextField
              placeholder={`Buscar en ${getFolderDisplayName(currentFolder)}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ 
                flex: 1,
                maxWidth: { xs: '100%', sm: 400 },
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
            
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadDocuments}
                disabled={loading}
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
                {loading ? 'Actualizando...' : 'Actualizar'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Fade>

      {/* Contenido Principal */}
      <Fade in timeout={1400}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid #e0e0e0',
            background: '#ffffff',
          }}
        >
          {/* Header de la tabla */}
          <Box sx={{ 
            p: 3, 
            borderBottom: 1, 
            borderColor: 'divider',
            background: alpha('#501b36', 0.02),
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FolderOpen sx={{ color: '#501b36', fontSize: 28 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#501b36' }}>
                  {getFolderDisplayName(currentFolder)}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {filteredDocuments.length} archivo{filteredDocuments.length !== 1 ? 's' : ''} disponible{filteredDocuments.length !== 1 ? 's' : ''}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Contenido de documentos */}
          {loading ? (
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
                Cargando documentos...
              </Typography>
            </Box>
          ) : filteredDocuments.length === 0 ? (
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
                <InsertDriveFile sx={{ fontSize: 48, color: '#501b36' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                No hay archivos en esta carpeta
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, maxWidth: 400 }}>
                {searchTerm 
                  ? `No se encontraron archivos que coincidan con "${searchTerm}"`
                  : `Comienza subiendo archivos a tu carpeta de ${getFolderDisplayName(currentFolder).toLowerCase()}`
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
                    <TableCell>Documento</TableCell>
                    <TableCell>Tamaño</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Fecha de creación</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documentsPagination.paginatedData.map((document: any) => (
                    <TableRow 
                      key={document.id} 
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
                              bgcolor: document.type === '.pdf' ? alpha('#d32f2f', 0.1) : alpha('#501b36', 0.1),
                            }}
                          >
                            {getFileIcon(document.type)}
                          </Box>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                              {document.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              Creado el {new Date(document.created_date).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={formatFileSize(document.size)}
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
                        <Chip
                          label={document.type.toUpperCase().replace('.', '')}
                          size="small"
                          color={document.type === '.pdf' ? 'error' : 'primary'}
                          sx={{
                            borderRadius: 2,
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {new Date(document.created_date).toLocaleDateString('es-ES')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuClick(e, document)}
                          sx={{
                            borderRadius: 2,
                            bgcolor: alpha('#501b36', 0.08),
                            color: '#501b36',
                            '&:hover': {
                              bgcolor: alpha('#501b36', 0.12),
                            },
                          }}
                        >
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Componente de paginación */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              mt: 3,
              p: 2,
              borderTop: '1px solid',
              borderColor: 'divider'
            }}>
              <PaginationComponent
                currentPage={documentsPagination.currentPage}
                itemsPerPage={documentsPagination.itemsPerPage}
                totalItems={filteredDocuments.length}
                onPageChange={documentsPagination.setCurrentPage}
                onItemsPerPageChange={documentsPagination.setItemsPerPage}
              />
            </Box>
            </>
          )}
        </Paper>
      </Fade>

      {/* Menú contextual mejorado */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            border: '1px solid #e0e0e0',
            mt: 1,
            minWidth: 180,
          }
        }}
      >
        <MenuItem 
          onClick={() => selectedDocument && handleView(selectedDocument)}
          sx={{
            py: 1.5,
            px: 2,
            gap: 2,
            '&:hover': {
              bgcolor: alpha('#501b36', 0.08),
              color: '#501b36',
            },
          }}
        >
          <Visibility sx={{ fontSize: 20 }} />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Vista previa
          </Typography>
        </MenuItem>
        <MenuItem 
          onClick={() => selectedDocument && handleDownload(selectedDocument)}
          sx={{
            py: 1.5,
            px: 2,
            gap: 2,
            '&:hover': {
              bgcolor: alpha('#4caf50', 0.08),
              color: '#4caf50',
            },
          }}
        >
          <CloudDownload sx={{ fontSize: 20 }} />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Descargar
          </Typography>
        </MenuItem>
      </Menu>

      {/* Dialog de subida mejorado */}
      <Dialog 
        open={uploadDialog} 
        onClose={() => setUploadDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: '#501b36',
          color: 'white',
          py: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}>
          <Upload sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
              Subir nuevo archivo
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Agregar a {getFolderDisplayName(currentFolder)}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 4, bgcolor: '#f8f9fa' }}>
          <Box sx={{ 
            border: '2px dashed #501b36',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            bgcolor: alpha('#501b36', 0.02),
            position: 'relative',
            transition: 'all 0.3s ease',
            '&:hover': {
              borderColor: '#3d1429',
              bgcolor: alpha('#501b36', 0.04),
            },
          }}>
            <input
              type="file"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
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
            <CloudUpload sx={{ fontSize: 48, color: '#501b36', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#501b36', mb: 1 }}>
              Arrastra tu archivo aquí
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              o haz clic para seleccionar desde tu dispositivo
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Formatos permitidos: PDF, DOC, DOCX • Máximo 10MB
            </Typography>
          </Box>
          
          {uploadFile && (
            <Box sx={{ 
              mt: 3, 
              p: 3, 
              bgcolor: 'white', 
              borderRadius: 2,
              border: '1px solid #e0e0e0',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha('#501b36', 0.1),
                }}
              >
                <InsertDriveFile sx={{ color: '#501b36' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {uploadFile.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {formatFileSize(uploadFile.size)}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          p: 3, 
          bgcolor: '#f8f9fa',
          gap: 1,
          borderTop: '1px solid #e0e0e0',
        }}>
          <Button 
            onClick={() => setUploadDialog(false)}
            variant="outlined"
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
            onClick={handleUpload} 
            variant="contained" 
            disabled={!uploadFile || uploading}
            sx={{
              borderRadius: 2,
              px: 3,
              textTransform: 'none',
              fontWeight: 600,
              backgroundColor: '#501b36',
              color: 'white',
              minWidth: 120,
              '&:hover': {
                backgroundColor: '#3d1429',
              },
            }}
          >
            {uploading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} color="inherit" />
                Subiendo...
              </Box>
            ) : (
              'Subir archivo'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview de PDF mejorado */}
      <PdfPreview
        open={pdfPreview.open}
        onClose={() => setPdfPreview({ open: false, fileUrl: '', fileName: '' })}
        fileUrl={pdfPreview.fileUrl}
        fileName={pdfPreview.fileName}
        title={`Vista previa: ${pdfPreview.fileName}`}
      />
    </Box>
    </>
  );
};
