import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  Avatar, 
  IconButton, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText,
  Divider,
  Chip
} from '@mui/material';
import { 
  AccountCircle, 
  Settings, 
  Logout, 
  Person,
  AdminPanelSettings,
  Work,
  Brightness4,
  Brightness7
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const drawerWidth = 240;
const collapsedWidth = 80;

interface HeaderProps {
  isCollapsed: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isCollapsed }) => {
  const currentWidth = isCollapsed ? collapsedWidth : drawerWidth;
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuAction = async (action: string) => {
    switch (action) {
      case 'perfil':
        navigate('/profile');
        break;
      case 'configuracion':
        navigate('/settings');
        break;
      case 'cerrar-sesion':
        try {
          await logout();
          navigate('/login');
        } catch (error) {
          console.error('Error al cerrar sesión:', error);
        }
        break;
      default:
        console.log(`Acción seleccionada: ${action}`);
    }
    handleClose();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <AdminPanelSettings sx={{ fontSize: 16 }} />;
      case 'MANAGER':
        return <Work sx={{ fontSize: 16 }} />;
      default:
        return <Person sx={{ fontSize: 16 }} />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'error';
      case 'MANAGER':
        return 'warning';
      default:
        return 'primary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrador';
      case 'MANAGER':
        return 'Gerente';
      default:
        return 'Empleado';
    }
  };

  // Función para obtener las iniciales del nombre
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };
  
  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: `calc(100vw - ${currentWidth}px)`,
        ml: `${currentWidth}px`,
        background: '#ffffff',
        border: 'none',
        borderBottom: '1px solid #e0e0e0',
        color: '#212121',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        borderRadius: 0,
        transition: 'all 0.3s ease',
      }}
    >
      <Toolbar sx={{ minHeight: '80px !important' }}>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 'auto' }}>
          {/* Información del usuario */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <Typography 
              variant="h6" 
              sx={{ 
                color: '#212121',
                fontWeight: 700,
                fontSize: '1rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                lineHeight: 1.2
              }}
            >
              {user ? `${user.last_name}, ${user.first_name}` : 'USUARIO'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Chip
                icon={getRoleIcon(user?.role || 'EMPLOYEE')}
                label={getRoleLabel(user?.role || 'EMPLOYEE')}
                size="small"
                color={getRoleColor(user?.role || 'EMPLOYEE') as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'}
                variant="outlined"
                sx={{ 
                  fontSize: '0.75rem',
                  height: '24px',
                  '& .MuiChip-label': { px: 1 },
                  '& .MuiChip-icon': { fontSize: '14px !important' }
                }}
              />
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#666',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}
              >
                {user?.department || 'Departamento'}
              </Typography>
            </Box>
          </Box>
          
          <IconButton
            onClick={handleClick}
            sx={{
              p: 0,
              '&:hover': {
                backgroundColor: 'transparent',
              },
            }}
          >
            <Avatar
              sx={{
                bgcolor: user?.role === 'ADMINISTRADOR' ? '#d32f2f' : 
                        user?.role === 'TRAFICO' ? '#ed6c02' : '#501b36',
                width: 45,
                height: 45,
                fontWeight: 700,
                fontSize: '1rem',
                border: '2px solid #fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }
              }}
            >
              {user ? getInitials(user.first_name, user.last_name) : 'U'}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            sx={{
              '& .MuiPaper-root': {
                borderRadius: '12px',
                minWidth: 200,
                boxShadow: '0 8px 32px rgba(80, 27, 54, 0.2)',
                border: '1px solid rgba(80, 27, 54, 0.1)',
                mt: 1,
              },
            }}
          >
            <MenuItem 
              onClick={() => handleMenuAction('perfil')}
              sx={{
                py: 1.5,
                '&:hover': {
                  backgroundColor: 'rgba(80, 27, 54, 0.05)',
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
                  backgroundColor: 'rgba(80, 27, 54, 0.05)',
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
      </Toolbar>
    </AppBar>
  );
};
