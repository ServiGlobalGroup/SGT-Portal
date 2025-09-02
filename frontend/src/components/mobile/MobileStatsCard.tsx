import React from 'react';
import {
  Box,
  Typography,
  Paper,
  alpha,
} from '@mui/material';
import {
  TrendingUp,
  Person,
  Description,
  Storage,
} from '@mui/icons-material';

interface StatsData {
  total_users?: number;
  active_users?: number;
  total_documents?: number;
  users_with_documents?: number;
  total_size?: number;
}

interface MobileStatsCardProps {
  stats: StatsData;
  corporateColor?: string;
}

export const MobileStatsCard: React.FC<MobileStatsCardProps> = ({
  stats,
  corporateColor = '#501b36'
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const statsItems = [
    {
      label: 'Usuarios',
      value: stats.total_users || 0,
      icon: <Person sx={{ fontSize: 18 }} />,
      color: '#2196f3'
    },
    {
      label: 'Activos',
      value: stats.active_users || 0,
      icon: <TrendingUp sx={{ fontSize: 18 }} />,
      color: '#4caf50'
    },
    {
      label: 'Documentos',
      value: stats.total_documents || 0,
      icon: <Description sx={{ fontSize: 18 }} />,
      color: '#ff9800'
    },
    {
      label: 'Tamaño',
      value: formatFileSize(stats.total_size || 0),
      icon: <Storage sx={{ fontSize: 18 }} />,
      color: '#9c27b0'
    }
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid #e0e0e0',
        background: `linear-gradient(135deg, ${corporateColor} 0%, ${alpha(corporateColor, 0.8)} 100%)`,
        color: 'white',
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontSize: '1rem' }}>
        Estadísticas del Sistema
      </Typography>
      
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: 1.5 
        }}
      >
        {statsItems.map((item, index) => (
          <Box
            key={index}
            sx={{
              p: 1.5,
              bgcolor: 'rgba(255, 255, 255, 0.15)',
              borderRadius: 1.5,
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Box
              sx={{
                p: 0.5,
                borderRadius: 1,
                color: item.color,
                bgcolor: 'white',
              }}
            >
              {item.icon}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography 
                variant="body1" 
                sx={{ 
                  fontWeight: 700, 
                  fontSize: '1rem',
                  lineHeight: 1.2 
                }}
              >
                {typeof item.value === 'string' ? item.value : item.value.toLocaleString()}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  opacity: 0.9,
                  fontSize: '0.7rem',
                  lineHeight: 1 
                }}
              >
                {item.label}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};
