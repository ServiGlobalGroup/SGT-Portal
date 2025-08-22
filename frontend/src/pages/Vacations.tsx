import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton,
  Menu,
  Fade,
  GlobalStyles,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Badge,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  EventNote,
  Add,
  CalendarToday,
  CheckCircle,
  Cancel,
  HourglassEmpty,
  Pending,
  Business,
  Schedule,
  MoreVert,
  Search,
  Refresh,
  EditCalendar,
  BeachAccess,
  DateRange,
  ViewList,
  CalendarMonth,
  ChevronLeft,
  ChevronRight,
  NotificationsNone,
  Check,
  Close,
  Delete,
} from '@mui/icons-material';
import { Calendar, momentLocalizer, Event, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { ModernModal, ModernButton } from '../components/ModernModal';
import { ModernField, InfoCard, StatusChip } from '../components/ModernFormComponents';
import { PaginationComponent } from '../components/PaginationComponent';
import { usePagination } from '../hooks/usePagination';
import { vacationService } from '../services/vacationService';
import type { VacationRequestCreate } from '../types/vacation';
import { useAuth } from '../hooks/useAuth';
import { useDeviceType } from '../hooks/useDeviceType';
import { MobileVacations } from './mobile/MobileVacations';

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
}

interface CalendarEvent extends Event {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource?: {
    type: 'vacation' | 'pending' | 'rejected';
    employeeName: string;
    reason: string;
    status: string;
  };
}

// Configurar moment en español
// Asegurar que la semana comienza en lunes (dow:1) y locale español completo
moment.locale('es');
moment.updateLocale('es', { week: { dow: 1, doy: 4 } });
const localizer = momentLocalizer(moment);

// Función para formatear mes en español con primera letra mayúscula
const formatMonthYear = (date: Date) => {
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
};

export const Vacations: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || '';
  const isAdminRole = role === 'ADMINISTRADOR' || role === 'MASTER_ADMIN';
  const isRestrictedRole = role === 'TRABAJADOR' || role === 'TRAFICO';
  const { useMobileVersion } = useDeviceType();

  // Versión móvil optimizada
  if (useMobileVersion) {
    return <MobileVacations />;
  }
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRequest, setSelectedRequest] = useState<VacationRequest | null>(null);

  // Estados para el calendario
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('table');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayVacations, setSelectedDayVacations] = useState<VacationRequest[]>([]);
  const [dayDetailModal, setDayDetailModal] = useState(false);

  // Estados para las notificaciones
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Estados para el formulario
  const [openDialog, setOpenDialog] = useState(false);
  const [newRequest, setNewRequest] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });

  // Estilos comunes para botones granate/burdeos
  const maroonGradient = 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 70%, #501b36 100%)';
  const maroonGradientHover = 'linear-gradient(135deg, #3d1429 0%, #5a1d3a 30%, #6b2545 70%, #3d1429 100%)';
  const commonContainedButtonSx = {
    borderRadius: '20px',
    px: 2.5,
    py: 1,
    textTransform: 'none' as const,
    fontSize: '0.8rem',
    fontWeight: 700,
    minWidth: 90,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
    background: maroonGradient,
    color: 'white',
    boxShadow: '0 4px 12px rgba(80,27,54,0.3), 0 2px 4px rgba(80,27,54,0.2)',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, rgba(80,27,54,0.1) 0%, rgba(80,27,54,0.05) 100%)',
      opacity: 0,
      transition: 'opacity 0.3s ease',
    },
    '&:hover': {
      background: maroonGradientHover,
      boxShadow: '0 6px 16px rgba(80,27,54,0.4), 0 2px 8px rgba(80,27,54,0.3)',
      transform: 'translateY(-1px)',
    },
    '&:hover::before': {
      opacity: 1,
    },
    '&.Mui-disabled': {
      background: maroonGradient,
      opacity: 0.6,
      color: 'white',
    },
  } as const;

  // Estados para filtros
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  // Alcance de lista para administradores: 'mine' (propias) | 'all' (todas)
  const [scope, setScope] = useState<'mine' | 'all'>('mine');

  // Estados para administradores (simulado como false para usuarios normales)
  const isAdmin = isAdminRole;
  const [error, setError] = useState<string | null>(null);

  // Función para cargar las solicitudes desde el API
  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const useAll = isAdminRole && scope === 'all';
      const params = !useAll && user?.id ? { user_id: user.id } : undefined;
      const data = await vacationService.getVacationRequests(params);
      // Convertir el formato de la API al formato local
      const convertedRequests: VacationRequest[] = data.map((apiRequest: any) => ({
        id: apiRequest.id,
        employeeName: apiRequest.employee_name || 'Usuario',
        startDate: apiRequest.start_date.toISOString().split('T')[0],
        endDate: apiRequest.end_date.toISOString().split('T')[0],
        reason: apiRequest.reason,
        status: apiRequest.status,
        days: apiRequest.duration_days,
        requestDate: apiRequest.created_at ? apiRequest.created_at.toISOString().split('T')[0] : '',
        approvedBy: apiRequest.reviewer_name || '',
        approvedDate: apiRequest.reviewed_at ? apiRequest.reviewed_at.toISOString().split('T')[0] : '',
        comments: apiRequest.admin_response || ''
      }));
      setRequests(convertedRequests);
    } catch (err) {
      console.error('Error loading vacation requests:', err);
      setError('Error al cargar las solicitudes de vacaciones');
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, user?.id, isAdminRole]);

  // Para administradores: si el alcance es 'mine', forzar vista tabla y ocultar controles de calendario/notificaciones
  useEffect(() => {
    if (isAdminRole && scope === 'mine' && viewMode !== 'table') {
      setViewMode('table');
    }
  }, [isAdminRole, scope, viewMode]);

  // Forzar vista 'tabla' para roles restringidos
  useEffect(() => {
    if (isRestrictedRole && viewMode !== 'table') {
      setViewMode('table');
    }
  }, [isRestrictedRole, viewMode]);

  // Funciones para navegar en el calendario
  const handleNavigate = (date: Date) => {
    setCurrentDate(date);
  };

  const navigateToMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Funciones para las notificaciones
  const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
    setNotificationOpen(true);
    // Activar animación de campanita
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 600); // Duración de la animación
  };

  const handleNotificationClose = () => {
    setNotificationOpen(false);
    setNotificationAnchor(null);
  };

  // Funciones para aceptar/rechazar rápido desde notificaciones
  const handleQuickApprove = async (requestId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      setLoading(true);
      await vacationService.updateVacationStatus(requestId, 'approved');
      setRequests(prev => 
        prev.map(req => 
          req.id === requestId 
            ? { ...req, status: 'approved' as const, approvedDate: new Date().toISOString().split('T')[0] }
            : req
        )
      );
      setAlert({
        type: 'success',
        message: 'Solicitud aprobada exitosamente'
      });
    } catch (error: any) {
      console.error('Error approving vacation request:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.detail || 'Error al aprobar la solicitud'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReject = async (requestId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      setLoading(true);
      await vacationService.updateVacationStatus(requestId, 'rejected');
      setRequests(prev => 
        prev.map(req => 
          req.id === requestId 
            ? { ...req, status: 'rejected' as const }
            : req
        )
      );
      setAlert({
        type: 'success',
        message: 'Solicitud rechazada'
      });
    } catch (error: any) {
      console.error('Error rejecting vacation request:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.detail || 'Error al rechazar la solicitud'
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para eliminar solicitud
  const handleDeleteRequest = async (requestId: number) => {
    try {
      setLoading(true);
      await vacationService.deleteVacationRequest(requestId);
      setRequests(prev => prev.filter(req => req.id !== requestId));
      setAlert({
        type: 'success',
        message: 'Solicitud eliminada correctamente'
      });
    } catch (error: any) {
      console.error('Error deleting vacation request:', error);
      setAlert({
        type: 'error',
        message: error?.response?.data?.detail || 'Error al eliminar la solicitud'
      });
    } finally {
      setLoading(false);
    }
  };

  // Obtener solicitudes pendientes para notificaciones
  const pendingRequests = useMemo(() => {
    return requests.filter(request => request.status === 'pending');
  }, [requests]);

  // Convertir requests a eventos del calendario
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return requests
      .filter(request => {
        const st = String(request.status || '').toLowerCase().trim();
        return st === 'pending' || st === 'approved';
      })
      .map(request => {
        const st = String(request.status || '').toLowerCase().trim() as 'pending' | 'approved';
        // react-big-calendar interpreta end como exclusivo, por eso el último día no se mostraba.
        const start = new Date(request.startDate);
        const endInclusive = new Date(request.endDate);
        endInclusive.setDate(endInclusive.getDate() + 1); // incluir el último día visualmente
        return ({
          id: request.id,
          title: `${request.employeeName} - ${request.reason}`,
          start,
          end: endInclusive,
          resource: {
            type: st === 'approved' ? 'vacation' : 'pending',
            employeeName: request.employeeName,
            reason: request.reason,
            status: st,
          }
        });
      });
  }, [requests]);

  // Auto-hide alert
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Estilos personalizados para los eventos del calendario
  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#501b36';
    let borderColor = '#501b36';
    let color = 'white';

    // Salvaguarda: ocultar cualquier evento rechazado
    const st = String(event.resource?.status || '').toLowerCase().trim();
    if (st === 'rejected') {
      return {
        style: {
          display: 'none',
        },
      };
    }

    if (event.resource) {
      switch (event.resource.status) {
        case 'approved':
          backgroundColor = '#4caf50';
          borderColor = '#388e3c';
          break;
        case 'pending':
          backgroundColor = '#ff9800';
          borderColor = '#f57c00';
          break;
        case 'rejected':
          backgroundColor = '#f44336';
          borderColor = '#d32f2f';
          break;
      }
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        color,
        border: `2px solid ${borderColor}`,
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: 600,
        padding: '2px 6px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    };
  };

  // Componente personalizado para eventos
  const CustomEvent = ({ event }: { event: CalendarEvent }) => (
    <Tooltip
      title={
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {event.resource?.employeeName}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Motivo:</strong> {event.resource?.reason}
          </Typography>
          <Typography variant="body2">
            <strong>Estado:</strong> {
              event.resource?.status === 'approved' ? 'Aprobado' :
              event.resource?.status === 'pending' ? 'Pendiente' : 'Rechazado'
            }
          </Typography>
        </Box>
      }
      arrow
    >
      <Box sx={{ height: '100%', width: '100%' }}>
        <Typography variant="caption" sx={{ 
          fontSize: '0.7rem', 
          fontWeight: 600,
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {event.resource?.employeeName}
        </Typography>
        <Typography variant="caption" sx={{ 
          fontSize: '0.65rem', 
          opacity: 0.9,
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {event.resource?.reason}
        </Typography>
      </Box>
    </Tooltip>
  );

  // Funciones auxiliares
  const calculateDays = (start: string, end: string): number => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // +1 para incluir el día de inicio
  };

  const formatDate = (dateString: string): string => {
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

  // Handlers
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, request: VacationRequest) => {
    setAnchorEl(event.currentTarget);
    setSelectedRequest(request);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedRequest(null);
  };

  const handleSubmitRequest = async () => {
    if (!newRequest.startDate || !newRequest.endDate || !newRequest.reason.trim()) {
      setAlert({ type: 'error', message: 'Por favor completa todos los campos' });
      return;
    }

    console.log('Valores del formulario:', {
      startDate_string: newRequest.startDate,
      endDate_string: newRequest.endDate,
      reason: newRequest.reason
    });

    const startDate = new Date(newRequest.startDate);
    const endDate = new Date(newRequest.endDate);
    
    console.log('Fechas convertidas a Date objects:', {
      startDate_obj: startDate,
      endDate_obj: endDate,
      startDate_iso: startDate.toISOString(),
      endDate_iso: endDate.toISOString()
    });
    
    if (startDate >= endDate) {
      setAlert({ type: 'error', message: `La fecha de fin (${newRequest.endDate}) debe ser posterior a la fecha de inicio (${newRequest.startDate})` });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate < today) {
      setAlert({ type: 'error', message: 'La fecha de inicio no puede ser anterior a hoy' });
      return;
    }

    try {
      setLoading(true);
      
      // Debug: Verificar las fechas antes de enviar
      console.log('Frontend enviando:', {
        newRequest_startDate: newRequest.startDate,
        newRequest_endDate: newRequest.endDate,
        startDate_obj: startDate,
        endDate_obj: endDate
      });
      
      const requestData: VacationRequestCreate = {
        start_date: startDate,
        end_date: endDate,
        reason: newRequest.reason.trim()
      };

      const createdRequest = await vacationService.createVacationRequest(requestData);
      
      // Convertir la respuesta del API al formato local
      const newLocalRequest: VacationRequest = {
        id: createdRequest.id!,
        employeeName: createdRequest.employee_name || 'Usuario Actual',
        startDate: createdRequest.start_date.toISOString().split('T')[0],
        endDate: createdRequest.end_date.toISOString().split('T')[0],
        reason: createdRequest.reason,
        status: createdRequest.status,
        days: createdRequest.duration_days ?? calculateDays(
          createdRequest.start_date.toISOString().split('T')[0],
          createdRequest.end_date.toISOString().split('T')[0]
        ),
        requestDate: createdRequest.created_at ? createdRequest.created_at.toISOString().split('T')[0] : '',
        approvedBy: createdRequest.reviewer_name || '',
        approvedDate: createdRequest.reviewed_at ? createdRequest.reviewed_at.toISOString().split('T')[0] : '',
        comments: createdRequest.admin_response || ''
      };

      setRequests(prev => [newLocalRequest, ...prev]);
      setOpenDialog(false);
      setNewRequest({ startDate: '', endDate: '', reason: '' });
      setAlert({ type: 'success', message: 'Solicitud de vacaciones enviada exitosamente' });
    } catch (error: any) {
      console.error('Error creating vacation request:', error);
      setAlert({ 
        type: 'error', 
        message: error.response?.data?.detail || 'Error al enviar la solicitud de vacaciones'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: 'approved' | 'rejected', comments?: string) => {
    try {
      setLoading(true);
      await vacationService.updateVacationStatus(id, status, comments);
      
      setRequests(prev => prev.map(req => 
        req.id === id 
          ? { 
              ...req, 
              status, 
              approvedBy: 'Admin',
              approvedDate: new Date().toISOString().split('T')[0],
              comments: comments || req.comments
            }
          : req
      ));
      setAlert({ 
        type: 'success', 
        message: `Solicitud ${status === 'approved' ? 'aprobada' : 'rechazada'} exitosamente` 
      });
    } catch (error: any) {
      console.error('Error updating vacation status:', error);
      setAlert({ 
        type: 'error', 
        message: error.response?.data?.detail || 'Error al actualizar el estado de la solicitud'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar solicitudes
  const filteredRequests = requests.filter(req => {
    const matchesStatus = filterStatus === 'all' ? true : req.status === filterStatus;
    const matchesSearch = req.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         req.reason.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Paginación para la tabla de solicitudes
  const pagination = usePagination({
    data: filteredRequests,
    initialItemsPerPage: 10,
    initialPage: 1
  });

  // Resetear paginación cuando cambian los filtros
  React.useEffect(() => {
    pagination.setCurrentPage(1);
  }, [searchTerm, filterStatus, pagination.setCurrentPage]);

  // Funciones para el calendario
  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    // Buscar vacaciones (solo pendientes/aprobadas) para el día seleccionado
    const selectedDay = slotInfo.start;
    const dayVacations = filteredRequests.filter(req => {
      const st = String(req.status || '').toLowerCase().trim();
      if (st !== 'pending' && st !== 'approved') return false;
      const startDate = new Date(req.startDate);
  const endDate = new Date(req.endDate);
  // Incluir día final (endDate inclusive)
  endDate.setHours(23,59,59,999);
  return selectedDay >= startDate && selectedDay <= endDate;
    });
    
    if (dayVacations.length > 0) {
      setSelectedDayVacations(dayVacations);
      setDayDetailModal(true);
    }
  };

  const getDayVacationUsers = (date: Date) => {
    // Solo mostrar pendientes/aprobadas en los chips del calendario
    return filteredRequests.filter(req => {
      const st = String(req.status || '').toLowerCase().trim();
      if (st !== 'pending' && st !== 'approved') return false;
      const startDate = new Date(req.startDate);
  const endDate = new Date(req.endDate);
  endDate.setHours(23,59,59,999); // asegurar inclusión del último día
  return date >= startDate && date <= endDate;
    });
  };

  // Componente personalizado para mostrar los días con indicadores
  const CustomDateHeader = ({ date, label }: { date: Date; label: string }) => {
    const vacationUsers = getDayVacationUsers(date);
    const isToday = moment(date).isSame(moment(), 'day');
    
    return (
      <Box sx={{ 
        position: 'relative', 
        height: '100%', 
        width: '100%',
        p: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: isToday ? 700 : 500,
            color: isToday ? '#501b36' : 'inherit',
            fontSize: '0.875rem',
            textAlign: 'center',
            mb: 1,
            flexShrink: 0
          }}
        >
          {label}
        </Typography>
        
        {vacationUsers.length > 0 && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 0.25,
            maxHeight: 80,
            minHeight: 0,
            overflow: 'hidden',
            flex: 1
          }}>
            {vacationUsers.slice(0, 3).map((user) => (
              <Chip
                key={user.id}
                label={user.employeeName.split(' ')[0]} // Solo el primer nombre
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  bgcolor: user.status === 'approved' ? '#4caf50' : 
                          user.status === 'pending' ? '#ff9800' : '#f44336',
                  color: 'white',
                  flexShrink: 0,
                  '& .MuiChip-label': {
                    px: 0.5,
                  },
                  cursor: 'pointer',
                  '&:hover': {
                    opacity: 0.8,
                  }
                }}
              />
            ))}
            {vacationUsers.length > 3 && (
              <Typography 
                variant="caption" 
                sx={{ 
                  fontSize: '0.6rem',
                  color: '#501b36',
                  fontWeight: 600,
                  textAlign: 'center',
                  mt: 0.25,
                  flexShrink: 0
                }}
              >
                +{vacationUsers.length - 3} más
              </Typography>
            )}
          </Box>
        )}
      </Box>
    );
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: 2,
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <BeachAccess sx={{ fontSize: 32 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Mis Vacaciones
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
                      Gestiona tus solicitudes de vacaciones de forma eficiente
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

        {/* Error de conexión */}
        {error && (
          <Fade in timeout={400}>
            <Alert 
              severity="warning" 
              sx={{ 
                mb: 3,
                borderRadius: 2,
                '& .MuiAlert-icon': {
                  fontSize: 24
                }
              }} 
              onClose={() => setError(null)}
            >
              {error}
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
                gap: 3, 
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap'
              }}>
              {/* Lado izquierdo: Filtros (solo en vista tabla) */}
              <Box sx={{ 
                display: 'flex',
                gap: 2,
                alignItems: 'center',
                flex: 1,
                minWidth: { xs: '100%', md: 'auto' }
              }}>
                {viewMode === 'table' && (
                  <>
                    <TextField
                      placeholder="Buscar solicitudes por empleado o motivo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                      sx={{ 
                        flex: 1,
                        maxWidth: 350,
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
                    
                    <FormControl size="small" sx={{ minWidth: 150 }}>
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
                          '& .MuiSelect-select:focus': {
                            backgroundColor: 'transparent',
                          },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              borderRadius: 2,
                              mt: 0.5,
                              '& .MuiMenuItem-root': {
                                '&:hover': {
                                  backgroundColor: alpha('#501b36', 0.08),
                                  color: '#501b36',
                                },
                                '&.Mui-selected': {
                                  backgroundColor: alpha('#501b36', 0.12),
                                  color: '#501b36',
                                  '&:hover': {
                                    backgroundColor: alpha('#501b36', 0.16),
                                  },
                                },
                              },
                            },
                          },
                        }}
                      >
                        <MenuItem value="all">Todas</MenuItem>
                        <MenuItem value="pending">Pendientes</MenuItem>
                        <MenuItem value="approved">Aprobadas</MenuItem>
                        <MenuItem value="rejected">Rechazadas</MenuItem>
                      </Select>
                    </FormControl>
                  </>
                )}

                {isAdminRole && (
                  <Box
                    sx={{
                      p: 0.5,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
                      border: '2px solid #e0e0e0',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
                      display: 'inline-block',
                    }}
                  >
                    <ToggleButtonGroup
                      value={scope}
                      exclusive
                      onChange={(_, val) => {
                        if (val) setScope(val);
                      }}
                      size="small"
                      sx={{
                        '& .MuiToggleButtonGroup-grouped': {
                          border: 'none',
                          '&:not(:first-of-type)': {
                            borderRadius: 3,
                            marginLeft: '4px',
                          },
                          '&:first-of-type': {
                            borderRadius: 3,
                          },
                        },
                        '& .MuiToggleButton-root': {
                          borderRadius: '20px !important',
                          px: 2.5,
                          py: 1,
                          textTransform: 'none',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          border: 'none !important',
                          minWidth: 90,
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          position: 'relative',
                          overflow: 'hidden',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(135deg, rgba(80,27,54,0.1) 0%, rgba(80,27,54,0.05) 100%)',
                            opacity: 0,
                            transition: 'opacity 0.3s ease',
                          },
                          '&:hover::before': {
                            opacity: 1,
                          },
                          '&.Mui-selected': {
                            background: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 70%, #501b36 100%)',
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(80,27,54,0.3), 0 2px 4px rgba(80,27,54,0.2)',
                            transform: 'translateY(-1px)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #3d1429 0%, #5a1d3a 30%, #6b2545 70%, #3d1429 100%)',
                              boxShadow: '0 6px 16px rgba(80,27,54,0.4), 0 2px 8px rgba(80,27,54,0.3)',
                            },
                            '&::before': {
                              opacity: 0,
                            },
                          },
                          '&:not(.Mui-selected)': {
                            color: '#501b36',
                            backgroundColor: 'rgba(255,255,255,0.8)',
                            backdropFilter: 'blur(10px)',
                            '&:hover': {
                              backgroundColor: 'rgba(255,255,255,0.95)',
                              transform: 'translateY(-0.5px)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            },
                          },
                        },
                      }}
                    >
                      <ToggleButton value="mine">Mías</ToggleButton>
                      <ToggleButton value="all">Todas</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                )}
              </Box>

              {/* Lado derecho: Controles principales - siempre visibles */}
              <Box sx={{ 
                display: 'flex', 
                gap: 2, 
                alignItems: 'center',
                flexShrink: 0
              }}>
                {/* Icono de notificaciones */}
                {isAdminRole && scope === 'all' && (
                  <Tooltip title="Notificaciones">
                    <Box 
                      onClick={handleNotificationClick}
                      sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        p: 0,
                      }}
                    >
                      <Badge 
                        badgeContent={pendingRequests.length > 0 ? ' ' : 0}
                        color="error"
                        variant="dot"
                        sx={{
                          '& .MuiBadge-badge': {
                            backgroundColor: '#d32f2f',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            top: '8px',
                            right: '8px',
                            minWidth: 'unset',
                          }
                        }}
                      >
                        <NotificationsNone 
                          fontSize="large" 
                          sx={{ 
                            color: '#501b36',
                            '&:hover': {
                              color: '#3d1429',
                            },
                            transition: 'color 0.2s ease-in-out',
                            animation: isAnimating ? 'bellRing 0.6s ease-in-out' : 'none',
                            '@keyframes bellRing': {
                              '0%': { transform: 'rotate(0deg)' },
                              '10%': { transform: 'rotate(10deg)' },
                              '20%': { transform: 'rotate(-8deg)' },
                              '30%': { transform: 'rotate(10deg)' },
                              '40%': { transform: 'rotate(-8deg)' },
                              '50%': { transform: 'rotate(6deg)' },
                              '60%': { transform: 'rotate(-4deg)' },
                              '70%': { transform: 'rotate(2deg)' },
                              '80%': { transform: 'rotate(-1deg)' },
                              '90%': { transform: 'rotate(0deg)' },
                              '100%': { transform: 'rotate(0deg)' },
                            },
                          }} 
                        />
                      </Badge>
                    </Box>
                  </Tooltip>
                )}
                
                {/* Toggle Vista Calendar/Table mejorado */}
                {isAdminRole && scope === 'all' && (
                  <Box
                    sx={{
                      p: 0.5,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
                      border: '2px solid #e0e0e0',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
                      display: 'inline-block',
                    }}
                  >
                    <ToggleButtonGroup
                      value={viewMode}
                      exclusive
                      onChange={(_, newView) => {
                        if (newView !== null) {
                          setViewMode(newView);
                        }
                      }}
                      size="small"
                      sx={{
                        '& .MuiToggleButtonGroup-grouped': {
                          border: 'none',
                          '&:not(:first-of-type)': {
                            borderRadius: 3,
                            marginLeft: '4px',
                          },
                          '&:first-of-type': {
                            borderRadius: 3,
                          },
                        },
                        '& .MuiToggleButton-root': {
                          borderRadius: '20px !important',
                          px: 2.5,
                          py: 1,
                          textTransform: 'none',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          border: 'none !important',
                          minWidth: 90,
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          position: 'relative',
                          overflow: 'hidden',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(135deg, rgba(80,27,54,0.1) 0%, rgba(80,27,54,0.05) 100%)',
                            opacity: 0,
                            transition: 'opacity 0.3s ease',
                          },
                          '&:hover::before': {
                            opacity: 1,
                          },
                          '&.Mui-selected': {
                            background: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 70%, #501b36 100%)',
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(80,27,54,0.3), 0 2px 4px rgba(80,27,54,0.2)',
                            transform: 'translateY(-1px)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #3d1429 0%, #5a1d3a 30%, #6b2545 70%, #3d1429 100%)',
                              boxShadow: '0 6px 16px rgba(80,27,54,0.4), 0 2px 8px rgba(80,27,54,0.3)',
                            },
                            '&::before': {
                              opacity: 0,
                            },
                          },
                          '&:not(.Mui-selected)': {
                            color: '#501b36',
                            backgroundColor: 'rgba(255,255,255,0.8)',
                            backdropFilter: 'blur(10px)',
                            '&:hover': {
                              backgroundColor: 'rgba(255,255,255,0.95)',
                              transform: 'translateY(-0.5px)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            },
                          },
                        },
                      }}
                    >
                      <ToggleButton value="table">
                        <ViewList sx={{ mr: 0.5, fontSize: 18 }} />
                        Lista
                      </ToggleButton>
                      <ToggleButton value="calendar">
                        <CalendarMonth sx={{ mr: 0.5, fontSize: 18 }} />
                        Calendario
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                )}
                
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={loadRequests}
                  disabled={loading}
                  sx={commonContainedButtonSx}
                >
                  {loading ? 'Actualizando...' : 'Actualizar'}
                </Button>

                {(!isAdminRole || scope === 'mine') && (
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setOpenDialog(true)}
                    sx={commonContainedButtonSx}
                  >
                    Nueva Solicitud
                  </Button>
                )}
              </Box>
            </Box>
          </Paper>
        </Fade>

        {/* Menú de Notificaciones */}
        {isAdminRole && scope === 'all' && (
        <Menu
          anchorEl={notificationAnchor}
          open={notificationOpen}
          onClose={handleNotificationClose}
          PaperProps={{
            sx: {
              borderRadius: 2,
              mt: 1,
              minWidth: 350,
              maxWidth: 400,
              maxHeight: 400,
              overflow: 'auto',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              border: '1px solid rgba(0,0,0,0.08)',
            },
          }}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#501b36' }}>
                Notificaciones
              </Typography>
              <Chip 
                label={`${pendingRequests.length} pendiente${pendingRequests.length !== 1 ? 's' : ''}`}
                size="small"
                sx={{ 
                  bgcolor: alpha('#501b36', 0.1),
                  color: '#501b36',
                  fontWeight: 600
                }}
              />
            </Box>
            
            {pendingRequests.length === 0 ? (
              <Box sx={{ 
                py: 3, 
                textAlign: 'center',
                color: 'text.secondary'
              }}>
                <NotificationsNone sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                <Typography variant="body2">
                  No hay solicitudes pendientes
                </Typography>
              </Box>
            ) : (
              <Box sx={{ maxHeight: 280, overflow: 'auto' }}>
                {pendingRequests.map((request) => (
                  <Box
                    key={request.id}
                    sx={{
                      p: 1.5,
                      mb: 0.75,
                      borderRadius: 1.5,
                      bgcolor: alpha('#fff4e6', 0.5),
                      border: '1px solid',
                      borderColor: alpha('#ff9800', 0.2),
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: alpha('#fff4e6', 0.8),
                        borderColor: alpha('#ff9800', 0.4),
                      },
                      '&:last-child': {
                        mb: 0
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ 
                          fontWeight: 600, 
                          color: '#501b36', 
                          mb: 0.25,
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {request.employeeName}
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          color: 'text.secondary', 
                          display: 'block',
                          fontSize: '0.75rem',
                          lineHeight: 1.2
                        }}>
                          {new Date(request.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - {new Date(request.endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} • {request.days} día{request.days !== 1 ? 's' : ''}
                        </Typography>
                        {/* Preview ligera del motivo */}
                        {request.reason && (
                          <Typography
                            variant="caption"
                            title={request.reason}
                            noWrap
                            sx={{
                              color: 'text.secondary',
                              display: 'block',
                              fontSize: '0.75rem',
                              lineHeight: 1.2,
                              mt: 0.25,
                              opacity: 0.9,
                              maxWidth: '100%'
                            }}
                          >
                            {request.reason}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
                        <Chip 
                          label="PENDIENTE" 
                          size="small" 
                          sx={{ 
                            height: 20,
                            fontSize: '0.6rem',
                            fontWeight: 600,
                            bgcolor: alpha('#ff9800', 0.15),
                            color: '#f57c00',
                            border: 'none',
                            '& .MuiChip-label': {
                              px: 0.75,
                            }
                          }} 
                        />
                      </Box>
                    </Box>
                    
                    {/* Botones de acción rápida */}
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <IconButton
                        size="small"
                        onClick={(e) => handleQuickReject(request.id, e)}
                        sx={{
                          width: 28,
                          height: 28,
                          bgcolor: alpha('#f44336', 0.1),
                          color: '#f44336',
                          '&:hover': {
                            bgcolor: alpha('#f44336', 0.2),
                          },
                        }}
                      >
                        <Close sx={{ fontSize: 14 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => handleQuickApprove(request.id, e)}
                        sx={{
                          width: 28,
                          height: 28,
                          bgcolor: alpha('#4caf50', 0.1),
                          color: '#4caf50',
                          '&:hover': {
                            bgcolor: alpha('#4caf50', 0.2),
                          },
                        }}
                      >
                        <Check sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
  </Menu>
  )}

        {/* Contenido Principal */}
        {viewMode === 'calendar' ? (
          // Vista Calendario
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
              {/* Header del calendario */}
              <Box sx={{ 
                p: 3, 
                borderBottom: 1, 
                borderColor: 'divider',
                background: alpha('#501b36', 0.02),
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 280 }}>
                    <CalendarMonth sx={{ color: '#501b36', fontSize: 28 }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#501b36' }}>
                        Calendario de Vacaciones
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {filteredRequests.length} solicitud{filteredRequests.length !== 1 ? 'es' : ''} encontrada{filteredRequests.length !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Controles de navegación del calendario */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton 
                        onClick={() => navigateToMonth('prev')}
                        sx={{ 
                          bgcolor: alpha('#501b36', 0.08),
                          color: '#501b36',
                          '&:hover': { bgcolor: alpha('#501b36', 0.12) },
                          borderRadius: '12px',
                          width: 40,
                          height: 40,
                        }}
                      >
                        <ChevronLeft />
                      </IconButton>
                      
                      <Button
                        onClick={goToToday}
                        variant="contained"
                        size="small"
                        sx={{ ...commonContainedButtonSx, height: 40, borderRadius: '12px' }}
                      >
                        Hoy
                      </Button>
                      
                      <IconButton 
                        onClick={() => navigateToMonth('next')}
                        sx={{ 
                          bgcolor: alpha('#501b36', 0.08),
                          color: '#501b36',
                          '&:hover': { bgcolor: alpha('#501b36', 0.12) },
                          borderRadius: '12px',
                          width: 40,
                          height: 40,
                        }}
                      >
                        <ChevronRight />
                      </IconButton>
                    </Box>
                    
                    <Typography variant="h6" sx={{ 
                      fontWeight: 600, 
                      color: '#501b36',
                      minWidth: 180,
                      textAlign: 'center',
                      ml: 1,
                    }}>
                      {formatMonthYear(currentDate)}
                    </Typography>
                  </Box>
              </Box>

              {/* Calendario */}
              <Box sx={{ p: 3 }}>
                <GlobalStyles
                  styles={{
                    '.rbc-calendar': {
                      fontFamily: '"Roboto","Helvetica","Arial",sans-serif !important',
                    },
                    '.rbc-month-view': {
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      overflow: 'hidden',
                    },
                    '.rbc-header': {
                      backgroundColor: alpha('#501b36', 0.05) + ' !important',
                      borderBottom: '1px solid #e0e0e0 !important',
                      fontWeight: '700 !important',
                      fontSize: '0.875rem !important',
                      color: '#501b36 !important',
                      padding: '12px 8px !important',
                    },
                    '.rbc-date-cell': {
                      padding: '4px !important',
                      borderRight: '1px solid #e0e0e0 !important',
                      borderBottom: '1px solid #e0e0e0 !important',
                      height: '125px !important',
                      minHeight: '125px !important',
                      maxHeight: '125px !important',
                      cursor: 'pointer !important',
                      transition: 'background-color 0.2s ease !important',
                      position: 'relative !important',
                      overflow: 'hidden !important',
                      boxSizing: 'border-box !important',
                    },
                    '.rbc-date-cell:hover': {
                      backgroundColor: alpha('#501b36', 0.04) + ' !important',
                    },
                    '.rbc-today': {
                      backgroundColor: alpha('#501b36', 0.15) + ' !important',
                    },
                    '.rbc-toolbar': {
                      display: 'none !important', // Ocultamos completamente la toolbar nativa
                    },
                    '.rbc-event': {
                      display: 'none !important', // Ocultamos los eventos porque ya mostramos los chips
                    },
                    '.rbc-show-more': {
                      color: '#501b36 !important',
                      fontWeight: '600 !important',
                      fontSize: '0.75rem !important',
                      backgroundColor: alpha('#501b36', 0.1) + ' !important',
                      borderRadius: '4px !important',
                      padding: '2px 6px !important',
                      margin: '2px 1px !important',
                    },
                    '.rbc-date-cell button': {
                      color: '#333 !important',
                      fontWeight: '500 !important',
                      fontSize: '0.875rem !important',
                      padding: '4px 8px !important',
                      borderRadius: '4px !important',
                      border: 'none !important',
                      backgroundColor: 'transparent !important',
                      width: 'auto !important',
                      height: 'auto !important',
                      lineHeight: '1.2 !important',
                    },
                    '.rbc-date-cell .rbc-button-link:hover': {
                      backgroundColor: alpha('#501b36', 0.08) + ' !important',
                    },
                    '.rbc-off-range-bg': {
                      backgroundColor: '#f9f9f9 !important',
                    },
                    '.rbc-off-range .rbc-button-link': {
                      color: '#bbb !important',
                    },
                    '.rbc-month-header': {
                      overflow: 'visible !important',
                    },
                    '.rbc-button-link': {
                      display: 'block !important',
                      width: '100% !important',
                      textAlign: 'left !important',
                      padding: '4px 0 !important',
                      borderRadius: '4px !important',
                      position: 'relative !important',
                    },
                    '.rbc-row-content': {
                      height: '100% !important',
                      overflow: 'hidden !important',
                    },
                    '.rbc-date-cell > div': {
                      height: '100% !important',
                      overflow: 'hidden !important',
                      boxSizing: 'border-box !important',
                    },
                  }}
                />
                <Calendar
                  localizer={localizer}
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: 750 }}
                  view={Views.MONTH}
                  date={currentDate}
                  onNavigate={handleNavigate}
                  toolbar={false}
                  onSelectSlot={handleSelectSlot}
                  selectable
                  eventPropGetter={eventStyleGetter}
                  components={{
                    event: CustomEvent,
                    month: {
                      dateHeader: CustomDateHeader,
                    },
                  }}
                  culture="es"
                  formats={{
                    monthHeaderFormat: (date) => moment(date).locale('es').format('MMMM YYYY'),
                    // Encabezados de días: usar abreviaturas españolas consistentes
                    // Opciones habituales: ["L", "M", "X", "J", "V", "S", "D"] o ["Lu","Ma","Mi","Ju","Vi","Sa","Do"]
                    // Elegimos 2 letras (segunda en minúscula salvo X) para claridad visual.
                    weekdayFormat: (date) => {
                      const map = ['Lu','Ma','Mi','Ju','Vi','Sa','Do'];
                      const day = moment(date).isoWeekday(); // 1..7
                      return map[day-1];
                    },
                    dayFormat: (date) => moment(date).locale('es').format('D'),
                  }}
                  messages={{
                    date: 'Fecha',
                    time: 'Hora',
                    event: 'Evento',
                    allDay: 'Todo el día',
                    noEventsInRange: 'No hay eventos en este rango',
                    showMore: (total) => `+${total} más`,
                  }}
                />
              </Box>
            </Paper>
          </Fade>
        ) : (
          // Vista Tabla (existente)
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
                <DateRange sx={{ color: '#501b36', fontSize: 28 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#501b36' }}>
                    Historial de Solicitudes
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {filteredRequests.length} solicitud{filteredRequests.length !== 1 ? 'es' : ''} encontrada{filteredRequests.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Contenido de solicitudes */}
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
                  Cargando solicitudes...
                </Typography>
              </Box>
            ) : filteredRequests.length === 0 ? (
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
                  <EventNote sx={{ fontSize: 48, color: '#501b36' }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                  No hay solicitudes de vacaciones
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, maxWidth: 400 }}>
                  {searchTerm 
                    ? `No se encontraron solicitudes que coincidan con "${searchTerm}"`
                    : filterStatus === 'all'
                      ? 'Comienza creando tu primera solicitud de vacaciones'
                      : `No hay solicitudes con estado "${filterStatus === 'pending' ? 'Pendiente' : filterStatus === 'approved' ? 'Aprobada' : 'Rechazada'}"`
                  }
                </Typography>
                {(!isAdminRole || scope === 'mine') && (
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setOpenDialog(true)}
                    sx={commonContainedButtonSx}
                  >
                    Crear Primera Solicitud
                  </Button>
                )}
              </Box>
            ) : (
              <>
                <TableContainer
                  sx={{
                    overflowX: 'hidden !important',
                    '&::-webkit-scrollbar': {
                      display: 'none',
                    },
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none',
                  }}
                >
                <Table>
                  <TableHead>
                    <TableRow 
                      sx={{ 
                        bgcolor: alpha('#501b36', 0.02),
                        '& .MuiTableCell-head': {
                          fontWeight: 700,
                          color: '#501b36',
                          borderBottom: `2px solid ${alpha('#501b36', 0.1)}`,
                          py: 2,
                        }
                      }}
                    >
                      <TableCell>Empleado</TableCell>
                      <TableCell>Período</TableCell>
                      <TableCell>Días</TableCell>
                      <TableCell>Motivo</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Solicitado</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagination.paginatedData.map((request) => (
                      <TableRow 
                        key={request.id} 
                        hover
                        sx={{
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: alpha('#501b36', 0.02),
                            transform: 'translateX(4px)',
                          },
                          '& .MuiTableCell-root': {
                            borderBottom: `1px solid ${alpha('#501b36', 0.06)}`,
                            py: 2,
                          }
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: alpha('#501b36', 0.1),
                              }}
                            >
                              <Business sx={{ color: '#501b36' }} />
                            </Box>
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                                {request.employeeName}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                Colaborador
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarToday sx={{ color: '#757575', fontSize: 16 }} />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {formatDate(request.startDate)} - {formatDate(request.endDate)}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                Periodo de vacaciones
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={`${request.days} días`} 
                            size="small" 
                            variant="outlined"
                            sx={{
                              borderRadius: 2,
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              borderColor: alpha('#501b36', 0.3),
                              color: '#501b36',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 200, fontWeight: 500 }}>
                            {request.reason}
                          </Typography>
                          {request.comments && (
                            <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
                              Comentarios: {request.comments}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getStatusIcon(request.status)}
                            <StatusChip status={request.status} size="small" />
                          </Box>
                          {request.approvedBy && (
                            <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                              Por: {request.approvedBy} el {formatDate(request.approvedDate!)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {formatDate(request.requestDate)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuClick(e, request)}
                            sx={{
                              borderRadius: 2,
                              bgcolor: alpha('#501b36', 0.08),
                              color: '#501b36',
                              '&:hover': {
                                bgcolor: alpha('#501b36', 0.12),
                              },
                            }}
                          >
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <PaginationComponent
                currentPage={pagination.currentPage}
                itemsPerPage={pagination.itemsPerPage}
                totalItems={filteredRequests.length}
                onPageChange={pagination.setCurrentPage}
                onItemsPerPageChange={pagination.setItemsPerPage}
                corporateColor="#501b36"
              />
              </>
            )}
          </Paper>
        </Fade>
        )}

        {/* Menú contextual */}
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
              minWidth: 180,
            }
          }}
        >
          <MenuItem 
            onClick={() => {
              // Aquí podrías abrir un diálogo de edición
              console.log('Editar solicitud:', selectedRequest);
              handleCloseMenu();
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
            <EditCalendar sx={{ fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Ver detalles
            </Typography>
          </MenuItem>
          {isAdmin && selectedRequest?.status === 'pending' && scope !== 'all' && (
            <>
              <MenuItem 
                onClick={() => {
                  if (selectedRequest) {
                    handleUpdateStatus(selectedRequest.id, 'approved');
                  }
                  handleCloseMenu();
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
                <CheckCircle sx={{ fontSize: 20 }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Aprobar
                </Typography>
              </MenuItem>
              <MenuItem 
                onClick={() => {
                  if (selectedRequest) {
                    handleUpdateStatus(selectedRequest.id, 'rejected', 'Rechazada por administrador');
                  }
                  handleCloseMenu();
                }}
                sx={{
                  py: 1.5,
                  px: 2,
                  gap: 2,
                  '&:hover': {
                    bgcolor: alpha('#f44336', 0.08),
                    color: '#f44336',
                  },
                }}
              >
                <Cancel sx={{ fontSize: 20 }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Rechazar
                </Typography>
              </MenuItem>
            </>
          )}
          
          {/* Opción de eliminar - disponible para todas las solicitudes del usuario */}
          <MenuItem 
            onClick={() => {
              if (selectedRequest) {
                handleDeleteRequest(selectedRequest.id);
              }
              handleCloseMenu();
            }}
            sx={{
              py: 1.5,
              px: 2,
              gap: 2,
              '&:hover': {
                bgcolor: alpha('#f44336', 0.08),
                color: '#f44336',
              },
            }}
          >
            <Delete sx={{ fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Eliminar solicitud
            </Typography>
          </MenuItem>
        </Menu>

        {/* Diálogo nueva solicitud mejorado */}
        <ModernModal
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          title="Nueva Solicitud de Vacaciones"
          subtitle="Completa los datos de tu solicitud"
          icon={<Add />}
          maxWidth="md"
          headerColor="#501b36"
          customHeaderGradient="linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 50%, #d4a574 100%)"
          actions={
            <>
              <ModernButton
                variant="outlined"
                onClick={() => setOpenDialog(false)}
                size="large"
              >
                Cancelar
              </ModernButton>
              <ModernButton
                variant="contained"
                onClick={handleSubmitRequest}
                disabled={!newRequest.startDate || !newRequest.endDate || !newRequest.reason.trim()}
                size="large"
                customColor="#501b36"
              >
                Enviar Solicitud
              </ModernButton>
            </>
          }
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ModernField
              label="Fecha de inicio"
              type="date"
              value={newRequest.startDate}
              onChange={(value) => setNewRequest(prev => ({ ...prev, startDate: value as string }))}
              required
              startIcon={<CalendarToday />}
              min={new Date().toISOString().split('T')[0]}
              helperText="Selecciona la fecha de inicio de tus vacaciones"
            />

            <ModernField
              label="Fecha de fin"
              type="date"
              value={newRequest.endDate}
              onChange={(value) => setNewRequest(prev => ({ ...prev, endDate: value as string }))}
              required
              startIcon={<CalendarToday />}
              min={newRequest.startDate || new Date().toISOString().split('T')[0]}
              helperText="Selecciona la fecha de fin de tus vacaciones"
            />

            <ModernField
              label="Motivo de la solicitud"
              type="multiline"
              value={newRequest.reason}
              onChange={(value) => setNewRequest(prev => ({ ...prev, reason: value as string }))}
              required
              rows={4}
              placeholder="Describe el motivo de tu solicitud de vacaciones..."
              maxLength={500}
              helperText="Proporciona una descripción detallada del motivo"
            />

            {newRequest.startDate && newRequest.endDate && newRequest.startDate < newRequest.endDate && (
              <InfoCard
                title="Resumen de la solicitud"
                color="#501b36"
                items={[
                  {
                    icon: <CalendarToday sx={{ fontSize: 16 }} />,
                    label: "Período",
                    value: `${formatDate(newRequest.startDate)} - ${formatDate(newRequest.endDate)}`
                  },
                  {
                    icon: <Schedule sx={{ fontSize: 16 }} />,
                    label: "Total de días",
                    value: `${calculateDays(newRequest.startDate, newRequest.endDate)} días`
                  },
                  {
                    icon: <EventNote sx={{ fontSize: 16 }} />,
                    label: "Estado inicial",
                    value: <StatusChip status="pending" size="small" />
                  }
                ]}
              />
            )}
          </Box>
        </ModernModal>

        {/* Modal de detalles del día */}
        <ModernModal
          open={dayDetailModal}
          onClose={() => setDayDetailModal(false)}
          title="Vacaciones del Día"
          subtitle={selectedDayVacations.length > 0 ? 
            `${selectedDayVacations.length} persona${selectedDayVacations.length !== 1 ? 's' : ''} de vacaciones` : 
            'Sin vacaciones'
          }
          icon={<CalendarToday />}
          maxWidth="md"
          headerColor="#501b36"
          customHeaderGradient="linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 50%, #d4a574 100%)"
          actions={
            <ModernButton
              variant="contained"
              onClick={() => setDayDetailModal(false)}
              size="large"
              customColor="#501b36"
            >
              Cerrar
            </ModernButton>
          }
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {selectedDayVacations.length === 0 ? (
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
                    p: 3,
                    borderRadius: '50%',
                    bgcolor: alpha('#501b36', 0.1),
                    mb: 2,
                  }}
                >
                  <CalendarToday sx={{ fontSize: 48, color: '#501b36' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  No hay vacaciones este día
                </Typography>
              </Box>
            ) : (
              selectedDayVacations.map((vacation) => (
                <Paper
                  key={vacation.id}
                  elevation={0}
                  sx={{
                    p: 3,
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                    backgroundColor: '#fafafa',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: '#501b36' }}>
                        {vacation.employeeName}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                        {vacation.reason}
                      </Typography>
                    </Box>
                    <StatusChip status={vacation.status} />
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DateRange sx={{ color: '#757575', fontSize: 16 }} />
                      <Typography variant="body2">
                        {formatDate(vacation.startDate)} - {formatDate(vacation.endDate)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Schedule sx={{ color: '#757575', fontSize: 16 }} />
                      <Typography variant="body2">
                        {vacation.days} días
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EventNote sx={{ color: '#757575', fontSize: 16 }} />
                      <Typography variant="body2">
                        Solicitado: {formatDate(vacation.requestDate)}
                      </Typography>
                    </Box>
                  </Box>

                  {vacation.approvedBy && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: alpha('#4caf50', 0.1), borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                        Aprobado por {vacation.approvedBy} el {formatDate(vacation.approvedDate!)}
                      </Typography>
                    </Box>
                  )}

                  {vacation.comments && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: alpha('#f44336', 0.1), borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ color: '#c62828', fontWeight: 600 }}>
                        Comentarios: {vacation.comments}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              ))
            )}
          </Box>
        </ModernModal>

      </Box>
    </>
  );
};
