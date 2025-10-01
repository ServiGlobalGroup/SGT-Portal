import React, { useState, useEffect } from 'react';
import { usePagination } from '../../hooks/usePagination';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Fade,
  GlobalStyles,
  Stack,
  Menu,
  MenuItem,
  Snackbar,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  SupervisorAccount,
  FolderOpen,
  AccountCircle,
  CloudUpload,
  People,
} from '@mui/icons-material';
import { PdfPreview } from '../../components/PdfPreview';
import { MobileUserCard } from '../../components/mobile/MobileUserCard';
import { MobileFilters } from '../../components/mobile/MobileFilters';
import { MobilePagination } from '../../components/mobile/MobilePagination';
import { MobileStatsCard } from '../../components/mobile/MobileStatsCard';
import { MobileLoading } from '../../components/mobile/MobileLoading';
import { documentationAPI } from '../../services/api';

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

export const MobileDocumentationPanel: React.FC = () => {
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
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Funciones auxiliares
  const loadUsers = async () => {
    setLoading(true);
    try {
      const userData = await documentationAPI.getUsers();
      setUsers(userData);
    } catch (error) {
      console.error('Error loading users:', error);
      setAlert({
        type: 'error',
        message: 'Error al cargar los usuarios del sistema'
      });
      setUsers([]);
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
    initialItemsPerPage: 6,
    initialPage: 1
  });

  // Reset página cuando cambian los filtros
  useEffect(() => {
    usersPagination.setCurrentPage(1);
  }, [searchTerm, filterStatus, usersPagination.setCurrentPage]);

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
      
      // Usar la API igual que en desktop
      const blob = await documentationAPI.downloadDocument(
        documentFile.user_dni,
        documentFile.folder,
        documentFile.name
      );
      
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = documentFile.name;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
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
      setLoadingActions(prev => ({ ...prev, [documentFile.id]: 'previewing' }));
      
      if (documentFile.type === '.pdf') {
        console.log('Previewing document:', documentFile);
        
        // En móvil, abrir PDFs en nueva pestaña ya que los iframes no funcionan bien
        // Detectar si es móvil usando user agent
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
          // Para móvil: descargar y abrir en el visor nativo
          const blob = await documentationAPI.downloadDocument(
            documentFile.user_dni,
            documentFile.folder,
            documentFile.name
          );

          if (!blob || blob.size === 0) {
            throw new Error('Archivo PDF vacío o no válido');
          }

          // Crear blob URL y abrir en nueva pestaña
          const blobUrl = window.URL.createObjectURL(blob);
          const newWindow = window.open(blobUrl, '_blank');
          
          if (!newWindow) {
            // Si no se puede abrir nueva ventana, forzar descarga
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = documentFile.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setSnackbar({
              open: true,
              message: 'PDF descargado. Ábrelo desde tu gestor de archivos.',
              severity: 'info'
            });
          } else {
            setSnackbar({
              open: true,
              message: 'PDF abierto en nueva pestaña',
              severity: 'success'
            });
          }
          
          // Limpiar blob URL después de un tiempo
          setTimeout(() => {
            window.URL.revokeObjectURL(blobUrl);
          }, 60000); // 1 minuto
          
        } else {
          // Para desktop: usar modal como siempre
          const blob = await documentationAPI.downloadDocument(
            documentFile.user_dni,
            documentFile.folder,
            documentFile.name
          );

          if (!blob || blob.size === 0) {
            throw new Error('Archivo PDF vacío o no válido');
          }

          const blobUrl = window.URL.createObjectURL(blob);
          
          setPreviewModal({
            open: true,
            fileUrl: blobUrl,
            fileName: documentFile.name,
            title: `${documentFile.name} - ${documentFile.user_dni}`,
            isBlobUrl: true
          });
        }
      } else {
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
        message: 'Error al previsualizar el documento: ' + (error as Error).message,
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

  // Calcular estadísticas
  const stats = {
    total_users: users.length,
    active_users: users.filter(u => u.is_active).length,
    total_documents: users.reduce((sum, u) => sum + u.total_documents, 0),
    users_with_documents: users.filter(u => u.total_documents > 0).length,
    total_size: users.reduce((sum, u) => sum + u.total_size, 0),
  };

  const statusFilterOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
  ];

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
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
                  <SupervisorAccount sx={{ fontSize: 24 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Panel de Documentación
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, lineHeight: 1.3 }}>
                    Gestiona usuarios y documentos
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Fade>

        {/* Estadísticas */}
        <Fade in timeout={800}>
          <Box sx={{ mb: 3 }}>
            <MobileStatsCard stats={stats} />
          </Box>
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

        {/* Filtros */}
        <Fade in timeout={1000}>
          <Box sx={{ mb: 2 }}>
            <MobileFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filterOptions={{
                status: {
                  value: filterStatus,
                  onChange: (value) => setFilterStatus(value as 'all' | 'active' | 'inactive'),
                  options: statusFilterOptions
                }
              }}
              onRefresh={loadUsers}
              onClearFilters={clearFilters}
              loading={loading}
              searchPlaceholder="Buscar usuarios por nombre, DNI o email..."
            />
          </Box>
        </Fade>

        {/* Contenido Principal - Lista de Usuarios */}
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <People sx={{ color: '#501b36', fontSize: 24 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#501b36', fontSize: '1.1rem' }}>
                    Usuarios y Documentos
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Lista de usuarios */}
            {loading ? (
              <MobileLoading message="Cargando usuarios..." />
            ) : filteredUsers.length === 0 ? (
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
                  <People sx={{ fontSize: 40, color: '#501b36' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                  No se encontraron usuarios
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 300, lineHeight: 1.4 }}>
                  {searchTerm 
                    ? `No hay usuarios que coincidan con "${searchTerm}"`
                    : 'No hay usuarios disponibles con los filtros aplicados'
                  }
                </Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ p: 2 }}>
                  <Stack spacing={1.5}>
                    {usersPagination.paginatedData.map((user: any) => (
                      <MobileUserCard
                        key={user.id}
                        user={user}
                        isExpanded={expandedUsers.includes(user.id)}
                        onToggleExpand={handleExpandUser}
                        onMenuClick={handleMenuClick}
                        onDownloadDocument={handleDownloadDocument}
                        onPreviewDocument={handlePreviewDocument}
                        loadingActions={loadingActions}
                      />
                    ))}
                  </Stack>
                </Box>
                
                {/* Paginación */}
                <MobilePagination
                  currentPage={usersPagination.currentPage}
                  totalPages={Math.ceil(filteredUsers.length / usersPagination.itemsPerPage)}
                  totalItems={filteredUsers.length}
                  itemsPerPage={usersPagination.itemsPerPage}
                  onPageChange={usersPagination.setCurrentPage}
                />
              </>
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
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              border: '1px solid #e0e0e0',
              minWidth: 180,
            }
          }}
        >
          <MenuItem 
            onClick={() => selectedUser && handleViewUserDocuments(selectedUser)}
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
            <FolderOpen sx={{ fontSize: 18 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Ver documentos
            </Typography>
          </MenuItem>
          <MenuItem 
            sx={{
              py: 1,
              px: 2,
              gap: 1.5,
              '&:hover': {
                bgcolor: alpha('#2196f3', 0.08),
                color: '#2196f3',
              },
            }}
          >
            <AccountCircle sx={{ fontSize: 18 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Ver perfil
            </Typography>
          </MenuItem>
          <MenuItem 
            sx={{
              py: 1,
              px: 2,
              gap: 1.5,
              '&:hover': {
                bgcolor: alpha('#ff9800', 0.08),
                color: '#ff9800',
              },
            }}
          >
            <CloudUpload sx={{ fontSize: 18 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Subir documento
            </Typography>
          </MenuItem>
        </Menu>

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

export default MobileDocumentationPanel;
