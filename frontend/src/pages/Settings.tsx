import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import {
  Security,
  Warning,
  Build,
  PowerSettingsNew,
  RestartAlt,
  Info,
  Storage,
  People,
  Shield,
  AccessTime,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface MaintenanceConfig {
  maintenance_mode: boolean;
  maintenance_message?: string;
}

interface SystemStats {
  system: {
    app_name: string;
    version: string;
    maintenance_mode: boolean;
    uptime: string;
    environment: string;
  };
  users: {
    total_users: number;
    active_sessions: number;
    master_admin_access: boolean;
  };
  storage: {
    total_space: string;
    used_space: string;
    available_space: string;
  };
  security: {
    last_backup: string;
    system_health: string;
    security_level: string;
  };
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('Sistema en mantenimiento. Por favor, intente más tarde.');
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string>('');
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'warning' | 'info', message: string} | null>(null);

  // Verificar que el usuario sea master admin
  useEffect(() => {
    if (!user || user.role !== 'MASTER_ADMIN') {
      navigate('/');
      return;
    }
    
    loadSystemData();
  }, [user, navigate]);

  const loadSystemData = async () => {
    try {
      setLoading(true);
      
      // Cargar configuración del sistema
      const settingsResponse = await fetch('/api/settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        setMaintenanceMode(settingsData.maintenance?.maintenance_mode || false);
        setMaintenanceMessage(settingsData.maintenance?.maintenance_message || maintenanceMessage);
      }

      // Cargar estadísticas del sistema
      const statsResponse = await fetch('/api/settings/system-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setSystemStats(statsData);
      }
      
    } catch (error) {
      console.error('Error cargando datos del sistema:', error);
      setAlert({ type: 'error', message: 'Error cargando la configuración del sistema' });
    } finally {
      setLoading(false);
    }
  };

  const handleMaintenanceToggle = async (enabled: boolean) => {
    try {
      setSaving(true);
      
      const response = await fetch('/api/settings/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          maintenance_mode: enabled,
          maintenance_message: maintenanceMessage
        })
      });

      if (response.ok) {
        const result = await response.json();
        setMaintenanceMode(enabled);
        setAlert({ 
          type: 'success', 
          message: result.message 
        });
      } else {
        throw new Error('Error cambiando modo de mantenimiento');
      }
    } catch (error) {
      console.error('Error:', error);
      setAlert({ type: 'error', message: 'Error cambiando el modo de mantenimiento' });
    } finally {
      setSaving(false);
    }
  };

  const handleEmergencyShutdown = async () => {
    try {
      setSaving(true);
      
      const response = await fetch('/api/settings/emergency-shutdown', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setMaintenanceMode(true);
        setAlert({ 
          type: 'warning', 
          message: result.message 
        });
        setShowConfirmDialog(false);
        await loadSystemData();
      }
    } catch (error) {
      console.error('Error:', error);
      setAlert({ type: 'error', message: 'Error ejecutando cierre de emergencia' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetSystem = async () => {
    try {
      setSaving(true);
      
      const response = await fetch('/api/settings/reset-all', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setAlert({ 
          type: 'success', 
          message: result.message 
        });
        setShowConfirmDialog(false);
        await loadSystemData();
      }
    } catch (error) {
      console.error('Error:', error);
      setAlert({ type: 'error', message: 'Error restableciendo el sistema' });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAction = () => {
    switch (confirmAction) {
      case 'emergency':
        handleEmergencyShutdown();
        break;
      case 'reset':
        handleResetSystem();
        break;
      default:
        setShowConfirmDialog(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Configuración del Sistema</Typography>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>Cargando configuración...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Security color="primary" />
        Configuración del Sistema
        <Chip label="SOLO USUARIO MAESTRO" size="small" color="primary" />
      </Typography>

      {alert && (
        <Alert severity={alert.type} onClose={() => setAlert(null)} sx={{ mb: 2 }}>
          {alert.message}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Modo de Mantenimiento */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Build />
                Modo de Mantenimiento
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography>Activar modo de mantenimiento</Typography>
                <Switch
                  checked={maintenanceMode}
                  onChange={(e) => handleMaintenanceToggle(e.target.checked)}
                  disabled={saving}
                />
              </Box>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Mensaje de mantenimiento"
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                disabled={saving}
                sx={{ mb: 2 }}
              />

              <Alert severity={maintenanceMode ? "warning" : "info"} sx={{ mb: 2 }}>
                {maintenanceMode 
                  ? "⚠️ Sistema en modo de mantenimiento - Solo el usuario maestro puede acceder"
                  : "✅ Sistema operativo - Todos los usuarios pueden acceder"
                }
              </Alert>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Warning />}
                  onClick={() => {
                    setConfirmAction('emergency');
                    setShowConfirmDialog(true);
                  }}
                  disabled={saving}
                  size="small"
                >
                  Cierre de Emergencia
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<RestartAlt />}
                  onClick={() => {
                    setConfirmAction('reset');
                    setShowConfirmDialog(true);
                  }}
                  disabled={saving}
                  size="small"
                >
                  Restablecer Sistema
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Estadísticas del Sistema */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Info />
                Información del Sistema
              </Typography>
              
              {systemStats && (
                <List dense>
                  <ListItem>
                    <ListItemIcon><PowerSettingsNew /></ListItemIcon>
                    <ListItemText 
                      primary="Estado del Sistema" 
                      secondary={systemStats.system.uptime}
                    />
                    <ListItemSecondaryAction>
                      <Chip 
                        label={systemStats.system.maintenance_mode ? "Mantenimiento" : "Operativo"}
                        color={systemStats.system.maintenance_mode ? "warning" : "success"}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon><People /></ListItemIcon>
                    <ListItemText 
                      primary="Usuarios Totales" 
                      secondary={`${systemStats.users.active_sessions} sesiones activas`}
                    />
                    <ListItemSecondaryAction>
                      <Typography variant="h6">{systemStats.users.total_users}</Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon><Storage /></ListItemIcon>
                    <ListItemText 
                      primary="Almacenamiento" 
                      secondary={`${systemStats.storage.used_space} de ${systemStats.storage.total_space} usado`}
                    />
                    <ListItemSecondaryAction>
                      <Typography variant="body2" color="textSecondary">
                        {systemStats.storage.available_space} libre
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon><Shield /></ListItemIcon>
                    <ListItemText 
                      primary="Seguridad" 
                      secondary={systemStats.security.system_health}
                    />
                    <ListItemSecondaryAction>
                      <Chip 
                        label={systemStats.security.security_level}
                        color="success"
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Información del Usuario Maestro */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Sesión del Usuario Maestro</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.main', color: 'white', borderRadius: 1 }}>
                    <Typography variant="h4">{user?.full_name}</Typography>
                    <Typography variant="body2">Usuario Maestro</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.main', color: 'white', borderRadius: 1 }}>
                    <Typography variant="h4">✅</Typography>
                    <Typography variant="body2">Acceso Completo</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.main', color: 'white', borderRadius: 1 }}>
                    <Typography variant="h4">🛡️</Typography>
                    <Typography variant="body2">Máxima Seguridad</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.main', color: 'white', borderRadius: 1 }}>
                    <AccessTime />
                    <Typography variant="body2">Sesión Sin Límite</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog de Confirmación */}
      <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
        <DialogTitle>
          {confirmAction === 'emergency' ? 'Confirmar Cierre de Emergencia' : 'Confirmar Restablecimiento del Sistema'}
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {confirmAction === 'emergency' 
              ? '⚠️ Esta acción pondrá el sistema inmediatamente en modo de mantenimiento, bloqueando el acceso a todos los usuarios excepto el usuario maestro.'
              : '⚠️ Esta acción restablecerá todas las configuraciones del sistema y desactivará el modo de mantenimiento.'
            }
          </Alert>
          <Typography>
            {confirmAction === 'emergency' 
              ? '¿Está seguro que desea ejecutar el cierre de emergencia del sistema?'
              : '¿Está seguro que desea restablecer el sistema a la configuración por defecto?'
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmAction} 
            color={confirmAction === 'emergency' ? 'error' : 'warning'}
            disabled={saving}
            variant="contained"
          >
            {saving ? 'Ejecutando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export { Settings };
