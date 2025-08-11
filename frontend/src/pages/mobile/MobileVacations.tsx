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
  Button,
  Chip,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  BeachAccess,
  Add,
  CalendarToday,
  CheckCircle,
  Cancel,
  HourglassEmpty,
  Pending,
  Business,
  Schedule,
  Refresh,
  EventNote,
  Person,
  Work,
  DateRange,
} from '@mui/icons-material';
import { DevelopmentModal } from '../../components/DevelopmentModal';
import { MobileTabs } from '../../components/mobile/MobileTabs';
import { MobilePagination } from '../../components/mobile/MobilePagination';
import { MobileLoading } from '../../components/mobile/MobileLoading';

// Interfaces
interface VacationRequest {
  id: number;
  employeeName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  days: number;
  requestDate: string;
  approvedBy?: string;
  approvedDate?: string;
  comments?: string;
  type: 'personal' | 'sick' | 'maternity' | 'study';
}

type VacationStatus = 'all' | 'pending' | 'approved' | 'rejected';

interface AlertState {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export const MobileVacations: React.FC = () => {
  // Estados principales
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([
    {
      id: 1,
      employeeName: 'María García',
      startDate: '2025-08-20',
      endDate: '2025-08-27',
      reason: 'Vacaciones familiares de verano',
      status: 'pending',
      days: 8,
      requestDate: '2025-07-15',
      type: 'personal'
    },
    {
      id: 2,
      employeeName: 'Carlos López',
      startDate: '2025-09-10',
      endDate: '2025-09-12',
      reason: 'Asuntos personales',
      status: 'approved',
      days: 3,
      requestDate: '2025-07-20',
      approvedBy: 'Admin',
      approvedDate: '2025-07-22',
      type: 'personal'
    },
    {
      id: 3,
      employeeName: 'Ana Martínez',
      startDate: '2025-08-05',
      endDate: '2025-08-07',
      reason: 'Cita médica',
      status: 'rejected',
      days: 3,
      requestDate: '2025-07-10',
      approvedBy: 'Admin',
      approvedDate: '2025-07-12',
      comments: 'Insuficiente antelación',
      type: 'sick'
    }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<VacationStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [showDevelopmentModal, setShowDevelopmentModal] = useState(true);

  // Estados de UI
  const [alert, setAlert] = useState<AlertState | null>(null);
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
    if (alert) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Funciones principales
  const loadVacationRequests = async () => {
    setLoading(true);
    try {
      // Simular carga de datos
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setAlert({
        type: 'success',
        message: 'Solicitudes de vacaciones cargadas exitosamente'
      });
    } catch (err: any) {
      console.error('Error loading vacation requests:', err);
      setAlert({
        type: 'error',
        message: 'Error al cargar las solicitudes de vacaciones'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar solicitudes
  const filteredRequests = vacationRequests.filter(request => {
    const matchesStatus = currentStatus === 'all' || request.status === currentStatus;
    const matchesSearch = request.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.reason.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Paginación
  const requestsPagination = usePagination({
    data: filteredRequests,
    initialItemsPerPage: 6,
    initialPage: 1
  });

  // Reset página cuando cambian los filtros
  useEffect(() => {
    if (requestsPagination.currentPage > requestsPagination.totalPages && requestsPagination.totalPages > 0) {
      requestsPagination.setCurrentPage(1);
    }
  }, [searchTerm, currentStatus, requestsPagination]);

  // Función para manejar cambio de página con loading
  const handlePageChange = async (page: number) => {
    setPaginationLoading(true);
    await new Promise(resolve => setTimeout(resolve, 200));
    requestsPagination.setCurrentPage(page);
    setPaginationLoading(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Configuración de pestañas
  const tabOptions = [
    {
      id: 'all',
      label: 'Todas',
      count: vacationRequests.length,
      icon: <EventNote sx={{ fontSize: 18 }} />,
    },
    {
      id: 'pending',
      label: 'Pendientes',
      count: vacationRequests.filter(r => r.status === 'pending').length,
      icon: <HourglassEmpty sx={{ fontSize: 18 }} />,
    },
    {
      id: 'approved',
      label: 'Aprobadas',
      count: vacationRequests.filter(r => r.status === 'approved').length,
      icon: <CheckCircle sx={{ fontSize: 18 }} />,
    },
    {
      id: 'rejected',
      label: 'Rechazadas',
      count: vacationRequests.filter(r => r.status === 'rejected').length,
      icon: <Cancel sx={{ fontSize: 18 }} />,
    },
  ];

  // Funciones auxiliares
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle sx={{ color: '#4caf50' }} />;
      case 'rejected': return <Cancel sx={{ color: '#f44336' }} />;
      case 'pending': return <HourglassEmpty sx={{ color: '#ff9800' }} />;
      default: return <Pending sx={{ color: '#757575' }} />;
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprobada';
      case 'rejected': return 'Rechazada';
      case 'pending': return 'Pendiente';
      default: return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'personal': return <Person sx={{ fontSize: 16 }} />;
      case 'sick': return <Business sx={{ fontSize: 16 }} />;
      case 'maternity': return <Work sx={{ fontSize: 16 }} />;
      case 'study': return <Schedule sx={{ fontSize: 16 }} />;
      default: return <EventNote sx={{ fontSize: 16 }} />;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'personal': return 'Personal';
      case 'sick': return 'Médica';
      case 'maternity': return 'Maternidad';
      case 'study': return 'Estudios';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'personal': return '#2196f3';
      case 'sick': return '#f44336';
      case 'maternity': return '#9c27b0';
      case 'study': return '#ff9800';
      default: return corporateColor;
    }
  };

  // Componente de tarjeta de solicitud
  const VacationCard: React.FC<{ request: VacationRequest }> = ({ request }) => (
    <Card
      sx={{
        borderRadius: 2,
        border: '1px solid #e0e0e0',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 4px 12px ${alpha(corporateColor, 0.15)}`,
        },
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Header con empleado y estado */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: alpha(corporateColor, 0.1),
                color: corporateColor,
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              {request.employeeName.split(' ').map(n => n[0]).join('').toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {request.employeeName}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Solicitud #{request.id}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {getStatusIcon(request.status)}
            <Chip
              label={getStatusText(request.status)}
              size="small"
              color={getStatusColor(request.status)}
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                height: 24,
              }}
            />
          </Box>
        </Box>

        {/* Período de vacaciones */}
        <Box sx={{ 
          p: 1.5, 
          bgcolor: alpha(corporateColor, 0.02), 
          borderRadius: 1.5, 
          border: `1px solid ${alpha(corporateColor, 0.1)}`,
          mb: 2 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CalendarToday sx={{ fontSize: 16, color: corporateColor }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: corporateColor }}>
              Período solicitado
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
            {formatDate(request.startDate)} - {formatDate(request.endDate)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {request.days} día{request.days !== 1 ? 's' : ''} • Tipo: {getTypeText(request.type)}
          </Typography>
        </Box>

        {/* Motivo */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5, color: 'text.primary' }}>
            Motivo:
          </Typography>
          <Typography variant="body2" sx={{ 
            color: 'text.secondary', 
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {request.reason}
          </Typography>
        </Box>

        {/* Información adicional */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          pt: 1,
          borderTop: '1px solid #f0f0f0'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Schedule sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Solicitado: {formatDate(request.requestDate)}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {getTypeIcon(request.type)}
            <Chip
              label={getTypeText(request.type)}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.65rem',
                fontWeight: 500,
                height: 20,
                borderColor: alpha(getTypeColor(request.type), 0.3),
                color: getTypeColor(request.type),
              }}
            />
          </Box>
        </Box>

        {/* Información de aprobación/rechazo */}
        {request.approvedBy && (
          <Box sx={{ 
            mt: 1.5, 
            p: 1, 
            bgcolor: alpha(request.status === 'approved' ? '#4caf50' : '#f44336', 0.05),
            borderRadius: 1,
            border: `1px solid ${alpha(request.status === 'approved' ? '#4caf50' : '#f44336', 0.1)}`
          }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              {request.status === 'approved' ? 'Aprobado' : 'Rechazado'} por: {request.approvedBy} el {formatDate(request.approvedDate!)}
            </Typography>
            {request.comments && (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                Comentarios: {request.comments}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );

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
        <EventNote sx={{ fontSize: 40, color: corporateColor }} />
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
        No hay solicitudes
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
          ? `No se encontraron solicitudes que coincidan con "${searchTerm}"`
          : currentStatus === 'all'
            ? 'No hay solicitudes de vacaciones registradas'
            : `No hay solicitudes con estado "${getStatusText(currentStatus)}"`
        }
      </Typography>
      <Button
        variant="contained"
        startIcon={<Add />}
        sx={{
          borderRadius: 2,
          px: 3,
          py: 1,
          textTransform: 'none',
          fontWeight: 600,
          bgcolor: corporateColor,
          '&:hover': {
            bgcolor: alpha(corporateColor, 0.8),
          },
        }}
        onClick={() => {
          setSnackbar({
            open: true,
            message: 'Función disponible próximamente',
            severity: 'info'
          });
        }}
      >
        Nueva Solicitud
      </Button>
    </Box>
  );

  if (loading) {
    return <MobileLoading message="Cargando solicitudes de vacaciones..." />;
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
                  <BeachAccess sx={{ fontSize: 24 }} />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Mis Vacaciones
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, lineHeight: 1.3 }}>
                    Gestiona tus solicitudes de vacaciones
                  </Typography>
                </Box>
                <IconButton
                  onClick={loadVacationRequests}
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
              activeTab={currentStatus}
              onChange={(tabId) => setCurrentStatus(tabId as VacationStatus)}
              corporateColor={corporateColor}
              variant="pills"
              searchProps={{
                searchTerm,
                onSearchChange: setSearchTerm,
                placeholder: "Buscar solicitudes...",
                showFilter: true,
                onFilterClick: () => {
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
                    {currentStatus === 'all' ? 'Todas las Solicitudes' : `Solicitudes ${getStatusText(currentStatus)}s`}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    {filteredRequests.length} solicitud{filteredRequests.length !== 1 ? 'es' : ''}
                    {requestsPagination.totalPages > 1 && (
                      <>
                        {' '} • Página {requestsPagination.currentPage} de {requestsPagination.totalPages}
                      </>
                    )}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(corporateColor, 0.1) }}>
                  <DateRange sx={{ color: corporateColor }} />
                </Avatar>
              </Box>
            </Box>

            {filteredRequests.length === 0 ? (
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
                  <Stack spacing={2}>
                    {requestsPagination.paginatedData.map((request) => (
                      <VacationCard key={request.id} request={request} />
                    ))}
                  </Stack>
                </Box>
                
                {/* Paginación */}
                <MobilePagination
                  currentPage={requestsPagination.currentPage}
                  totalPages={requestsPagination.totalPages}
                  totalItems={filteredRequests.length}
                  itemsPerPage={requestsPagination.itemsPerPage}
                  onPageChange={handlePageChange}
                  corporateColor={corporateColor}
                />
              </>
            )}
          </Paper>
        </Fade>

        {/* Botón flotante para nueva solicitud */}
        <Box
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 1000,
          }}
        >
          <Button
            variant="contained"
            size="large"
            startIcon={<Add />}
            onClick={() => {
              setSnackbar({
                open: true,
                message: 'Función de nueva solicitud disponible próximamente',
                severity: 'info'
              });
            }}
            sx={{
              borderRadius: 3,
              px: 3,
              py: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              bgcolor: corporateColor,
              boxShadow: '0 4px 12px rgba(80, 27, 54, 0.3)',
              '&:hover': {
                bgcolor: alpha(corporateColor, 0.8),
                boxShadow: '0 6px 16px rgba(80, 27, 54, 0.4)',
              },
            }}
          >
            Nueva Solicitud
          </Button>
        </Box>

        {/* Modal de desarrollo */}
        <DevelopmentModal
          open={showDevelopmentModal}
          onClose={() => setShowDevelopmentModal(false)}
          pageTitle="Gestión de Vacaciones Móvil"
          description="Esta funcionalidad móvil está siendo desarrollada para gestionar las solicitudes de vacaciones de forma optimizada en dispositivos móviles."
          features={[
            'Interfaz optimizada para móviles',
            'Solicitud de vacaciones simplificada',
            'Vista de calendario integrada',
            'Notificaciones push',
            'Filtros avanzados por estado',
            'Exportación a calendario personal'
          ]}
          estimatedCompletion="Agosto 2025"
          progressValue={75}
          corporateColor={corporateColor}
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

export default MobileVacations;
