import React, { useState } from 'react';
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
} from '@mui/material';
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
  const filteredRequests = requests.filter(req => 
    filterStatus === 'all' ? true : req.status === filterStatus
  );

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: { xs: '100%', sm: '100%', md: '1200px', lg: '1400px' },
      mx: 'auto',
      px: { xs: 0, sm: 1, md: 2 }
    }}>
      {/* Alerta */}
      {alert && (
        <Alert 
          severity={alert.type} 
          sx={{ mb: 2 }} 
          onClose={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      {/* Acciones y filtros */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: { xs: 'stretch', sm: 'center' }, 
          justifyContent: 'space-between', 
          gap: 2, 
          flexDirection: { xs: 'column', sm: 'row' },
          flexWrap: 'wrap' 
        }}>
          <Button
            variant="contained" 
            startIcon={<Add />}
            onClick={() => setOpenDialog(true)}
            sx={{ 
              width: { xs: '100%', sm: 'auto' },
              height: { xs: '48px', sm: 'auto' }
            }}
          >
            Nueva Solicitud
          </Button>
          
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
            <InputLabel>Filtrar por estado</InputLabel>
            <Select
              value={filterStatus}
              label="Filtrar por estado"
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            >
              <MenuItem value="all">Todas</MenuItem>
              <MenuItem value="pending">Pendientes</MenuItem>
              <MenuItem value="approved">Aprobadas</MenuItem>
              <MenuItem value="rejected">Rechazadas</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Tabla de solicitudes / Cards en móvil */}
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" sx={{ 
          mb: 2, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}>
          <Schedule />
          Historial de Solicitudes
        </Typography>
        
        {/* Vista de tabla para desktop */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Empleado</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Período</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Días</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Motivo</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Solicitado</TableCell>
                  {isAdmin && <TableCell sx={{ fontWeight: 600 }}>Acciones</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Business sx={{ color: '#1565C0', fontSize: 20 }} />
                        {request.employeeName}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarToday sx={{ color: '#757575', fontSize: 16 }} />
                        <Box>
                          <Typography variant="body2">
                            {formatDate(request.startDate)} - {formatDate(request.endDate)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={`${request.days} días`} 
                        size="small" 
                        variant="outlined"
                        color="info"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200 }}>
                        {request.reason}
                      </Typography>
                      {request.comments && (
                        <Typography variant="caption" color="textSecondary" display="block">
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
                        />
                      </Box>
                      {request.approvedBy && (
                        <Typography variant="caption" color="textSecondary" display="block">
                          Por: {request.approvedBy} el {formatDate(request.approvedDate!)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDate(request.requestDate)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {request.status === 'pending' && (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => handleUpdateStatus(request.id, 'approved')}
                            >
                              Aprobar
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              onClick={() => handleUpdateStatus(request.id, 'rejected', 'Rechazada por administrador')}
                            >
                              Rechazar
                            </Button>
                          </Box>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Vista de cards para móvil y tablet */}
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          {filteredRequests.map((request) => (
            <Paper 
              key={request.id} 
              elevation={2} 
              sx={{ 
                mb: 2, 
                p: 2,
                border: '1px solid #e0e0e0',
                '&:hover': {
                  boxShadow: 3,
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s ease'
                }
              }}
            >
              {/* Header de la card con empleado y estado */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                mb: 2,
                flexWrap: 'wrap',
                gap: 1
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Business sx={{ color: '#1565C0', fontSize: 20 }} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    {request.employeeName}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getStatusIcon(request.status)}
                  <Chip
                    label={getStatusText(request.status)}
                    size="small"
                    color={getStatusColor(request.status)}
                  />
                </Box>
              </Box>

              {/* Información del período */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CalendarToday sx={{ color: '#757575', fontSize: 16 }} />
                  <Typography variant="body2" fontWeight={500}>
                    Período:
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ ml: 3 }}>
                  {formatDate(request.startDate)} - {formatDate(request.endDate)}
                </Typography>
                <Box sx={{ mt: 1, ml: 3 }}>
                  <Chip 
                    label={`${request.days} días`} 
                    size="small" 
                    variant="outlined"
                    color="info"
                  />
                </Box>
              </Box>

              {/* Motivo */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                  Motivo:
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {request.reason}
                </Typography>
                {request.comments && (
                  <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                    Comentarios: {request.comments}
                  </Typography>
                )}
              </Box>

              {/* Footer con fecha de solicitud y aprobación */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                pt: 2,
                borderTop: '1px solid #e0e0e0',
                flexWrap: 'wrap',
                gap: 1
              }}>
                <Typography variant="caption" color="textSecondary">
                  Solicitado: {formatDate(request.requestDate)}
                </Typography>
                {request.approvedBy && (
                  <Typography variant="caption" color="textSecondary">
                    Por: {request.approvedBy} el {formatDate(request.approvedDate!)}
                  </Typography>
                )}
              </Box>

              {/* Acciones para admin (solo en móvil si es necesario) */}
              {isAdmin && request.status === 'pending' && (
                <Box sx={{ 
                  mt: 2, 
                  pt: 2,
                  borderTop: '1px solid #e0e0e0',
                  display: 'flex', 
                  gap: 1,
                  flexDirection: { xs: 'column', sm: 'row' }
                }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    onClick={() => handleUpdateStatus(request.id, 'approved')}
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                  >
                    Aprobar
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    onClick={() => handleUpdateStatus(request.id, 'rejected', 'Rechazada por administrador')}
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                  >
                    Rechazar
                  </Button>
                </Box>
              )}
            </Paper>
          ))}
        </Box>

        {filteredRequests.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <EventNote sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No hay solicitudes de vacaciones
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {filterStatus === 'all' 
                ? 'Crea tu primera solicitud de vacaciones'
                : 'No hay solicitudes con este estado'
              }
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Diálogo nueva solicitud */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        maxWidth="sm" 
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            margin: { xs: 1, sm: 'auto' },
            width: { xs: 'calc(100% - 16px)', sm: 'auto' },
            maxHeight: { xs: 'calc(100% - 64px)', sm: 'auto' }
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Add />
            Nueva Solicitud de Vacaciones
          </Box>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
          <Box sx={{ pt: 2 }}>
            <TextField
              label="Fecha de inicio"
              type="date"
              fullWidth
              value={newRequest.startDate}
              onChange={(e) => setNewRequest(prev => ({ ...prev, startDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
              inputProps={{ min: new Date().toISOString().split('T')[0] }}
            />
            <TextField
              label="Fecha de fin"
              type="date"
              fullWidth
              value={newRequest.endDate}
              onChange={(e) => setNewRequest(prev => ({ ...prev, endDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
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
              sx={{ mb: 2 }}
            />
            
            {newRequest.startDate && newRequest.endDate && newRequest.startDate < newRequest.endDate && (
              <Box sx={{ 
                p: 2, 
                backgroundColor: '#f5f5f5', 
                borderRadius: 1,
                border: '1px solid #e0e0e0'
              }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Resumen de la solicitud:
                </Typography>
                <Typography variant="body2">
                  <strong>Período:</strong> {formatDate(newRequest.startDate)} - {formatDate(newRequest.endDate)}
                </Typography>
                <Typography variant="body2">
                  <strong>Total de días:</strong> {calculateDays(newRequest.startDate, newRequest.endDate)} días
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          px: { xs: 2, sm: 3 }, 
          pb: { xs: 2, sm: 1 },
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          gap: { xs: 1, sm: 0 }
        }}>
          <Button 
            onClick={() => setOpenDialog(false)}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmitRequest} 
            variant="contained"
            disabled={!newRequest.startDate || !newRequest.endDate || !newRequest.reason.trim()}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Enviar Solicitud
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
