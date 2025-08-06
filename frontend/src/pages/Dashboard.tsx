import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  IconButton,
  Alert,
  GlobalStyles,
  Button,
  Stack,
  LinearProgress,
  Fade,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Assessment,
  TrendingUp,
  People,
  Description,
  Refresh,
  ArrowUpward,
  ArrowDownward,
  CalendarToday,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

interface DashboardStats {
  total_users: number;
  active_users_today: number;
  total_documents: number;
  pending_requests: number;
  users_change: number;
  documents_change: number;
}

interface Activity {
  id: number;
  user_name: string;
  action: string;
  timestamp: string;
  type: 'upload' | 'approval' | 'login' | 'update';
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    total_users: 0,
    active_users_today: 0,
    total_documents: 0,
    pending_requests: 0,
    users_change: 0,
    documents_change: 0,
  });
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos del dashboard
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Simular carga de datos - reemplazar con API real
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setStats({
        total_users: 45,
        active_users_today: 28,
        total_documents: 1245,
        pending_requests: 7,
        users_change: 12,
        documents_change: -3,
      });

      setRecentActivity([
        {
          id: 1,
          user_name: 'María García',
          action: 'Subió nuevo documento',
          timestamp: '2025-08-06T10:30:00Z',
          type: 'upload'
        },
        {
          id: 2,
          user_name: 'Carlos López',
          action: 'Aprobó solicitud de vacaciones',
          timestamp: '2025-08-06T09:15:00Z',
          type: 'approval'
        },
        {
          id: 3,
          user_name: 'Ana Martínez',
          action: 'Inició sesión',
          timestamp: '2025-08-06T08:45:00Z',
          type: 'login'
        },
        {
          id: 4,
          user_name: 'Pedro Ruiz',
          action: 'Actualizó perfil',
          timestamp: '2025-08-06T08:20:00Z',
          type: 'update'
        }
      ]);
    } catch (err) {
      setError('Error al cargar los datos del dashboard');
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Verificar permisos básicos
  const canViewDashboard = user?.role === 'ADMINISTRADOR';

  if (!canViewDashboard) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          No tienes permisos para acceder al dashboard.
        </Alert>
      </Box>
    );
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
          '.MuiModal-root': {
            paddingRight: '0px !important',
          },
          '.MuiPopover-root': {
            paddingRight: '0px !important',
          },
          '@keyframes fadeInUp': {
            '0%': {
              opacity: 0,
              transform: 'translateY(20px)',
            },
            '100%': {
              opacity: 1,
              transform: 'translateY(0)',
            },
          },
        }}
      />
      
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: '100%', bgcolor: '#f5f5f5', minHeight: '100vh' }}>
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: 2,
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <Assessment sx={{ fontSize: 32 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Dashboard
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
                      Resumen general del sistema
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Fade>
        </Box>

        {error && (
          <Fade in timeout={400}>
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                borderRadius: 2,
                '& .MuiAlert-icon': {
                  fontSize: 24
                }
              }}
              action={
                <Button color="inherit" size="small" onClick={loadDashboardData}>
                  Reintentar
                </Button>
              }
            >
              {error}
            </Alert>
          </Fade>
        )}

        {/* Estadísticas principales */}
        <Fade in timeout={1000}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
              xs: '1fr', 
              sm: '1fr 1fr', 
              md: 'repeat(4, 1fr)' 
            }, 
            gap: 3, 
            mb: 4 
          }}>
            <StatsCard
              title="Total Usuarios"
              value={stats.total_users}
              change={stats.users_change}
              icon={<People />}
              color="#2196f3"
              loading={loading}
            />

            <StatsCard
              title="Activos Hoy"
              value={stats.active_users_today}
              icon={<TrendingUp />}
              color="#4caf50"
              loading={loading}
            />

            <StatsCard
              title="Total Documentos"
              value={stats.total_documents}
              change={stats.documents_change}
              icon={<Description />}
              color="#ff9800"
              loading={loading}
            />

            <StatsCard
              title="Solicitudes Pendientes"
              value={stats.pending_requests}
              icon={<Assessment />}
              color="#f44336"
              loading={loading}
            />
          </Box>
        </Fade>

        <Fade in timeout={1200}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, 
            gap: 3 
          }}>
            {/* Actividad reciente */}
            <Paper
              elevation={0}
              sx={{
                borderRadius: 2,
                border: '1px solid #e0e0e0',
                background: '#ffffff',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Actividad Reciente
                  </Typography>
                  <IconButton 
                    onClick={loadDashboardData}
                    size="small"
                    disabled={loading}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(80, 27, 54, 0.04)',
                      },
                    }}
                  >
                    <Refresh />
                  </IconButton>
                </Box>
              </Box>
              
              <Box sx={{ p: 0 }}>
                <RecentActivityList activities={recentActivity} loading={loading} />
              </Box>
            </Paper>

            {/* Acciones rápidas */}
            <QuickActionsCard />
          </Box>
        </Fade>
      </Box>
    </>
  );
};

// Componente de tarjeta de estadísticas
interface StatsCardProps {
  title: string;
  value: number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  loading: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  change, 
  icon, 
  color, 
  loading 
}) => (
  <Paper
    elevation={0}
    sx={{
      p: 3,
      borderRadius: 2,
      border: '1px solid #e0e0e0',
      background: '#ffffff',
      height: '100%',
      transition: 'all 0.2s ease',
      '&:hover': {
        boxShadow: `0 4px 20px ${alpha(color, 0.1)}`,
        transform: 'translateY(-2px)',
      },
    }}
  >
    {loading ? (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    ) : (
      <Fade in timeout={600}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                backgroundColor: alpha(color, 0.1),
                color: color,
                mr: 2,
              }}
            >
              {icon}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {value.toLocaleString()}
              </Typography>
            </Box>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {title}
          </Typography>
          
          {change !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {change > 0 ? (
                <ArrowUpward sx={{ fontSize: 16, color: '#4caf50', mr: 0.5 }} />
              ) : change < 0 ? (
                <ArrowDownward sx={{ fontSize: 16, color: '#f44336', mr: 0.5 }} />
              ) : null}
              <Typography
                variant="caption"
                sx={{
                  color: change > 0 ? '#4caf50' : change < 0 ? '#f44336' : 'text.secondary',
                  fontWeight: 500,
                }}
              >
                {change > 0 ? '+' : ''}{change} esta semana
              </Typography>
            </Box>
          )}
        </Box>
      </Fade>
    )}
  </Paper>
);

// Componente de lista de actividad reciente
interface RecentActivityListProps {
  activities: Activity[];
  loading: boolean;
}

const RecentActivityList: React.FC<RecentActivityListProps> = ({ activities, loading }) => {
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'upload':
        return <Description sx={{ fontSize: 20, color: '#2196f3' }} />;
      case 'approval':
        return <Assessment sx={{ fontSize: 20, color: '#4caf50' }} />;
      case 'login':
        return <People sx={{ fontSize: 20, color: '#ff9800' }} />;
      case 'update':
        return <TrendingUp sx={{ fontSize: 20, color: '#9c27b0' }} />;
      default:
        return <Assessment sx={{ fontSize: 20 }} />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Stack spacing={2}>
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={20} />
              <Box sx={{ flex: 1 }}>
                <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />
                <LinearProgress sx={{ width: '60%', borderRadius: 1 }} />
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>
    );
  }

  if (activities.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No hay actividad reciente
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 0 }}>
      {activities.map((activity, index) => (
        <Fade in timeout={300 + index * 100} key={activity.id}>
          <Box
            sx={{
              p: 3,
              borderBottom: index < activities.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider',
              '&:hover': {
                backgroundColor: alpha('#501b36', 0.02),
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 1.5,
                  backgroundColor: alpha('#501b36', 0.05),
                }}
              >
                {getActivityIcon(activity.type)}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {activity.user_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {activity.action}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {formatTime(activity.timestamp)}
              </Typography>
            </Box>
          </Box>
        </Fade>
      ))}
    </Box>
  );
};

// Componente de acciones rápidas
const QuickActionsCard: React.FC = () => (
  <Paper
    elevation={0}
    sx={{
      borderRadius: 2,
      border: '1px solid #e0e0e0',
      background: '#ffffff',
      overflow: 'hidden',
      height: 'fit-content',
    }}
  >
    <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        Acciones Rápidas
      </Typography>
    </Box>
    
    <Box sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Button
          variant="outlined"
          fullWidth
          startIcon={<Description />}
          sx={{
            justifyContent: 'flex-start',
            borderRadius: 2,
            py: 1.5,
            textTransform: 'none',
            borderColor: '#e0e0e0',
            '&:hover': {
              borderColor: '#501b36',
              backgroundColor: 'rgba(80, 27, 54, 0.04)',
            },
          }}
          onClick={() => window.location.href = '/'}
        >
          Ver Documentos
        </Button>
        
        <Button
          variant="outlined"
          fullWidth
          startIcon={<People />}
          sx={{
            justifyContent: 'flex-start',
            borderRadius: 2,
            py: 1.5,
            textTransform: 'none',
            borderColor: '#e0e0e0',
            '&:hover': {
              borderColor: '#501b36',
              backgroundColor: 'rgba(80, 27, 54, 0.04)',
            },
          }}
          onClick={() => window.location.href = '/users'}
        >
          Gestionar Usuarios
        </Button>
        
        <Button
          variant="outlined"
          fullWidth
          startIcon={<CalendarToday />}
          sx={{
            justifyContent: 'flex-start',
            borderRadius: 2,
            py: 1.5,
            textTransform: 'none',
            borderColor: '#e0e0e0',
            '&:hover': {
              borderColor: '#501b36',
              backgroundColor: 'rgba(80, 27, 54, 0.04)',
            },
          }}
          onClick={() => window.location.href = '/vacations'}
        >
          Ver Vacaciones
        </Button>
      </Stack>
    </Box>
  </Paper>
);

export default Dashboard;
