import React, { useState, useEffect, useCallback } from 'react';
import { usersAPI } from '../services/api';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  MoreVert,
  Edit,
  Delete,
  Lock,
  Block,
  CheckCircle,
} from '@mui/icons-material';

interface User {
  id: number;
  dni_nie: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  department: string;
  position?: string;
  is_active: boolean;
  created_at: string;
  full_name: string;
  initials: string;
}

export const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Estados para menú contextual
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Función para cargar usuarios desde la API
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await usersAPI.getUsers({
        active_only: false // Mostrar TODOS los usuarios (activos e inactivos)
      });
      setUsers(response.users || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      setAlert({ type: 'error', message: 'Error al cargar los usuarios' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar usuarios al montar el componente
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Auto-ocultar alertas
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Handlers para menú contextual
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  // Funciones de acciones
  const handleDeleteUser = async (id: number) => {
    const user = users.find(u => u.id === id);
    const confirmMessage = `¿Estás seguro de que deseas desactivar al usuario ${user?.first_name} ${user?.last_name}?`;
    
    if (!window.confirm(confirmMessage)) {
      handleCloseMenu();
      return;
    }

    try {
      await usersAPI.deleteUser(id);
      await loadUsers(); // Recargar la lista
      setAlert({ type: 'success', message: 'Usuario desactivado correctamente' });
    } catch (error) {
      console.error('Error al desactivar usuario:', error);
      setAlert({ type: 'error', message: 'Error al desactivar el usuario' });
    } finally {
      handleCloseMenu();
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await usersAPI.toggleUserStatus(id);
      setAlert({ type: 'success', message: 'Estado del usuario actualizado correctamente' });
      await loadUsers(); // Recargar la lista
    } catch (error) {
      console.error('Error al cambiar estado del usuario:', error);
      setAlert({ type: 'error', message: 'Error al cambiar el estado del usuario' });
    }
    handleCloseMenu();
  };

  const handleResetPassword = async (user: User) => {
    const newPassword = prompt(`Ingrese la nueva contraseña para ${user.first_name} ${user.last_name}:`);
    if (!newPassword) {
      handleCloseMenu();
      return;
    }

    try {
      await usersAPI.changePassword(user.id, {
        new_password: newPassword,
        confirm_password: newPassword
      });
      setAlert({ type: 'success', message: `Contraseña restablecida para ${user.first_name} ${user.last_name}` });
    } catch (error) {
      console.error('Error al restablecer contraseña:', error);
      setAlert({ type: 'error', message: 'Error al restablecer la contraseña' });
    } finally {
      handleCloseMenu();
    }
  };

  // Funciones auxiliares
  const getRoleColor = (role: string): 'error' | 'warning' | 'info' | 'default' => {
    switch (role) {
      case 'ADMIN': return 'error';
      case 'MANAGER': return 'warning';
      case 'EMPLOYEE': return 'info';
      default: return 'default';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Administrador';
      case 'MANAGER': return 'Gerente';
      case 'EMPLOYEE': return 'Empleado';
      default: return role;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Gestión de Usuarios
      </Typography>

      {alert && (
        <Alert 
          severity={alert.type} 
          sx={{ mb: 2 }} 
          onClose={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Lista de Usuarios ({users.length})
        </Typography>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Usuario</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Rol</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Departamento</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3 }}>
                    <CircularProgress />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Cargando usuarios...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="body2" color="textSecondary">
                      No se encontraron usuarios
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: '#501b36',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold'
                        }}>
                          {user.initials}
                        </Box>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {user.full_name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            DNI: {user.dni_nie}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.email}</Typography>
                      {user.phone && (
                        <Typography variant="caption" color="textSecondary">
                          {user.phone}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleText(user.role)}
                        size="small"
                        color={getRoleColor(user.role)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.department}</Typography>
                      {user.position && (
                        <Typography variant="caption" color="textSecondary">
                          {user.position}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_active ? 'Activo' : 'Inactivo'}
                        size="small"
                        color={user.is_active ? 'success' : 'default'}
                        icon={user.is_active ? <CheckCircle /> : <Block />}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        onClick={(e) => handleMenuClick(e, user)}
                        size="small"
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Menú contextual */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => selectedUser && setAlert({ type: 'error', message: 'Función de edición en desarrollo' })}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => selectedUser && handleToggleStatus(selectedUser.id)}>
          <ListItemIcon>
            {selectedUser?.is_active ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
          </ListItemIcon>
          <ListItemText>
            {selectedUser?.is_active ? 'Desactivar' : 'Activar'}
          </ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => selectedUser && handleResetPassword(selectedUser)}>
          <ListItemIcon>
            <Lock fontSize="small" />
          </ListItemIcon>
          <ListItemText>Restablecer contraseña</ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={() => selectedUser && handleDeleteUser(selectedUser.id)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Delete fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Eliminar</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Users;
