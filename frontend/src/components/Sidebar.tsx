import React, { useState, useMemo } from 'react';
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
import { useAuth } from '../hooks/useAuth';
import { canAccessRoute, getRoleText } from '../utils/permissions';

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
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Filtrar elementos del menú según los permisos del usuario
  const allowedMenuItems = useMemo(() => {
    return menuItems.filter(item => canAccessRoute(user, item.path));
  }, [user]);

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
        logout();
        navigate('/login');
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between', width: '100%' }}>
          {(!isCollapsed || isMobile) && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                p: 1,
              }}
            >
              <Box
                component="img"
                src="/images/logosgt.png"
                alt="Grupo SGT"
                sx={{
                  height: 42,
                  width: 'auto',
                  maxWidth: '160px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))',
                }}
              />
            </Box>
          )}
          {!isMobile && (
            <IconButton
              onClick={handleToggle}
              disableRipple
              sx={{
                color: '#ffffff',
                ml: 'auto',
                boxShadow: 'none',
                border: 'none',
                outline: 'none',
                '&:hover': {
                  color: '#ffffff',
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  borderRadius: '8px',
                  boxShadow: 'none',
                },
                '&:focus': {
                  outline: 'none',
                  boxShadow: 'none',
                },
                '&:active': {
                  outline: 'none',
                  boxShadow: 'none',
                  transform: 'none',
                },
                '&.Mui-focusVisible': {
                  outline: 'none',
                  boxShadow: 'none',
                },
                transition: 'all 0.2s ease',
              }}
            >
              {isCollapsed ? <MenuOpen /> : <Close />}
            </IconButton>
          )}
        </Box>
      </Toolbar>
      
      <Divider 
        sx={{ 
          backgroundColor: '#501b36',
          margin: (isCollapsed && !isMobile) ? '0 8px' : '0 16px',
          height: '1px',
          display: 'block',
          opacity: (isCollapsed && !isMobile) ? 0.4 : 0.3,
        }} 
      />
      
      <Box sx={{ overflow: 'hidden', mt: 2, flex: 1 }}>
        <List sx={{ px: 1 }}>
          {allowedMenuItems.map((item) => (
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
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    borderRadius: '8px',
                    '& .MuiListItemIcon-root': {
                      color: '#ffffff',
                    },
                    '& .MuiListItemText-primary': {
                      color: '#ffffff',
                    },
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.25)',
                      borderRadius: '8px',
                    },
                  },
                  '&:hover': {
                    background: 'rgba(0, 0, 0, 0.1)',
                    borderRadius: '8px',
                    '& .MuiListItemIcon-root': {
                      color: '#ffffff',
                    },
                    '& .MuiListItemText-primary': {
                      color: '#ffffff',
                    },
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <ListItemIcon 
                  sx={{ 
                    color: location.pathname === item.path ? '#ffffff' : '#ffffff',
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
                      color: location.pathname === item.path ? '#ffffff' : '#ffffff',
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
            background: (isCollapsed && !isMobile) 
              ? 'linear-gradient(90deg, transparent 0%, rgba(212, 165, 116, 0.6) 20%, rgba(212, 165, 116, 0.6) 80%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, rgba(212, 165, 116, 0.5) 20%, rgba(212, 165, 116, 0.5) 80%, transparent 100%)',
            mb: 3,
            mx: (isCollapsed && !isMobile) ? 1 : 1,
            display: 'block',
            borderRadius: '0.5px',
            boxShadow: (isCollapsed && !isMobile) 
              ? '0 0 4px rgba(212, 165, 116, 0.4)'
              : '0 0 3px rgba(212, 165, 116, 0.3)',
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
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              background: 'rgba(0, 0, 0, 0.1)',
              transform: 'translateY(-1px)',
              '& .MuiAvatar-root': {
                transform: 'scale(1.05)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                border: '2px solid rgba(255, 255, 255, 0.25)',
              },
              '& .user-text': {
                color: '#ffffff',
              },
              '& .role-text': {
                color: '#ffffff',
              },
            },
          }}
          onClick={handleProfileClick}
        >
          <Avatar
            sx={{
              width: (isCollapsed && !isMobile) ? 36 : 42,
              height: (isCollapsed && !isMobile) ? 36 : 42,
              backgroundColor: '#501b36',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: (isCollapsed && !isMobile) ? '0.9rem' : '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: '2px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            }}
          >
            {user?.initials || user?.first_name?.charAt(0) || 'U'}
          </Avatar>
          
          {(!isCollapsed || isMobile) && (
            <Box sx={{ minWidth: 0, flex: 1, textAlign: 'left', maxWidth: '140px' }}>
              <Typography 
                variant="body2" 
                className="user-text"
                sx={{ 
                  color: '#ecf0f1',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  lineHeight: 1.2,
                  wordBreak: 'break-word',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  transition: 'color 0.2s ease',
                }}
              >
                {user?.full_name || user?.first_name || 'Usuario'}
              </Typography>
              <Typography 
                variant="caption" 
                className="role-text"
                sx={{ 
                  color: '#bdc3c7',
                  fontSize: '0.75rem',
                  display: 'block',
                  lineHeight: 1.2,
                  fontWeight: 400,
                  textTransform: 'capitalize',
                  transition: 'color 0.2s ease',
                }}
              >
                {getRoleText(user?.role || '')}
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
                backgroundColor: '#501b36',
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
              <AccountCircle sx={{ color: '#501b36' }} />
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
              <Settings sx={{ color: '#501b36' }} />
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
            background: '#501b36',
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
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 0.5,
                }}
              >
                <Box
                  component="img"
                  src="/images/logosgt.png"
                  alt="Grupo SGT"
                  sx={{
                    height: 32,
                    width: 'auto',
                    maxWidth: '120px',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4))',
                  }}
                />
              </Box>
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
              background: 'linear-gradient(45deg, #501b36 0%, #7d2d52 50%, #ffb347 100%)',
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
          background: 'linear-gradient(45deg, #501b36 0%, #7d2d52 50%, #ffb347 100%)',
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
