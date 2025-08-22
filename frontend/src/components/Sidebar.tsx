import React, { useState, useMemo, useEffect } from 'react';
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
  GlobalStyles,
  Collapse,
} from '@mui/material';
import {
  Traffic,
  EventNote,
  Description,
  LocalShipping,
  MenuOpen,
  Close,
  AccountCircle,
  Settings,
  Logout,
  Menu as MenuIcon,
  CloudUpload,
  ManageAccounts,
  ExpandLess,
  ExpandMore,
  Folder,
  Assignment,
  Dashboard,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { canAccessRoute, getRoleText, hasPermission, Permission } from '../utils/permissions';
// Eliminado import de ColorModeContext tras retirar dark mode

const drawerWidth = 280;
const collapsedWidth = 80;

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { 
    text: 'Gestor Docs', 
    icon: <Folder />, 
    children: [
      { text: 'Mis Documentos', icon: <Description />, path: '/' },
      { text: 'Documentación', icon: <Assignment />, path: '/gestor' },
      { text: 'Subida Masiva', icon: <CloudUpload />, path: '/mass-upload' },
    ]
  },
  { text: 'Vacaciones', icon: <EventNote />, path: '/vacations' },
  { text: 'Tráfico', icon: <Traffic />, path: '/traffic' },
  { text: 'Órdenes', icon: <LocalShipping />, path: '/orders' },
  { text: 'Gestión de Usuarios', icon: <ManageAccounts />, path: '/users' },
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
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const open = Boolean(anchorEl);

  // Filtrar elementos del menú según los permisos del usuario
  const allowedMenuItems = useMemo(() => {
    const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
      return items.filter(item => {
        if (item.path) {
          return canAccessRoute(user, item.path);
        }
        if (item.children) {
          const allowedChildren = filterMenuItems(item.children);
          return allowedChildren.length > 0;
        }
        return true;
      }).map(item => {
        if (item.children) {
          return {
            ...item,
            children: filterMenuItems(item.children)
          };
        }
        return item;
      });
    };
    
    return filterMenuItems(menuItems);
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

  const handleToggleSubmenu = (menuText: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(menuText)) {
        newSet.delete(menuText);
      } else {
        newSet.add(menuText);
      }
      return newSet;
    });
  };

  // Función para verificar si un menú padre debe estar activo
  const isParentActive = (item: MenuItem): boolean => {
    if (item.path && location.pathname === item.path) {
      return true;
    }
    if (item.children) {
      return item.children.some(child => child.path === location.pathname);
    }
    return false;
  };

  // Efecto para expandir automáticamente el menú padre cuando un hijo está activo
  useEffect(() => {
    menuItems.forEach(item => {
      if (item.children && isParentActive(item)) {
        setExpandedMenus(prev => new Set(prev).add(item.text));
      }
    });
  }, [location.pathname]);

  // Efecto para cerrar todos los submenús cuando el sidebar se colapsa
  useEffect(() => {
    if (isCollapsed && !isMobile) {
      setExpandedMenus(new Set());
    }
  }, [isCollapsed, isMobile]);

  const drawerContent = (
    <>
      <GlobalStyles
        styles={{
          // Optimizaciones para renderizado de líneas en diferentes zooms
          '.MuiDrawer-paper': {
            '& hr, & [role="separator"]': {
              transform: 'translateZ(0)',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
            },
            '& *': {
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
            },
          },
          // Optimizaciones específicas para líneas de separación
          '.sidebar-divider': {
            transform: 'translateZ(0)',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            imageRendering: 'crisp-edges',
            '&::before, &::after': {
              transform: 'translateZ(0)',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
            },
          },
        }}
      />
      <Toolbar sx={{ 
        minHeight: { xs: '64px !important', sm: '80px !important' }, 
        flexDirection: 'column', 
        justifyContent: 'center', 
        gap: 2,
        position: 'relative',
      }}>
        {/* Botón de toggle - movido a esquina superior derecha */}
        {!isMobile && (
          <IconButton
            onClick={handleToggle}
            disableRipple
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: '#ffffff',
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

        {/* Logo centrado */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          {(!isCollapsed || isMobile) && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 1,
                pt: 2, // Espacio extra para el botón
              }}
            >
              <Box
                component="img"
                src="/images/logosgt.webp"
                alt="Grupo SGT"
                sx={{
                  height: 45,
                  width: 'auto',
                  maxWidth: '180px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))',
                }}
              />
            </Box>
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
          transform: 'translateZ(0)', // Fuerza aceleración de hardware
          willChange: 'transform', // Optimiza para cambios de transformación
          borderRadius: '0.5px',
          flexShrink: 0, // Evita que se comprima
        }} 
      />
      
      <Box sx={{ overflow: 'hidden', mt: 2, flex: 1 }}>
        <List sx={{ px: 1 }}>
          {allowedMenuItems.map((item) => (
            <React.Fragment key={item.text}>
              <ListItem disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  selected={isParentActive(item)}
                  onClick={() => {
                    if (item.path) {
                      handleNavigation(item.path);
                    } else if (item.children) {
                      handleToggleSubmenu(item.text);
                    }
                  }}
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
                    color: isParentActive(item) ? '#ffffff' : '#ffffff',
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
                      fontWeight: isParentActive(item) ? 600 : 400,
                      color: isParentActive(item) ? '#ffffff' : '#ffffff',
                    }}
                  />
                )}
                {item.children && (!isCollapsed || isMobile) && (
                  expandedMenus.has(item.text) ? <ExpandLess sx={{ color: '#ffffff' }} /> : <ExpandMore sx={{ color: '#ffffff' }} />
                )}
              </ListItemButton>
            </ListItem>
            
            {/* Submenús */}
            {item.children && (!isCollapsed || isMobile) && (
              <Collapse in={expandedMenus.has(item.text)} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {item.children.map((subItem) => (
                    <ListItem key={subItem.text} disablePadding sx={{ mb: 0.5 }}>
                      <ListItemButton
                        selected={subItem.path ? location.pathname === subItem.path : false}
                        onClick={() => subItem.path && handleNavigation(subItem.path)}
                        sx={{
                          pl: 4,
                          borderRadius: 0,
                          minHeight: 40,
                          '&.Mui-selected': {
                            background: 'rgba(255, 255, 255, 0.2)',
                            color: '#ffffff',
                            borderRadius: '6px',
                            '& .MuiListItemIcon-root': {
                              color: '#ffffff',
                            },
                            '& .MuiListItemText-primary': {
                              color: '#ffffff',
                            },
                          },
                          '&:hover': {
                            background: 'rgba(0, 0, 0, 0.1)',
                            borderRadius: '6px',
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
                            color: (subItem.path && location.pathname === subItem.path) ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                            minWidth: 30,
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {subItem.icon}
                        </ListItemIcon>
                        <ListItemText 
                          primary={subItem.text}
                          primaryTypographyProps={{
                            fontSize: '0.85rem',
                            fontWeight: (subItem.path && location.pathname === subItem.path) ? 600 : 400,
                            color: (subItem.path && location.pathname === subItem.path) ? '#ffffff' : 'rgba(255, 255, 255, 0.9)',
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            )}
            </React.Fragment>
          ))}
        </List>
      </Box>
      
      <Box sx={{ mt: 'auto', p: 2 }}>
        {/* Separador superior con desvanecimiento mejorado */}
        <Box
          className="sidebar-divider"
          sx={{
            position: 'relative',
            height: '1px',
            mb: 3,
            mx: (isCollapsed && !isMobile) ? 1 : 1,
            display: 'block',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: (isCollapsed && !isMobile) 
                ? 'linear-gradient(90deg, transparent 0%, rgba(212, 165, 116, 0.6) 20%, rgba(212, 165, 116, 0.6) 80%, transparent 100%)'
                : 'linear-gradient(90deg, transparent 0%, rgba(212, 165, 116, 0.5) 20%, rgba(212, 165, 116, 0.5) 80%, transparent 100%)',
              borderRadius: '0.5px',
              transform: 'translateZ(0)', // Fuerza aceleración de hardware
              willChange: 'transform', // Optimiza para cambios de transformación
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              top: '-1px',
              left: '10%',
              right: '10%',
              bottom: '-1px',
              boxShadow: (isCollapsed && !isMobile) 
                ? '0 0 4px rgba(212, 165, 116, 0.4)'
                : '0 0 3px rgba(212, 165, 116, 0.3)',
              borderRadius: '1px',
              transform: 'translateZ(0)', // Fuerza aceleración de hardware
              willChange: 'transform', // Optimiza para cambios de transformación
            },
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
          
          {/* Solo mostrar Configuración si el usuario tiene permisos */}
          {hasPermission(user, Permission.VIEW_SETTINGS) && (
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
          )}
          
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
        {/* Botón flotante para abrir sidebar (solo cuando está cerrado) */}
        {!mobileMenuOpen && (
          <IconButton
            onClick={() => setMobileMenuOpen(true)}
            sx={{
              position: 'fixed',
              top: 16,
              left: 16,
              zIndex: (theme) => theme.zIndex.drawer + 2,
              bgcolor: 'rgba(80, 27, 54, 0.9)',
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(80, 27, 54, 1)',
                transform: 'scale(1.05)',
              },
              borderRadius: 2,
              p: 1.5,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <MenuIcon />
          </IconButton>
        )}
        
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
