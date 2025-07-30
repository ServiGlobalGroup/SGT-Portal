import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { canAccessRoute, getDefaultRoute } from '../utils/permissions';
import { Box, CircularProgress, Typography } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Mostrar loading mientras se verifica la autenticación
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress size={40} sx={{ color: '#501b36' }} />
        <Typography variant="body2" color="text.secondary">
          Verificando permisos...
        </Typography>
      </Box>
    );
  }

  // Si no hay usuario autenticado, redirigir al login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar si el usuario puede acceder a esta ruta
  if (!canAccessRoute(user, location.pathname)) {
    // Si no puede acceder, redirigir a la página permitida más apropiada
    const defaultRoute = getDefaultRoute(user);
    return <Navigate to={defaultRoute} replace />;
  }

  // Si todo está bien, renderizar el componente
  return <>{children}</>;
};
