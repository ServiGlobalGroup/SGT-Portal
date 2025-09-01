import React, { useState, useContext } from 'react';
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
  Warning,
  GridView,
  ViewList,
} from '@mui/icons-material';

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
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [folders] = useState<TrafficFolder[]>([
    { 
      id: 1, 
      name: 'ServiGlobal Canarias', 
      parentId: null, 
      createdDate: '2025-01-15', 
      type: 'company',
      description: 'Documentos y archivos de la sede de Canarias'
    },
    { 
      id: 2, 
      name: 'ServiGlobal Península', 
      parentId: null, 
      createdDate: '2025-01-10', 
      type: 'company',
      description: 'Documentos y archivos de la sede de Península'
    },
    { 
      id: 3, 
      name: 'Transporte Urbano', 
      parentId: null, 
      createdDate: '2025-01-20', 
      type: 'company',
      description: 'División especializada en transporte urbano'
    },
    { 
      id: 4, 
      name: 'Vehículos Ligeros', 
      parentId: 1, 
      createdDate: '2025-01-16', 
      type: 'vehicle_type',
      description: 'Furgonetas y vehículos de hasta 3.5T'
    },
    { 
      id: 5, 
      name: 'Vehículos Pesados', 
      parentId: 1, 
      createdDate: '2025-01-17', 
      type: 'vehicle_type',
      description: 'Camiones y vehículos de más de 3.5T'
    },
  ]);
  
  const [files] = useState<TrafficFile[]>([
    { 
      id: 1, 
      name: 'Licencia_Transporte_2024.pdf', 
      size: 2048576, 
      type: 'application/pdf', 
      folderId: 1, 
      uploadDate: '2025-01-15', 
      url: 'blob:example1' 
    },
    { 
      id: 2, 
      name: 'Seguro_Vehiculos_2024.pdf', 
      size: 1536789, 
      type: 'application/pdf', 
      folderId: 1, 
      uploadDate: '2025-01-16', 
      url: 'blob:example2' 
    },
  ]);

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Estados de modales
  const [createFolderModal, setCreateFolderModal] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  
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
  const handleFolderClick = (folderId: number) => {
    setCurrentFolderId(folderId);
  };

  const handleBackClick = () => {
    const currentFolder = folders.find(f => f.id === currentFolderId);
    setCurrentFolderId(currentFolder?.parentId || null);
  };

  const handleRefresh = async () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showSnackbar('Datos actualizados correctamente', 'success');
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
        }}
      />
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', bgcolor: '#f8fafc', minHeight: '100vh' }}>
        {/* Header Principal Moderno */}
        <Fade in timeout={800}>
          <Paper 
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              mb: 4,
              background: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #8b3058 60%, #d4a574 100%)',
              color: 'white',
              borderRadius: 3,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(80, 27, 54, 0.15)',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.08"%3E%3Cpath d="m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              },
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
                <Box
                  sx={{
                    p: 2.5,
                    bgcolor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: 3,
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <LocalShipping sx={{ fontSize: 36, color: 'white' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h3" sx={{ 
                    fontWeight: 800, 
                    mb: 0.5,
                    background: 'linear-gradient(45deg, #ffffff, #f0f0f0)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}>
                    Gestión de Tráfico
                  </Typography>
                  <Typography variant="h6" sx={{ 
                    opacity: 0.9, 
                    fontWeight: 400,
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  }}>
                    Gestión integral de documentos y archivos del departamento de tráfico
                  </Typography>
                </Box>
                
                {/* Información del usuario actual */}
                <Box sx={{ 
                  display: { xs: 'none', sm: 'flex' },
                  alignItems: 'center',
                  gap: 2,
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: 2,
                  p: 2,
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      Conectado como
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {currentUser?.first_name} {currentUser?.last_name}
                    </Typography>
                    <Chip
                      label={currentUser?.role}
                      size="small"
                      sx={{
                        mt: 0.5,
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                      }}
                    />
                  </Box>
                </Box>
              </Box>
              
              {/* Mensaje de permisos si no puede gestionar */}
              {!canManageTraffic && (
                <Alert 
                  severity="warning" 
                  sx={{ 
                    mt: 2,
                    bgcolor: 'rgba(255, 193, 7, 0.1)',
                    border: '1px solid rgba(255, 193, 7, 0.3)',
                    '& .MuiAlert-icon': {
                      color: '#ffb74d'
                    }
                  }}
                  icon={<Warning />}
                >
                  Tu rol actual ({currentUser?.role}) permite visualizar pero tiene permisos limitados para gestión.
                </Alert>
              )}
            </Box>
          </Paper>
        </Fade>

        {/* Estadísticas Principales */}
        <Fade in timeout={1000}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
              xs: 'repeat(2, 1fr)', 
              sm: 'repeat(3, 1fr)', 
              md: 'repeat(5, 1fr)' 
            }, 
            gap: 3, 
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
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            {/* Navegación breadcrumbs */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                        textTransform: 'none',
                        fontWeight: 600,
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
                placeholder="Buscar archivos y carpetas..."
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
                size="small"
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
                    {currentFolderId ? 
                      getBreadcrumbs()[getBreadcrumbs().length - 1]?.name || 'Carpeta Actual' :
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
                      p: 3,
                      borderRadius: '50%',
                      bgcolor: alpha('#501b36', 0.1),
                      display: 'inline-flex',
                      mb: 3,
                    }}
                  >
                    <FolderOpen sx={{ fontSize: 48, color: '#501b36' }} />
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
                    Esta área está vacía
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, maxWidth: 500, mx: 'auto' }}>
                    {currentFolderId 
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
                // Grid/Lista de contenido
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
                      onClick={() => handleFolderClick(folder.id)}
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
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Box
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              bgcolor: file.type === 'application/pdf' ? alpha('#d32f2f', 0.1) : alpha('#501b36', 0.1),
                              border: `1px solid ${file.type === 'application/pdf' ? alpha('#d32f2f', 0.2) : alpha('#501b36', 0.2)}`,
                            }}
                          >
                            {file.type === 'application/pdf' ? 
                              <Description sx={{ fontSize: 28, color: '#d32f2f' }} /> :
                              <InsertDriveFile sx={{ fontSize: 28, color: '#501b36' }} />
                            }
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
                        
                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                          {file.type === 'application/pdf' && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Visibility />}
                              sx={{
                                flex: 1,
                                borderRadius: 2,
                                textTransform: 'none',
                                fontSize: '0.75rem',
                                fontWeight: 600,
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
                            sx={{
                              flex: 1,
                              borderRadius: 2,
                              textTransform: 'none',
                              fontSize: '0.75rem',
                              fontWeight: 600,
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
                  ))}
                </Box>
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

        {/* TODO: Modales modernos se implementarán después */}
        {createFolderModal && (
          <Box sx={{ display: 'none' }}>Modal de crear carpeta (implementar con ModernModal)</Box>
        )}
        {uploadModal && (
          <Box sx={{ display: 'none' }}>Modal de subir archivos (implementar con ModernModal)</Box>
        )}
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
      p: 3,
      borderRadius: 3,
      border: '1px solid #e2e8f0',
      background: '#ffffff',
      height: '100%',
      transition: 'all 0.3s ease',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      '&:hover': {
        boxShadow: `0 8px 25px ${alpha(color, 0.12)}`,
        transform: 'translateY(-2px)',
        borderColor: alpha(color, 0.3),
      },
    }}
  >
    {loading ? (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={28} sx={{ color }} />
      </Box>
    ) : (
      <Fade in timeout={600}>
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              p: 2,
              borderRadius: 3,
              backgroundColor: alpha(color, 0.1),
              color: color,
              mb: 2,
              display: 'inline-flex',
              border: `1px solid ${alpha(color, 0.2)}`,
            }}
          >
            {icon}
          </Box>
          
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
            {isSize ? value : typeof value === 'number' ? value.toLocaleString() : value}
          </Typography>
          
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
      </Fade>
    )}
  </Paper>
);

export default Traffic;
