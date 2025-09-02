import React, { useEffect, useState } from 'react';
import { activityService, ActivityItem } from '../../services/activityService';
import { Box, Typography, Paper, Skeleton, Avatar, Tooltip, IconButton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LoginIcon from '@mui/icons-material/Login';
import EditIcon from '@mui/icons-material/Edit';

const typeIconMap: Record<string, React.ReactElement> = {
  upload: <UploadFileIcon fontSize="small" />,
  approval: <CheckCircleIcon fontSize="small" />,
  login: <LoginIcon fontSize="small" />,
  update: <EditIcon fontSize="small" />,
};

const RecentActivity: React.FC = () => {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await activityService.getRecent(12);
      setItems(res.items);
    } catch (e) {
      setError('No se pudo cargar la actividad');
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await activityService.getRecent(12);
      setItems(res.items);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
  <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #e0e0e0', background: '#ffffff', height: { xs: 'auto', md: 500 }, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Actividad reciente</Typography>
        <Box>
          <Tooltip title="Actualizar">
            <span>
              <IconButton size="small" onClick={refresh} disabled={refreshing}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 1.5, sm: 2 } }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={48} sx={{ borderRadius: 1.5 }} />
            ))}
          </Box>
        ) : error ? (
          <Typography color="error" variant="body2">{error}</Typography>
        ) : items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Sin actividad registrada</Typography>
        ) : (
          items.map(item => {
            const date = new Date(item.timestamp);
            const timeStr = date.toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
            const iconEl = typeIconMap[item.type] || typeIconMap.update;
            const initials = (item.user_name || 'U?')
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map(p => p[0]?.toUpperCase())
              .join('');
            return (
              <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: '#7d2d52', fontSize: 13 }}>{initials}</Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>{item.user_name}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>{item.action}</Typography>
                </Box>
                <Tooltip title={item.type}>
                  <Box sx={{ color: '#7d2d52', display: 'flex', alignItems: 'center' }}>{iconEl}</Box>
                </Tooltip>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{timeStr}</Typography>
              </Box>
            );
          })
        )}
      </Box>
    </Paper>
  );
};

export default RecentActivity;
