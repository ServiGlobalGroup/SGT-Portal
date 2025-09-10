import React, { useState, useEffect } from 'react';
import { usePagination } from '../../hooks/usePagination';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Fade,
  GlobalStyles,
  Snackbar,
  CircularProgress,
  Avatar,
  IconButton,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  FolderOpen,
  Receipt,
  RestaurantMenu,
  Info,
  FilePresent,
  Refresh,
} from '@mui/icons-material';
import { PdfPreview } from '../../components/PdfPreview';
import { MobileDocumentCard } from '../../components/mobile/MobileDocumentCard';
import { MobilePagination } from '../../components/mobile/MobilePagination';
import { MobileLoading } from '../../components/mobile/MobileLoading';
import { MobileTabs } from '../../components/mobile/MobileTabs';
import { userFilesAPI } from '../../services/api';

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

interface AlertState {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export const MobileMisDocumentos: React.FC = () => {
  // Estados principales
  const [userDocuments, setUserDocuments] = useState<UserDocuments>({
    nominas: [],
    dietas: [],
    documentos: [],
    circulacion: [],
    permisos: [],
    vacaciones: []
  });
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState<FolderType>('nominas');
  const [searchTerm, setSearchTerm] = useState('');
  const [paginationLoading, setPaginationLoading] = useState(false);

  // Estados de UI
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [pdfPreview, setPdfPreview] = useState({
    open: false, fileUrl: '', fileName: '', title: ''
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const corporateColor = '#501b36';

  // Efectos
  useEffect(() => {
    loadUserDocuments();
  }, []);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Funciones principales
  const loadUserDocuments = async () => {
    setLoading(true);
    try {
      // Solo cargar las carpetas que soporta el backend
      const folders: ('nominas' | 'dietas' | 'documentos')[] = ['nominas', 'dietas', 'documentos'];
      const documentsByFolder: UserDocuments = {
        nominas: [],
        dietas: [],
        documentos: [],
        circulacion: [], // Vacío por defecto
        permisos: [],   // Vacío por defecto
        vacaciones: []  // Vacío por defecto
      };

      // Cargar documentos de cada carpeta válida
      for (const folder of folders) {
        try {
          console.log(`Cargando documentos para carpeta: ${folder}`);
          const response = await userFilesAPI.getUserDocuments(folder);
          console.log(`Respuesta para ${folder}:`, response);
          
          // La API devuelve {documents: [], folder_type: '', total_files: 0, total_size: 0}
          const documents = response.documents || [];
          
          // Mapear la respuesta de la API al formato esperado
          documentsByFolder[folder] = documents.map((doc: any) => ({
            id: doc.id || Math.random(),
            name: doc.name || 'Documento sin nombre',
            size: doc.size || 0,
            type: doc.type || '.pdf',
            created_date: doc.created_date || new Date().toISOString(),
            modified_date: doc.modified_date,
            download_url: doc.download_url
          }));
        } catch (error) {
          console.warn(`Error loading documents for ${folder}:`, error);
          // Mantener array vacío en caso de error
          documentsByFolder[folder] = [];
        }
      }

      console.log('Documentos cargados:', documentsByFolder);
      setUserDocuments(documentsByFolder);
    } catch (err: any) {
      console.error('Error loading user documents:', err);
      setAlert({
        type: 'error',
        message: 'Error al cargar los documentos'
      });
    } finally {
      setLoading(false);
    }
  };

  // Obtener documentos de la carpeta actual
  const currentDocuments = userDocuments[currentFolder] || [];
  
  // Filtrar documentos
  const filteredDocuments = currentDocuments.filter(doc => {
    return doc.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Paginación
  const documentsPagination = usePagination({
    data: filteredDocuments,
    initialItemsPerPage: 8, // Aumentamos a 8 para mejor aprovechamiento del espacio
    initialPage: 1
  });

  // Reset página cuando cambian los filtros
  useEffect(() => {
    if (documentsPagination.currentPage > documentsPagination.totalPages && documentsPagination.totalPages > 0) {
      documentsPagination.setCurrentPage(1);
    }
  }, [searchTerm, currentFolder, documentsPagination]);

  // Función para manejar cambio de página con loading
  const handlePageChange = async (page: number) => {
    setPaginationLoading(true);
    // Pequeño delay para mostrar el loading (simula carga)
    await new Promise(resolve => setTimeout(resolve, 200));
    documentsPagination.setCurrentPage(page);
    setPaginationLoading(false);
    // Scroll hacia arriba para mostrar la nueva página
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleView = (document: UserDocument) => {
    setPdfPreview({
      open: true,
      fileUrl: document.download_url,
      fileName: document.name,
      title: `${document.name} - ${getFolderDisplayName(currentFolder)}`
    });
  };

  const handleDownload = async (document: UserDocument) => {
    try {
      // Usar la API real para descargar el archivo
      const blob = await userFilesAPI.downloadFileBlob(document.download_url);
      
      // Crear un enlace de descarga
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.name;
      window.document.body.appendChild(link);
      link.click();
      
      // Limpiar
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSnackbar({
        open: true,
        message: `Documento "${document.name}" descargado exitosamente`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      setSnackbar({
        open: true,
        message: 'Error al descargar el documento',
        severity: 'error'
      });
    }
  };

  // Componente de estado vacío
  const EmptyState = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        px: 4,
      }}
    >
      <Avatar
        sx={{
          width: 80,
          height: 80,
          bgcolor: alpha(corporateColor, 0.1),
          mb: 3,
        }}
      >
        <FilePresent sx={{ fontSize: 40, color: corporateColor }} />
      </Avatar>
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
          mb: 3,
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
    return <MobileLoading message="Cargando tus documentos..." />;
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
              background: `linear-gradient(135deg, ${corporateColor} 0%, #6d2548 30%, #7d2d52 50%, #d4a574 100%)`,
              color: 'white',
              borderRadius: 3,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <FolderOpen sx={{ fontSize: 24 }} />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Mis Documentos
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, lineHeight: 1.3 }}>
                    Gestiona todos tus documentos personales
                  </Typography>
                </Box>
                <IconButton
                  onClick={loadUserDocuments}
                  sx={{ 
                    color: 'white',
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                    }
                  }}
                >
                  <Refresh />
                </IconButton>
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

        {/* Pestañas con búsqueda integrada */}
        <Fade in timeout={1000}>
          <Box sx={{ mb: 3 }}>
            <MobileTabs
              options={tabOptions}
              activeTab={currentFolder}
              onChange={(tabId) => setCurrentFolder(tabId as FolderType)}
              corporateColor={corporateColor}
              variant="pills"
              searchProps={{
                searchTerm,
                onSearchChange: setSearchTerm,
                placeholder: "Buscar documentos...",
                showFilter: true,
                onFilterClick: () => {
                  // Aquí puedes agregar lógica de filtrado adicional
                  console.log('Filtro clickeado');
                }
              }}
            />
          </Box>
        </Fade>

        {/* Contenido principal */}
        <Fade in timeout={1400}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              border: '1px solid #e0e0e0',
              background: '#ffffff',
              overflow: 'hidden',
              mb: 3,
            }}
          >
            {/* Header de la sección */}
            <Box sx={{ 
              p: 2, 
              borderBottom: '1px solid #e0e0e0',
              background: alpha(corporateColor, 0.02),
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: corporateColor, fontSize: '1.1rem' }}>
                    {getFolderDisplayName(currentFolder)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    {filteredDocuments.length} documento{filteredDocuments.length !== 1 ? 's' : ''} • {formatFileSize(
                      filteredDocuments.reduce((sum, doc) => sum + doc.size, 0)
                    )}
                    {documentsPagination.totalPages > 1 && (
                      <>
                        {' '} • Página {documentsPagination.currentPage} de {documentsPagination.totalPages}
                      </>
                    )}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(corporateColor, 0.1) }}>
                  {tabOptions.find(tab => tab.id === currentFolder)?.icon}
                </Avatar>
              </Box>
            </Box>

            {filteredDocuments.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <Box 
                  sx={{ 
                    p: 2, 
                    position: 'relative',
                    opacity: paginationLoading ? 0.6 : 1,
                    transition: 'opacity 0.2s ease'
                  }}
                >
                  {paginationLoading && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(255,255,255,0.8)',
                        zIndex: 1,
                        borderRadius: 2,
                      }}
                    >
                      <Box sx={{ textAlign: 'center' }}>
                        <CircularProgress size={24} sx={{ color: corporateColor, mb: 1 }} />
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Cargando página...
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 2 
                  }}>
                    {documentsPagination.paginatedData.map((document) => (
                      <MobileDocumentCard
                        key={document.id}
                        document={document}
                        onView={handleView}
                        onDownload={handleDownload}
                        corporateColor={corporateColor}
                      />
                    ))}
                  </Box>
                </Box>
                
                {/* Paginación */}
                <MobilePagination
                  currentPage={documentsPagination.currentPage}
                  totalPages={documentsPagination.totalPages}
                  totalItems={filteredDocuments.length}
                  itemsPerPage={documentsPagination.itemsPerPage}
                  onPageChange={handlePageChange}
                  corporateColor={corporateColor}
                />
              </>
            )}
          </Paper>
        </Fade>

        {/* Preview de PDF */}
        <PdfPreview
          open={pdfPreview.open}
          onClose={() => setPdfPreview({ open: false, fileUrl: '', fileName: '', title: '' })}
          fileUrl={pdfPreview.fileUrl}
          fileName={pdfPreview.fileName}
          title={pdfPreview.title}
        />

        {/* Snackbar para notificaciones */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
};

export default MobileMisDocumentos;
