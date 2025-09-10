import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Alert,
  GlobalStyles,
  Fade,
  Chip,
  Menu,
  Button,
  Stack,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  LinearProgress,
  Skeleton,
  Tooltip,
} from '@mui/material';
// Eliminado DatePicker: ahora siempre se muestra día actual, se filtra por position
import { alpha } from '@mui/material/styles';
import { LocalShipping as TruckIcon } from '@mui/icons-material';
import {
  Assessment,
  People,
  Description,
  NotificationsNone,
  Check,
  Close,
  FileDownload,
  ListAlt,
  PictureAsPdf,
  TableView,
  LocalShipping,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
// Sin gráfico pesado: usaremos tarjetas con barras de progreso
import { useAuth } from '../hooks/useAuth';
import StatsCard from '../components/dashboard/StatsCards';
import QuickActions from '../components/dashboard/QuickActions';
import RecentActivity from '../components/dashboard/RecentActivity';
import { usersAPI } from '../services/api';
import { dashboardService } from '../services/dashboardService';
import { vacationService } from '../services/vacationService';
import { ModernModal, ModernButton } from '../components/ModernModal';
import { DashboardStats as IDashboardStats, AvailableWorkersResponse, UserStatsSummary, PENDING_POLL_MS } from '../types/dashboard';

// Tipos reemplazados por interfaces en types/dashboard

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<IDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const [pendingVacation, setPendingVacation] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<UserStatsSummary | null>(null);
  const [availableWorkers, setAvailableWorkers] = useState<
    | AvailableWorkersResponse
    | null
  >(null);
  const [availableLoading, setAvailableLoading] = useState<boolean>(false);
  // Filtro de puesto (position). '' => todos
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  // Fecha de hoy fija (como antes pero sin permitir cambiarla)
  const todayDate = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);
  const [showAvailableDialog, setShowAvailableDialog] = useState(false);
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const exportBtnAnchorRef = useRef<HTMLDivElement | null>(null);
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  // (sin normalizador adicional: el DatePicker ya controla el formato)

  // Export helpers
  const handleExportExcel = useCallback(() => {
    if (!availableWorkers) return;
    const rows = availableWorkers.available;
    const header = ['Nombre', 'DNI/NIE', 'Fecha'];
    const csvRows = [header.join(';'), ...rows.map((r) => [r.full_name, r.dni_nie, availableWorkers.date].join(';'))];
    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `conductores_disponibles_${availableWorkers.date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [availableWorkers]);

  const handleExportPDF = useCallback(async () => {
    if (!availableWorkers) return;
    try {
      const jsPdfMod: any = await import('jspdf');
      const autoTableMod: any = await import('jspdf-autotable');
      const jsPDF = jsPdfMod.jsPDF || jsPdfMod.default || jsPdfMod;
      const autoTable = autoTableMod.default || autoTableMod.autoTable || autoTableMod;

      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text(`Conductores disponibles — ${availableWorkers.date}`, 14, 16);
      const head = [['Nombre', 'DNI/NIE']];
      const body = availableWorkers.available.map((u) => [u.full_name, u.dni_nie]);
      autoTable(doc, { head, body, startY: 22, styles: { fontSize: 10 } });
      doc.save(`conductores_disponibles_${availableWorkers.date}.pdf`);
    } catch (e) {
      console.error('Export PDF failed or library missing. Falling back to CSV.', e);
      handleExportExcel();
    }
  }, [availableWorkers, handleExportExcel]);

  // (helper contrast color eliminado por no uso)

  // Carga inicial del dashboard (solo una vez). Importante: no depender de selectedPosition
  // para evitar recargar toda la página al cambiar el filtro. El panel de disponibles
  // se refresca de forma independiente en un useEffect específico más abajo.
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
    const [statsRes, _vacRes, usersRes, availableRes] = await Promise.all([
  dashboardService.getStats(),
        vacationService.getVacationStats().catch(() => null),
        usersAPI.getUserStats().catch(() => null),
  // En la carga inicial usamos "todos" los puestos; los cambios de filtro
  // actualizan el panel mediante el efecto específico de selectedPosition.
  dashboardService.getAvailableWorkers(todayDate, '').catch(() => null),
      ]);

  setStats(statsRes);
      if (usersRes) {
        console.log('User stats cargados:', usersRes); // DEBUG: verificar estructura
        setUserStats(usersRes);
      }
      if (availableRes) setAvailableWorkers(availableRes);

      if (user?.role === 'ADMINISTRADOR' || user?.role === 'MASTER_ADMIN') {
        const pend = await vacationService.getPendingRequestsForAdmin();
        setPendingVacation(pend);
      } else {
        setPendingVacation([]);
      }
    } catch (err) {
      setError('Error al cargar los datos del dashboard');
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.role, todayDate]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Polling en tiempo (casi) real para solicitudes de vacaciones pendientes (solo admin)
  useEffect(() => {
    if (!(user?.role === 'ADMINISTRADOR' || user?.role === 'MASTER_ADMIN')) return;
    let cancelled = false;
    const POLL_MS = PENDING_POLL_MS;
    let id: any;
    const fetchPending = async () => {
      if (document.hidden) return; // pausar si pestaña no visible
      try {
        const pend = await vacationService.getPendingRequestsForAdmin();
        if (!cancelled) setPendingVacation(pend);
      } catch {}
    };
    fetchPending();
    id = setInterval(fetchPending, POLL_MS);
    const visHandler = () => { if (!document.hidden) fetchPending(); };
    document.addEventListener('visibilitychange', visHandler);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', visHandler);
    };
  }, [user?.role]);

  // Refrescar sólo la lista de disponibles cuando cambia el filtro de posición
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setAvailableLoading(true);
  const res = await dashboardService.getAvailableWorkers(todayDate, selectedPosition);
        if (!cancelled) setAvailableWorkers(res);
      } catch (e) {
        console.error('Error cargando disponibles:', e);
  if (!cancelled) setAvailableWorkers({ date: todayDate, available: [] });
      } finally {
        if (!cancelled) setAvailableLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [selectedPosition, todayDate]);

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
        }}
      />

      {/* Header */}
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: '100%', bgcolor: '#f5f5f5' }}>
        <Box sx={{ mb: 4 }}>
          <Fade in timeout={800}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, sm: 4 },
                background: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 55%, #d4a574 100%)',
                color: 'white',
                borderRadius: 3,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\\"60\\" height=\\"60\\" viewBox=\\"0 0 60 60\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cg fill=\\"none\\" fill-rule=\\"evenodd\\"%3E%3Cg fill=\\"%23ffffff\\" fill-opacity=\\"0.08\\"%3E%3Cpath d=\\"m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
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
                      justifyContent: 'center',
                    }}
                  >
                    <Assessment sx={{ fontSize: 32 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Panel de control
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
                      Resumen general del sistema
                    </Typography>
                  </Box>
                  {(user?.role === 'ADMINISTRADOR' || user?.role === 'MASTER_ADMIN') && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={(e) => setNotifAnchor(e.currentTarget)}
                      startIcon={<NotificationsNone />}
                      sx={{
                        textTransform: 'none',
                        borderRadius: 999,
                        backgroundColor: '#c62828',
                        '&:hover': { backgroundColor: '#b71c1c' },
                        minWidth: 'auto',
                        color: 'white',
                        fontWeight: 600,
                        ml: 'auto'
                      }}
                    >
                      ({pendingVacation.length})
                    </Button>
                  )}
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
                  fontSize: 24,
                },
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

        {/* Stats */}
        <Fade in timeout={1000}>
          <Box sx={{ position: 'relative' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
              gap: 3,
              mb: 4,
            }}
          >
            <StatsCard
              title="Usuarios"
              value={(userStats?.total_users ?? stats?.total_users) ?? 0}
              icon={<People />}
              color="#2196f3"
              loading={loading}
              details={(() => {
                const total = (userStats?.total_users ?? stats?.total_users) ?? 0;
                const activos = userStats?.active_users ?? 0;
                const inactivos = total > 0 ? total - activos : 0;
                const pct = total > 0 ? Math.round((activos / total) * 100) : 0;
                const colorPct = pct >= 80 ? '#2e7d32' : pct >= 50 ? '#ed6c02' : '#c62828';
                return (
                  <>Activos {activos} · Inactivos {inactivos} · <Tooltip title="% de usuarios con estado activo"><span style={{ color: colorPct }}>{pct}% activos</span></Tooltip></>
                );
              })()}
            />
            <StatsCard
              title="Trabajadores disponibles hoy"
              value={availableWorkers?.available.length || 0}
              icon={<LocalShipping />}
              color="#ff9800"
              loading={availableLoading || loading}
              onClick={() => setShowAvailableDialog(true)}
              details={(() => {
                const totalTrab = Number((userStats?.roles?.TRABAJADOR ?? 0));
                const disp = availableWorkers?.available.length || 0;
                const pct = totalTrab > 0 ? Math.round((disp / totalTrab) * 100) : 0;
                const colorPct = pct >= 70 ? '#2e7d32' : pct >= 40 ? '#ed6c02' : '#c62828';
                return <>De {totalTrab} (<Tooltip title="% trabajadores disponibles respecto al total de TRABAJADOR"><span style={{ color: colorPct }}>{pct}% disponibles</span></Tooltip>)</>;
              })()}
            />
            <StatsCard
              title="Solicitudes Pendientes"
              value={pendingVacation.length}
              icon={<Assessment />}
              color="#f44336"
              loading={loading && pendingVacation.length === 0}
            />
          </Box>
          {/* Etiqueta de última actualización eliminada según preferencia del usuario */}
          </Box>
        </Fade>

        {/* Charts and Available Workers */}
        <Fade in timeout={1200}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 2, md: 3 }, mb: 4 }}>
            <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #e0e0e0', background: '#ffffff' }}>
              <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assessment sx={{ color: '#501b36' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Usuarios por rol
                </Typography>
              </Box>
              <Box sx={{ p: { xs: 2, sm: 3 }, height: { xs: 'auto', md: 320 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {loading ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {[1,2,3,4].map(i => (
                      <Skeleton key={i} variant="rectangular" height={isXs ? 52 : 64} sx={{ borderRadius: 2 }} />
                    ))}
                  </Box>
                ) : (userStats || stats) ? (
                  (() => {
                    const roleMap = userStats?.roles || {} as Record<string, number>;
                    const entries = Object.entries(roleMap);
                    if (entries.length === 0) {
                      return <Typography color="text.secondary">Sin datos de roles</Typography>;
                    }
                    const total = entries.reduce((acc, [, c]) => acc + Number(c || 0), 0) || 0;
                    const roleColors: Record<string, string> = {
                      TRABAJADOR: '#7d2d52',
                      ADMINISTRADOR: '#d4a574',
                      TRAFICO: '#1976d2',
                    };
                    const sorted = entries.sort((a, b) => Number(b[1]) - Number(a[1]));
                    return (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Total usuarios: <strong>{total}</strong>
                        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: { xs: 1.5, sm: 2 } }}>
                          {sorted.map(([role, count]) => {
                            const n = Number(count) || 0;
                            const pct = total > 0 ? Math.round((n / total) * 100) : 0;
                            const color = roleColors[role] || '#90a4ae';
                            return (
          <Box key={role} sx={{ p: { xs: 1.5, sm: 2 }, border: '1px solid #ede7e9', borderRadius: 2, background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 10, height: 10, bgcolor: color, borderRadius: '50%' }} />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{role}</Typography>
                                  </Box>
                                  <Typography variant="subtitle2">{n}</Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={pct}
                                  sx={{
                                    height: 8,
                                    borderRadius: 6,
                                    backgroundColor: alpha(color, 0.15),
                                    overflow: 'hidden',
                                    '& .MuiLinearProgress-bar': {
                                      backgroundColor: color,
                                      borderRadius: 6,
                                      transition: 'transform .6s ease, width .6s ease',
                                    },
                                  }}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                  {pct}% del total
                                </Typography>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    );
                  })()
                ) : (
                  <Typography color="text.secondary">Sin datos</Typography>
                )}
              </Box>
            </Paper>

            <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #e0e0e0', background: '#ffffff' }}>
              <Box
                sx={{
                  p: { xs: 2, sm: 3 },
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                  gap: 1.5,
                  flexDirection: { xs: 'column', sm: 'row' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Description sx={{ color: '#501b36' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Conductores disponibles
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                  {/* Selector de puesto */}
                  <FormControl size="small" sx={{ minWidth: isXs ? '100%' : 180 }}>
                    <InputLabel id="position-filter-label">Puesto</InputLabel>
                    <Select
                      labelId="position-filter-label"
                      label="Puesto"
                      value={selectedPosition}
                      onChange={(e) => setSelectedPosition(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>Todos</em>
                      </MenuItem>
                      {(availableWorkers?.positions && availableWorkers.positions.length > 0
                        ? availableWorkers.positions
                        : Array.from(new Set((availableWorkers?.available || []).map(a => a.position).filter(Boolean as any)))
                        ).map((raw) => {
                          const p = String(raw);
                          return <MenuItem key={p} value={p}>{p}</MenuItem>;
                        })}
                    </Select>
                  </FormControl>
                  <ModernButton
                    size="small"
                    startIcon={<ListAlt />}
                    disabled={!availableWorkers || (availableWorkers?.available?.length ?? 0) === 0}
                    onClick={() => setShowAvailableDialog(true)}
                  >
                    Ver todo
                  </ModernButton>
                  <Box ref={exportBtnAnchorRef}>
                    <ModernButton
                      size="small"
                      startIcon={<FileDownload />}
                      disabled={!availableWorkers || (availableWorkers?.available?.length ?? 0) === 0}
                      onClick={() => setExportAnchor(exportBtnAnchorRef.current)}
                    >
                      Exportar
                    </ModernButton>
                  </Box>
                </Stack>
              </Box>
              <Box id="available-workers-panel" sx={{ p: { xs: 1.5, sm: 2 }, height: { xs: 'auto', md: 320 }, display: 'flex', flexDirection: 'column' }}>
                {availableLoading || loading ? (
                  <Box sx={{ p: 1 }}>
                    {[1,2,3,4,5].map(i => (
                      <Skeleton key={i} variant="rectangular" height={isXs ? 40 : 48} sx={{ mb: 1, borderRadius: 1.5 }} />
                    ))}
                  </Box>
                ) : availableWorkers ? (
                  <Box sx={{ overflowY: 'auto', maxHeight: { xs: 260, md: 'unset' } }}>
                    {availableWorkers.available.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                        <TruckIcon sx={{ fontSize: 48, opacity: 0.25, mb: 1 }} />
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          {selectedPosition
                            ? 'No hay trabajadores disponibles con el filtro seleccionado'
                            : 'No hay trabajadores disponibles hoy'}
                        </Typography>
                        {selectedPosition && (
                          <Button size="small" variant="outlined" onClick={() => setSelectedPosition('')}>Quitar filtro</Button>
                        )}
                      </Box>
                    ) : (
                      availableWorkers.available.map((u) => (
                        <Box key={u.id} sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {u.full_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
              {u.dni_nie}{u.position ? ` · ${u.position}` : ''}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </Box>
                ) : (
                  <Typography color="text.secondary">Sin datos</Typography>
                )}
              </Box>
            </Paper>
          </Box>
        </Fade>

        {/* Quick Actions + Actividad Reciente */}
        <Fade in timeout={1200}>
          <Box sx={{ mb: 4, display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, alignItems: 'stretch' }}>
            <Box sx={{ minHeight: { md: 500 } }}>
              <RecentActivity />
            </Box>
            <Box sx={{ minHeight: { md: 500 } }}>
              <QuickActions />
            </Box>
          </Box>
        </Fade>

        {/* Notificaciones (solo vacaciones) */}
        <Menu
          anchorEl={notifAnchor}
          open={Boolean(notifAnchor)}
          onClose={() => setNotifAnchor(null)}
          PaperProps={{
            sx: {
              borderRadius: 2,
              mt: 1,
              minWidth: 360,
              maxHeight: 420,
              overflow: 'auto',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              border: '1px solid rgba(0,0,0,0.08)',
            },
          }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#501b36' }}>
                Solicitudes de Vacaciones
              </Typography>
              <Chip
                label={`${pendingVacation.length} pendiente${pendingVacation.length !== 1 ? 's' : ''}`}
                size="small"
                sx={{ bgcolor: alpha('#501b36', 0.1), color: '#501b36', fontWeight: 600 }}
              />
            </Box>
            {pendingVacation.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
                <NotificationsNone sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                <Typography variant="body2">No hay solicitudes pendientes</Typography>
              </Box>
            ) : (
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {pendingVacation.map((req) => (
                  <Box
                    key={req.id}
                    sx={{
                      p: 1.5,
                      mb: 0.75,
                      borderRadius: 1.5,
                      bgcolor: alpha('#fff4e6', 0.5),
                      border: '1px solid',
                      borderColor: alpha('#ff9800', 0.2),
                      '&:last-child': { mb: 0 },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 600,
                            color: '#501b36',
                            mb: 0.25,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {req.employee_name || 'Usuario'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          {new Date(req.start_date).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                          })}{' '}
                          -{' '}
                          {new Date(req.end_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} •{' '}
                          {req.duration_days || '-'} días
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <IconButton
                        size="small"
                        onClick={async () => {
                          await vacationService.updateVacationStatus(req.id, 'rejected');
                          loadDashboardData();
                        }}
                        sx={{ width: 28, height: 28, bgcolor: alpha('#f44336', 0.1), color: '#f44336', '&:hover': { bgcolor: alpha('#f44336', 0.2) } }}
                      >
                        <Close sx={{ fontSize: 14 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={async () => {
                          await vacationService.updateVacationStatus(req.id, 'approved');
                          loadDashboardData();
                        }}
                        sx={{ width: 28, height: 28, bgcolor: alpha('#4caf50', 0.1), color: '#4caf50', '&:hover': { bgcolor: alpha('#4caf50', 0.2) } }}
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
      </Box>

      {/* Menú exportación (tarjeta exterior) */}
      <Menu
        anchorEl={exportAnchor}
        open={Boolean(exportAnchor)}
        onClose={() => setExportAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            setExportAnchor(null);
            handleExportExcel();
          }}
          disabled={!availableWorkers || (availableWorkers?.available?.length ?? 0) === 0}
        >
          <TableView fontSize="small" style={{ marginRight: 8 }} />
          Exportar Excel
        </MenuItem>
        <MenuItem
          onClick={() => {
            setExportAnchor(null);
            handleExportPDF();
          }}
          disabled={!availableWorkers || (availableWorkers?.available?.length ?? 0) === 0}
        >
          <PictureAsPdf fontSize="small" style={{ marginRight: 8 }} />
          Exportar PDF
        </MenuItem>
      </Menu>

      {/* Modal: lista completa de disponibles */}
      <ModernModal
        open={showAvailableDialog}
        onClose={() => setShowAvailableDialog(false)}
        title={`Conductores disponibles — ${availableWorkers?.date ?? ''}`}
        icon={<Description />}
        maxWidth="sm"
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ModernButton
              variant="outlined"
              size="small"
              onClick={() => setShowAvailableDialog(false)}
            >
              Cerrar
            </ModernButton>
            <ModernButton
              size="small"
              disabled={!availableWorkers || (availableWorkers?.available?.length ?? 0) === 0}
              startIcon={<FileDownload />}
              onClick={handleExportExcel}
            >
              Excel
            </ModernButton>
            <ModernButton
              size="small"
              disabled={!availableWorkers || (availableWorkers?.available?.length ?? 0) === 0}
              startIcon={<FileDownload />}
              onClick={handleExportPDF}
            >
              PDF
            </ModernButton>
          </Box>
        }
      >
        {!availableWorkers || availableWorkers.available.length === 0 ? (
          <Typography color="text.secondary">No hay trabajadores disponibles</Typography>
        ) : (
          <List>
            {availableWorkers.available.map((u) => (
              <ListItem key={u.id} divider>
                <ListItemText
                  primary={<Typography sx={{ fontWeight: 600 }}>{u.full_name}</Typography>}
                  secondary={<Typography variant="caption" color="text.secondary">{u.dni_nie}{u.position ? ` · ${u.position}` : ''}</Typography>}
                />
              </ListItem>
            ))}
          </List>
        )}
      </ModernModal>
    </>
  );
};

export default Dashboard;
