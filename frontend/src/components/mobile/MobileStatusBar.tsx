import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Paper,
} from '@mui/material';

interface MobileStatusBarProps {
  current: number;
  total: number;
  label: string;
  corporateColor?: string;
  loading?: boolean;
}

export const MobileStatusBar: React.FC<MobileStatusBarProps> = ({
  current,
  total,
  label,
  corporateColor = '#501b36',
  loading = false
}) => {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: '1px solid #e0e0e0',
        borderRadius: 2,
        background: '#ffffff',
      }}
    >
      <Box sx={{ mb: 1 }}>
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: 600, 
            color: corporateColor,
            mb: 0.5 
          }}
        >
          {label}
        </Typography>
        
        <Typography 
          variant="body2" 
          sx={{ color: 'text.secondary' }}
        >
          {current} de {total}
        </Typography>
      </Box>
      
      {loading ? (
        <LinearProgress 
          sx={{ 
            height: 6, 
            borderRadius: 3,
            backgroundColor: '#f0f0f0',
            '& .MuiLinearProgress-bar': {
              backgroundColor: corporateColor,
            }
          }} 
        />
      ) : (
        <LinearProgress 
          variant="determinate" 
          value={percentage} 
          sx={{ 
            height: 6, 
            borderRadius: 3,
            backgroundColor: '#f0f0f0',
            '& .MuiLinearProgress-bar': {
              backgroundColor: corporateColor,
            }
          }} 
        />
      )}
      
      {!loading && (
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'text.secondary',
            display: 'block',
            textAlign: 'center',
            mt: 0.5
          }}
        >
          {percentage.toFixed(1)}% completado
        </Typography>
      )}
    </Paper>
  );
};
