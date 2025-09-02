import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Paper,
} from '@mui/material';

interface MobileLoadingProps {
  message?: string;
  corporateColor?: string;
}

export const MobileLoading: React.FC<MobileLoadingProps> = ({
  message = 'Cargando...',
  corporateColor = '#501b36'
}) => {
  return (
    <Box 
      sx={{ 
        p: 2, 
        maxWidth: '100%', 
        bgcolor: '#f5f5f5', 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 3,
          border: '1px solid #e0e0e0',
          background: '#ffffff',
          textAlign: 'center',
          maxWidth: 300,
          width: '100%',
        }}
      >
        <Box sx={{ mb: 3 }}>
          <CircularProgress 
            size={48} 
            sx={{ 
              color: corporateColor,
              mb: 2
            }} 
          />
        </Box>
        
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 600, 
            color: corporateColor,
            mb: 1
          }}
        >
          {message}
        </Typography>
        
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'text.secondary',
            lineHeight: 1.4
          }}
        >
          Por favor espera un momento...
        </Typography>
      </Paper>
    </Box>
  );
};
