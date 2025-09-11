import React, { useState, useEffect } from 'react';
import { usePagination } from '../../hooks/usePagination';
import {
  Box,
  Typography,
  Alert,
  Stack,
  Menu,
  MenuItem,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Receipt,
  RestaurantMenu,
  Info,
  Visibility,
  CloudDownload,
  FilePresent,
} from '@mui/icons-material';
import { PdfPreview } from '../../components/PdfPreview';
import { MobileDocumentCard } from '../../components/mobile/MobileDocumentCard';
import { MobileLayout } from '../../components/mobile/MobileLayout';
import { MobileTabs } from '../../components/mobile/MobileTabs';
import { MobileSearchBar } from '../../components/mobile/MobileSearchBar';
import { MobilePagination } from '../../components/mobile/MobilePagination';
import { userFilesAPI, API_BASE_URL } from '../../services/api';

// Interfaces
interface UserDocument {
  id: number;
  name: string;
  size: number;
  type: string;
  created_date: string;
  modified_date?: string;
  download_url: string;
}

interface UserDocuments {
  nominas: UserDocument[];
  dietas: UserDocument[];
  documentos: UserDocument[];
  circulacion: UserDocument[];
  permisos: UserDocument[];
  vacaciones: UserDocument[];
}

type FolderType = keyof UserDocuments;

export const MobileDocuments: React.FC = () => {
  const [userDocuments, setUserDocuments] = useState<UserDocuments>({
    nominas: [],
    dietas: [],
    documentos: [],
    circulacion: [],
    permisos: [],
    vacaciones: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<FolderType>('nominas');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para preview y menú
  const [pdfPreview, setPdfPreview] = useState({
    open: false, fileUrl: '', fileName: ''
  });
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(null);

  const corporateColor = '#501b36';

  // Cargar documentos al montar
  useEffect(() => {
    loadUserDocuments();
  }, []);

  const loadUserDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userFilesAPI.getUserDocuments();
      setUserDocuments(data);
    } catch (err: any) {
      setError('Error al cargar los documentos');
    } finally {
      setLoading(false);
    }
  };

  // Obtener documentos de la carpeta actual
  const currentDocuments = userDocuments[currentFolder] || [];
  
  // Filtrar documentos por búsqueda
  const filteredDocuments = currentDocuments.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Configurar paginación
  const {
    currentItems: paginatedDocuments,
    currentPage,
    totalPages,
    goToPage,
    goToNextPage,
    goToPreviousPage,
  } = usePagination(filteredDocuments, 6);

  // Configuración de pestañas
  const tabOptions = [
    {
      id: 'nominas',
      label: 'Nóminas',
      count: userDocuments.nominas.length,
      icon: <Receipt sx={{ fontSize: 18 }} />,
    },
    {
      id: 'dietas',
      label: 'Dietas',
      count: userDocuments.dietas.length,
      icon: <RestaurantMenu sx={{ fontSize: 18 }} />,
    },
    {
      id: 'documentos',
      label: 'Información',
      count: userDocuments.documentos.length,
      icon: <Info sx={{ fontSize: 18 }} />,
    },
  ];

  // Funciones de manejo
  const getFolderDisplayName = (folder: FolderType) => {
    const names = {
      nominas: 'Nóminas',
      dietas: 'Dietas',
      documentos: 'Información',
      circulacion: 'Circulación',
      permisos: 'Permisos',
      vacaciones: 'Vacaciones'
    };
    return names[folder] || folder;
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, document: UserDocument) => {
    setMenuAnchor(event.currentTarget);
    setSelectedDocument(document);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedDocument(null);
  };

  const handleView = (document: UserDocument) => {
    setPdfPreview({
      open: true,
      fileUrl: document.download_url,
      fileName: document.name
    });
    handleMenuClose();
  };

  const handleDownload = async (document: UserDocument) => {
    try {
      window.open(document.download_url, '_blank');
    } catch (error) {
      setError('Error al descargar el documento');
    }
    handleMenuClose();
  };

  // Componente de estado vacío
  const EmptyState = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 4,
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          bgcolor: alpha(corporateColor, 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
        }}
      >
        <FilePresent sx={{ fontSize: 40, color: corporateColor }} />
      </Box>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          color: 'text.secondary',
          mb: 1,
          textAlign: 'center',
        }}
      >
        No hay documentos
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          textAlign: 'center',
          maxWidth: 300,
          lineHeight: 1.5,
        }}
      >
        {searchTerm
          ? `No se encontraron documentos que coincidan con "${searchTerm}"`
          : `No hay documentos disponibles en ${getFolderDisplayName(currentFolder).toLowerCase()}`
        }
      </Typography>
    </Box>
  );

  if (loading) {
    return (
      <MobileLayout
        title="Mis Documentos"
        subtitle="Cargando..."
        corporateColor={corporateColor}
      >
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography>Cargando documentos...</Typography>
        </Box>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout
      title="Mis Documentos"
      subtitle="Gestiona tus documentos de forma organizada"
      corporateColor={corporateColor}
    >
      {/* Búsqueda */}
      <Box sx={{ mb: 3 }}>
        <MobileSearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar en documentos..."
          corporateColor={corporateColor}
        />
      </Box>

      {/* Pestañas */}
      <MobileTabs
        options={tabOptions}
        activeTab={currentFolder}
        onChange={(tabId) => setCurrentFolder(tabId as FolderType)}
        corporateColor={corporateColor}
        variant="pills"
      />

      {/* Estadísticas rápidas */}
      <Card
        sx={{
          mt: 2,
          mb: 3,
          background: `linear-gradient(135deg, ${corporateColor} 0%, ${alpha(corporateColor, 0.8)} 100%)`,
          color: 'white',
        }}
      >
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                {filteredDocuments.length}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {filteredDocuments.length === 1 ? 'documento' : 'documentos'} disponibles
              </Typography>
            </Box>
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {tabOptions.find(tab => tab.id === currentFolder)?.icon}
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Contenido principal */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {filteredDocuments.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Grid de documentos */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {paginatedDocuments.map((document) => (
              <Grid item xs={12} sm={6} key={document.id}>
                <MobileDocumentCard
                  document={document}
                  onMenuClick={handleMenuClick}
                  onView={handleView}
                  onDownload={handleDownload}
                  corporateColor={corporateColor}
                />
              </Grid>
            ))}
          </Grid>

          {/* Paginación */}
          {totalPages > 1 && (
            <MobilePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              onNextPage={goToNextPage}
              onPreviousPage={goToPreviousPage}
              corporateColor={corporateColor}
            />
          )}
        </>
      )}

      {/* Menú contextual */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 2,
            minWidth: 180,
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          },
        }}
      >
        <MenuItem onClick={() => selectedDocument && handleView(selectedDocument)}>
          <Visibility sx={{ mr: 2, fontSize: 20, color: '#2196f3' }} />
          Ver documento
        </MenuItem>
        <MenuItem onClick={() => selectedDocument && handleDownload(selectedDocument)}>
          <CloudDownload sx={{ mr: 2, fontSize: 20, color: '#4caf50' }} />
          Descargar
        </MenuItem>
      </Menu>

      {/* Preview de PDF */}
      <PdfPreview
        open={pdfPreview.open}
        onClose={() => setPdfPreview({ open: false, fileUrl: '', fileName: '' })}
        fileUrl={pdfPreview.fileUrl}
        fileName={pdfPreview.fileName}
      />
    </MobileLayout>
  );
};

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

export const MobileDocuments: React.FC = () => {
  const [currentFolder, setCurrentFolder] = useState('informacion');
  const [folderData, setFolderData] = useState<FolderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
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
      const folderType = currentFolder === 'informacion' ? 'documentos' : currentFolder;
      const data = await userFilesAPI.getUserDocuments(folderType);
      setFolderData(data);
    } catch (error: any) {
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
    initialItemsPerPage: 10,
    initialPage: 1
  });

  // Reset página cuando cambia el término de búsqueda
  useEffect(() => {
    documentsPagination.setCurrentPage(1);
  }, [searchTerm, documentsPagination.setCurrentPage]);

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
      const blob = await userFilesAPI.downloadFileBlob(document.download_url);
      
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.name;
      window.document.body.appendChild(link);
      link.click();
      
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setAlert({ type: 'success', message: 'Archivo descargado exitosamente' });
    } catch (error) {
      setAlert({ type: 'error', message: 'Error al descargar el archivo' });
    }
    handleCloseMenu();
  };

  const handleView = (document: UserDocument) => {
    if (document.type === '.pdf') {
      if (currentFolder === 'informacion') {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setAlert({ type: 'error', message: 'No se puede mostrar el archivo. Por favor, inicia sesión nuevamente.' });
          return;
        }
        
        const fileName = document.download_url.split('/').pop();
        const previewUrl = `/api/documents/preview/general/${fileName}?token=${encodeURIComponent(token)}`;
        const fullUrl = previewUrl.startsWith('http') 
          ? previewUrl 
          : `${API_BASE_URL}${previewUrl}`;
        
        setPdfPreview({
          open: true,
          fileUrl: fullUrl,
          fileName: document.name
        });
      } else {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setAlert({ type: 'error', message: 'No se puede mostrar el archivo. Por favor, inicia sesión nuevamente.' });
          return;
        }
        
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

  const getFolderDisplayName = (folder: string) => {
    const folderNames: { [key: string]: string } = {
      'nominas': 'Nóminas', 
      'dietas': 'Dietas',
      'informacion': 'Información'
    };
    return folderNames[folder] || folder;
  };

  const folderTabs = [
    { value: 'nominas', label: 'Nóminas', icon: <PictureAsPdf sx={{ fontSize: 20 }} /> },
    { value: 'dietas', label: 'Dietas', icon: <Description sx={{ fontSize: 20 }} /> },
    { value: 'informacion', label: 'Información', icon: <Info sx={{ fontSize: 20 }} /> },
  ];

  return (
    <>
      <GlobalStyles
        styles={{
          body: {
            paddingRight: '0px !important',
            overflow: 'auto !important',
            overflowX: 'hidden !important',
          },
        }}
      />
      <Box sx={{ p: 2, maxWidth: '100%', bgcolor: '#f5f5f5', minHeight: '100vh' }}>
        {/* Header Principal */}
        <Fade in timeout={600}>
          <Paper 
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              background: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 50%, #d4a574 100%)',
              color: 'white',
              borderRadius: 3,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
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
                  <FilePresent sx={{ fontSize: 24 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Mis Documentos
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, lineHeight: 1.3 }}>
                    Gestiona tus documentos de forma organizada
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Fade>

        {/* Alertas */}
        {alert && (
          <Fade in timeout={400}>
            <Alert 
              severity={alert.type} 
              sx={{ 
                mb: 2,
                borderRadius: 2,
              }} 
              onClose={() => setAlert(null)}
            >
              {alert.message}
            </Alert>
          </Fade>
        )}

        {/* Navegación por Carpetas */}
        <Fade in timeout={800}>
          <Paper
            elevation={0}
            sx={{
              mb: 2,
              borderRadius: 2,
              border: '1px solid #e0e0e0',
              overflow: 'hidden',
            }}
          >
            <Tabs
              value={currentFolder}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                '& .MuiTab-root': {
                  minHeight: 56,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  color: '#6c757d',
                  padding: '8px 12px',
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
                  display: 'none',
                },
              }}
            >
              {folderTabs.map((tab) => (
                <Tab
                  key={tab.value}
                  icon={tab.icon}
                  label={tab.label}
                  value={tab.value}
                  iconPosition="start"
                  sx={{ gap: 0.5, flexDirection: 'row' }}
                />
              ))}
            </Tabs>
          </Paper>
        </Fade>

        {/* Filtros de búsqueda */}
        <Fade in timeout={1000}>
          <Box sx={{ mb: 2 }}>
            <MobileFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onRefresh={loadDocuments}
              loading={loading}
              searchPlaceholder={`Buscar en ${getFolderDisplayName(currentFolder)}`}
            />
          </Box>
        </Fade>

        {/* Contenido Principal */}
        <Fade in timeout={1200}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              border: '1px solid #e0e0e0',
              background: '#ffffff',
              overflow: 'hidden',
            }}
          >
            {/* Header de la sección */}
            <Box sx={{ 
              p: 2, 
              borderBottom: '1px solid #e0e0e0',
              background: alpha('#501b36', 0.02),
            }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#501b36', fontSize: '1.1rem' }}>
                {getFolderDisplayName(currentFolder)}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {filteredDocuments.length} archivo{filteredDocuments.length !== 1 ? 's' : ''} disponible{filteredDocuments.length !== 1 ? 's' : ''}
              </Typography>
            </Box>

            {/* Lista de documentos */}
            {loading ? (
              <MobileLoading message="Cargando documentos..." />
            ) : filteredDocuments.length === 0 ? (
              <Box sx={{ 
                p: 4, 
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2
              }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: '50%',
                    bgcolor: alpha('#501b36', 0.1),
                    mb: 1,
                  }}
                >
                  <FilePresent sx={{ fontSize: 40, color: '#501b36' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                  No hay archivos
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 300, lineHeight: 1.4 }}>
                  {searchTerm 
                    ? `No se encontraron archivos que coincidan con "${searchTerm}"`
                    : `No hay archivos en ${getFolderDisplayName(currentFolder).toLowerCase()}`
                  }
                </Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ p: 2 }}>
                  <Stack spacing={1.5}>
                    {documentsPagination.paginatedData.map((document: any) => (
                      <MobileDocumentCard
                        key={document.id}
                        document={document}
                        onMenuClick={handleMenuClick}
                        onView={handleView}
                        onDownload={handleDownload}
                      />
                    ))}
                  </Stack>
                </Box>
                
                {/* Paginación */}
                <MobilePagination
                  currentPage={documentsPagination.currentPage}
                  totalPages={Math.ceil(filteredDocuments.length / documentsPagination.itemsPerPage)}
                  totalItems={filteredDocuments.length}
                  itemsPerPage={documentsPagination.itemsPerPage}
                  onPageChange={documentsPagination.setCurrentPage}
                />
              </>
            )}
          </Paper>
        </Fade>

        {/* Menú contextual */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseMenu}
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              border: '1px solid #e0e0e0',
              minWidth: 160,
            }
          }}
        >
          <MenuItem 
            onClick={() => selectedDocument && handleView(selectedDocument)}
            sx={{
              py: 1,
              px: 2,
              gap: 1.5,
              '&:hover': {
                bgcolor: alpha('#501b36', 0.08),
                color: '#501b36',
              },
            }}
          >
            <Visibility sx={{ fontSize: 18 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Vista previa
            </Typography>
          </MenuItem>
          <MenuItem 
            onClick={() => selectedDocument && handleDownload(selectedDocument)}
            sx={{
              py: 1,
              px: 2,
              gap: 1.5,
              '&:hover': {
                bgcolor: alpha('#4caf50', 0.08),
                color: '#4caf50',
              },
            }}
          >
            <CloudDownload sx={{ fontSize: 18 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Descargar
            </Typography>
          </MenuItem>
        </Menu>

        {/* Preview de PDF */}
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
