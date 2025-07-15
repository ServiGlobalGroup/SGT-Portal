import React, { useState } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Box,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  SwipeableDrawer,
  AppBar,
} from '@mui/material';
import {
  Dashboard,
  Traffic,
  EventNote,
  Description,
  LocalShipping,
  MenuOpen,
  Close,
  AccountCircle,
  Settings,
  Logout,
  SupervisorAccount,
  People,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

const drawerWidth = 280;
const collapsedWidth = 80;

const menuItems = [
  { text: 'Inicio', icon: <Dashboard />, path: '/' },
  { text: 'Tráfico', icon: <Traffic />, path: '/traffic' },
  { text: 'Vacaciones', icon: <EventNote />, path: '/vacations' },
  { text: 'Documentos', icon: <Description />, path: '/documents' },
  { text: 'Órdenes', icon: <LocalShipping />, path: '/orders' },
  { text: 'Gestión de Usuarios', icon: <People />, path: '/users' },
  { text: 'Panel de Documentación', icon: <SupervisorAccount />, path: '/gestor' },
];

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobile?: boolean;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isCollapsed, 
  setIsCollapsed,
  isMobile = false,
  mobileMenuOpen = false,
  setMobileMenuOpen = () => {}
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleToggle = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuAction = (action: string) => {
    switch (action) {
      case 'perfil':
        navigate('/profile');
        break;
      case 'configuracion':
        navigate('/settings');
        break;
      case 'cerrar-sesion':
        // Aquí se manejaría el cierre de sesión
        console.log('Cerrando sesión...');
        break;
      default:
        console.log(`Acción seleccionada: ${action}`);
    }
    handleClose();
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const drawerContent = (
    <>
      <Toolbar sx={{ 
        minHeight: { xs: '64px !important', sm: '80px !important' }, 
        flexDirection: 'column', 
        justifyContent: 'center', 
        gap: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {(!isCollapsed || isMobile) && (              <Typography 
                variant="h6" 
                noWrap 
                component="div" 
                sx={{ 
                  color: '#1565C0',
                  fontWeight: 700,
                  textAlign: 'center',
                  fontSize: { xs: '1.1rem', sm: '1.1rem' },
                }}
              >
                Grupo SGT
              </Typography>
          )}
          {!isMobile && (              <IconButton
                onClick={handleToggle}
                size="small"
                sx={{
                  color: '#666666',
                  '&:hover': {
                    color: '#1565C0',
                    backgroundColor: 'rgba(21, 101, 192, 0.08)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
              {isCollapsed ? <MenuOpen /> : <Close />}
            </IconButton>
          )}
        </Box>
      </Toolbar>
      
      <Divider 
        sx={{ 
          backgroundColor: '#e0e0e0',
          margin: '0 16px',
          height: '1px',
          display: (isCollapsed && !isMobile) ? 'none' : 'block',
        }} 
      />
      
      <Box sx={{ overflow: 'hidden', mt: 2, flex: 1 }}>
        <List sx={{ px: 1 }}>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigation(item.path)}
                sx={{
                  borderRadius: 0,
                  minHeight: 48,
                  justifyContent: (isCollapsed && !isMobile) ? 'center' : 'flex-start',
                  px: (isCollapsed && !isMobile) ? 1 : 2,
                  '&.Mui-selected': {
                    background: 'rgba(52, 152, 219, 0.2)',
                    color: '#3498db',
                    borderRadius: '4px',
                    '&:hover': {
                      background: 'rgba(52, 152, 219, 0.3)',
                      borderRadius: '4px',
                    },
                  },
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <ListItemIcon 
                  sx={{ 
                    color: location.pathname === item.path ? '#3498db' : '#bdc3c7',
                    minWidth: (isCollapsed && !isMobile) ? 'auto' : 40,
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {(!isCollapsed || isMobile) && (
                  <ListItemText 
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.95rem',
                      fontWeight: location.pathname === item.path ? 600 : 400,
                      color: location.pathname === item.path ? '#3498db' : '#ecf0f1',
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
      
      <Box sx={{ mt: 'auto', p: 2 }}>
        {/* Separador superior con desvanecimiento */}
        <Box
          sx={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(189, 195, 199, 0.3) 20%, rgba(189, 195, 199, 0.3) 80%, transparent 100%)',
            mb: 3,
            mx: (isCollapsed && !isMobile) ? 0.5 : 1,
            display: 'block',
          }}
        />
        
        {/* Perfil de Usuario */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: (isCollapsed && !isMobile) ? 'column' : 'row',
            alignItems: 'center',
            gap: (isCollapsed && !isMobile) ? 1 : 2,
            justifyContent: 'center',
            px: 1,
            py: 2,
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              backgroundColor: 'rgba(21, 101, 192, 0.08)',
              transform: 'translateY(-1px)',
            },
          }}
          onClick={handleProfileClick}
        >
          <Avatar
            sx={{
              width: (isCollapsed && !isMobile) ? 36 : 42,
              height: (isCollapsed && !isMobile) ? 36 : 42,
              background: 'linear-gradient(135deg, #1565C0 0%, #42A5F5 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: (isCollapsed && !isMobile) ? '0.9rem' : '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: '2px solid rgba(21, 101, 192, 0.15)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                border: '2px solid rgba(21, 101, 192, 0.25)',
              },
            }}
          >
            JP
          </Avatar>
          
          {(!isCollapsed || isMobile) && (
            <Box sx={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#ecf0f1',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  lineHeight: 1.3,
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                Usuario
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#bdc3c7',
                  fontSize: '0.75rem',
                  display: 'block',
                  lineHeight: 1.2,
                  fontWeight: 400,
                  textTransform: 'capitalize',
                }}
              >
                Administrador
              </Typography>
            </Box>
          )}
          
          {/* Indicador visual para modo colapsado */}
          {(isCollapsed && !isMobile) && (
            <Box
              sx={{
                width: 3,
                height: 3,
                borderRadius: '50%',
                backgroundColor: '#1565C0',
                mt: 0.5,
              }}
            />
          )}
        </Box>
        
        {/* Menú del perfil */}
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
          anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
          sx={{
            '& .MuiPaper-root': {
              borderRadius: '8px',
              minWidth: 200,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              background: '#ffffff',
            },
          }}
        >
          <MenuItem 
            onClick={() => handleMenuAction('perfil')}
            sx={{
              py: 1.5,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            <ListItemIcon>
              <AccountCircle sx={{ color: '#1565C0' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Mi Perfil" 
              primaryTypographyProps={{
                fontSize: '0.95rem',
                fontWeight: 500,
              }}
            />
          </MenuItem>
          
          <MenuItem 
            onClick={() => handleMenuAction('configuracion')}
            sx={{
              py: 1.5,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            <ListItemIcon>
              <Settings sx={{ color: '#1565C0' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Configuración" 
              primaryTypographyProps={{
                fontSize: '0.95rem',
                fontWeight: 500,
              }}
            />
          </MenuItem>
          
          <Divider sx={{ my: 1 }} />
          
          <MenuItem 
            onClick={() => handleMenuAction('cerrar-sesion')}
            sx={{
              py: 1.5,
              '&:hover': {
                backgroundColor: 'rgba(211, 47, 47, 0.05)',
              },
            }}
          >
            <ListItemIcon>
              <Logout sx={{ color: '#d32f2f' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Cerrar Sesión" 
              primaryTypographyProps={{
                fontSize: '0.95rem',
                fontWeight: 500,
                color: '#d32f2f',
              }}
            />
          </MenuItem>
        </Menu>
      </Box>
    </>
  );

  if (isMobile) {
    return (
      <>
        {/* AppBar para móviles */}
        <AppBar 
          position="fixed" 
          sx={{ 
            zIndex: (theme) => theme.zIndex.drawer + 1,
            background: '#2c3e50',
            color: 'white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            display: { xs: 'block', md: 'none' }
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={() => setMobileMenuOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
              Grupo SGT
            </Typography>
          </Toolbar>
        </AppBar>
        
        {/* Drawer deslizable para móviles */}
        <SwipeableDrawer
          anchor="left"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          onOpen={() => setMobileMenuOpen(true)}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              background: 'linear-gradient(180deg, #2c3e50 0%, #34495e 100%)',
              color: 'white',
              border: 'none',
              boxShadow: '2px 0 10px rgba(0,0,0,0.15)',
            },
          }}
        >
          {drawerContent}
        </SwipeableDrawer>

        {/* Espaciador para el AppBar */}
        <Toolbar sx={{ display: { xs: 'block', md: 'none' } }} />
      </>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: isCollapsed ? collapsedWidth : drawerWidth,
        flexShrink: 0,
        display: { xs: 'none', md: 'block' },
        '& .MuiDrawer-paper': {
          width: isCollapsed ? collapsedWidth : drawerWidth,
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #2c3e50 0%, #34495e 100%)',
          color: 'white',
          border: 'none',
          boxShadow: '2px 0 10px rgba(0,0,0,0.15)',
          borderRadius: 0,
          transition: 'width 0.3s ease',
          overflowX: 'hidden',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};
