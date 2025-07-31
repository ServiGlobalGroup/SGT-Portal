import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
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
} from '@mui/icons-material';

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

export const Vacations: React.FC = () => {
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRequest, setSelectedRequest] = useState<VacationRequest | null>(null);

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

  // Auto-hide alert
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

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
      default: return 'Desconocido';
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
                      : `No hay solicitudes con estado "${getStatusText(filterStatus)}"`
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
                            <Chip
                              label={getStatusText(request.status)}
                              size="small"
                              color={getStatusColor(request.status)}
                              sx={{
                                borderRadius: 2,
                                fontWeight: 600,
                                fontSize: '0.75rem',
                              }}
                            />
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
        <Dialog 
          open={openDialog} 
          onClose={() => setOpenDialog(false)} 
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
            <Add sx={{ fontSize: 28 }} />
            <Box>
              <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                Nueva Solicitud de Vacaciones
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Completa los datos de tu solicitud
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 4, bgcolor: '#f8f9fa' }}>
            <Box sx={{ pt: 2 }}>
              <TextField
                label="Fecha de inicio"
                type="date"
                fullWidth
                value={newRequest.startDate}
                onChange={(e) => setNewRequest(prev => ({ ...prev, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ 
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
                inputProps={{ min: new Date().toISOString().split('T')[0] }}
              />
              <TextField
                label="Fecha de fin"
                type="date"
                fullWidth
                value={newRequest.endDate}
                onChange={(e) => setNewRequest(prev => ({ ...prev, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ 
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
                inputProps={{ min: newRequest.startDate || new Date().toISOString().split('T')[0] }}
              />
              <TextField
                label="Motivo de la solicitud"
                multiline
                rows={4}
                fullWidth
                value={newRequest.reason}
                onChange={(e) => setNewRequest(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Describe el motivo de tu solicitud de vacaciones..."
                sx={{ 
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              
              {newRequest.startDate && newRequest.endDate && newRequest.startDate < newRequest.endDate && (
                <Box sx={{ 
                  p: 3, 
                  backgroundColor: 'white', 
                  borderRadius: 2,
                  border: '1px solid #e0e0e0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}>
                  <Typography variant="body2" color="textSecondary" gutterBottom sx={{ fontWeight: 600 }}>
                    Resumen de la solicitud:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarToday sx={{ fontSize: 16, color: '#501b36' }} />
                    <Typography variant="body2">
                      <strong>Período:</strong> {formatDate(newRequest.startDate)} - {formatDate(newRequest.endDate)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Schedule sx={{ fontSize: 16, color: '#501b36' }} />
                    <Typography variant="body2">
                      <strong>Total de días:</strong> {calculateDays(newRequest.startDate, newRequest.endDate)} días
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ 
            p: 3, 
            bgcolor: '#f8f9fa',
            gap: 1,
            borderTop: '1px solid #e0e0e0',
          }}>
            <Button 
              onClick={() => setOpenDialog(false)}
              variant="outlined"
              sx={{
                borderRadius: 2,
                px: 3,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmitRequest} 
              variant="contained"
              disabled={!newRequest.startDate || !newRequest.endDate || !newRequest.reason.trim()}
              sx={{
                borderRadius: 2,
                px: 3,
                textTransform: 'none',
                fontWeight: 600,
                backgroundColor: '#501b36',
                minWidth: 140,
                '&:hover': {
                  backgroundColor: '#3d1429',
                },
              }}
            >
              Enviar Solicitud
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
};
