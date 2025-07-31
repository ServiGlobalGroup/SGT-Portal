import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Divider,
  LinearProgress,
  Alert,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import {
  PendingActions,
  CheckCircle,
  Cancel,
  Group,
  CalendarToday,
  Refresh,
  EventAvailable,
  WorkOff,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

// Interfaces para los datos del dashboard
interface VacationRequest {
  id: number;
  employee_name: string;
  employee_avatar?: string;
  department: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  request_date: string;
  priority: 'normal' | 'urgent';
}

interface EmployeeAvailability {
  date: string;
  available_employees: number;
  total_employees: number;
  on_vacation: string[];
  on_leave: string[];
  percentage: number;
}

interface DashboardStats {
  pending_vacation_requests: number;
  approved_requests_this_month: number;
  total_employees: number;
  employees_on_vacation_today: number;
  availability_percentage_today: number;
  pending_leave_requests: number;
}

export const Home: React.FC = () => {
  const { user } = useAuth();
  
  // Estados principales
  const [stats, setStats] = useState<DashboardStats>({
    pending_vacation_requests: 0,
    approved_requests_this_month: 0,
    total_employees: 0,
    employees_on_vacation_today: 0,
    availability_percentage_today: 0,
    pending_leave_requests: 0,
  });

  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([]);
  const [weeklyAvailability, setWeeklyAvailability] = useState<EmployeeAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<VacationRequest | null>(null);
  const [actionDialog, setActionDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [comments, setComments] = useState('');

  // Cargar datos del dashboard
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Simular datos hasta que esté la API real
      await simulateApiCall();
      
      // Datos simulados
      setStats({
        pending_vacation_requests: 5,
        approved_requests_this_month: 12,
        total_employees: 45,
        employees_on_vacation_today: 3,
        availability_percentage_today: 93,
        pending_leave_requests: 2,
      });

      setVacationRequests([
        {
          id: 1,
          employee_name: 'María García',
          department: 'Administración',
          start_date: '2025-08-15',
          end_date: '2025-08-25',
          days: 10,
          reason: 'Vacaciones familiares',
          status: 'pending',
          request_date: '2025-07-20',
          priority: 'normal'
        },
        {
          id: 2,
          employee_name: 'Carlos López',
          department: 'Tráfico',
          start_date: '2025-08-01',
          end_date: '2025-08-05',
          days: 5,
          reason: 'Asuntos personales',
          status: 'pending',
          request_date: '2025-07-25',
          priority: 'urgent'
        },
        {
          id: 3,
          employee_name: 'Ana Martínez',
          department: 'Logística',
          start_date: '2025-09-01',
          end_date: '2025-09-10',
          days: 8,
          reason: 'Vacaciones de verano',
          status: 'pending',
          request_date: '2025-07-28',
          priority: 'normal'
        }
      ]);

      // Generar disponibilidad para los próximos 7 días
      const availability = [];
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const available = Math.floor(Math.random() * 5) + 40; // 40-45 empleados disponibles
        availability.push({
          date: date.toISOString().split('T')[0],
          available_employees: available,
          total_employees: 45,
          on_vacation: i === 0 ? ['Juan Pérez', 'Laura Sánchez', 'Miguel Torres'] : [],
          on_leave: i === 1 ? ['Patricia Ruiz'] : [],
          percentage: Math.round((available / 45) * 100)
        });
      }
      setWeeklyAvailability(availability);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const simulateApiCall = () => new Promise(resolve => setTimeout(resolve, 1000));

  const handleRequestAction = (request: VacationRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setActionDialog(true);
  };

  const executeAction = async () => {
    if (!selectedRequest) return;

    try {
      // Aquí iría la llamada a la API real
      await simulateApiCall();

      // Actualizar el estado local
      setVacationRequests(prev => 
        prev.map(req => 
          req.id === selectedRequest.id 
            ? { ...req, status: actionType === 'approve' ? 'approved' : 'rejected' }
            : req
        )
      );

      // Actualizar estadísticas
      setStats(prev => ({
        ...prev,
        pending_vacation_requests: prev.pending_vacation_requests - 1,
        approved_requests_this_month: actionType === 'approve' ? prev.approved_requests_this_month + 1 : prev.approved_requests_this_month
      }));

      setActionDialog(false);
      setComments('');
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error updating request:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getWeekDay = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', { weekday: 'short' });
  };

  const getPriorityColor = (priority: string) => {
    return priority === 'urgent' ? 'error' : 'default';
  };

  // Verificar si el usuario es administrador
  const isAdmin = user?.role === 'ADMINISTRADOR';

  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Esta página está disponible solo para administradores.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#501b36', mb: 1 }}>
          Dashboard Administrativo
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Gestión centralizada de solicitudes y disponibilidad de personal
        </Typography>
      </Box>

      {/* Estadísticas generales */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #501b36 0%, #7d2d54 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats.pending_vacation_requests}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Solicitudes Pendientes
                  </Typography>
                </Box>
                <PendingActions sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#4caf50' }}>
                    {stats.approved_requests_this_month}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Aprobadas este mes
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 40, color: '#4caf50' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196f3' }}>
                    {stats.total_employees}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Empleados
                  </Typography>
                </Box>
                <Group sx={{ fontSize: 40, color: '#2196f3' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff9800' }}>
                    {stats.employees_on_vacation_today}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    De vacaciones hoy
                  </Typography>
                </Box>
                <WorkOff sx={{ fontSize: 40, color: '#ff9800' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#8bc34a' }}>
                    {stats.availability_percentage_today}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Disponibilidad hoy
                  </Typography>
                </Box>
                <EventAvailable sx={{ fontSize: 40, color: '#8bc34a' }} />
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={stats.availability_percentage_today} 
                sx={{ 
                  height: 6, 
                  borderRadius: 3,
                  backgroundColor: '#e0e0e0',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#8bc34a'
                  }
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Solicitudes pendientes */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ height: 'fit-content' }}>
            <CardHeader
              title="Solicitudes de Vacaciones Pendientes"
              avatar={<PendingActions color="primary" />}
              action={
                <IconButton onClick={loadDashboardData}>
                  <Refresh />
                </IconButton>
              }
            />
            <CardContent sx={{ pt: 0 }}>
              {loading ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <LinearProgress sx={{ mb: 2 }} />
                  <Typography color="text.secondary">Cargando solicitudes...</Typography>
                </Box>
              ) : vacationRequests.filter(req => req.status === 'pending').length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <CheckCircle sx={{ fontSize: 60, color: '#4caf50', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    ¡No hay solicitudes pendientes!
                  </Typography>
                  <Typography color="text.secondary">
                    Todas las solicitudes han sido procesadas.
                  </Typography>
                </Box>
              ) : (
                <List>
                  {vacationRequests
                    .filter(req => req.status === 'pending')
                    .map((request, index) => (
                      <React.Fragment key={request.id}>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: '#501b36' }}>
                              {request.employee_name.split(' ').map(n => n[0]).join('')}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                  {request.employee_name}
                                </Typography>
                                <Chip 
                                  label={request.priority === 'urgent' ? 'Urgente' : 'Normal'} 
                                  size="small" 
                                  color={getPriorityColor(request.priority)}
                                  sx={{ height: 20 }}
                                />
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {request.department} • {request.days} días
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {formatDate(request.start_date)} - {formatDate(request.end_date)}
                                </Typography>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                                  "{request.reason}"
                                </Typography>
                              </Box>
                            }
                          />
                          <ListItemSecondaryAction>
                            <Stack direction="row" spacing={1}>
                              <Button
                                variant="contained"
                                color="success"
                                size="small"
                                startIcon={<CheckCircle />}
                                onClick={() => handleRequestAction(request, 'approve')}
                              >
                                Aprobar
                              </Button>
                              <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                startIcon={<Cancel />}
                                onClick={() => handleRequestAction(request, 'reject')}
                              >
                                Rechazar
                              </Button>
                            </Stack>
                          </ListItemSecondaryAction>
                        </ListItem>
                        {index < vacationRequests.filter(req => req.status === 'pending').length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Disponibilidad semanal */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: 'fit-content' }}>
            <CardHeader
              title="Disponibilidad de Personal"
              avatar={<CalendarToday color="primary" />}
              subheader="Próximos 7 días"
            />
            <CardContent sx={{ pt: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Día</TableCell>
                      <TableCell align="center">Disponibles</TableCell>
                      <TableCell align="center">%</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {weeklyAvailability.map((day) => (
                      <TableRow key={day.date}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {getWeekDay(day.date)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(day.date)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">
                            {day.available_employees}/{day.total_employees}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${day.percentage}%`}
                            size="small"
                            color={day.percentage >= 90 ? 'success' : day.percentage >= 75 ? 'warning' : 'error'}
                            sx={{ minWidth: 60 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Empleados de vacaciones hoy */}
              {weeklyAvailability[0]?.on_vacation.length > 0 && (
                <Box sx={{ mt: 2, p: 2, bgcolor: '#fff3e0', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="warning.main" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WorkOff fontSize="small" />
                    De vacaciones hoy:
                  </Typography>
                  {weeklyAvailability[0].on_vacation.map(name => (
                    <Chip
                      key={name}
                      label={name}
                      size="small"
                      sx={{ mr: 0.5, mb: 0.5 }}
                      color="warning"
                    />
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog para aprobar/rechazar solicitudes */}
      <Dialog open={actionDialog} onClose={() => setActionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionType === 'approve' ? 'Aprobar' : 'Rechazar'} Solicitud de Vacaciones
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">{selectedRequest.employee_name}</Typography>
              <Typography color="text.secondary">
                {formatDate(selectedRequest.start_date)} - {formatDate(selectedRequest.end_date)} ({selectedRequest.days} días)
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                "{selectedRequest.reason}"
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            label={`Comentarios ${actionType === 'approve' ? '(opcional)' : '(requerido)'}`}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder={actionType === 'approve' ? 'Comentarios adicionales...' : 'Motivo del rechazo...'}
            required={actionType === 'reject'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog(false)}>
            Cancelar
          </Button>
          <Button
            onClick={executeAction}
            variant="contained"
            color={actionType === 'approve' ? 'success' : 'error'}
            disabled={actionType === 'reject' && !comments.trim()}
          >
            {actionType === 'approve' ? 'Aprobar' : 'Rechazar'} Solicitud
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
