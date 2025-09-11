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
  Button,
  Chip,
  Card,
  CardContent,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
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
  EventNote,
  Person,
  Work,
  DateRange,
} from '@mui/icons-material';
import { mobileContainedButtonSx as sharedMobileContainedBtn, maroonGradient } from '../../theme/mobileStyles';
import { ModernModal } from '../../components/ModernModal';
import { ModernField } from '../../components/ModernFormComponents';
import { Checkbox, FormControlLabel } from '@mui/material';
import { vacationService } from '../../services/vacationService';
import type { AbsenceType } from '../../types/vacation';
import { useAuth } from '../../hooks/useAuth';
import { MobilePagination } from '../../components/mobile/MobilePagination';
import { MobileLoading } from '../../components/mobile/MobileLoading';
import { MobileTabs } from '../../components/mobile/MobileTabs';

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
  type: 'vacation' | 'personal' | 'sick' | 'maternity' | 'study';
}

type VacationStatus = 'all' | 'pending' | 'approved' | 'rejected';

interface AlertState {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export const MobileVacations: React.FC = () => {
  const { user } = useAuth();
  // Estados principales
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<VacationStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [newRequest, setNewRequest] = useState({ startDate: '', endDate: '', reason: 'Vacaciones', oneDay: false, absenceType: 'VACATION' as AbsenceType });

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
  // Estética de botón contenida (granate/burdeos) como el toggle Mías/Todas (desktop)
  const mobileContainedButtonSx = sharedMobileContainedBtn;

  // Efectos
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Cargar solicitudes al montar
  useEffect(() => {
    loadVacationRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Comparador superficial para evitar re-render innecesario
  const isSameRequests = (a: VacationRequest[], b: VacationRequest[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const x = a[i];
      const y = b[i];
      if (!y || x.id !== y.id) return false;
      if (
        x.startDate !== y.startDate ||
        x.endDate !== y.endDate ||
        x.reason !== y.reason ||
        x.status !== y.status ||
        x.days !== y.days ||
        x.requestDate !== y.requestDate ||
        (x.approvedBy || '') !== (y.approvedBy || '') ||
        (x.approvedDate || '') !== (y.approvedDate || '') ||
        (x.comments || '') !== (y.comments || '')
      ) return false;
    }
    return true;
  };

  // Funciones principales
  const loadVacationRequests = async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    if (!silent) setLoading(true);
    try {
      const params = user?.id ? { user_id: user.id } : undefined;
      const data = await vacationService.getVacationRequests(params);
      const mapped: VacationRequest[] = data.map((api: any) => ({
        id: api.id,
        employeeName: api.employee_name || 'Yo',
        startDate: api.start_date.toISOString().split('T')[0],
        endDate: api.end_date.toISOString().split('T')[0],
        reason: api.reason,
        status: api.status,
        days: api.duration_days || Math.max(1, Math.ceil((api.end_date.getTime() - api.start_date.getTime()) / (1000*60*60*24)) + 1),
        requestDate: api.created_at ? api.created_at.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        approvedBy: api.reviewer_name || undefined,
        approvedDate: api.reviewed_at ? api.reviewed_at.toISOString().split('T')[0] : undefined,
        comments: api.admin_response || undefined,
  type: api.absence_type === 'PERSONAL' ? 'personal' : 'vacation',
      }));
      setVacationRequests(prev => (isSameRequests(prev, mapped) ? prev : mapped));
    } catch (err: any) {
      console.error('Error loading vacation requests:', err);
      setAlert({
        type: 'error',
        message: 'Error al cargar las solicitudes de vacaciones'
      });
    } finally {
      if (!silent) setLoading(false);
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
  initialItemsPerPage: 8,
    initialPage: 1
  });

  // Reset página cuando cambian los filtros
  useEffect(() => {
    if (requestsPagination.currentPage > requestsPagination.totalPages && requestsPagination.totalPages > 0) {
      requestsPagination.setCurrentPage(1);
    }
  }, [searchTerm, currentStatus, requestsPagination]);

  // Auto-refresh silencioso en móvil
  useEffect(() => {
    const intervalMs = 30000; // 30s
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadVacationRequests({ silent: true });
      }
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [user?.id]);

  // Función para manejar cambio de página con loading
  const handlePageChange = async (page: number) => {
    setPaginationLoading(true);
    await new Promise(resolve => setTimeout(resolve, 200));
    requestsPagination.setCurrentPage(page);
    setPaginationLoading(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Conteos y tabs para estados (estilo MobileTabs - pills)
  const statusCounts = React.useMemo(() => ({
    all: vacationRequests.length,
    pending: vacationRequests.filter(r => r.status === 'pending').length,
    approved: vacationRequests.filter(r => r.status === 'approved').length,
    rejected: vacationRequests.filter(r => r.status === 'rejected').length,
  }), [vacationRequests]);

  const statusTabs = [
    { id: 'all', label: 'Todas', count: statusCounts.all, icon: <EventNote sx={{ fontSize: 18 }} /> },
    { id: 'pending', label: 'Pendientes', count: statusCounts.pending, icon: <HourglassEmpty sx={{ fontSize: 18 }} /> },
    { id: 'approved', label: 'Aprobadas', count: statusCounts.approved, icon: <CheckCircle sx={{ fontSize: 18 }} /> },
    { id: 'rejected', label: 'Rechazadas', count: statusCounts.rejected, icon: <Cancel sx={{ fontSize: 18 }} /> },
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
      case 'personal': return 'Asuntos propios';
      case 'vacation': return 'Vacaciones';
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
  {/* Botón central eliminado: usamos solo el flotante inferior */}
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
              p: { xs: 3, sm: 4 },
              mb: 3,
              background: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 55%, #d4a574 100%)',
              color: 'white',
              borderRadius: 3,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=%5C"60%5C" height=%5C"60%5C" viewBox=%5C"0 0 60 60%5C" xmlns=%5C"http://www.w3.org/2000/svg%5C"%3E%3Cg fill=%5C"none%5C" fill-rule=%5C"evenodd%5C"%3E%3Cg fill=%5C"%23ffffff%5C" fill-opacity=%5C"0.08%5C"%3E%3Cpath d=%5C"m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%5C"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
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
                  <BeachAccess sx={{ fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Mis Ausencias
                  </Typography>
                  <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
                    Gestiona tus solicitudes de vacaciones y asuntos propios
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

        {/* Selector de estado + búsqueda integrada (píldoras), igual que Mis Documentos */}
        <Fade in timeout={950}>
          <Box sx={{ mb: 2 }}>
            <MobileTabs
              options={statusTabs}
              activeTab={currentStatus}
              onChange={(tabId) => setCurrentStatus(tabId as VacationStatus)}
              corporateColor={corporateColor}
              variant="pills"
              searchProps={{
                searchTerm,
                onSearchChange: setSearchTerm,
                placeholder: 'Buscar solicitudes...',
                showFilter: true,
                onFilterClick: () => {
                  // Aquí podríamos abrir filtros extra; por ahora replicamos el comportamiento básico
                  console.log('Filtro de solicitudes clicado');
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
                    Solicitudes
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    {filteredRequests.length} solicitud{filteredRequests.length !== 1 ? 'es' : ''}
                    {currentStatus !== 'all' && (<>
                      {' '}• Estado: {getStatusText(currentStatus)}
                    </>)}
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
            onClick={() => setOpenDialog(true)}
            sx={{
              ...mobileContainedButtonSx,
              borderRadius: 3,
              px: 3,
              py: 1.5,
            }}
          >
            Nueva Solicitud
          </Button>
        </Box>

        {/* Modal Nueva Solicitud */}
        <ModernModal
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          title="Nueva Solicitud"
          subtitle="Completa los detalles de tu ausencia"
          icon={<CalendarToday />}
          headerColor={corporateColor}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Tipo de ausencia (píldoras) */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ color: corporateColor, minWidth: 130 }}>Tipo de ausencia</Typography>
              <Box
                sx={{
                  p: 0.5,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
                  border: '2px solid #e0e0e0',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <ToggleButtonGroup
                  value={newRequest.absenceType}
                  exclusive
                  onChange={(_, val) => {
                    if (!val) return;
                    setNewRequest(prev => ({
                      ...prev,
                      absenceType: val as AbsenceType,
                      reason: (val as AbsenceType) === 'PERSONAL' ? 'Asuntos propios' : 'Vacaciones',
                    }));
                  }}
                  size="small"
                  sx={{
                    '& .MuiToggleButtonGroup-grouped': {
                      border: 'none',
                      '&:not(:first-of-type)': { borderRadius: 3, marginLeft: '4px' },
                      '&:first-of-type': { borderRadius: 3 },
                    },
                    '& .MuiToggleButton-root': {
                      borderRadius: '20px !important',
                      px: 2,
                      py: 0.75,
                      textTransform: 'none',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      border: 'none !important',
                      minWidth: 90,
                      '&.Mui-selected': {
                        background: maroonGradient,
                        color: 'white',
                        boxShadow: '0 3px 8px rgba(80,27,54,0.3)'
                      },
                      '&:not(.Mui-selected)': {
                        color: corporateColor,
                        backgroundColor: 'rgba(255,255,255,0.85)',
                      },
                    },
                  }}
                >
                  <ToggleButton value="VACATION">Vacaciones</ToggleButton>
                  <ToggleButton value="PERSONAL">Asuntos propios</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>
            <FormControlLabel 
              control={
                <Checkbox 
                  checked={newRequest.oneDay}
                  onChange={(e) => setNewRequest(prev => ({
                    ...prev,
                    oneDay: e.target.checked,
                    endDate: e.target.checked ? (prev.startDate || prev.endDate) : prev.endDate,
                  }))}
                  sx={{ color: corporateColor, '&.Mui-checked': { color: corporateColor } }}
                />
              }
              label="Un solo día"
            />
            <ModernField
              label="Fecha inicio"
              type="date"
              value={newRequest.startDate}
              onChange={(value) => setNewRequest(prev => ({ ...prev, startDate: String(value), ...(prev.oneDay ? { endDate: String(value) } : {}) }))}
              fullWidth
              helperText="Selecciona la fecha de inicio"
              min={new Date().toISOString().split('T')[0]}
            />
            <ModernField
              label="Fecha fin"
              type="date"
              value={newRequest.endDate}
              onChange={(value) => setNewRequest(prev => ({ ...prev, endDate: String(value) }))}
              fullWidth
              helperText={newRequest.oneDay ? 'Se solicitará solo el día indicado' : 'Selecciona la fecha de fin'}
              min={newRequest.startDate || new Date().toISOString().split('T')[0]}
              disabled={newRequest.oneDay}
            />
            {/* Campo de motivo eliminado: lo fijamos automáticamente según el tipo seleccionado */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
              <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
              <Button
                variant="contained"
                disabled={submitting}
                onClick={async () => {
                  try {
                    // Validación mínima
                    if (!newRequest.startDate || !newRequest.endDate || !newRequest.reason.trim()) {
                      setSnackbar({ open: true, message: 'Completa todos los campos', severity: 'warning' });
                      return;
                    }
                    const start = new Date(newRequest.startDate);
                    const end = new Date(newRequest.endDate);

                    // Normalizar día actual sin horas
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    if (start < today) {
                      setSnackbar({ open: true, message: 'La fecha de inicio no puede ser anterior a hoy', severity: 'warning' });
                      return;
                    }

                    if (end < start) {
                      setSnackbar({ open: true, message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio', severity: 'warning' });
                      return;
                    }

                    // Validar solapamientos con solicitudes existentes (pendientes o aprobadas)
                    const hasOverlap = vacationRequests.some(r => {
                      if (r.status === 'rejected') return false;
                      const rStart = new Date(r.startDate);
                      const rEnd = new Date(r.endDate);
                      return rStart <= end && rEnd >= start;
                    });
                    if (hasOverlap) {
                      setSnackbar({ open: true, message: 'Ya existe una solicitud de vacaciones en ese período', severity: 'warning' });
                      return;
                    }

                    setSubmitting(true);

                    // Llamada a API
                    await vacationService.createVacationRequest({
                      start_date: start,
                      end_date: end,
                      reason: newRequest.reason.trim(),
                      absence_type: newRequest.absenceType,
                    });

                    // Refrescar lista desde el backend para asegurar consistencia
                    await loadVacationRequests();

                    setOpenDialog(false);
                    setNewRequest({ startDate: '', endDate: '', reason: 'Vacaciones', oneDay: false, absenceType: 'VACATION' });
                    setSnackbar({ open: true, message: 'Solicitud enviada', severity: 'success' });
                  } catch (error: any) {
                    console.error('Error creando solicitud:', error);
                    const backendDetail = error?.response?.data?.detail;
                    setSnackbar({ open: true, message: backendDetail || 'Error al crear la solicitud', severity: 'error' });
                  } finally {
                    setSubmitting(false);
                  }
                }}
                sx={mobileContainedButtonSx}
              >
                {submitting ? 'Enviando…' : 'Enviar'}
              </Button>
            </Box>
          </Box>
        </ModernModal>

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
