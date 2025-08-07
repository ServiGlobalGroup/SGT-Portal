import React, { useState, useEffect } from 'react';
import { PaginationComponent } from '../components/PaginationComponent';
import { usePagination } from '../hooks/usePagination';
import { useDeviceType } from '../hooks/useDeviceType';
import { MobileGestor } from './mobile/MobileGestor';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Avatar,
  Badge,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  MenuBook,
  ExpandMore,
  Person,
  Download,
  Visibility,
  Search,
  FilterList,
  PictureAsPdf,
  AttachMoney,
  Restaurant,
  AdminPanelSettings,
  FolderOpen,
  Refresh,
} from '@mui/icons-material';
import { PdfPreview } from '../components/PdfPreview';
import { userFilesAPI } from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  dni_nie: string;
  role: string;
  department: string;
  is_active: boolean;
  documents: {
    nominas: UserDocument[];
    dietas: UserDocument[];
  };
  total_documents: number;
  total_size: number;
}

interface UserDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  created_date: string;
  modified_date: string;
  download_url: string;
}

interface AllUsersData {
  users: User[];
  statistics: {
    total_users: number;
    active_users: number;
    total_documents: number;
    users_with_documents: number;
    total_size: number;
  };
}

export const Gestor: React.FC = () => {
  const { useMobileVersion } = useDeviceType();
  
  // Si es dispositivo móvil, usar la versión optimizada
  if (useMobileVersion) {
    return <MobileGestor />;
  }

  const [allUsersData, setAllUsersData] = useState<AllUsersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterDocumentType, setFilterDocumentType] = useState<'all' | 'nominas' | 'dietas'>('all');
  const [expandedUser, setExpandedUser] = useState<number | false>(false);
  const [userTabs, setUserTabs] = useState<Record<string, number>>({});
  const [success, setSuccess] = useState('');
  const [pdfPreview, setPdfPreview] = useState<{ open: boolean; fileUrl: string; fileName: string }>({
    open: false, fileUrl: '', fileName: ''
  });

  // Cargar datos al montar el componente
  useEffect(() => {
    loadAllUsersData();
  }, []);

  const loadAllUsersData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Intentando cargar datos de usuarios...');
      const data = await userFilesAPI.admin.getAllUsersDocuments();
      console.log('Datos recibidos:', data);
      setAllUsersData(data);
    } catch (err: any) {
      console.error('Error completo:', err);
      console.error('Error response:', err.response);
      console.error('Error status:', err.response?.status);
      console.error('Error detail:', err.response?.data?.detail);
      
      let errorMessage = 'Error al cargar los datos de usuarios';
      
      if (err.response?.status === 403) {
        errorMessage = 'No tienes permisos de administrador para acceder a esta información';
      } else if (err.response?.status === 401) {
        errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (userId: string, newValue: number) => {
    setUserTabs(prev => ({
      ...prev,
      [userId]: newValue
    }));
  };

  const users = allUsersData?.users || [];
  const stats = allUsersData?.statistics || {
    total_users: 0,
    active_users: 0,
    total_documents: 0,
    users_with_documents: 0,
    total_size: 0
  };

  // Obtener departamentos únicos
  const departments = Array.from(new Set(users.map(user => user.department)));

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.dni_nie.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || user.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && user.is_active) ||
                         (filterStatus === 'inactive' && !user.is_active);
    const hasDocuments = filterDocumentType === 'all' || 
                        (filterDocumentType === 'nominas' && user.documents.nominas.length > 0) ||
                        (filterDocumentType === 'dietas' && user.documents.dietas.length > 0);
    
    return matchesSearch && matchesDepartment && matchesStatus && hasDocuments;
  });

  // Estados para paginación de usuarios
  const usersPagination = usePagination({
    data: filteredUsers,
    initialItemsPerPage: 5,
    initialPage: 1
  });

  // Reset página cuando cambian los filtros
  useEffect(() => {
    usersPagination.setCurrentPage(1);
  }, [searchTerm, filterDepartment, filterStatus, filterDocumentType]);

  const getDocumentsForTab = (user: User, tabIndex: number) => {
    return tabIndex === 0 ? user.documents.nominas : user.documents.dietas;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentTypeFromPath = (downloadUrl: string): 'nomina' | 'dieta' => {
    return downloadUrl.includes('/nominas/') ? 'nomina' : 'dieta';
  };

  const getTypeIcon = (type: 'nomina' | 'dieta') => {
    return type === 'nomina' ? <AttachMoney color="success" /> : <Restaurant color="info" />;
  };

  const getTypeColor = (type: 'nomina' | 'dieta') => {
    return type === 'nomina' ? 'success' : 'info';
  };

  const handleAccordionChange = (userId: number) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedUser(isExpanded ? userId : false);
  };

  const handleDownload = async (document: UserDocument) => {
    try {
      setSuccess(`Descargando ${document.name}...`);
      // Crear un enlace temporal para descargar
      const link = window.document.createElement('a');
      link.href = document.download_url;
      link.download = document.name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Error al descargar el archivo');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleView = (document: UserDocument) => {
    // Construir URL de preview con token de autenticación
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('Token de autenticación no encontrado');
      return;
    }
    
    // Extraer DNI, folder_type y filename del download_url
    // Formato: /api/user-files/download/{dni_nie}/{folder_type}/{filename}
    const urlParts = document.download_url.split('/');
    const dni_nie = urlParts[4]; // /api/user-files/download/{dni_nie}/...
    const folder_type = urlParts[5]; // .../download/{dni_nie}/{folder_type}/...
    const filename = urlParts[6]; // .../{folder_type}/{filename}
    
    // Construir URL de preview
    const previewUrl = `/api/user-files/preview/${dni_nie}/${folder_type}/${filename}?token=${encodeURIComponent(token)}`;
    
    setPdfPreview({
      open: true,
      fileUrl: previewUrl,
      fileName: document.name
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterDepartment('all');
    setFilterStatus('all');
    setFilterDocumentType('all');
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#501b36' }}>
        Panel de Documentación
      </Typography>

      {/* Estados de carga y error */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            Cargando datos de usuarios...
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {!loading && !error && (
        <>
          {/* Estadísticas */}
          <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <MenuBook sx={{ fontSize: 40, color: '#1565C0' }} />
          <Box>
            <Typography variant="h6">Sistema de Gestión Documental Administrativo</Typography>
            <Typography variant="body2" color="textSecondary">
              Vista consolidada de todos los usuarios y sus documentos
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person color="primary" />
                <Box>
                  <Typography variant="h4" color="primary.main">{stats.total_users}</Typography>
                  <Typography variant="body2">Total Usuarios</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AdminPanelSettings color="success" />
                <Box>
                  <Typography variant="h4" color="success.main">{stats.active_users}</Typography>
                  <Typography variant="body2">Usuarios Activos</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PictureAsPdf color="error" />
                <Box>
                  <Typography variant="h4" color="error.main">{(stats.total_size / (1024 * 1024)).toFixed(1)} MB</Typography>
                  <Typography variant="body2">Tamaño Total</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MenuBook color="info" />
                <Box>
                  <Typography variant="h4" color="info.main">{stats.users_with_documents}</Typography>
                  <Typography variant="body2">Con Documentos</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Paper>

      {/* Filtros */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          <FilterList sx={{ mr: 1, verticalAlign: 'middle' }} />
          Filtros de Usuario
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <Box sx={{ flex: '1 1 300px' }}>
            <TextField
              fullWidth
              size="small"
              label="Buscar usuarios"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Box>
          
          <Box sx={{ flex: '1 1 200px' }}>
            <FormControl fullWidth size="small">
              <InputLabel>Departamento</InputLabel>
              <Select
                value={filterDepartment}
                label="Departamento"
                onChange={(e) => setFilterDepartment(e.target.value)}
              >
                <MenuItem value="all">Todos</MenuItem>
                {departments.map(dept => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ flex: '1 1 150px' }}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select
                value={filterStatus}
                label="Estado"
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="active">Activos</MenuItem>
                <MenuItem value="inactive">Inactivos</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ flex: '1 1 150px' }}>
            <FormControl fullWidth size="small">
              <InputLabel>Documentos</InputLabel>
              <Select
                value={filterDocumentType}
                label="Documentos"
                onChange={(e) => setFilterDocumentType(e.target.value as 'all' | 'nominas' | 'dietas')}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="nominas">Con Nóminas</MenuItem>
                <MenuItem value="dietas">Con Dietas</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ flex: '0 0 auto' }}>
            <Button
              variant="outlined"
              onClick={clearFilters}
              disabled={searchTerm === '' && filterDepartment === 'all' && filterStatus === 'all' && filterDocumentType === 'all'}
              sx={{ mr: 1 }}
            >
              Limpiar
            </Button>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={loadAllUsersData}
              disabled={loading}
            >
              Actualizar
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Lista de usuarios con documentos */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Usuarios y sus Documentos ({filteredUsers.length})
        </Typography>

        {usersPagination.paginatedData.map((user: any) => {
          const currentTab = userTabs[user.id] || 0;
          const tabDocuments = getDocumentsForTab(user, currentTab); // Para mostrar en tabla
          return (
            <Accordion
              key={user.id}
              expanded={expandedUser === user.id}
              onChange={handleAccordionChange(user.id)}
              sx={{ mb: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Badge
                    badgeContent={user.total_documents}
                    color="primary"
                    showZero
                  >
                    <Avatar sx={{ bgcolor: user.is_active ? 'primary.main' : 'grey.400' }}>
                      {getUserInitials(user.name)}
                    </Avatar>
                  </Badge>
                  
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {user.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {user.email} • {user.department} • DNI/NIE: {user.dni_nie}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={user.role === 'ADMIN' ? 'Administrador' : 'Usuario'}
                      color={user.role === 'ADMIN' ? 'warning' : 'default'}
                      size="small"
                    />
                    <Chip
                      label={user.is_active ? 'Activo' : 'Inactivo'}
                      color={user.is_active ? 'success' : 'error'}
                      size="small"
                    />
                    <Chip
                      label={`${formatFileSize(user.total_size)}`}
                      color="info"
                      size="small"
                    />
                  </Box>
                </Box>
              </AccordionSummary>
              
              <AccordionDetails>
                {tabDocuments.length > 0 ? (
                  <Box>
                    {/* Tabs para separar nóminas y dietas */}
                    <Tabs 
                      value={userTabs[user.id] || 0} 
                      onChange={(_, newValue) => handleTabChange(user.id.toString(), newValue)}
                      sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                    >
                      <Tab 
                        label={`Nóminas (${user.documents.nominas.length})`} 
                        icon={<AttachMoney />} 
                        iconPosition="start" 
                      />
                      <Tab 
                        label={`Dietas (${user.documents.dietas.length})`} 
                        icon={<Restaurant />} 
                        iconPosition="start" 
                      />
                    </Tabs>
                    
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Tipo</TableCell>
                            <TableCell>Archivo</TableCell>
                            <TableCell>Tamaño</TableCell>
                            <TableCell>Fecha Creación</TableCell>
                            <TableCell>Última Modificación</TableCell>
                            <TableCell align="center">Acciones</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {tabDocuments.map((document) => {
                            const documentType = getDocumentTypeFromPath(document.download_url);
                            return (
                              <TableRow key={document.id}>
                                <TableCell>
                                  <Chip
                                    icon={getTypeIcon(documentType)}
                                    label={documentType === 'nomina' ? 'Nómina' : 'Dieta'}
                                    color={getTypeColor(documentType) as 'success' | 'info'}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" noWrap title={document.name}>
                                    {document.name.length > 30 ? `${document.name.substring(0, 30)}...` : document.name}
                                  </Typography>
                                </TableCell>
                                <TableCell>{formatFileSize(document.size)}</TableCell>
                                <TableCell>
                                  {new Date(document.created_date).toLocaleDateString('es-ES')}
                                </TableCell>
                                <TableCell>
                                  {new Date(document.modified_date).toLocaleDateString('es-ES')}
                                </TableCell>
                                <TableCell align="center">
                                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => handleView(document)}
                                      title="Visualizar"
                                    >
                                      <Visibility />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      color="success"
                                      onClick={() => handleDownload(document)}
                                      title="Descargar"
                                    >
                                      <Download />
                                    </IconButton>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <FolderOpen sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body2" color="textSecondary">
                      Este usuario no tiene documentos disponibles
                    </Typography>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}

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

        {filteredUsers.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary">
              No se encontraron usuarios
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Intenta ajustar los filtros de búsqueda
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Componente de preview de PDF */}
      <PdfPreview
        open={pdfPreview.open}
        onClose={() => setPdfPreview({ open: false, fileUrl: '', fileName: '' })}
        fileUrl={pdfPreview.fileUrl}
        fileName={pdfPreview.fileName}
        title={`Vista previa: ${pdfPreview.fileName}`}
      />
        </>
      )}
    </Box>
  );
};
