import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Button,
  Stack,
} from '@mui/material';
import {
  Description,
  People,
  CalendarToday,
} from '@mui/icons-material';

const QuickActions: React.FC = () => (
  <Paper
    elevation={0}
    sx={{
      borderRadius: 2,
      border: '1px solid',
      borderColor: 'divider',
      overflow: 'hidden',
      // Ajuste para igualar la altura del panel de Actividad Reciente
      display: 'flex',
      flexDirection: 'column',
      height: { xs: 'auto', md: 500 },
    }}
  >
    <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        Acciones Rápidas
      </Typography>
    </Box>
    
    <Box sx={{ p: 3, flex: 1, display: 'flex' }}>
      <Stack spacing={2} sx={{ width: '100%', alignSelf: 'flex-start' }}>
        <Button
          variant="outlined"
          fullWidth
          startIcon={<Description />}
          sx={{
            justifyContent: 'flex-start',
            borderRadius: 2,
            py: 1.5,
            textTransform: 'none',
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
          }}
          onClick={() => window.location.href = '/vacations'}
        >
          Ver Vacaciones
        </Button>
      </Stack>
    </Box>
  </Paper>
);

export default QuickActions;
