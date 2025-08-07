import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Stack,
  IconButton,
} from '@mui/material';
import {
  Dashboard,
  Description,
  DirectionsCar,
  Settings,
  ExitToApp,
  Close,
  Person,
  BusinessCenter,
  Assignment,
  CalendarToday,
  Receipt,
  RestaurantMenu,
} from '@mui/icons-material';

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  corporateColor?: string;
  userName?: string;
  userRole?: string;
  onNavigate?: (path: string) => void;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({
  open,
  onClose,
  corporateColor = '#501b36',
  userName = 'Usuario',
  userRole = 'Empleado',
  onNavigate,
}) => {
  const menuItems = [
    { icon: <Dashboard />, text: 'Dashboard', path: '/dashboard' },
    { icon: <Description />, text: 'Mis Documentos', path: '/documents' },
    { icon: <Receipt />, text: 'Nóminas', path: '/payroll' },
    { icon: <RestaurantMenu />, text: 'Dietas', path: '/dietas' },
    { icon: <CalendarToday />, text: 'Vacaciones', path: '/vacations' },
    { icon: <Assignment />, text: 'Permisos', path: '/permissions' },
    { icon: <DirectionsCar />, text: 'Tráfico', path: '/traffic' },
    { icon: <BusinessCenter />, text: 'Perfil', path: '/profile' },
    { icon: <Settings />, text: 'Configuración', path: '/settings' },
  ];

  const handleNavigation = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
    onClose();
  };

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '85vw', sm: '300px' },
          maxWidth: '350px',
          backgroundColor: '#ffffff',
          borderRight: `1px solid ${corporateColor}20`,
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header del Sidebar */}
        <Box
          sx={{
            background: `linear-gradient(135deg, ${corporateColor} 0%, ${corporateColor}dd 100%)`,
            color: 'white',
            p: 2,
            position: 'relative',
          }}
        >
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'white',
              backgroundColor: 'rgba(255,255,255,0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.2)',
              },
            }}
          >
            <Close />
          </IconButton>

          <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 1 }}>
            <Box
              component="img"
              src="/images/logosgt.webp"
              alt="SGT Logo"
              sx={{
                height: 40,
                width: 'auto',
                objectFit: 'contain',
                filter: 'brightness(0) invert(1)', // Hace el logo blanco
              }}
            />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                SGT Portal
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                Gestión Empresarial
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Avatar
              sx={{
                width: 60,
                height: 60,
                bgcolor: 'rgba(255,255,255,0.2)',
                border: '3px solid rgba(255,255,255,0.3)',
                mx: 'auto',
                mb: 1,
              }}
            >
              <Person sx={{ fontSize: 30 }} />
            </Avatar>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {userName}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {userRole}
            </Typography>
          </Box>
        </Box>

        {/* Menú de navegación */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          <List sx={{ p: 1 }}>
            {menuItems.map((item, index) => (
              <ListItem key={index} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    borderRadius: 2,
                    mx: 1,
                    '&:hover': {
                      backgroundColor: `${corporateColor}10`,
                      color: corporateColor,
                      '& .MuiListItemIcon-root': {
                        color: corporateColor,
                      },
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: '#666',
                      minWidth: 40,
                      '& .MuiSvgIcon-root': {
                        fontSize: 22,
                      },
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Divider sx={{ mx: 2, my: 1 }} />

          {/* Cerrar sesión */}
          <List sx={{ p: 1 }}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleNavigation('/logout')}
                sx={{
                  borderRadius: 2,
                  mx: 1,
                  color: '#e74c3c',
                  '&:hover': {
                    backgroundColor: '#e74c3c10',
                    '& .MuiListItemIcon-root': {
                      color: '#e74c3c',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: '#e74c3c',
                    minWidth: 40,
                    '& .MuiSvgIcon-root': {
                      fontSize: 22,
                    },
                  }}
                >
                  <ExitToApp />
                </ListItemIcon>
                <ListItemText
                  primary="Cerrar Sesión"
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: 500,
                  }}
                />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid #e0e0e0',
            backgroundColor: '#f8f9fa',
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" sx={{ color: '#666' }}>
            © 2025 ServiGlobal Group
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};
