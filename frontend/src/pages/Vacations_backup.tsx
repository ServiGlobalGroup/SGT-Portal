import React, { useState, useEffect, useMemo } from 'react';
import { DevelopmentModal } from '../components/DevelopmentModal';
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
  Stack,
  Fade,
  GlobalStyles,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Slide,
  Collapse,
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
} from '@mui/icons-material';
import { Calendar, momentLocalizer, Event, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { ModernModal, ModernButton } from '../components/ModernModal';
import { ModernField, InfoCard, StatusChip } from '../components/ModernFormComponents';

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
moment.locale('es');
const localizer = momentLocalizer(moment);

export const Vacations: React.FC = () => {
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRequest, setSelectedRequest] = useState<VacationRequest | null>(null);

  // Estados para el calendario
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('table');
  const [calendarView, setCalendarView] = useState<View>(Views.MONTH);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayVacations, setSelectedDayVacations] = useState<VacationRequest[]>([]);
  const [dayDetailModal, setDayDetailModal] = useState(false);

  // Estados para el formulario
  const [openDialog, setOpenDialog] = useState(false);
  const [newRequest, setNewRequest] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });

  // Estados para filtros
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Estados para administradores (simulado como false para usuarios normales)
  const [isAdmin] = useState(false);
  const [showDevelopmentModal, setShowDevelopmentModal] = useState(true);

  // Datos de ejemplo para el calendario
  useEffect(() => {
    const sampleRequests: VacationRequest[] = [
      {
        id: 1,
        employeeName: "Juan Pérez",
        startDate: "2025-08-25",
        endDate: "2025-08-29",
        reason: "Vacaciones familiares",
        status: "approved",
        days: 5,
        requestDate: "2025-08-10",
        approvedBy: "Ana García",
        approvedDate: "2025-08-12"
      },
      {
        id: 2,
        employeeName: "María López",
        startDate: "2025-09-02",
        endDate: "2025-09-06",
        reason: "Descanso personal",
        status: "pending",
        days: 5,
        requestDate: "2025-08-15"
      },
      {
        id: 3,
        employeeName: "Carlos Ruiz",
        startDate: "2025-09-15",
        endDate: "2025-09-22",
        reason: "Viaje al extranjero",
        status: "approved",
        days: 8,
        requestDate: "2025-08-05",
        approvedBy: "Ana García",
        approvedDate: "2025-08-08"
      },
      {
        id: 4,
        employeeName: "Ana Martín",
        startDate: "2025-08-30",
        endDate: "2025-09-01",
        reason: "Asuntos personales",
        status: "rejected",
        days: 3,
        requestDate: "2025-08-18",
        approvedBy: "Ana García",
        approvedDate: "2025-08-19",
        comments: "Periodo ocupado, solicitar otro momento"
      }
    ];
    setRequests(sampleRequests);
  }, []);

  // Convertir requests a eventos del calendario
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return requests.map(request => ({
      id: request.id,
      title: `${request.employeeName} - ${request.reason}`,
      start: new Date(request.startDate),
      end: new Date(request.endDate),
      resource: {
        type: request.status === 'approved' ? 'vacation' : request.status === 'pending' ? 'pending' : 'rejected',
        employeeName: request.employeeName,
        reason: request.reason,
        status: request.status
      }
    }));
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

  const loadRequests = () => {
    setLoading(true);
    // Simular carga de datos
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const handleSubmitRequest = () => {
    if (!newRequest.startDate || !newRequest.endDate || !newRequest.reason.trim()) {
      setAlert({ type: 'error', message: 'Por favor completa todos los campos' });
      return;
    }

    const startDate = new Date(newRequest.startDate);
    const endDate = new Date(newRequest.endDate);
    
    if (startDate >= endDate) {
      setAlert({ type: 'error', message: 'La fecha de fin debe ser posterior a la fecha de inicio' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate < today) {
      setAlert({ type: 'error', message: 'La fecha de inicio no puede ser anterior a hoy' });
      return;
    }

    const days = calculateDays(newRequest.startDate, newRequest.endDate);

    const request: VacationRequest = {
      id: Date.now(),
      employeeName: "Usuario Actual", // En una app real sería del contexto del usuario
      startDate: newRequest.startDate,
      endDate: newRequest.endDate,
      reason: newRequest.reason,
      status: 'pending',
      days,
      requestDate: new Date().toISOString().split('T')[0]
    };

    setRequests(prev => [request, ...prev]);
    setOpenDialog(false);
    setNewRequest({ startDate: '', endDate: '', reason: '' });
    setAlert({ type: 'success', message: 'Solicitud de vacaciones enviada exitosamente' });
  };

  const handleUpdateStatus = (id: number, status: 'approved' | 'rejected', comments?: string) => {
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
  };

  // Filtrar solicitudes
  const filteredRequests = requests.filter(req => {
    const matchesStatus = filterStatus === 'all' ? true : req.status === filterStatus;
    const matchesSearch = req.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         req.reason.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Funciones para el calendario
  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    // Buscar vacaciones para el día seleccionado
    const selectedDay = slotInfo.start;
    const dayVacations = filteredRequests.filter(req => {
      const startDate = new Date(req.startDate);
      const endDate = new Date(req.endDate);
      return selectedDay >= startDate && selectedDay <= endDate;
    });
    
    if (dayVacations.length > 0) {
      setSelectedDayVacations(dayVacations);
      setDayDetailModal(true);
    }
  };

  const getDayVacationUsers = (date: Date) => {
    return filteredRequests.filter(req => {
      const startDate = new Date(req.startDate);
      const endDate = new Date(req.endDate);
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
        gap: 0.5
      }}>
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: isToday ? 700 : 500,
            color: isToday ? '#501b36' : 'inherit',
            fontSize: '0.875rem',
            textAlign: 'center',
            mb: 1
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
            overflow: 'hidden'
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
                  mt: 0.25
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
                placeholder="Buscar solicitudes por empleado o motivo..."
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

                {/* Toggle Vista Calendar/Table mejorado */}
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
                
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={loadRequests}
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

                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setOpenDialog(true)}
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    textTransform: 'none',
                    fontWeight: 600,
                    backgroundColor: '#501b36',
                    '&:hover': {
                      backgroundColor: '#3d1429',
                    },
                  }}
                >
                  Nueva Solicitud
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Fade>

        {/* Contenido Principal */}
        {viewMode === 'calendar' ? (
          // Vista Calendario con animación
          <Fade in={true} timeout={800}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid #e0e0e0',
                background: '#ffffff',
                transform: 'translateX(0)',
                transition: 'all 0.5s ease-in-out',
              }}
            >
                  {/* Header del calendario */}
                  <Box sx={{ 
                    p: 3, 
                    borderBottom: 1, 
                    borderColor: 'divider',
                    background: alpha('#501b36', 0.02),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CalendarMonth sx={{ color: '#501b36', fontSize: 28 }} />
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#501b36' }}>
                          Calendario de Vacaciones
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {filteredRequests.length} solicitud{filteredRequests.length !== 1 ? 'es' : ''} encontrada{filteredRequests.length !== 1 ? 's' : ''} - {moment(currentDate).format('MMMM YYYY')}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Controles de navegación */}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Tooltip title="Mes anterior">
                        <IconButton
                          onClick={() => {
                            const newDate = moment(currentDate).subtract(1, 'month').toDate();
                            setCurrentDate(newDate);
                          }}
                          sx={{
                            color: '#501b36',
                            backgroundColor: 'rgba(255,255,255,0.8)',
                            '&:hover': {
                              backgroundColor: 'rgba(255,255,255,0.95)',
                              transform: 'scale(1.05)',
                            },
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <Schedule sx={{ transform: 'rotate(180deg)' }} />
                        </IconButton>
                      </Tooltip>
                      
                      <Button
                        onClick={() => {
                          const today = new Date();
                          setCurrentDate(today);
                        }}
                        sx={{
                          color: '#501b36',
                          fontWeight: 700,
                          textTransform: 'none',
                          minWidth: 80,
                          backgroundColor: 'rgba(255,255,255,0.8)',
                          borderRadius: 2,
                          px: 2,
                          py: 0.5,
                          '&:hover': {
                            backgroundColor: 'rgba(255,255,255,0.95)',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        Hoy
                      </Button>
                      
                      <Tooltip title="Mes siguiente">
                        <IconButton
                          onClick={() => {
                            const newDate = moment(currentDate).add(1, 'month').toDate();
                            setCurrentDate(newDate);
                          }}
                          sx={{
                            color: '#501b36',
                            backgroundColor: 'rgba(255,255,255,0.8)',
                            '&:hover': {
                              backgroundColor: 'rgba(255,255,255,0.95)',
                              transform: 'scale(1.05)',
                            },
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <Schedule />
                        </IconButton>
                      </Tooltip>
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
                          minHeight: '110px !important',
                          cursor: 'pointer !important',
                          transition: 'background-color 0.2s ease !important',
                          position: 'relative !important',
                        },
                        '.rbc-date-cell:hover': {
                          backgroundColor: alpha('#501b36', 0.04) + ' !important',
                        },
                        '.rbc-today': {
                          backgroundColor: alpha('#501b36', 0.08) + ' !important',
                        },
                        '.rbc-toolbar': {
                          marginBottom: '20px !important',
                          padding: '10px 0 !important',
                          borderBottom: '1px solid #e0e0e0 !important',
                        },
                        '.rbc-toolbar button': {
                          color: '#501b36 !important',
                          border: '1px solid #501b36 !important',
                          backgroundColor: 'transparent !important',
                          borderRadius: '6px !important',
                          padding: '8px 16px !important',
                          fontWeight: '600 !important',
                          fontSize: '0.875rem !important',
                          margin: '0 4px !important',
                        },
                        '.rbc-toolbar button:hover': {
                          backgroundColor: alpha('#501b36', 0.08) + ' !important',
                        },
                        '.rbc-toolbar button.rbc-active': {
                          backgroundColor: '#501b36 !important',
                          color: 'white !important',
                        },
                        '.rbc-toolbar .rbc-toolbar-label': {
                          fontSize: '1.25rem !important',
                          fontWeight: '700 !important',
                          color: '#501b36 !important',
                          flex: '1 !important',
                          textAlign: 'center !important',
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
                      }}
                    />
                    <Calendar
                      localizer={localizer}
                      events={calendarEvents}
                      startAccessor="start"
                      endAccessor="end"
                      style={{ height: 600 }}
                      view={calendarView}
                      onView={setCalendarView}
                      date={currentDate}
                      onNavigate={handleNavigate}
                      onSelectSlot={handleSelectSlot}
                      selectable
                      eventPropGetter={eventStyleGetter}
                      components={{
                        event: CustomEvent,
                        month: {
                          dateHeader: CustomDateHeader,
                        },
                      }}
                      messages={{
                        next: 'Siguiente',
                        previous: 'Anterior',
                        today: 'Hoy',
                        month: 'Mes',
                        week: 'Semana',
                        day: 'Día',
                        agenda: 'Agenda',
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
            </Box>
          </Slide>

          {/* Vista Tabla */}
          <Slide
            direction="right"
            in={viewMode === 'table'}
            mountOnEnter
            unmountOnExit
            timeout={600}
          >
            <Box
              sx={{
                position: viewMode === 'table' ? 'relative' : 'absolute',
                width: '100%',
                top: viewMode === 'table' ? 0 : 0,
                zIndex: viewMode === 'table' ? 2 : 1,
              }}
            >
              <Fade in={viewMode === 'table'} timeout={800}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid #e0e0e0',
                    background: '#ffffff',
                    transform: viewMode === 'table' ? 'translateX(0)' : 'translateX(-100%)',
                    transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
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
                      <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => setOpenDialog(true)}
                        sx={{
                          borderRadius: 2,
                          px: 4,
                          py: 1.5,
                          textTransform: 'none',
                          fontWeight: 600,
                          backgroundColor: '#501b36',
                          '&:hover': {
                            backgroundColor: '#3d1429',
                          },
                        }}
                      >
                        Crear Primera Solicitud
                      </Button>
                    </Box>
                  ) : (
                    <TableContainer
                      sx={{
                        overflowX: 'hidden !important',
                        '&::-webkit-scrollbar': {
                          display: 'none',
                        },
                        '-ms-overflow-style': 'none',
                        'scrollbar-width': 'none',
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
                          {filteredRequests.map((request) => (
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
                  )}
                </Paper>
              </Fade>
            </Box>
          </Slide>
        </Box>
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
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setOpenDialog(true)}
                  sx={{
                    borderRadius: 2,
                    px: 4,
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    backgroundColor: '#501b36',
                    '&:hover': {
                      backgroundColor: '#3d1429',
                    },
                  }}
                >
                  Crear Primera Solicitud
                </Button>
              </Box>
            ) : (
              <TableContainer
                sx={{
                  overflowX: 'hidden !important',
                  '&::-webkit-scrollbar': {
                    display: 'none',
                  },
                  '-ms-overflow-style': 'none',
                  'scrollbar-width': 'none',
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
                    {filteredRequests.map((request) => (
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
            )}
          </Paper>
        </Fade>
            </Box>
          </Slide>
        </Box>

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
          {isAdmin && selectedRequest?.status === 'pending' && (
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

        {/* Modal de desarrollo */}
        <DevelopmentModal
          open={showDevelopmentModal}
          onClose={() => setShowDevelopmentModal(false)}
          pageTitle="Gestión de Vacaciones"
          description="Esta funcionalidad está siendo desarrollada para gestionar las solicitudes de vacaciones de forma eficiente."
          features={[
            'Solicitud de vacaciones por empleados',
            'Sistema de aprobación por gerentes',
            'Calendario de vacaciones integrado',
            'Notificaciones automáticas',
            'Historial completo de solicitudes',
            'Reportes de disponibilidad'
          ]}
          estimatedCompletion="Agosto 2025"
          progressValue={85}
          corporateColor="#501b36"
        />
      </Box>
    </>
  );
};
