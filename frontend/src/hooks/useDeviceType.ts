import { useMediaQuery, useTheme } from '@mui/material';

export const useDeviceType = () => {
  const theme = useTheme();
  
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    // Función helper para decidir si usar versión móvil
    useMobileVersion: isMobile,
    // Función helper para decidir si usar versión optimizada
    useOptimizedVersion: isMobile || isTablet
  };
};
