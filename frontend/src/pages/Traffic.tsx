import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Breadcrumbs,
  Link,
  Chip,
  Menu,
  MenuItem as MenuItemComponent,
  Alert,
  CircularProgress,
  Divider,
  LinearProgress,
  Stack,
  Fade,
  GlobalStyles,
  Grid,
  IconButton,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Folder,
  FolderOpen,
  Upload,
  ArrowBack,
  Delete,
  Edit,
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
  CloudUpload,
  InsertDriveFile,
  MoreVert,
  DriveEta,
  AccountTree,
} from '@mui/icons-material';
import { PdfPreview } from '../components/PdfPreview';

interface TrafficFolder {
  id: number;
  name: string;
  parentId: number | null;
  createdDate: string;
  type: 'folder' | 'company' | 'vehicle_type' | 'vehicle';
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

export const Traffic: React.FC = () => {
  // Estados principales
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [folders, setFolders] = useState<TrafficFolder[]>([
    { id: 1, name: 'ServiGlobal Canarias', parentId: null, createdDate: '2025-01-15', type: 'company' },
    { id: 2, name: 'ServiGlobal Peninsula', parentId: null, createdDate: '2025-01-10', type: 'company' },
    { id: 3, name: 'Transporte Urbano', parentId: null, createdDate: '2025-01-20', type: 'company' },
    { id: 4, name: 'Vehículos Ligeros', parentId: 1, createdDate: '2025-01-16', type: 'vehicle_type' },
    { id: 5, name: 'Vehículos Pesados', parentId: 1, createdDate: '2025-01-17', type: 'vehicle_type' },
    { id: 6, name: 'Autobuses', parentId: 2, createdDate: '2025-01-12', type: 'vehicle_type' },
    { id: 7, name: 'Furgonetas', parentId: 2, createdDate: '2025-01-13', type: 'vehicle_type' },
  ]);
  
  const [files, setFiles] = useState<TrafficFile[]>([
    { id: 1, name: 'Licencia_Transporte_2024.pdf', size: 2048576, type: 'application/pdf', folderId: 1, uploadDate: '2025-01-15', url: 'blob:example1' },
    { id: 2, name: 'Seguro_Vehiculos_2024.pdf', size: 1536789, type: 'application/pdf', folderId: 1, uploadDate: '2025-01-16', url: 'blob:example2' },
    { id: 3, name: 'ITV_Pendientes_Enero.xlsx', size: 45678, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', folderId: 4, uploadDate: '2025-01-18', url: 'blob:example3' },
  ]);

  // Estados de UI
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'folder' | 'file'; id: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Estados de diálogos
  const [createFolderDialog, setCreateFolderDialog] = useState(false);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; type: 'folder' | 'file'; id: number; currentName: string }>({
    open: false, type: 'folder', id: 0, currentName: ''
  });
  const [pdfPreview, setPdfPreview] = useState<{ open: boolean; fileUrl: string; fileName: string }>({
    open: false, fileUrl: '', fileName: ''
  });

  // Estados de formularios
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderType, setNewFolderType] = useState<'folder' | 'company' | 'vehicle_type' | 'vehicle'>('folder');
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);

  // Auto-ocultar alertas
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Funciones auxiliares
  const getCurrentFolders = () => {
    return folders.filter(folder => folder.parentId === currentFolderId);
  };

  const getCurrentFiles = () => {
    return files.filter(file => file.folderId === (currentFolderId || 0));
  };

  const getBreadcrumbs = (): TrafficFolder[] => {
    const breadcrumbs: TrafficFolder[] = [];
    let currentId = currentFolderId;
    
    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (folder) {
        breadcrumbs.unshift(folder);
        currentId = folder.parentId;
      } else {
        break;
      }
    }
    
    return breadcrumbs;
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getTypeIcon = (type: 'folder' | 'company' | 'vehicle_type' | 'vehicle') => {
    switch (type) {
      case 'company': return <Business sx={{ fontSize: 24, color: '#501b36' }} />;
      case 'vehicle_type': return <LocalShipping sx={{ fontSize: 24, color: '#43A047' }} />;
      case 'vehicle': return <DirectionsCar sx={{ fontSize: 24, color: '#FF9800' }} />;
      default: return <Folder sx={{ fontSize: 24, color: '#757575' }} />;
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
  const handleFolderClick = (folderId: number) => {
    setCurrentFolderId(folderId);
  };

  const handleBackClick = () => {
    const currentFolder = folders.find(f => f.id === currentFolderId);
    setCurrentFolderId(currentFolder?.parentId || null);
  };

  const handleContextMenu = (event: React.MouseEvent, type: 'folder' | 'file', id: number) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, type, id });
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const newFolder: TrafficFolder = {
      id: Date.now(),
      name: newFolderName,
      parentId: currentFolderId,
      createdDate: new Date().toISOString().split('T')[0],
      type: newFolderType,
    };

    setFolders([...folders, newFolder]);
    setCreateFolderDialog(false);
    setNewFolderName('');
    setNewFolderType('folder');
    setAlert({ type: 'success', message: 'Carpeta creada exitosamente' });
  };

  const handleFileUpload = async () => {
    if (!uploadFiles || uploadFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];
      
      // Simular progreso de subida
      for (let progress = 0; progress <= 100; progress += 10) {
        setUploadProgress(progress);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const newFile: TrafficFile = {
        id: Date.now() + i,
        name: file.name,
        size: file.size,
        type: file.type,
        folderId: currentFolderId || 0,
        uploadDate: new Date().toISOString().split('T')[0],
        url: URL.createObjectURL(file),
      };

      setFiles(prev => [...prev, newFile]);
    }

    setIsUploading(false);
    setUploadProgress(0);
    setUploadDialog(false);
    setUploadFiles(null);
    setAlert({ type: 'success', message: `${uploadFiles.length} archivo(s) subido(s) exitosamente` });
  };

  const handleDelete = (type: 'folder' | 'file', id: number) => {
    if (type === 'folder') {
      // Eliminar carpeta y todo su contenido recursivamente
      const deleteRecursively = (folderId: number) => {
        const subfolders = folders.filter(f => f.parentId === folderId);
        subfolders.forEach(subfolder => deleteRecursively(subfolder.id));
        
        setFolders(prev => prev.filter(f => f.id !== folderId));
        setFiles(prev => prev.filter(f => f.folderId !== folderId));
      };
      
      deleteRecursively(id);
    } else {
      setFiles(prev => prev.filter(f => f.id !== id));
    }
    
    setContextMenu(null);
    setAlert({ type: 'success', message: `${type === 'folder' ? 'Carpeta' : 'Archivo'} eliminado exitosamente` });
  };

  const handleRename = () => {
    const { type, id, currentName } = renameDialog;
    if (!currentName.trim()) return;

    if (type === 'folder') {
      setFolders(prev => prev.map(f => f.id === id ? { ...f, name: currentName } : f));
    } else {
      setFiles(prev => prev.map(f => f.id === id ? { ...f, name: currentName } : f));
    }

    setRenameDialog({ open: false, type: 'folder', id: 0, currentName: '' });
    setAlert({ type: 'success', message: `${type === 'folder' ? 'Carpeta' : 'Archivo'} renombrado exitosamente` });
  };

  const handleDownload = (file: TrafficFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.click();
    setContextMenu(null);
  };

  const handlePreview = (file: TrafficFile) => {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      setPdfPreview({
        open: true,
        fileUrl: file.url,
        fileName: file.name
      });
    }
    setContextMenu(null);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    setUploadFiles(droppedFiles);
    setUploadDialog(true);
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    // Simular carga
    setTimeout(() => {
      setLoading(false);
      setAlert({ type: 'success', message: 'Datos actualizados correctamente' });
    }, 1000);
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: 2,
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <LocalShipping sx={{ fontSize: 32 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Gestor de Archivos de Tráfico
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
                      Organiza documentos por empresas, tipos de vehículos y vehículos específicos
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

        {/* Estadísticas principales */}
        <Fade in timeout={1000}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
              xs: 'repeat(2, 1fr)', 
              sm: 'repeat(3, 1fr)', 
              md: 'repeat(5, 1fr)' 
            }, 
            gap: 2, 
            mb: 4 
          }}>
            <StatsCard
              title="Empresas"
              value={folders.filter(f => f.type === 'company').length}
              icon={<Business />}
              color="#501b36"
              loading={loading}
            />
            <StatsCard
              title="Tipos Vehículo"
              value={folders.filter(f => f.type === 'vehicle_type').length}
              icon={<LocalShipping />}
              color="#43A047"
              loading={loading}
            />
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
              p: 3,
              mb: 3,
              borderRadius: 2,
              border: '1px solid #e0e0e0',
              background: '#ffffff',
            }}
          >
            {/* Navegación breadcrumbs */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {currentFolderId && (
                    <Button
                      startIcon={<ArrowBack />}
                      onClick={handleBackClick}
                      variant="outlined"
                      size="small"
                      sx={{
                        borderRadius: 2,
                        borderColor: '#501b36',
                        color: '#501b36',
                        '&:hover': {
                          borderColor: '#3d1429',
                          bgcolor: alpha('#501b36', 0.04),
                        },
                      }}
                    >
                      Volver
                    </Button>
                  )}
                  
                  <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
                    <Link
                      component="button"
                      variant="body1"
                      onClick={() => setCurrentFolderId(null)}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        textDecoration: 'none',
                        fontWeight: 600,
                        color: '#501b36',
                        '&:hover': { textDecoration: 'underline' }
                      }}
                    >
                      <Home sx={{ mr: 0.5, fontSize: 18 }} />
                      Inicio
                    </Link>
                    {getBreadcrumbs().map((folder) => (
                      <Link
                        key={folder.id}
                        component="button"
                        variant="body1"
                        onClick={() => setCurrentFolderId(folder.id)}
                        sx={{ 
                          textDecoration: 'none',
                          fontWeight: 600,
                          color: '#501b36',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                      >
                        {folder.name}
                      </Link>
                    ))}
                  </Breadcrumbs>
                </Box>

                <Chip
                  icon={<AccountTree />}
                  label={currentFolderId ? `Nivel ${getBreadcrumbs().length + 1}` : 'Raíz'}
                  variant="outlined"
                  sx={{
                    borderColor: '#501b36',
                    color: '#501b36',
                    fontWeight: 600,
                  }}
                />
              </Box>
            </Box>

            {/* Controles de acción */}
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              alignItems: 'center',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between'
            }}>
              <TextField
                placeholder="Buscar archivos..."
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
                  {loading ? 'Actualizando...' : 'Actualizar'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CreateNewFolder />}
                  onClick={() => setCreateFolderDialog(true)}
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
                  onClick={() => setUploadDialog(true)}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    bgcolor: '#501b36',
                    '&:hover': {
                      bgcolor: '#3d1429',
                    },
                  }}
                >
                  Subir Archivos
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Fade>

        {/* Área principal con contenido */}
        <Fade in timeout={1400}>
          <Paper 
            elevation={0}
            sx={{ 
              borderRadius: 2,
              border: '1px solid #e0e0e0',
              background: '#ffffff',
              minHeight: 400,
            }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
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
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#501b36' }}>
                    {currentFolderId ? 
                      getBreadcrumbs()[getBreadcrumbs().length - 1]?.name || 'Carpeta Actual' :
                      'Empresas de Transporte'
                    }
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {getCurrentFolders().length} carpeta{getCurrentFolders().length !== 1 ? 's' : ''} • {filteredFiles.length} archivo{filteredFiles.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Contenido principal */}
            <Box sx={{ p: 3 }}>
              {(getCurrentFolders().length === 0 && getCurrentFiles().length === 0) ? (
                // Área vacía con drag & drop
                <Box sx={{ 
                  textAlign: 'center',
                  py: 8,
                  border: '2px dashed #e0e0e0',
                  borderRadius: 3,
                  bgcolor: alpha('#501b36', 0.01),
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: '#501b36',
                    bgcolor: alpha('#501b36', 0.02),
                  },
                }}>
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: '50%',
                      bgcolor: alpha('#501b36', 0.1),
                      display: 'inline-flex',
                      mb: 3,
                    }}
                  >
                    <FolderOpen sx={{ fontSize: 48, color: '#501b36' }} />
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                    Esta carpeta está vacía
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, maxWidth: 400, mx: 'auto' }}>
                    Arrastra archivos aquí o usa los botones para crear carpetas y subir archivos
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button
                      variant="outlined"
                      startIcon={<CreateNewFolder />}
                      onClick={() => setCreateFolderDialog(true)}
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
                      onClick={() => setUploadDialog(true)}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        bgcolor: '#501b36',
                        '&:hover': {
                          bgcolor: '#3d1429',
                        },
                      }}
                    >
                      Subir Archivos
                    </Button>
                  </Box>
                </Box>
              ) : (
                // Grid con carpetas y archivos
                <Grid container spacing={3}>
                  {/* Carpetas */}
                  {getCurrentFolders().map((folder) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={`folder-${folder.id}`}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          borderRadius: 2,
                          border: '1px solid #e0e0e0',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: `0 8px 24px ${alpha(getFolderTypeColor(folder.type), 0.15)}`,
                            borderColor: getFolderTypeColor(folder.type),
                          },
                        }}
                        onClick={() => handleFolderClick(folder.id)}
                        onContextMenu={(e) => handleContextMenu(e, 'folder', folder.id)}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: alpha(getFolderTypeColor(folder.type), 0.1),
                              }}
                            >
                              {getTypeIcon(folder.type)}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="subtitle1" sx={{ 
                                fontWeight: 600, 
                                mb: 0.5,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {folder.name}
                              </Typography>
                              <Chip
                                label={getFolderTypeText(folder.type)}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  bgcolor: alpha(getFolderTypeColor(folder.type), 0.1),
                                  color: getFolderTypeColor(folder.type),
                                  border: `1px solid ${alpha(getFolderTypeColor(folder.type), 0.3)}`,
                                }}
                              />
                            </Box>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              Creado: {new Date(folder.createdDate).toLocaleDateString('es-ES')}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleContextMenu(e, 'folder', folder.id);
                              }}
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
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}

                  {/* Archivos */}
                  {filteredFiles.map((file) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={`file-${file.id}`}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          borderRadius: 2,
                          border: '1px solid #e0e0e0',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            borderColor: '#501b36',
                          },
                        }}
                        onContextMenu={(e) => handleContextMenu(e, 'file', file.id)}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: file.type === 'application/pdf' ? alpha('#d32f2f', 0.1) : alpha('#501b36', 0.1),
                              }}
                            >
                              {file.type === 'application/pdf' ? 
                                <Description sx={{ fontSize: 24, color: '#d32f2f' }} /> :
                                <InsertDriveFile sx={{ fontSize: 24, color: '#501b36' }} />
                              }
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="subtitle2" sx={{ 
                                fontWeight: 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                mb: 0.5
                              }}>
                                {file.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {formatFileSize(file.size)}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                            {file.type === 'application/pdf' && (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Visibility />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePreview(file);
                                }}
                                sx={{
                                  flex: 1,
                                  borderRadius: 1.5,
                                  textTransform: 'none',
                                  fontSize: '0.75rem',
                                  borderColor: '#501b36',
                                  color: '#501b36',
                                  '&:hover': {
                                    borderColor: '#3d1429',
                                    bgcolor: alpha('#501b36', 0.04),
                                  },
                                }}
                              >
                                Ver
                              </Button>
                            )}
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Download />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(file);
                              }}
                              sx={{
                                flex: 1,
                                borderRadius: 1.5,
                                textTransform: 'none',
                                fontSize: '0.75rem',
                                borderColor: '#501b36',
                                color: '#501b36',
                                '&:hover': {
                                  borderColor: '#3d1429',
                                  bgcolor: alpha('#501b36', 0.04),
                                },
                              }}
                            >
                              Descargar
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </Paper>
        </Fade>

        {/* Menú contextual */}
        <Menu
          open={Boolean(contextMenu)}
          onClose={() => setContextMenu(null)}
          anchorReference="anchorPosition"
          anchorPosition={
            contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined
          }
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
          <MenuItemComponent
            onClick={() => {
              if (contextMenu) {
                const item = contextMenu.type === 'folder' 
                  ? folders.find(f => f.id === contextMenu.id)
                  : files.find(f => f.id === contextMenu.id);
                setRenameDialog({
                  open: true,
                  type: contextMenu.type,
                  id: contextMenu.id,
                  currentName: item?.name || ''
                });
              }
              setContextMenu(null);
            }}
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
            <Edit sx={{ fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Renombrar
            </Typography>
          </MenuItemComponent>
          
          {contextMenu?.type === 'file' && (
            <MenuItemComponent
              onClick={() => {
                const file = files.find(f => f.id === contextMenu.id);
                if (file) handleDownload(file);
              }}
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
              <Download sx={{ fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Descargar
              </Typography>
            </MenuItemComponent>
          )}
          
          {contextMenu?.type === 'file' && files.find(f => f.id === contextMenu.id)?.type === 'application/pdf' && (
            <MenuItemComponent
              onClick={() => {
                const file = files.find(f => f.id === contextMenu.id);
                if (file) handlePreview(file);
              }}
              sx={{
                py: 1.5,
                px: 2,
                gap: 2,
                '&:hover': {
                  bgcolor: alpha('#2196f3', 0.08),
                  color: '#2196f3',
                },
              }}
            >
              <Visibility sx={{ fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Vista previa
              </Typography>
            </MenuItemComponent>
          )}
          
          <Divider />
          
          <MenuItemComponent
            onClick={() => {
              if (contextMenu) {
                handleDelete(contextMenu.type, contextMenu.id);
              }
            }}
            sx={{
              py: 1.5,
              px: 2,
              gap: 2,
              color: 'error.main',
              '&:hover': {
                bgcolor: alpha('#d32f2f', 0.08),
              },
            }}
          >
            <Delete sx={{ fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Eliminar
            </Typography>
          </MenuItemComponent>
        </Menu>

        {/* Diálogo crear carpeta */}
        <Dialog 
          open={createFolderDialog} 
          onClose={() => setCreateFolderDialog(false)} 
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
            <CreateNewFolder sx={{ fontSize: 28 }} />
            <Box>
              <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                Crear Nueva Carpeta
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Organiza tus documentos de tráfico
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 4, bgcolor: '#f8f9fa' }}>
            <TextField
              autoFocus
              margin="dense"
              label="Nombre de la carpeta"
              fullWidth
              variant="outlined"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              sx={{ 
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
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
                '& .MuiInputLabel-root': {
                  fontWeight: 600,
                  '&.Mui-focused': {
                    color: '#501b36',
                  },
                },
              }}
            />
            <FormControl fullWidth>
              <InputLabel sx={{ 
                fontWeight: 600,
                '&.Mui-focused': {
                  color: '#501b36',
                },
              }}>
                Tipo de carpeta
              </InputLabel>
              <Select
                value={newFolderType}
                label="Tipo de carpeta"
                onChange={(e) => setNewFolderType(e.target.value as TrafficFolder['type'])}
                sx={{
                  borderRadius: 2,
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#501b36',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#501b36',
                  },
                }}
              >
                <MenuItem value="company">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Business sx={{ color: '#501b36' }} />
                    Empresa
                  </Box>
                </MenuItem>
                <MenuItem value="vehicle_type">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalShipping sx={{ color: '#43A047' }} />
                    Tipo de Vehículo
                  </Box>
                </MenuItem>
                <MenuItem value="vehicle">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DirectionsCar sx={{ color: '#FF9800' }} />
                    Vehículo
                  </Box>
                </MenuItem>
                <MenuItem value="folder">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Folder sx={{ color: '#757575' }} />
                    Carpeta General
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ 
            p: 3, 
            bgcolor: '#f8f9fa',
            gap: 1,
            borderTop: '1px solid #e0e0e0',
          }}>
            <Button 
              onClick={() => setCreateFolderDialog(false)}
              variant="outlined"
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
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateFolder} 
              variant="contained"
              sx={{
                borderRadius: 2,
                px: 3,
                textTransform: 'none',
                fontWeight: 600,
                bgcolor: '#501b36',
                '&:hover': {
                  bgcolor: '#3d1429',
                },
              }}
            >
              Crear
            </Button>
          </DialogActions>
        </Dialog>

        {/* Diálogo subir archivos */}
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
                Subir archivos
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Agregar documentos a la carpeta actual
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
                multiple
                onChange={(e) => setUploadFiles(e.target.files)}
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
                Arrastra tus archivos aquí
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                o haz clic para seleccionar desde tu dispositivo
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Formatos permitidos: PDF, DOC, DOCX, XLS, XLSX • Máximo 10MB por archivo
              </Typography>
            </Box>
            
            {uploadFiles && uploadFiles.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  Archivos seleccionados:
                </Typography>
                {Array.from(uploadFiles).map((file, index) => (
                  <Box key={index} sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    bgcolor: 'white',
                    borderRadius: 2,
                    border: '1px solid #e0e0e0',
                    mb: 1,
                  }}>
                    <InsertDriveFile sx={{ color: '#501b36' }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {file.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {formatFileSize(file.size)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {isUploading && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                  Subiendo archivos... {uploadProgress}%
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: '100%' }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={uploadProgress} 
                      sx={{
                        borderRadius: 1,
                        height: 8,
                        '& .MuiLinearProgress-bar': {
                          bgcolor: '#501b36',
                        },
                      }}
                    />
                  </Box>
                  <CircularProgress size={20} sx={{ color: '#501b36' }} />
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
              disabled={isUploading}
              variant="outlined"
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
              Cancelar
            </Button>
            <Button 
              onClick={handleFileUpload} 
              variant="contained" 
              disabled={!uploadFiles || isUploading}
              sx={{
                borderRadius: 2,
                px: 3,
                textTransform: 'none',
                fontWeight: 600,
                bgcolor: '#501b36',
                '&:hover': {
                  bgcolor: '#3d1429',
                },
              }}
            >
              {isUploading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} color="inherit" />
                  Subiendo...
                </Box>
              ) : (
                'Subir'
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Diálogo renombrar */}
        <Dialog 
          open={renameDialog.open} 
          onClose={() => setRenameDialog({ open: false, type: 'folder', id: 0, currentName: '' })}
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
            <Edit sx={{ fontSize: 28 }} />
            <Box>
              <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                Renombrar {renameDialog.type === 'folder' ? 'Carpeta' : 'Archivo'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Cambiar el nombre del elemento
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 4, bgcolor: '#f8f9fa' }}>
            <TextField
              autoFocus
              margin="dense"
              label="Nuevo nombre"
              fullWidth
              variant="outlined"
              value={renameDialog.currentName}
              onChange={(e) => setRenameDialog(prev => ({ ...prev, currentName: e.target.value }))}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
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
                '& .MuiInputLabel-root': {
                  fontWeight: 600,
                  '&.Mui-focused': {
                    color: '#501b36',
                  },
                },
              }}
            />
          </DialogContent>
          <DialogActions sx={{ 
            p: 3, 
            bgcolor: '#f8f9fa',
            gap: 1,
            borderTop: '1px solid #e0e0e0',
          }}>
            <Button 
              onClick={() => setRenameDialog({ open: false, type: 'folder', id: 0, currentName: '' })}
              variant="outlined"
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
              Cancelar
            </Button>
            <Button 
              onClick={handleRename} 
              variant="contained"
              sx={{
                borderRadius: 2,
                px: 3,
                textTransform: 'none',
                fontWeight: 600,
                bgcolor: '#501b36',
                '&:hover': {
                  bgcolor: '#3d1429',
                },
              }}
            >
              Renombrar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Componente de preview de PDF */}
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

// Componente de tarjeta de estadísticas
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
      border: '1px solid #e0e0e0',
      background: '#ffffff',
      height: '100%',
      transition: 'all 0.2s ease',
      '&:hover': {
        boxShadow: `0 4px 20px ${alpha(color, 0.1)}`,
        transform: 'translateY(-2px)',
      },
    }}
  >
    {loading ? (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} sx={{ color }} />
      </Box>
    ) : (
      <Fade in timeout={600}>
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              backgroundColor: alpha(color, 0.1),
              color: color,
              mb: 1,
              display: 'inline-flex',
            }}
          >
            {icon}
          </Box>
          
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
            {isSize ? value : typeof value === 'number' ? value.toLocaleString() : value}
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Box>
      </Fade>
    )}
  </Paper>
);
