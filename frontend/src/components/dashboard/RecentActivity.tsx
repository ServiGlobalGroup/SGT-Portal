import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  LinearProgress,
  Fade,
  Stack,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Description,
  Assessment,
  People,
  TrendingUp,
} from '@mui/icons-material';

interface Activity {
  id: number;
  user_name: string;
  action: string;
  timestamp: string;
  type: 'upload' | 'approval' | 'login' | 'update';
}

interface RecentActivityProps {
  activities: Activity[];
  loading?: boolean;
}

const RecentActivity: React.FC<RecentActivityProps> = ({ activities, loading = false }) => {
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

export default RecentActivity;
