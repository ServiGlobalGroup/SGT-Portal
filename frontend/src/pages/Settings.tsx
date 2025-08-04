import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert
} from '@mui/material';
import {
  Settings as SettingsIcon
} from '@mui/icons-material';

const Settings: React.FC = () => {
  return (
    <Box sx={{ 
      p: 3,
      maxWidth: 1200,
      mx: 'auto'
    }}>
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant="h3" 
          sx={{ 
            fontWeight: 'bold', 
            color: '#2c3e50',
            mb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          <SettingsIcon sx={{ fontSize: '2.5rem', color: '#3498db' }} />
          Configuración del Sistema
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Gestiona las configuraciones del portal SGT
        </Typography>
      </Box>

      <Paper 
        elevation={0} 
        sx={{ 
          borderRadius: '16px',
          p: 4,
          background: '#ffffff',
          border: '1px solid rgba(52, 152, 219, 0.1)',
          boxShadow: '0 10px 40px rgba(52, 152, 219, 0.1)'
        }}
      >
        <Alert 
          severity="info" 
          sx={{ 
            borderRadius: '12px',
            '& .MuiAlert-icon': {
              fontSize: '1.5rem'
            }
          }}
        >
          <Typography variant="body1">
            La página de configuración está en desarrollo. Próximamente estará disponible con todas las opciones de configuración del sistema.
          </Typography>
        </Alert>
      </Paper>
    </Box>
  );
};

export { Settings };
