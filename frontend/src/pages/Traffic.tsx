import React, { useState, useContext, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Paper,
  TextField,
  Breadcrumbs,
  Link,
  Chip,
  Alert,
  CircularProgress,
  Stack,
  Fade,
  GlobalStyles,
  IconButton,
  Tooltip,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  MenuItem,
} from '@mui/material';
import { AuthContext } from '../contexts/AuthContext';
import { alpha } from '@mui/material/styles';
import {
  Folder,
  FolderOpen,
  Upload,
  ArrowBack,
  Download,
  CreateNewFolder,
  Description,
  Home,
  NavigateNext,
  Visibility,
  LocalShipping,
  Business,
  DirectionsCar,
  Refresh,
  Search,
  InsertDriveFile,
  MoreVert,
  DriveEta,
  AccountTree,
  GridView,
  ViewList,
  Warning,
  PictureAsPdf,
  Image,
  Delete,
} from '@mui/icons-material';
import { trafficFilesAPI, API_BASE_URL } from '../services/api';
import { PdfPreview } from '../components/PdfPreview';

interface TrafficFolder {
  id: number;
  name: string;
  parentId: number | null;
  createdDate: string;
  type: 'folder' | 'company' | 'vehicle_type' | 'vehicle';
  description?: string;
}

interface TrafficFile {
  id: number;
  name: string;
  size: number;
  type: string;
  folderId: number;
  uploadDate: string;
  url: string;
}

type UnifiedItem = 
  | (TrafficFolder & { itemType: 'folder' })
  | (TrafficFile & { itemType: 'file' });

export const Traffic: React.FC = () => {
  // Contexto de autenticación
  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error('Traffic must be used within an AuthProvider');
  }
  const { user: currentUser } = authContext;

  // Helper para verificar permisos
  const canManageTraffic = currentUser?.role === 'ADMINISTRADOR' || 
                          currentUser?.role === 'TRAFICO' || 
                          currentUser?.role === 'MASTER_ADMIN';

  // Estados principales
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [folders, setFolders] = useState<TrafficFolder[]>([]);
  const [files, setFiles] = useState<TrafficFile[]>([]);

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Estados para paginación
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [unifiedItems, setUnifiedItems] = useState<UnifiedItem[]>([]);

  // Estados de modales
  const [createFolderModal, setCreateFolderModal] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);

  // Estados para preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFileUrl, setPreviewFileUrl] = useState('');
  const [previewFileName, setPreviewFileName] = useState('');
  
  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // Función para cargar carpetas desde la API
  const loadFolders = async (path?: string) => {
    try {
      console.log('🔄 Loading folders for path:', path || 'root');
      setLoading(true);
      
      const foldersData = await trafficFilesAPI.getFolders(path);
      console.log('📁 Folders loaded:', foldersData);
      
      // Filtrar para evitar bucles y navegación circular
      let filteredFolders = Array.isArray(foldersData) ? foldersData : [];
      
      if (path && path !== '/') {
        // Obtener todos los segmentos de la ruta actual
        const pathSegments = path.split('/').filter(p => p);
        console.log('🔍 Current path segments:', pathSegments);
        
        // Filtrar carpetas que ya están en la ruta actual (evitar bucles)
        filteredFolders = filteredFolders.filter(folder => {
          const isInCurrentPath = pathSegments.includes(folder.name);
          const shouldKeep = !isInCurrentPath;
          
          if (!shouldKeep) {
            console.log('🚫 Filtered out circular reference:', folder.name, 'from path:', pathSegments);
          }
          
          return shouldKeep;
        });
      }
      
      console.log('✅ Final filtered folders:', filteredFolders.map(f => f.name));
      setFolders(filteredFolders);
    } catch (error) {
      console.error('Error loading folders:', error);
      showSnackbar('Error al cargar las carpetas', 'error');
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar archivos desde la API
  const loadFiles = async (path?: string) => {
    try {
      console.log('🔄 Loading files for path:', path || 'root');
      
      const filesData = await trafficFilesAPI.getFiles(path);
      console.log('📄 Files loaded:', filesData);
      setFiles(Array.isArray(filesData) ? filesData : []);
    } catch (error) {
      console.error('Error loading files:', error);
      showSnackbar('Error al cargar los archivos', 'error');
      setFiles([]);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    loadFolders();
    loadFiles();
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    loadFolders(currentPath === '/' ? undefined : currentPath);
    loadFiles(currentPath === '/' ? undefined : currentPath);
  }, []);

  // Recargar datos cuando cambie la carpeta actual
  useEffect(() => {
    loadFolders(currentPath === '/' ? undefined : currentPath);
    loadFiles(currentPath === '/' ? undefined : currentPath);
  }, [currentPath]);

  // Crear elementos unificados para vista lista
  useEffect(() => {
    const currentFolders = getCurrentFolders();
    const currentFiles = getCurrentFiles();
    
    const folderItems: UnifiedItem[] = currentFolders.map((folder: TrafficFolder) => ({
      ...folder,
      itemType: 'folder' as const
    }));
    
    const fileItems: UnifiedItem[] = currentFiles.map((file: TrafficFile) => ({
      ...file,
      itemType: 'file' as const
    }));
    
    setUnifiedItems([...folderItems, ...fileItems]);
  }, [currentPath, searchTerm, folders, files]);

  // Funciones auxiliares
  const getCurrentFolders = () => {
    // Como la API ya devuelve las carpetas del path actual,
    // solo necesitamos filtrar por término de búsqueda si existe
    const filteredFolders = searchTerm 
      ? folders.filter(folder => 
          folder.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : folders;
    
    return filteredFolders;
  };

  const getCurrentFiles = () => {
    // Como la API ya devuelve los archivos del path actual,
    // solo necesitamos filtrar por término de búsqueda si existe
    const filteredFiles = searchTerm 
      ? files.filter(file => 
          file.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : files;
    
    return filteredFiles;
  };

  const getBreadcrumbs = (): string[] => {
    if (currentPath === '/') return [];
    return currentPath.split('/').filter(p => p);
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getTypeIcon = (type: 'folder' | 'company' | 'vehicle_type' | 'vehicle') => {
    switch (type) {
      case 'company': return <Business sx={{ fontSize: 28, color: '#501b36' }} />;
      case 'vehicle_type': return <LocalShipping sx={{ fontSize: 28, color: '#43A047' }} />;
      case 'vehicle': return <DirectionsCar sx={{ fontSize: 28, color: '#FF9800' }} />;
      default: return <Folder sx={{ fontSize: 28, color: '#757575' }} />;
    }
  };

  const getFolderTypeColor = (type: 'folder' | 'company' | 'vehicle_type' | 'vehicle') => {
    switch (type) {
      case 'company': return '#501b36';
      case 'vehicle_type': return '#43A047';
      case 'vehicle': return '#FF9800';
      default: return '#757575';
    }
  };

  const getFolderTypeText = (type: 'folder' | 'company' | 'vehicle_type' | 'vehicle') => {
    switch (type) {
      case 'company': return 'Empresa';
      case 'vehicle_type': return 'Tipo de Vehículo';
      case 'vehicle': return 'Vehículo';
      default: return 'Carpeta';
    }
  };

  // Handlers
  const handleFolderClick = (folderName: string) => {
    // Verificar si ya estamos en esta carpeta o si causaría un bucle
    const pathSegments = currentPath.split('/').filter(p => p);
    
    // Evitar bucles: no navegar a una carpeta si ya estamos dentro de ella
    if (pathSegments.includes(folderName)) {
      console.warn('🚫 Preventing circular navigation to:', folderName, 'current path:', currentPath);
      showSnackbar(`No se puede navegar a "${folderName}" - ya estás dentro de esta carpeta`, 'warning');
      return;
    }
    
    const newPath = currentPath === '/' 
      ? `/${folderName}`
      : `${currentPath}/${folderName}`;
    
    console.log('📂 Navigating from', currentPath, 'to', newPath);
    setCurrentPath(newPath);
  };

  const handleBackClick = () => {
    if (currentPath !== '/') {
      const pathParts = currentPath.split('/').filter(p => p);
      pathParts.pop();
      const newPath = pathParts.length > 0 ? `/${pathParts.join('/')}` : '/';
      setCurrentPath(newPath);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await loadFolders(currentPath === '/' ? undefined : currentPath);
      await loadFiles(currentPath === '/' ? undefined : currentPath);
      showSnackbar('Datos actualizados correctamente', 'success');
    } catch (error) {
      showSnackbar('Error al actualizar los datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handler para crear carpeta
  const handleCreateFolder = async (folderName: string) => {
    if (!folderName.trim()) return;
    
    try {
      setLoading(true);
      
      await trafficFilesAPI.createFolder(folderName, currentPath === '/' ? undefined : currentPath);
      
      // Recargar carpetas
      await loadFolders(currentPath === '/' ? undefined : currentPath);
      showSnackbar('Carpeta creada exitosamente', 'success');
      setCreateFolderModal(false);
    } catch (error) {
      console.error('Error creating folder:', error);
      showSnackbar('Error al crear la carpeta', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handler para subir archivos
  const handleUploadFiles = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;
    
    try {
      setLoading(true);
      console.log('🔼 Uploading files to path:', currentPath);
      console.log('📎 Files to upload:', selectedFiles.map(f => f.name));
      
      const uploadResult = await trafficFilesAPI.uploadFiles(selectedFiles, currentPath === '/' ? undefined : currentPath);
      console.log('✅ Upload result:', uploadResult);
      
      // Recargar archivos
      console.log('🔄 Reloading files after upload...');
      await loadFiles(currentPath === '/' ? undefined : currentPath);
      
      showSnackbar(`${selectedFiles.length} archivo(s) subido(s) exitosamente`, 'success');
      setUploadModal(false);
    } catch (error) {
      console.error('❌ Error uploading files:', error);
      showSnackbar('Error al subir los archivos', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Estadísticas
  const stats = {
    totalFolders: folders.length,
    totalFiles: files.length,
    currentFolders: getCurrentFolders().length,
    currentFiles: getCurrentFiles().length,
    totalSize: files.reduce((acc, file) => acc + file.size, 0),
  };

  // Filtrar archivos por búsqueda
  const filteredFiles = getCurrentFiles().filter(file => 
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtrar elementos unificados por búsqueda para vista lista
  const filteredUnifiedItems = unifiedItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginación para vista lista
  const paginatedItems = filteredUnifiedItems.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Función para manejar la apertura de archivos
  const handleOpenFile = (file: TrafficFile) => {
    // Por ahora, solo mostrar en consola
    console.log('Abrir archivo:', file);
  };

  // Funciones para manejo de archivos
  const handlePreviewFile = (file: TrafficFile) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension || '');
    const isPDF = fileExtension === 'pdf';
    
    if (isImage || isPDF) {
      let fileUrl: string;
      
      if (file.url) {
        // Usar la URL que viene del backend - reemplazar download por preview
        fileUrl = file.url.replace('/download/', '/preview/');
      } else {
        // Fallback: construir la URL manualmente
        const relativePath = currentPath === '/' 
          ? file.name 
          : `${currentPath.substring(1)}/${file.name}`;
        fileUrl = `${API_BASE_URL}/api/traffic/preview/${encodeURIComponent(relativePath)}`;
      }
      
      // Usar el componente PdfPreview para mostrar el archivo
      setPreviewFileUrl(fileUrl);
      setPreviewFileName(file.name);
      setPreviewOpen(true);
    } else {
      showSnackbar('Vista previa no disponible para este tipo de archivo', 'warning');
    }
  };

  const handleDownloadFile = (file: TrafficFile) => {
    try {
      let fileUrl: string;
      
      if (file.url) {
        // Usar directamente la URL que viene del backend
        fileUrl = file.url;
      } else {
        // Fallback: construir la URL manualmente
        const relativePath = currentPath === '/' 
          ? file.name 
          : `${currentPath.substring(1)}/${file.name}`;
  // El backend espera query param ?path=
  fileUrl = `${API_BASE_URL}/api/traffic/download?path=${encodeURIComponent(relativePath)}`;
      }
      
      // Crear elemento a temporal para descargar
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSnackbar('Descarga iniciada', 'success');
    } catch (error) {
      console.error('Error downloading file:', error);
      showSnackbar('Error al descargar el archivo', 'error');
    }
  };

  const handleDeleteFile = async (file: TrafficFile) => {
    console.log('File object:', file); // Debug log
    
    if (window.confirm(`¿Estás seguro de que quieres eliminar "${file.name}"?`)) {
      try {
        setLoading(true);
        
        // Verificar si file.url existe, sino construir la ruta manualmente
        let relativePath: string;
        
        if (file.url) {
          // Extraer el path relativo desde la URL del archivo (soporta formato con query ?path=)
          try {
            const urlObj = new URL(file.url, API_BASE_URL);
            const qp = urlObj.searchParams.get('path');
            if (qp) {
              relativePath = decodeURIComponent(qp);
            } else {
              relativePath = decodeURIComponent(urlObj.pathname.replace('/api/traffic/download/', ''));
            }
          } catch {
            relativePath = file.url.replace(`${API_BASE_URL}/api/traffic/download/`, '');
            relativePath = decodeURIComponent(relativePath);
          }
        } else {
          // Fallback: construir el path relativo manualmente
          relativePath = currentPath === '/' 
            ? file.name 
            : `${currentPath.substring(1)}/${file.name}`;
        }
          
        await trafficFilesAPI.deleteFile(relativePath);
        showSnackbar('Archivo eliminado correctamente', 'success');
        
        // Recargar archivos
        await loadFiles(currentPath === '/' ? undefined : currentPath);
      } catch (error) {
        console.error('Error deleting file:', error);
        showSnackbar('Error al eliminar el archivo', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // Función para obtener el icono según el tipo de archivo
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <PictureAsPdf sx={{ fontSize: 28, color: '#d32f2f' }} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
      case 'svg':
        return <Image sx={{ fontSize: 28, color: '#2e7d32' }} />;
      default:
        return <InsertDriveFile sx={{ fontSize: 28, color: '#757575' }} />;
    }
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
        }}
      />
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', bgcolor: '#f5f5f5', minHeight: '100vh' }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Fade in timeout={700}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, sm: 4 },
                background: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 55%, #d4a574 100%)',
                color: 'white',
                borderRadius: 3,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\\"60\\" height=\\"60\\" viewBox=\\"0 0 60 60\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cg fill=\\"none\\" fill-rule=\\"evenodd\\"%3E%3Cg fill=\\"%23ffffff\\" fill-opacity=\\"0.08\\"%3E%3Cpath d=\\"m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                },
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display:'flex', alignItems:'center', gap:2 }}>
                  <Box
                    sx={{
                      p:2,
                      bgcolor:'rgba(255,255,255,0.18)',
                      borderRadius:2,
                      backdropFilter:'blur(8px)',
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center'
                    }}
                  >
                    <LocalShipping sx={{ fontSize:32, color:'#ffffff' }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Gestión de Tráfico
                    </Typography>

                    <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400, fontSize: { xs: '1rem', sm: '1.1rem' } }}>
                      Gestión integral de documentos y archivos del departamento de tráfico
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Fade>
        </Box>

        {/* Estadísticas Principales - Más Compactas */}
        <Fade in timeout={1000}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
              xs: 'repeat(1, 1fr)', 
              sm: 'repeat(2, 1fr)', 
              md: 'repeat(3, 1fr)' 
            }, 
            gap: 2, 
            mb: 3 
          }}>
            <StatsCard
              title="Total Carpetas"
              value={stats.totalFolders}
              icon={<FolderOpen />}
              color="#2196f3"
              loading={loading}
            />
            <StatsCard
              title="Total Archivos"
              value={stats.totalFiles}
              icon={<Description />}
              color="#ff9800"
              loading={loading}
            />
            <StatsCard
              title="Tamaño Total"
              value={formatFileSize(stats.totalSize)}
              icon={<DriveEta />}
              color="#9c27b0"
              loading={loading}
              isSize
            />
          </Box>
        </Fade>

        {/* Panel de Control */}
        <Fade in timeout={1200}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              mb: 2,
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            {/* Navegación breadcrumbs moderna - Simplificada */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              mb: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: 'rgba(248, 250, 252, 0.8)',
              border: '1px solid #e2e8f0',
            }}>
              {/* Breadcrumb Navigation */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                {currentPath !== '/' && (
                  <Button
                    startIcon={<ArrowBack />}
                    onClick={handleBackClick}
                    variant="outlined"
                    size="small"
                    sx={{
                      borderRadius: 2,
                      borderColor: 'transparent',
                      bgcolor: 'rgba(80, 27, 54, 0.08)',
                      color: '#501b36',
                      textTransform: 'none',
                      fontWeight: 500,
                      px: 2,
                      py: 0.5,
                      fontSize: '0.875rem',
                      '&:hover': {
                        bgcolor: 'rgba(80, 27, 54, 0.15)',
                      },
                    }}
                  >
                    Volver
                  </Button>
                )}
                
                {/* Breadcrumb Trail */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem', color: '#64748b' }}>
                  {/* Home */}
                  <Button
                    onClick={() => setCurrentPath('/')}
                    sx={{
                      minWidth: 'auto',
                      p: 0.5,
                      borderRadius: 1,
                      color: currentPath === '/' ? '#501b36' : '#64748b',
                      fontWeight: currentPath === '/' ? 600 : 400,
                      '&:hover': { bgcolor: 'rgba(80, 27, 54, 0.08)' },
                    }}
                  >
                    <Home sx={{ fontSize: 16 }} />
                  </Button>

                  {/* Breadcrumb Items */}
                  {getBreadcrumbs().map((folderName, index) => {
                    const pathToFolder = '/' + getBreadcrumbs().slice(0, index + 1).join('/');
                    return (
                      <React.Fragment key={folderName}>
                        <Typography sx={{ color: '#cbd5e1', mx: 0.5, fontSize: '0.75rem' }}>
                          /
                        </Typography>
                        <Button
                          onClick={() => setCurrentPath(pathToFolder)}
                          sx={{
                            textTransform: 'none',
                            fontWeight: index === getBreadcrumbs().length - 1 ? 600 : 400,
                            fontSize: '0.875rem',
                            color: index === getBreadcrumbs().length - 1 ? '#501b36' : '#64748b',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            minWidth: 'auto',
                            maxWidth: '150px',
                            '&:hover': { bgcolor: 'rgba(80, 27, 54, 0.08)' },
                          }}
                        >
                          <Typography
                            sx={{
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              fontSize: 'inherit',
                            }}
                          >
                            {folderName}
                          </Typography>
                        </Button>
                      </React.Fragment>
                    );
                  })}
                </Box>
              </Box>

              {/* Level Indicator */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: 'rgba(80, 27, 54, 0.08)',
                  border: '1px solid rgba(80, 27, 54, 0.15)',
                }}
              >
                <AccountTree sx={{ color: '#501b36', fontSize: 16 }} />
                <Typography
                  variant="caption"
                  sx={{ 
                    color: '#501b36',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                  }}
                >
                  Nivel {currentPath !== '/' ? getBreadcrumbs().length : 0}
                </Typography>
              </Box>
            </Box>

            {/* Controles de acción - Más compactos */}
            <Box sx={{ 
              display: 'flex', 
              gap: 1.5, 
              alignItems: 'center',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              mb: 2
            }}>
              <TextField
                size="small"
                placeholder="Buscar archivos y carpetas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                }}
                sx={{ 
                  flex: 1,
                  maxWidth: { xs: '100%', sm: 350 },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    bgcolor: '#f8fafc',
                    '&:hover': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#501b36',
                      },
                    },
                    '&.Mui-focused': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#501b36',
                      },
                    },
                  },
                }}
              />
              
              <Stack direction="row" spacing={1}>
                <Tooltip title="Cambiar vista">
                  <IconButton
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    sx={{
                      color: '#501b36',
                      '&:hover': {
                        bgcolor: alpha('#501b36', 0.08),
                      },
                    }}
                  >
                    {viewMode === 'grid' ? <ViewList /> : <GridView />}
                  </IconButton>
                </Tooltip>
                
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handleRefresh}
                  disabled={loading}
                  sx={{
                    borderRadius: 2,
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
                  {loading ? <CircularProgress size={16} color="inherit" /> : 'Actualizar'}
                </Button>
                
                {canManageTraffic && (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<CreateNewFolder />}
                      onClick={() => setCreateFolderModal(true)}
                      sx={{
                        borderRadius: 2,
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
                      Nueva Carpeta
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<Upload />}
                      onClick={() => setUploadModal(true)}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        bgcolor: '#501b36',
                        boxShadow: '0 4px 12px rgba(80, 27, 54, 0.3)',
                        '&:hover': {
                          bgcolor: '#3d1429',
                          boxShadow: '0 6px 20px rgba(80, 27, 54, 0.4)',
                        },
                      }}
                    >
                      Subir Archivos
                    </Button>
                  </>
                )}
              </Stack>
            </Box>
          </Paper>
        </Fade>

        {/* Contenido Principal */}
        <Fade in timeout={1400}>
          <Paper 
            elevation={0}
            sx={{ 
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              minHeight: 500,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            {/* Header del contenido */}
            <Box sx={{ 
              p: 3, 
              borderBottom: 1, 
              borderColor: 'divider',
              background: alpha('#501b36', 0.02),
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <AccountTree sx={{ color: '#501b36', fontSize: 28 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#501b36' }}>
                    {currentPath !== '/' ? 
                      getBreadcrumbs()[getBreadcrumbs().length - 1] || 'Carpeta Actual' :
                      'Gestión de Empresas de Transporte'
                    }
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {getCurrentFolders().length} carpeta{getCurrentFolders().length !== 1 ? 's' : ''} • {filteredFiles.length} archivo{filteredFiles.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
                
                <Chip
                  label={`${getCurrentFolders().length + filteredFiles.length} elementos`}
                  variant="outlined"
                  sx={{
                    borderColor: alpha('#501b36', 0.3),
                    color: '#501b36',
                    fontWeight: 600,
                  }}
                />
              </Box>
            </Box>

            {/* Contenido */}
            <Box sx={{ p: 4 }}>
              {(getCurrentFolders().length === 0 && getCurrentFiles().length === 0) ? (
                // Estado vacío
                <Box sx={{ 
                  textAlign: 'center',
                  py: 8,
                  border: '2px dashed #e2e8f0',
                  borderRadius: 3,
                  bgcolor: alpha('#501b36', 0.01),
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: alpha('#501b36', 0.3),
                    bgcolor: alpha('#501b36', 0.02),
                  },
                }}>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: '50%',
                      bgcolor: alpha('#501b36', 0.1),
                      display: 'inline-flex',
                      mb: 2,
                    }}
                  >
                    <FolderOpen sx={{ fontSize: 40, color: '#501b36' }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
                    Esta área está vacía
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, maxWidth: 500, mx: 'auto' }}>
                    {currentPath !== '/' 
                      ? 'No hay carpetas ni archivos en esta ubicación. Puedes crear carpetas o subir archivos para empezar.' 
                      : 'Comienza creando carpetas para organizar tus documentos de tráfico por empresas y tipos de vehículos.'
                    }
                  </Typography>
                  {canManageTraffic && (
                    <Stack direction="row" spacing={2} justifyContent="center">
                      <Button
                        variant="outlined"
                        startIcon={<CreateNewFolder />}
                        onClick={() => setCreateFolderModal(true)}
                        sx={{
                          borderRadius: 2,
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
                        Crear Carpeta
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<Upload />}
                        onClick={() => setUploadModal(true)}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          bgcolor: '#501b36',
                          boxShadow: '0 4px 12px rgba(80, 27, 54, 0.3)',
                          '&:hover': {
                            bgcolor: '#3d1429',
                            boxShadow: '0 6px 20px rgba(80, 27, 54, 0.4)',
                          },
                        }}
                      >
                        Subir Archivos
                      </Button>
                    </Stack>
                  )}
                </Box>
              ) : (
                // Contenido dinámico basado en modo de vista
                viewMode === 'grid' ? (
                  // Vista de Grid (existente)
                <Box sx={{ 
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(auto-fill, minmax(280px, 1fr))',
                    sm: 'repeat(auto-fill, minmax(300px, 1fr))',
                    md: 'repeat(auto-fill, minmax(320px, 1fr))',
                    lg: 'repeat(auto-fill, minmax(340px, 1fr))'
                  },
                  gap: 3
                }}>
                  {/* Carpetas */}
                  {getCurrentFolders().map((folder) => (
                    <Card
                      key={`folder-${folder.id}`}
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        borderRadius: 3,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: `0 8px 25px ${alpha(getFolderTypeColor(folder.type), 0.15)}`,
                          borderColor: getFolderTypeColor(folder.type),
                        },
                      }}
                      onClick={() => handleFolderClick(folder.name)}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                          <Box
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              bgcolor: alpha(getFolderTypeColor(folder.type), 0.1),
                              border: `1px solid ${alpha(getFolderTypeColor(folder.type), 0.2)}`,
                            }}
                          >
                            {getTypeIcon(folder.type)}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="h6" sx={{ 
                              fontWeight: 700, 
                              mb: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: 'text.primary',
                            }}>
                              {folder.name}
                            </Typography>
                            <Chip
                              label={getFolderTypeText(folder.type)}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                bgcolor: alpha(getFolderTypeColor(folder.type), 0.1),
                                color: getFolderTypeColor(folder.type),
                                border: `1px solid ${alpha(getFolderTypeColor(folder.type), 0.3)}`,
                                mb: 1,
                              }}
                            />
                            {folder.description && (
                              <Typography variant="caption" sx={{ 
                                color: 'text.secondary',
                                display: 'block',
                                lineHeight: 1.3,
                              }}>
                                {folder.description}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {new Date(folder.createdDate).toLocaleDateString('es-ES')}
                          </Typography>
                          {canManageTraffic && (
                            <IconButton
                              size="small"
                              sx={{
                                bgcolor: alpha('#501b36', 0.08),
                                color: '#501b36',
                                '&:hover': {
                                  bgcolor: alpha('#501b36', 0.15),
                                },
                              }}
                            >
                              <MoreVert fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Archivos */}
                  {filteredFiles.map((file) => (
                    <Card
                      key={`file-${file.id}`}
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        borderRadius: 3,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 8px 25px rgba(0,0,0,0.12)',
                          borderColor: '#501b36',
                        },
                      }}
                    >
                      <CardContent sx={{ p: 3, position: 'relative' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Box
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              bgcolor: file.type === 'application/pdf' ? alpha('#d32f2f', 0.1) : alpha('#2e7d32', 0.1),
                              border: `1px solid ${file.type === 'application/pdf' ? alpha('#d32f2f', 0.2) : alpha('#2e7d32', 0.2)}`,
                            }}
                          >
                            {getFileIcon(file.name)}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle1" sx={{ 
                              fontWeight: 700,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              mb: 0.5,
                              color: 'text.primary',
                            }}>
                              {file.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {formatFileSize(file.size)}
                            </Typography>
                          </Box>
                        </Box>
                        
                        {/* Iconos de acción en la esquina inferior derecha */}
                        <Box sx={{ 
                          position: 'absolute',
                          bottom: 12,
                          right: 12,
                          display: 'flex',
                          gap: 0.5,
                          opacity: 0.7,
                          transition: 'opacity 0.2s ease',
                          '&:hover': { opacity: 1 }
                        }}>
                          <Tooltip title="Vista previa" arrow>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreviewFile(file);
                              }}
                              sx={{
                                width: 28,
                                height: 28,
                                bgcolor: 'rgba(255,255,255,0.9)',
                                color: '#2563eb',
                                border: '1px solid rgba(37, 99, 235, 0.2)',
                                backdropFilter: 'blur(4px)',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  bgcolor: '#2563eb',
                                  color: 'white',
                                  transform: 'scale(1.1)',
                                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                                }
                              }}
                            >
                              <Visibility sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Descargar" arrow>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadFile(file);
                              }}
                              sx={{
                                width: 28,
                                height: 28,
                                bgcolor: 'rgba(255,255,255,0.9)',
                                color: '#16a34a',
                                border: '1px solid rgba(22, 163, 74, 0.2)',
                                backdropFilter: 'blur(4px)',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  bgcolor: '#16a34a',
                                  color: 'white',
                                  transform: 'scale(1.1)',
                                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
                                }
                              }}
                            >
                              <Download sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          
                          {canManageTraffic && (
                            <Tooltip title="Eliminar" arrow>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFile(file);
                                }}
                                sx={{
                                  width: 28,
                                  height: 28,
                                  bgcolor: 'rgba(255,255,255,0.9)',
                                  color: '#dc2626',
                                  border: '1px solid rgba(220, 38, 38, 0.2)',
                                  backdropFilter: 'blur(4px)',
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    bgcolor: '#dc2626',
                                    color: 'white',
                                    transform: 'scale(1.1)',
                                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                                  }
                                }}
                              >
                                <Delete sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
                ) : (
                  // Vista de Lista Unificada
                  <Box>
                    <TableContainer component={Paper} sx={{ 
                      borderRadius: 3,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      overflow: 'hidden'
                    }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow sx={{ 
                          '& th': {
                            bgcolor: '#f8fafc',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            color: 'text.primary',
                            borderBottom: '2px solid #e2e8f0'
                          }
                        }}>
                          <TableCell sx={{ width: '40px', pl: 3 }}></TableCell>
                          <TableCell>Nombre</TableCell>
                          <TableCell>Tipo</TableCell>
                          <TableCell>Fecha</TableCell>
                          <TableCell>Tamaño</TableCell>
                          <TableCell align="right" sx={{ pr: 3 }}>Acciones</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paginatedItems.map((item) => (
                          <TableRow
                            key={`${item.itemType}-${item.id}`}
                            hover
                            sx={{
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                bgcolor: alpha('#501b36', 0.02),
                                transform: 'translateX(4px)',
                              },
                            }}
                            onClick={() => item.itemType === 'folder' 
                              ? handleFolderClick(item.name) 
                              : handleOpenFile(item as TrafficFile)
                            }
                          >
                            <TableCell sx={{ pl: 3 }}>
                              <Box
                                sx={{
                                  p: 1,
                                  borderRadius: 2,
                                  bgcolor: alpha(
                                    item.itemType === 'folder' 
                                      ? getFolderTypeColor((item as TrafficFolder).type)
                                      : '#501b36',
                                    0.1
                                  ),
                                  color: item.itemType === 'folder' 
                                    ? getFolderTypeColor((item as TrafficFolder).type)
                                    : '#501b36',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {item.itemType === 'folder' 
                                  ? getTypeIcon((item as TrafficFolder).type)
                                  : <Box sx={{ transform: 'scale(0.8)' }}>{getFileIcon(item.name)}</Box>
                                }
                              </Box>
                            </TableCell>
                            
                            <TableCell>
                              <Box>
                                <Typography
                                  variant="subtitle2"
                                  sx={{ 
                                    fontWeight: 600, 
                                    color: 'text.primary',
                                    mb: 0.5
                                  }}
                                >
                                  {item.name}
                                </Typography>
                                {item.itemType === 'folder' && (item as TrafficFolder).description && (
                                  <Typography
                                    variant="caption"
                                    sx={{ 
                                      color: 'text.secondary',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 1,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    {(item as TrafficFolder).description}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            
                            <TableCell>
                              <Chip
                                size="small"
                                label={item.itemType === 'folder' ? 'Carpeta' : 'Archivo'}
                                sx={{
                                  bgcolor: alpha(
                                    item.itemType === 'folder' ? '#2563eb' : '#501b36',
                                    0.1
                                  ),
                                  color: item.itemType === 'folder' ? '#2563eb' : '#501b36',
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  border: 'none',
                                }}
                              />
                            </TableCell>
                            
                            <TableCell>
                              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                {item.itemType === 'folder' 
                                  ? (item as TrafficFolder).createdDate
                                  : (item as TrafficFile).uploadDate
                                }
                              </Typography>
                            </TableCell>
                            
                            <TableCell>
                              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                {item.itemType === 'file' 
                                  ? `${((item as TrafficFile).size / 1024).toFixed(1)} KB`
                                  : '-'
                                }
                              </Typography>
                            </TableCell>
                            
                            <TableCell align="right" sx={{ pr: 3 }}>
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                {item.itemType === 'folder' ? (
                                  // Acciones para carpetas
                                  <Tooltip title="Entrar a la carpeta" arrow>
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleFolderClick(item.name);
                                      }}
                                      sx={{
                                        width: 32,
                                        height: 32,
                                        color: '#501b36',
                                        bgcolor: alpha('#501b36', 0.04),
                                        border: '1px solid',
                                        borderColor: alpha('#501b36', 0.2),
                                        borderRadius: 2,
                                        transition: 'all 0.2s ease',
                                        '&:hover': { 
                                          bgcolor: alpha('#501b36', 0.1),
                                          borderColor: '#501b36',
                                          transform: 'translateY(-1px)',
                                          boxShadow: '0 2px 8px rgba(80, 27, 54, 0.2)'
                                        }
                                      }}
                                    >
                                      <FolderOpen fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                ) : (
                                  // Acciones para archivos
                                  <>
                                    <Tooltip title="Vista previa" arrow>
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handlePreviewFile(item as TrafficFile);
                                        }}
                                        sx={{
                                          width: 32,
                                          height: 32,
                                          color: '#2563eb',
                                          bgcolor: alpha('#2563eb', 0.04),
                                          border: '1px solid',
                                          borderColor: alpha('#2563eb', 0.2),
                                          borderRadius: 2,
                                          transition: 'all 0.2s ease',
                                          '&:hover': { 
                                            bgcolor: alpha('#2563eb', 0.1),
                                            borderColor: '#2563eb',
                                            transform: 'translateY(-1px)',
                                            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)'
                                          }
                                        }}
                                      >
                                        <Visibility fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    
                                    <Tooltip title="Descargar" arrow>
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownloadFile(item as TrafficFile);
                                        }}
                                        sx={{
                                          width: 32,
                                          height: 32,
                                          color: '#16a34a',
                                          bgcolor: alpha('#16a34a', 0.04),
                                          border: '1px solid',
                                          borderColor: alpha('#16a34a', 0.2),
                                          borderRadius: 2,
                                          transition: 'all 0.2s ease',
                                          '&:hover': { 
                                            bgcolor: alpha('#16a34a', 0.1),
                                            borderColor: '#16a34a',
                                            transform: 'translateY(-1px)',
                                            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.2)'
                                          }
                                        }}
                                      >
                                        <Download fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    
                                    {canManageTraffic && (
                                      <Tooltip title="Eliminar archivo" arrow>
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteFile(item as TrafficFile);
                                          }}
                                          sx={{
                                            width: 32,
                                            height: 32,
                                            color: '#dc2626',
                                            bgcolor: alpha('#dc2626', 0.04),
                                            border: '1px solid',
                                            borderColor: alpha('#dc2626', 0.2),
                                            borderRadius: 2,
                                            transition: 'all 0.2s ease',
                                            '&:hover': { 
                                              bgcolor: alpha('#dc2626', 0.1),
                                              borderColor: '#dc2626',
                                              transform: 'translateY(-1px)',
                                              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.2)'
                                            }
                                          }}
                                        >
                                          <Delete fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                  </>
                                )}
                                
                                {item.itemType === 'folder' && canManageTraffic && (
                                  <>
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleFolderClick(item.name);
                                        setCreateFolderModal(true);
                                      }}
                                      sx={{
                                        color: '#501b36',
                                        '&:hover': { bgcolor: alpha('#501b36', 0.1) }
                                      }}
                                    >
                                      <CreateNewFolder fontSize="small" />
                                    </IconButton>
                                    
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleFolderClick(item.name);
                                        setUploadModal(true);
                                      }}
                                      sx={{
                                        color: '#501b36',
                                        '&:hover': { bgcolor: alpha('#501b36', 0.1) }
                                      }}
                                    >
                                      <Upload fontSize="small" />
                                    </IconButton>
                                  </>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {/* Paginación moderna y elegante */}
                    {filteredUnifiedItems.length > 0 && (
                      <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 3,
                        borderTop: '1px solid #e2e8f0',
                        bgcolor: '#ffffff',
                      }}>
                        {/* Info de elementos */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="body2" sx={{ 
                            color: '#64748b', 
                            fontWeight: 500,
                            fontSize: '0.875rem' 
                          }}>
                            Mostrando {Math.min((page * rowsPerPage) + 1, filteredUnifiedItems.length)}-{Math.min((page + 1) * rowsPerPage, filteredUnifiedItems.length)} de {filteredUnifiedItems.length} elementos
                          </Typography>
                          
                          {/* Selector de elementos por página */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ 
                              color: '#64748b', 
                              fontWeight: 500,
                              fontSize: '0.875rem',
                              whiteSpace: 'nowrap'
                            }}>
                              Ver:
                            </Typography>
                            <TextField
                              select
                              size="small"
                              value={rowsPerPage}
                              onChange={(e) => setRowsPerPage(parseInt(e.target.value))}
                              sx={{
                                minWidth: '70px',
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                  height: '36px',
                                  fontSize: '0.875rem',
                                  fontWeight: 500,
                                  bgcolor: '#f8fafc',
                                  border: '1.5px solid #e2e8f0',
                                  '&:hover': {
                                    borderColor: '#501b36',
                                  },
                                  '&.Mui-focused': {
                                    borderColor: '#501b36',
                                    boxShadow: '0 0 0 3px rgba(80, 27, 54, 0.1)',
                                  },
                                  '& fieldset': {
                                    border: 'none',
                                  },
                                },
                                '& .MuiSelect-select': {
                                  py: 1,
                                },
                              }}
                            >
                              {[5, 10, 25, 50, 100].map((option) => (
                                <MenuItem key={option} value={option}>
                                  {option}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Box>
                        </Box>

                        {/* Controles de navegación */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {/* Páginas */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {/* Botón primera página */}
                            <IconButton
                              onClick={() => setPage(0)}
                              disabled={page === 0}
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2,
                                border: '1.5px solid #e2e8f0',
                                bgcolor: '#f8fafc',
                                color: '#501b36',
                                transition: 'all 0.2s ease-in-out',
                                '&:hover:not(:disabled)': {
                                  bgcolor: 'rgba(80, 27, 54, 0.1)',
                                  borderColor: '#501b36',
                                  transform: 'translateY(-1px)',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                },
                                '&:disabled': {
                                  color: '#9ca3af',
                                  borderColor: '#e5e7eb',
                                  bgcolor: '#f3f4f6',
                                },
                              }}
                            >
                              <ArrowBack sx={{ fontSize: '1.1rem' }} />
                            </IconButton>

                            {/* Botón página anterior */}
                            <IconButton
                              onClick={() => setPage(page - 1)}
                              disabled={page === 0}
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2,
                                border: '1.5px solid #e2e8f0',
                                bgcolor: '#f8fafc',
                                color: '#501b36',
                                transition: 'all 0.2s ease-in-out',
                                '&:hover:not(:disabled)': {
                                  bgcolor: 'rgba(80, 27, 54, 0.1)',
                                  borderColor: '#501b36',
                                  transform: 'translateY(-1px)',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                },
                                '&:disabled': {
                                  color: '#9ca3af',
                                  borderColor: '#e5e7eb',
                                  bgcolor: '#f3f4f6',
                                },
                              }}
                            >
                              <NavigateNext sx={{ fontSize: '1.1rem', transform: 'rotate(180deg)' }} />
                            </IconButton>

                            {/* Información de página actual */}
                            <Box sx={{
                              px: 3,
                              py: 1,
                              borderRadius: 2,
                              bgcolor: '#501b36',
                              color: 'white',
                              minWidth: '80px',
                              textAlign: 'center',
                              fontWeight: 600,
                              fontSize: '0.875rem',
                              border: '1.5px solid #501b36',
                            }}>
                              {page + 1} de {Math.ceil(filteredUnifiedItems.length / rowsPerPage)}
                            </Box>

                            {/* Botón página siguiente */}
                            <IconButton
                              onClick={() => setPage(page + 1)}
                              disabled={page >= Math.ceil(filteredUnifiedItems.length / rowsPerPage) - 1}
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2,
                                border: '1.5px solid #e2e8f0',
                                bgcolor: '#f8fafc',
                                color: '#501b36',
                                transition: 'all 0.2s ease-in-out',
                                '&:hover:not(:disabled)': {
                                  bgcolor: 'rgba(80, 27, 54, 0.1)',
                                  borderColor: '#501b36',
                                  transform: 'translateY(-1px)',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                },
                                '&:disabled': {
                                  color: '#9ca3af',
                                  borderColor: '#e5e7eb',
                                  bgcolor: '#f3f4f6',
                                },
                              }}
                            >
                              <NavigateNext sx={{ fontSize: '1.1rem' }} />
                            </IconButton>

                            {/* Botón última página */}
                            <IconButton
                              onClick={() => setPage(Math.ceil(filteredUnifiedItems.length / rowsPerPage) - 1)}
                              disabled={page >= Math.ceil(filteredUnifiedItems.length / rowsPerPage) - 1}
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2,
                                border: '1.5px solid #e2e8f0',
                                bgcolor: '#f8fafc',
                                color: '#501b36',
                                transition: 'all 0.2s ease-in-out',
                                '&:hover:not(:disabled)': {
                                  bgcolor: 'rgba(80, 27, 54, 0.1)',
                                  borderColor: '#501b36',
                                  transform: 'translateY(-1px)',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                },
                                '&:disabled': {
                                  color: '#9ca3af',
                                  borderColor: '#e5e7eb',
                                  bgcolor: '#f3f4f6',
                                },
                              }}
                            >
                              <NavigateNext sx={{ fontSize: '1.1rem' }} />
                            </IconButton>
                          </Box>
                        </Box>
                      </Box>
                    )}
                    
                    {/* Mensaje cuando no hay elementos */}
                    {filteredUnifiedItems.length === 0 && (
                      <Box sx={{ 
                        p: 6, 
                        textAlign: 'center', 
                        bgcolor: '#f8fafc',
                        borderTop: '1px solid #e2e8f0'
                      }}>
                        <Box
                          sx={{
                            p: 3,
                            borderRadius: '50%',
                            bgcolor: 'rgba(80, 27, 54, 0.1)',
                            display: 'inline-flex',
                            mb: 2,
                          }}
                        >
                          <InsertDriveFile sx={{ fontSize: 48, color: '#501b36' }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
                          {searchTerm 
                            ? 'No se encontraron elementos' 
                            : currentPath !== '/' 
                              ? 'Carpeta vacía'
                              : 'No hay elementos para mostrar'
                          }
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {searchTerm 
                            ? `No hay carpetas ni archivos que coincidan con "${searchTerm}"`
                            : currentPath !== '/'
                              ? 'Esta carpeta está vacía. Puedes subir archivos o crear subcarpetas.'
                              : 'Esta ubicación está vacía. Puedes crear carpetas o subir archivos.'
                          }
                        </Typography>
                      </Box>
                    )}
                  </TableContainer>
                  </Box>
                )
              )}
            </Box>
          </Paper>
        </Fade>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            severity={snackbar.severity}
            sx={{ 
              width: '100%',
              borderRadius: 2,
              fontWeight: 600,
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* Modales */}
        <CreateFolderModal
          open={createFolderModal}
          onClose={() => setCreateFolderModal(false)}
          onConfirm={handleCreateFolder}
        />
        
        <UploadModal
          open={uploadModal}
          onClose={() => setUploadModal(false)}
          onConfirm={handleUploadFiles}
        />

        {/* Modal de preview de archivos */}
        <PdfPreview
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          fileUrl={previewFileUrl}
          fileName={previewFileName}
          title="Vista previa - Tráfico"
        />
      </Box>
    </>
  );
};

// Componente de tarjeta de estadísticas moderno
interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  loading: boolean;
  isSize?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  icon, 
  color, 
  loading,
  isSize = false
}) => (
  <Paper
    elevation={0}
    sx={{
      p: 2,
      borderRadius: 2,
      border: '1px solid #e2e8f0',
      background: '#ffffff',
      height: '100%',
      minHeight: '100px',
      transition: 'all 0.3s ease',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      '&:hover': {
        boxShadow: `0 4px 12px ${alpha(color, 0.12)}`,
        transform: 'translateY(-1px)',
        borderColor: alpha(color, 0.3),
      },
    }}
  >
    {loading ? (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={20} sx={{ color }} />
      </Box>
    ) : (
      <Fade in timeout={600}>
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              backgroundColor: alpha(color, 0.1),
              color: color,
              mb: 1.5,
              display: 'inline-flex',
              border: `1px solid ${alpha(color, 0.2)}`,
            }}
          >
            <Box sx={{ fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {icon}
            </Box>
          </Box>
          
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            {isSize ? value : typeof value === 'number' ? value.toLocaleString() : value}
          </Typography>
          
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem' }}>
            {title}
          </Typography>
        </Box>
      </Fade>
    )}
  </Paper>
);

// Modal para crear carpeta
const CreateFolderModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: (folderName: string) => void;
}> = ({ open, onClose, onConfirm }) => {
  const [folderName, setFolderName] = useState('');

  const handleSubmit = () => {
    if (folderName.trim()) {
      onConfirm(folderName.trim());
      setFolderName('');
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        bgcolor: 'rgba(0, 0, 0, 0.5)',
        display: open ? 'flex' : 'none',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300,
      }}
    >
      <Paper
        sx={{
          p: 3,
          borderRadius: 2,
          width: '90%',
          maxWidth: '400px',
        }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          Nueva Carpeta
        </Typography>
        
        <TextField
          fullWidth
          label="Nombre de la carpeta"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          sx={{ mb: 2 }}
        />
        
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button onClick={onClose} variant="outlined">
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={!folderName.trim()}
          >
            Crear
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

// Modal para subir archivos
const UploadModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: (files: File[]) => void;
}> = ({ open, onClose, onConfirm }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles(Array.from(event.target.files));
    }
  };

  const handleSubmit = () => {
    if (selectedFiles.length > 0) {
      onConfirm(selectedFiles);
      setSelectedFiles([]);
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        bgcolor: 'rgba(0, 0, 0, 0.5)',
        display: open ? 'flex' : 'none',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300,
      }}
    >
      <Paper
        sx={{
          p: 3,
          borderRadius: 2,
          width: '90%',
          maxWidth: '500px',
        }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          Subir Archivos
        </Typography>
        
        <Button
          variant="outlined"
          component="label"
          startIcon={<Upload />}
          sx={{ mb: 2, width: '100%' }}
        >
          Seleccionar Archivos
          <input
            type="file"
            hidden
            multiple
            onChange={handleFileChange}
          />
        </Button>

        {selectedFiles.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Archivos seleccionados ({selectedFiles.length}):
            </Typography>
            {selectedFiles.map((file, index) => (
              <Typography key={index} variant="caption" sx={{ display: 'block' }}>
                {file.name}
              </Typography>
            ))}
          </Box>
        )}
        
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button onClick={onClose} variant="outlined">
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={selectedFiles.length === 0}
          >
            Subir
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default Traffic;
