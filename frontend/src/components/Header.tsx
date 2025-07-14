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
  Divider
} from '@mui/material';
import { 
  AccountCircle, 
  Settings, 
  Logout, 
  Person 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const drawerWidth = 240;
const collapsedWidth = 80;

interface HeaderProps {
  isCollapsed: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isCollapsed }) => {
  const currentWidth = isCollapsed ? collapsedWidth : drawerWidth;
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
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
          <Typography 
            variant="h6" 
            sx={{ 
              color: '#212121',
              fontWeight: 700,
              fontSize: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            PÉREZ, JUAN
          </Typography>
          
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
                width: 44,
                height: 44,
                background: '#1565C0',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: '2px solid rgba(0, 0, 0, 0.1)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  border: '2px solid rgba(0, 0, 0, 0.2)',
                },
              }}
            >
              <Person />
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
                boxShadow: '0 8px 32px rgba(114, 47, 55, 0.2)',
                border: '1px solid rgba(114, 47, 55, 0.1)',
                mt: 1,
              },
            }}
          >
            <MenuItem 
              onClick={() => handleMenuAction('perfil')}
              sx={{
                py: 1.5,
                '&:hover': {
                  backgroundColor: 'rgba(114, 47, 55, 0.05)',
                },
              }}
            >
              <ListItemIcon>
                <AccountCircle sx={{ color: '#722F37' }} />
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
                  backgroundColor: 'rgba(114, 47, 55, 0.05)',
                },
              }}
            >
              <ListItemIcon>
                <Settings sx={{ color: '#722F37' }} />
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
