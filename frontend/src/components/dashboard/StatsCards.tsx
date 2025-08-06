import React from 'react';
import {
  Paper,
  Box,
  Typography,
  CircularProgress,
  Fade,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';

interface StatsCardProps {
  title: string;
  value: number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  change, 
  icon, 
  color, 
  loading = false 
}) => (
  <Paper
    elevation={0}
    sx={{
      p: 3,
      borderRadius: 2,
      border: '1px solid',
      borderColor: 'divider',
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

export default StatsCard;
