import React, { useState } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { Sidebar } from './Sidebar';
import { ForcePasswordModal } from './ForcePasswordModal';
import { useAuth } from '../hooks/useAuth';

const drawerWidth = 280;
const collapsedWidth = 80;

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isCollapsed, setIsCollapsed] = useState(isMobile);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { mustChangePassword } = useAuth() as any;
  
  const currentWidth = isCollapsed ? collapsedWidth : drawerWidth;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <Sidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed}
        isMobile={isMobile}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1, sm: 3, md: 4 },
          width: { 
            xs: '100%',
            md: `calc(100vw - ${currentWidth}px)` 
          },
          ml: { xs: 0, md: 0 },
          mr: { xs: 0, md: 0 },
          mt: { xs: '64px', md: 0 }, // Espacio para AppBar en móvil
          background: '#f5f5f5',
          minHeight: { xs: 'calc(100vh - 64px)', md: '100vh' },
          position: 'relative',
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '100vw',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ 
          position: 'relative', 
          zIndex: 1, 
          width: '100%', 
          maxWidth: '100%',
          mx: 0,
          px: 0,
          pt: { xs: 0.5, sm: 2 },
          overflow: 'hidden',
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {children}
        </Box>
      </Box>
      
      {/* Modal para cambio obligatorio de contraseña */}
      <ForcePasswordModal open={mustChangePassword} />
    </Box>
  );
};
