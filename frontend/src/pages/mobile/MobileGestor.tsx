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
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  MenuBook,
} from '@mui/icons-material';
import { PdfPreview } from '../../components/PdfPreview';
import { MobileUserCard } from '../../components/mobile/MobileUserCard';
import { MobileFilters } from '../../components/mobile/MobileFilters';
import { MobilePagination } from '../../components/mobile/MobilePagination';
import { MobileStatsCard } from '../../components/mobile/MobileStatsCard';
import { MobileLoading } from '../../components/mobile/MobileLoading';
import { userFilesAPI } from '../../services/api';

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

// Adaptar datos para componente móvil
const adaptUserForMobile = (user: User) => ({
  id: user.id.toString(),
  dni: user.dni_nie,
  first_name: user.name.split(' ')[0] || '',
  last_name: user.name.split(' ').slice(1).join(' ') || '',
  email: user.email,
  role: user.role,
  is_active: user.is_active,
  total_documents: user.total_documents,
  total_size: user.total_size,
  documents: [
    ...user.documents.nominas.map(doc => ({
      ...doc,
      folder: 'nominas',
      path: doc.download_url,
      user_dni: user.dni_nie,
    })),
    ...user.documents.dietas.map(doc => ({
      ...doc,
      folder: 'dietas', 
      path: doc.download_url,
      user_dni: user.dni_nie,
    })),
  ]
});

export const MobileGestor: React.FC = () => {
  const [allUsersData, setAllUsersData] = useState<AllUsersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterDocumentType, setFilterDocumentType] = useState<'all' | 'nominas' | 'dietas'>('all');
  const [expandedUsers, setExpandedUsers] = useState<string[]>([]);
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
      const data = await userFilesAPI.admin.getAllUsersDocuments();
      setAllUsersData(data);
    } catch (err: any) {
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

  // Adaptar usuarios para componente móvil
  const adaptedUsers = filteredUsers.map(adaptUserForMobile);

  // Estados para paginación de usuarios
  const usersPagination = usePagination({
    data: adaptedUsers,
    initialItemsPerPage: 5,
    initialPage: 1
  });

  // Reset página cuando cambian los filtros
  useEffect(() => {
    usersPagination.setCurrentPage(1);
  }, [searchTerm, filterDepartment, filterStatus, filterDocumentType]);

  const handleExpandUser = (userId: string) => {
    setExpandedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleDownloadDocument = async (documentFile: any) => {
    try {
      setSuccess(`Descargando ${documentFile.name}...`);
      const link = window.document.createElement('a');
      link.href = documentFile.download_url;
      link.download = documentFile.name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Error al descargar el archivo');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handlePreviewDocument = (documentFile: any) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('Token de autenticación no encontrado');
      return;
    }
    
    // Extraer datos del download_url
    const urlParts = documentFile.download_url.split('/');
    const dni_nie = urlParts[4];
    const folder_type = urlParts[5];
    const filename = urlParts[6];
    
    const previewUrl = `/api/user-files/preview/${dni_nie}/${folder_type}/${filename}?token=${encodeURIComponent(token)}`;
    
    setPdfPreview({
      open: true,
      fileUrl: previewUrl,
      fileName: documentFile.name
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterDepartment('all');
    setFilterStatus('all');
    setFilterDocumentType('all');
  };

  // Opciones para filtros
  const statusOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
  ];

  const departmentOptions = [
    { value: 'all', label: 'Todos' },
    ...departments.map(dept => ({ value: dept, label: dept }))
  ];

  const documentTypeOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'nominas', label: 'Con Nóminas' },
    { value: 'dietas', label: 'Con Dietas' },
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
                  <MenuBook sx={{ fontSize: 24 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Panel de Documentación
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, lineHeight: 1.3 }}>
                    Vista consolidada de usuarios y documentos
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Fade>

        {/* Estados de carga y error */}
        {loading && (
          <MobileLoading message="Cargando datos de usuarios..." />
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
            <Fade in timeout={800}>
              <Box sx={{ mb: 3 }}>
                <MobileStatsCard stats={stats} />
              </Box>
            </Fade>

            {/* Filtros */}
            <Fade in timeout={1000}>
              <Box sx={{ mb: 2 }}>
                <MobileFilters
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  filterOptions={{
                    status: {
                      value: filterStatus,
                      onChange: (value) => setFilterStatus(value as typeof filterStatus),
                      options: statusOptions
                    },
                    department: {
                      value: filterDepartment,
                      onChange: setFilterDepartment,
                      options: departmentOptions
                    },
                    documentType: {
                      value: filterDocumentType,
                      onChange: (value) => setFilterDocumentType(value as typeof filterDocumentType),
                      options: documentTypeOptions
                    }
                  }}
                  onRefresh={loadAllUsersData}
                  onClearFilters={clearFilters}
                  loading={loading}
                  searchPlaceholder="Buscar usuarios por nombre, DNI, email o departamento..."
                />
              </Box>
            </Fade>

            {/* Lista de usuarios con documentos */}
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
                    Usuarios y sus Documentos ({filteredUsers.length})
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    Gestión de documentos administrativos
                  </Typography>
                </Box>

                {usersPagination.paginatedData.length === 0 ? (
                  <Box sx={{ 
                    p: 4, 
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2
                  }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                      No se encontraron usuarios
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 300, lineHeight: 1.4 }}>
                      Intenta ajustar los filtros de búsqueda
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
                            onMenuClick={() => {}} // No se usa en esta versión
                            onDownloadDocument={handleDownloadDocument}
                            onPreviewDocument={handlePreviewDocument}
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
    </>
  );
};
