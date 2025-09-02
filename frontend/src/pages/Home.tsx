import React from 'react';
import { Box, Typography } from '@mui/material';

export const Home: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: '#501b36', mb: 2 }}>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Contenido del dashboard eliminado.
      </Typography>
    </Box>
  );
};
