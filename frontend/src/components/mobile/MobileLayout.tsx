import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  AppBar,
  Toolbar,
  Slide,
  useScrollTrigger,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications,
  AccountCircle,
  ArrowBack,
} from '@mui/icons-material';
import { MobileSidebar } from './MobileSidebar';

interface MobileLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  onMenuClick?: () => void;
  corporateColor?: string;
  backgroundColor?: string;
}

interface HideOnScrollProps {
  children: React.ReactElement;
}

function HideOnScroll({ children }: HideOnScrollProps) {
  const trigger = useScrollTrigger();
  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  );
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  title,
  subtitle,
  showBackButton = false,
  onBackClick,
  onMenuClick,
  corporateColor = '#501b36',
  backgroundColor = '#f5f7fa',
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuClick = () => {
    if (onMenuClick) {
      onMenuClick();
    } else {
      setSidebarOpen(true);
    }
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  const handleNavigation = (path: string) => {
    // Aquí puedes manejar la navegación según tu router
    console.log('Navegando a:', path);
    // Por ejemplo: navigate(path);
  };
  return (
    <Box
      className="mobile-container"
      sx={{
        minHeight: '100vh',
        width: '100vw',
        maxWidth: '100%',
        bgcolor: backgroundColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        position: 'relative',
        overflowX: 'hidden',
        margin: 0,
        padding: 0,
      }}
    >
      {/* Header fijo */}
      <HideOnScroll>
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            width: '100%',
            left: 0,
            right: 0,
            top: 0,
            bgcolor: corporateColor,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            zIndex: 1100,
          }}
        >
          <Toolbar
            sx={{
              px: 0,
              minHeight: '56px !important',
              justifyContent: 'center',
              width: '100%',
              maxWidth: '100%',
              position: 'relative',
              margin: 0,
              padding: 0,
            }}
          >
            {/* Lado izquierdo */}
            <Box
              sx={{
                position: 'absolute',
                left: { xs: 8, sm: 16 },
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              {showBackButton ? (
                <IconButton
                  onClick={onBackClick}
                  sx={{ color: 'white', p: 1 }}
                >
                  <ArrowBack />
                </IconButton>
              ) : (
                <>
                  <IconButton
                    onClick={handleMenuClick}
                    sx={{ color: 'white', p: 1 }}
                  >
                    <MenuIcon />
                  </IconButton>
                  <Box
                    component="img"
                    src="/images/logosgt.webp"
                    alt="SGT Logo"
                    sx={{
                      height: { xs: 28, sm: 32 },
                      width: 'auto',
                      objectFit: 'contain',
                      ml: 0.5,
                    }}
                  />
                </>
              )}
            </Box>

            {/* Centro - Título centrado */}
            <Box 
              sx={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                width: '100%',
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                px: { xs: 6, sm: 8 },
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: 'white',
                  fontWeight: 700,
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  width: '100%',
                }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: '0.75rem',
                    display: 'block',
                    lineHeight: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    width: '100%',
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>

            {/* Lado derecho */}
            <Box
              sx={{
                position: 'absolute',
                right: { xs: 8, sm: 16 },
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <IconButton
                sx={{ color: 'white', p: 1 }}
              >
                <Notifications sx={{ fontSize: 20 }} />
              </IconButton>
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  border: '2px solid rgba(255,255,255,0.3)',
                }}
              >
                <AccountCircle sx={{ color: 'white', fontSize: 16 }} />
              </Avatar>
            </Box>
          </Toolbar>
        </AppBar>
      </HideOnScroll>

      {/* Espaciado para el header fijo */}
      <Box sx={{ height: 56, flexShrink: 0 }} />

      {/* Contenido principal centrado */}
      <Box
        className="mobile-content-with-header mobile-scroll"
        sx={{
          flex: 1,
          width: '100vw',
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          overflowX: 'hidden',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          position: 'relative',
          left: 0,
          right: 0,
          margin: 0,
          padding: 0,
          pt: { xs: 2, sm: 3 },
          pb: { xs: 6, sm: 8 },
        }}
      >
        <Box
          className="mobile-content"
          sx={{
            width: '100%',
            maxWidth: { xs: '100%', sm: '600px', md: '768px' },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: { xs: 2, sm: 3 },
            px: { xs: 1, sm: 2 },
            position: 'relative',
            left: '50%',
            transform: 'translateX(-50%)',
            boxSizing: 'border-box',
          }}
        >
          {children}
        </Box>
      </Box>

      {/* Sidebar Móvil */}
      <MobileSidebar
        open={sidebarOpen}
        onClose={handleSidebarClose}
        corporateColor={corporateColor}
        userName="Usuario"
        userRole="Empleado"
        onNavigate={handleNavigation}
      />
    </Box>
  );
};
