import React, { useState, useEffect } from 'react';
import { PaginationComponent } from '../components/PaginationComponent';
import { usePagination } from '../hooks/usePagination';
import { useDeviceType } from '../hooks/useDeviceType';
import { MobileDocumentationPanel } from './mobile/MobileDocumentationPanel';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Chip,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  CircularProgress,
  Alert,
  Collapse,
  Divider,
  Menu,
  Badge,
  Stack,
  Fade,
  GlobalStyles,
  alpha,
  Snackbar,
} from '@mui/material';
import {
  SupervisorAccount,
  People,
  Search,
  Refresh,
  ExpandMore,
  ExpandLess,
  MoreVert,
  FolderOpen,
  AccountCircle,
  CloudUpload,
  CloudDownload,
  Visibility,
  PictureAsPdf,
  Description,
  StorageRounded,
  ArticleRounded,
  AssignmentRounded,
  TimeToLeaveRounded,
  LocalShippingRounded,
  AttachMoneyRounded,
} from '@mui/icons-material';
import { PdfPreview } from '../components/PdfPreview';
import { documentationAPI } from '../services/api';

// Interfaces
interface User {
  id: string;
  dni: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  total_documents: number;
  total_size: number;
  documents: UserDocument[];
}

interface UserDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  folder: string;
  created_date: string;
  path: string;
  user_dni: string;
}

interface AlertState {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

const DocumentationPanel: React.FC = () => {
  const { useMobileVersion } = useDeviceType();
  
  // Si es dispositivo móvil, usar la versión optimizada
  if (useMobileVersion) {
    return <MobileDocumentationPanel />;
  }

  // Estados
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [expandedUsers, setExpandedUsers] = useState<string[]>([]);
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loadingActions, setLoadingActions] = useState<Record<string, 'downloading' | 'previewing'>>({});
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [previewModal, setPreviewModal] = useState<{
    open: boolean;
    fileUrl: string;
    fileName: string;
    title: string;
    isBlobUrl: boolean;
  }>({
    open: false,
    fileUrl: '',
    fileName: '',
    title: '',
    isBlobUrl: false
  });

  // Efectos
  useEffect(() => {
    loadUsers();
  }, []);

  // Auto-ocultar alerta después de 4 segundos
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, 4000); // 4 segundos

      return () => clearTimeout(timer); // Limpiar el timer si el componente se desmonta o la alerta cambia
    }
  }, [alert]);

  // Funciones auxiliares
  const loadUsers = async () => {
    setLoading(true);
    try {
      // Cargar usuarios reales desde las carpetas del sistema usando API autenticada
      const userData = await documentationAPI.getUsers();
      setUsers(userData);
    } catch (error) {
      console.error('Error loading users:', error);
      setAlert({
        type: 'error',
        message: 'Error al cargar los usuarios del sistema'
      });
      setUsers([]); // Fallback a lista vacía
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.dni.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && user.is_active) ||
      (filterStatus === 'inactive' && !user.is_active);
    
    return matchesSearch && matchesStatus;
  });

  // Estados para paginación de usuarios
  const usersPagination = usePagination({
    data: filteredUsers,
    initialItemsPerPage: 8,
    initialPage: 1
  });

  // Reset página cuando cambian los filtros
  useEffect(() => {
    usersPagination.setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handleExpandUser = (userId: string) => {
    setExpandedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  const handleViewUserDocuments = (user: User) => {
    console.log('Ver documentos de:', user);
    handleCloseMenu();
  };

  const handleDownloadDocument = async (documentFile: UserDocument) => {
    try {
      setLoadingActions(prev => ({ ...prev, [documentFile.id]: 'downloading' }));
      
      // Usar la API autenticada
      const blob = await documentationAPI.downloadDocument(
        documentFile.user_dni, 
        documentFile.folder, 
        documentFile.name
      );

      // Crear enlace temporal para descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = documentFile.name;
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // Mostrar mensaje de éxito
      setSnackbar({
        open: true,
        message: `Documento "${documentFile.name}" descargado exitosamente`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      setSnackbar({
        open: true,
        message: 'Error al descargar el documento',
        severity: 'error'
      });
    } finally {
      setLoadingActions(prev => {
        const newState = { ...prev };
        delete newState[documentFile.id];
        return newState;
      });
    }
  };

  const handleClosePreviewModal = () => {
    // Limpiar blob URL si fue creada para evitar memory leaks
    if (previewModal.isBlobUrl && previewModal.fileUrl) {
      window.URL.revokeObjectURL(previewModal.fileUrl);
    }
    
    setPreviewModal(prev => ({ 
      ...prev, 
      open: false, 
      fileUrl: '', 
      isBlobUrl: false 
    }));
  };

  const handlePreviewDocument = async (documentFile: UserDocument) => {
    try {
      console.log('Intentando previsualizar documento:', documentFile);
      setLoadingActions(prev => ({ ...prev, [documentFile.id]: 'previewing' }));
      
      if (documentFile.type === '.pdf') {
        // Para PDFs, usar la URL directa con token en lugar de blob
        // Esto permite que el iframe pueda autenticarse correctamente
        const previewUrl = documentationAPI.getPreviewUrl(
          documentFile.user_dni,
          documentFile.folder,
          documentFile.name
        );
        
        console.log('Preview URL generada:', previewUrl);
        
        setPreviewModal({
          open: true,
          fileUrl: previewUrl,
          fileName: documentFile.name,
          title: `${documentFile.name} - ${documentFile.user_dni}`,
          isBlobUrl: false  // No es blob URL, es URL directa con autenticación
        });
        
        console.log('Modal de preview configurado con URL directa');
      } else {
        // Para otros tipos de archivo, hacer descarga directa
        await handleDownloadDocument(documentFile);
        setSnackbar({
          open: true,
          message: `El archivo "${documentFile.name}" no es un PDF. Se ha descargado automáticamente.`,
          severity: 'info'
        });
      }
    } catch (error) {
      console.error('Error previewing document:', error);
      setSnackbar({
        open: true,
        message: 'Error al previsualizar el documento',
        severity: 'error'
      });
    } finally {
      setLoadingActions(prev => {
        const newState = { ...prev };
        delete newState[documentFile.id];
        return newState;
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUserInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleColor = (role: string): string => {
    switch (role) {
      case 'CHOFER': return '#2196f3';
      case 'ADMIN': return '#4caf50';
      case 'IT': return '#ff9800';
      default: return '#501b36';
    }
  };

  const getDocumentsByFolder = (documents: UserDocument[]) => {
    return documents.reduce((acc, doc) => {
      if (!acc[doc.folder]) {
        acc[doc.folder] = [];
      }
      acc[doc.folder].push(doc);
      return acc;
    }, {} as Record<string, UserDocument[]>);
  };

  const getFolderIcon = (folder: string) => {
    switch (folder) {
      case 'documentos': return <ArticleRounded sx={{ color: '#2196f3', fontSize: 20 }} />;
      case 'nominas': return <AttachMoneyRounded sx={{ color: '#4caf50', fontSize: 20 }} />;
      case 'vacaciones': return <TimeToLeaveRounded sx={{ color: '#ff9800', fontSize: 20 }} />;
      case 'permisos': return <AssignmentRounded sx={{ color: '#9c27b0', fontSize: 20 }} />;
      case 'circulacion': return <LocalShippingRounded sx={{ color: '#f44336', fontSize: 20 }} />;
      case 'perfil': return <AccountCircle sx={{ color: '#501b36', fontSize: 20 }} />;
      default: return <FolderOpen sx={{ color: '#757575', fontSize: 20 }} />;
    }
  };

  const getFolderDisplayName = (folder: string): string => {
    const names: Record<string, string> = {
      'documentos': 'Documentos',
      'nominas': 'Nóminas',
      'vacaciones': 'Vacaciones',
      'permisos': 'Permisos',
      'circulacion': 'Circulación',
      'perfil': 'Perfil',
      'dietas': 'Dietas'
    };
    return names[folder] || folder.charAt(0).toUpperCase() + folder.slice(1);
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
          p: 2,
          bgcolor: 'rgba(255,255,255,0.18)',
          borderRadius: 2,
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
                    }}
                  >
                    <SupervisorAccount sx={{ fontSize: 32 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Panel de Documentación
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
                      Gestiona usuarios y sus documentos asociados
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

        {/* Panel de Control */}
        <Fade in timeout={1000}>
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
                placeholder="Buscar usuarios por nombre, DNI o email..."
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
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel sx={{ 
                    '&.Mui-focused': { 
                      color: '#501b36' 
                    } 
                  }}>
                    Estado
                  </InputLabel>
                  <Select
                    value={filterStatus}
                    label="Estado"
                    onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                    sx={{
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
                    }}
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    <MenuItem value="active">Activos</MenuItem>
                    <MenuItem value="inactive">Inactivos</MenuItem>
                  </Select>
                </FormControl>

                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={loadUsers}
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

        {/* Contenido Principal - Lista de Usuarios */}
        <Fade in timeout={1200}>
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
                <People sx={{ color: '#501b36', fontSize: 28 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#501b36' }}>
                    Usuarios y sus Documentos
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Contenido de usuarios */}
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
                  Cargando usuarios...
                </Typography>
              </Box>
            ) : filteredUsers.length === 0 ? (
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
                  <People sx={{ fontSize: 48, color: '#501b36' }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                  No se encontraron usuarios
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, maxWidth: 400 }}>
                  {searchTerm 
                    ? `No hay usuarios que coincidan con "${searchTerm}"`
                    : 'No hay usuarios disponibles con los filtros aplicados'
                  }
                </Typography>
              </Box>
            ) : (
              <Box sx={{ p: 2 }}>
                {usersPagination.paginatedData.map((user: any) => (
                  <Card
                    key={user.id}
                    elevation={0}
                    sx={{
                      mb: 1.5,
                      border: '1px solid #e0e0e0',
                      borderRadius: 2,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#501b36',
                        boxShadow: '0 2px 8px rgba(80, 27, 54, 0.1)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      {/* Header compacto del usuario */}
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        mb: expandedUsers.includes(user.id) ? 2 : 0
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                          <Avatar
                            sx={{
                              width: 40,
                              height: 40,
                              bgcolor: getRoleColor(user.role),
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.9rem',
                            }}
                          >
                            {getUserInitials(user.first_name, user.last_name)}
                          </Avatar>
                          
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle1" sx={{ 
                              fontWeight: 600, 
                              mb: 0.5,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {user.first_name} {user.last_name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {user.dni}
                              </Typography>
                              <Chip
                                label={user.role}
                                size="small"
                                sx={{
                                  bgcolor: alpha(getRoleColor(user.role), 0.1),
                                  color: getRoleColor(user.role),
                                  fontWeight: 500,
                                  fontSize: '0.7rem',
                                  height: 20,
                                }}
                              />
                              <Chip
                                label={user.is_active ? 'Activo' : 'Inactivo'}
                                size="small"
                                color={user.is_active ? 'success' : 'error'}
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            </Box>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {/* Estadísticas compactas */}
                          <Box sx={{ textAlign: 'center', minWidth: 60 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#2196f3', lineHeight: 1 }}>
                              {user.total_documents}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                              Docs
                            </Typography>
                          </Box>
                          
                          <Box sx={{ textAlign: 'center', minWidth: 60 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#ff9800', lineHeight: 1 }}>
                              {formatFileSize(user.total_size)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                              Tamaño
                            </Typography>
                          </Box>

                          <IconButton
                            size="small"
                            onClick={() => handleExpandUser(user.id)}
                            sx={{
                              bgcolor: alpha('#501b36', 0.08),
                              color: '#501b36',
                              width: 32,
                              height: 32,
                              '&:hover': {
                                bgcolor: alpha('#501b36', 0.12),
                              },
                            }}
                          >
                            {expandedUsers.includes(user.id) ? 
                              <ExpandLess sx={{ fontSize: 18 }} /> : 
                              <ExpandMore sx={{ fontSize: 18 }} />
                            }
                          </IconButton>

                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuClick(e, user)}
                            sx={{
                              bgcolor: alpha('#501b36', 0.08),
                              color: '#501b36',
                              width: 32,
                              height: 32,
                              '&:hover': {
                                bgcolor: alpha('#501b36', 0.12),
                              },
                            }}
                          >
                            <MoreVert sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Box>
                      </Box>

                      {/* Sección expandible de documentos */}
                      <Collapse in={expandedUsers.includes(user.id)}>
                        <Divider sx={{ mb: 2 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5, color: '#501b36' }}>
                          Documentos por Carpeta
                        </Typography>
                        
                        {user.documents.length === 0 ? (
                          <Box sx={{ 
                            textAlign: 'center', 
                            py: 3,
                            bgcolor: alpha('#501b36', 0.02),
                            borderRadius: 2
                          }}>
                            <StorageRounded sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              Este usuario no tiene documentos
                            </Typography>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'grid', gap: 1.5 }}>
                            {Object.entries(getDocumentsByFolder(user.documents)).map(([folder, docs]) => (
                              <Paper
                                key={folder}
                                elevation={0}
                                sx={{
                                  p: 1.5,
                                  border: '1px solid #e0e0e0',
                                  borderRadius: 1.5,
                                  bgcolor: alpha('#501b36', 0.02),
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                  {getFolderIcon(folder)}
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {getFolderDisplayName(folder)}
                                  </Typography>
                                  <Badge
                                    badgeContent={docs.length}
                                    color="primary"
                                    sx={{
                                      '& .MuiBadge-badge': {
                                        bgcolor: '#501b36',
                                        color: 'white',
                                        fontWeight: 600,
                                        fontSize: '0.6rem',
                                        minWidth: 16,
                                        height: 16,
                                      },
                                    }}
                                  >
                                    <Box />
                                  </Badge>
                                </Box>
                                
                                <Box sx={{ display: 'grid', gap: 0.5 }}>
                                  {docs.map((doc) => (
                                    <Box
                                      key={doc.id}
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        p: 1,
                                        bgcolor: 'white',
                                        borderRadius: 1,
                                        border: '1px solid #f0f0f0',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                          borderColor: '#501b36',
                                          bgcolor: alpha('#501b36', 0.02),
                                        },
                                      }}
                                    >
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                                        <Box
                                          sx={{
                                            p: 0.5,
                                            borderRadius: 1,
                                            bgcolor: doc.type === '.pdf' ? alpha('#d32f2f', 0.1) : alpha('#501b36', 0.1),
                                          }}
                                        >
                                          {doc.type === '.pdf' ? (
                                            <PictureAsPdf sx={{ fontSize: 16, color: '#d32f2f' }} />
                                          ) : (
                                            <Description sx={{ fontSize: 16, color: '#501b36' }} />
                                          )}
                                        </Box>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                          <Typography variant="caption" sx={{ 
                                            fontWeight: 600,
                                            display: 'block',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                          }}>
                                            {doc.name}
                                          </Typography>
                                          <Typography variant="caption" sx={{ 
                                            color: 'text.secondary',
                                            fontSize: '0.65rem'
                                          }}>
                                            {formatFileSize(doc.size)} • {new Date(doc.created_date).toLocaleDateString('es-ES')}
                                          </Typography>
                                        </Box>
                                      </Box>
                                      
                                      <Stack direction="row" spacing={0.5}>
                                        <IconButton
                                          size="small"
                                          onClick={() => handleDownloadDocument(doc)}
                                          disabled={loadingActions[doc.id] === 'downloading'}
                                          disableRipple
                                          disableFocusRipple
                                          disableTouchRipple
                                          sx={{
                                            color: '#4caf50',
                                            padding: 0.5,
                                            backgroundColor: 'transparent !important',
                                            boxShadow: 'none !important',
                                            '&:hover': {
                                              backgroundColor: 'transparent !important',
                                              bgcolor: 'transparent !important',
                                              boxShadow: 'none !important',
                                              color: '#388e3c',
                                            },
                                            '&:active': {
                                              backgroundColor: 'transparent !important',
                                              bgcolor: 'transparent !important',
                                              boxShadow: 'none !important',
                                            },
                                            '&:focus': {
                                              backgroundColor: 'transparent !important',
                                              bgcolor: 'transparent !important',
                                              boxShadow: 'none !important',
                                            },
                                            '&.MuiIconButton-root': {
                                              backgroundColor: 'transparent !important',
                                              bgcolor: 'transparent !important',
                                            },
                                            '&:disabled': {
                                              color: alpha('#4caf50', 0.5),
                                            },
                                          }}
                                        >
                                          {loadingActions[doc.id] === 'downloading' ? (
                                            <CircularProgress size={20} sx={{ color: '#4caf50' }} />
                                          ) : (
                                            <CloudDownload sx={{ fontSize: 20 }} />
                                          )}
                                        </IconButton>
                                        <IconButton
                                          size="small"
                                          onClick={() => handlePreviewDocument(doc)}
                                          disabled={loadingActions[doc.id] === 'previewing'}
                                          disableRipple
                                          disableFocusRipple
                                          disableTouchRipple
                                          sx={{
                                            color: '#2196f3',
                                            padding: 0.5,
                                            backgroundColor: 'transparent !important',
                                            boxShadow: 'none !important',
                                            '&:hover': {
                                              backgroundColor: 'transparent !important',
                                              bgcolor: 'transparent !important',
                                              boxShadow: 'none !important',
                                              color: '#1976d2',
                                            },
                                            '&:active': {
                                              backgroundColor: 'transparent !important',
                                              bgcolor: 'transparent !important',
                                              boxShadow: 'none !important',
                                            },
                                            '&:focus': {
                                              backgroundColor: 'transparent !important',
                                              bgcolor: 'transparent !important',
                                              boxShadow: 'none !important',
                                            },
                                            '&.MuiIconButton-root': {
                                              backgroundColor: 'transparent !important',
                                              bgcolor: 'transparent !important',
                                            },
                                            '&:disabled': {
                                              color: alpha('#2196f3', 0.5),
                                            },
                                          }}
                                        >
                                          {loadingActions[doc.id] === 'previewing' ? (
                                            <CircularProgress size={20} sx={{ color: '#2196f3' }} />
                                          ) : (
                                            <Visibility sx={{ fontSize: 20 }} />
                                          )}
                                        </IconButton>
                                      </Stack>
                                    </Box>
                                  ))}
                                </Box>
                              </Paper>
                            ))}
                          </Box>
                        )}
                      </Collapse>
                    </CardContent>
                  </Card>
                ))}

                {/* Componente de paginación */}
                {filteredUsers.length > 0 && (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    mt: 3,
                    p: 2,
                    borderTop: '1px solid',
                    borderColor: 'divider'
                  }}>
                    <PaginationComponent
                      currentPage={usersPagination.currentPage}
                      itemsPerPage={usersPagination.itemsPerPage}
                      totalItems={filteredUsers.length}
                      onPageChange={usersPagination.setCurrentPage}
                      onItemsPerPageChange={usersPagination.setItemsPerPage}
                    />
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Fade>

        {/* Menú contextual para usuarios */}
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
              minWidth: 200,
            }
          }}
        >
          <MenuItem 
            onClick={() => selectedUser && handleViewUserDocuments(selectedUser)}
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
            <FolderOpen sx={{ fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Ver todos los documentos
            </Typography>
          </MenuItem>
          <MenuItem 
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
            <AccountCircle sx={{ fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Ver perfil de usuario
            </Typography>
          </MenuItem>
          <MenuItem 
            sx={{
              py: 1.5,
              px: 2,
              gap: 2,
              '&:hover': {
                bgcolor: alpha('#ff9800', 0.08),
                color: '#ff9800',
              },
            }}
          >
            <CloudUpload sx={{ fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Subir documento
            </Typography>
          </MenuItem>
        </Menu>
      </Box>

      {/* Modal de preview para PDFs */}
      <PdfPreview
        open={previewModal.open}
        onClose={handleClosePreviewModal}
        fileUrl={previewModal.fileUrl}
        fileName={previewModal.fileName}
        title={previewModal.title}
      />

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
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
    </>
  );
};

export default DocumentationPanel;
