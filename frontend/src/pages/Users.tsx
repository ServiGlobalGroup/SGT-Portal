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
  TextField,
  FormControl,
  InputLabel,
  Select,
  Card,
  CardContent,
  InputAdornment,
  Button,
  Dialog,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  MoreVert,
  Edit,
  Delete,
  Lock,
  Block,
  CheckCircle,
  Search,
  FilterList,
  PersonAdd,
  Visibility,
  VisibilityOff,
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
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE'>('all');
  
  // Estados para modal de creación de usuario
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [createUserData, setCreateUserData] = useState({
    dni_nie: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'EMPLOYEE' as 'ADMIN' | 'MANAGER' | 'EMPLOYEE',
    department: '',
    position: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [dniValidation, setDniValidation] = useState<{
    checking: boolean;
    exists: boolean;
    message: string;
  }>({
    checking: false,
    exists: false,
    message: ''
  });
  
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

  // Función para filtrar usuarios
  const filteredUsers = users.filter(user => {
    // Filtro por texto de búsqueda (nombre, apellidos, DNI/NIE)
    const searchText = searchTerm.toLowerCase().trim();
    const matchesSearch = !searchText || 
      user.first_name.toLowerCase().includes(searchText) ||
      user.last_name.toLowerCase().includes(searchText) ||
      user.full_name.toLowerCase().includes(searchText) ||
      user.dni_nie.toLowerCase().includes(searchText);

    // Filtro por estado
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active);

    // Filtro por rol
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

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
    const confirmMessage = `⚠️ PELIGRO: ¿Estás seguro de que deseas ELIMINAR PERMANENTEMENTE al usuario ${user?.first_name} ${user?.last_name}?\n\n🗑️ Esta acción es IRREVERSIBLE y eliminará:\n• El usuario completamente de la base de datos\n• Su carpeta personal y todos los archivos\n\n¿Continuar?`;
    
    if (!window.confirm(confirmMessage)) {
      handleCloseMenu();
      return;
    }

    // Doble confirmación para eliminación permanente
    const doubleConfirm = window.confirm(`⚠️ ÚLTIMA CONFIRMACIÓN:\n\nSe eliminará PERMANENTEMENTE:\n• Usuario: ${user?.first_name} ${user?.last_name}\n• Email: ${user?.email}\n• Carpeta personal: ${user?.dni_nie}/\n• Todos sus archivos\n\n¿Está ABSOLUTAMENTE seguro?`);
    
    if (!doubleConfirm) {
      handleCloseMenu();
      return;
    }

    try {
      await usersAPI.deleteUserPermanently(id);
      await loadUsers(); // Recargar la lista
      setAlert({ type: 'success', message: 'Usuario y carpeta eliminados permanentemente' });
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      setAlert({ type: 'error', message: 'Error al eliminar el usuario' });
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

  const handleAddUser = () => {
    setOpenCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setOpenCreateModal(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setDniValidation({ checking: false, exists: false, message: '' });
    setCreateUserData({
      dni_nie: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      role: 'EMPLOYEE',
      department: '',
      position: '',
      password: '',
      confirmPassword: ''
    });
  };

  // Función para verificar DNI en tiempo real
  const checkDniExists = async (dni: string) => {
    if (!dni || dni.length < 8) {
      setDniValidation({ checking: false, exists: false, message: '' });
      return;
    }

    // Validación de formato básica
    const dniRegex = /^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]$/i;
    const nieRegex = /^[XYZ][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$/i;
    
    if (!dniRegex.test(dni) && !nieRegex.test(dni)) {
      setDniValidation({ 
        checking: false, 
        exists: false, 
        message: 'Formato inválido. Ej: 12345678A o X1234567A' 
      });
      return;
    }

    setDniValidation({ checking: true, exists: false, message: 'Verificando...' });
    
    try {
      // Buscar en la lista actual de usuarios
      const existingUser = users.find(user => user.dni_nie.toLowerCase() === dni.toLowerCase());
      
      if (existingUser) {
        setDniValidation({ 
          checking: false, 
          exists: true, 
          message: `❌ DNI ya registrado por ${existingUser.first_name} ${existingUser.last_name}` 
        });
      } else {
        setDniValidation({ 
          checking: false, 
          exists: false, 
          message: '✅ DNI disponible' 
        });
      }
    } catch {
      setDniValidation({ 
        checking: false, 
        exists: false, 
        message: 'Error al verificar DNI' 
      });
    }
  };

  const handleCreateUser = async () => {
    // Validaciones básicas
    if (!createUserData.dni_nie || !createUserData.first_name || !createUserData.last_name || 
        !createUserData.email || !createUserData.department || !createUserData.password) {
      setAlert({ type: 'error', message: 'Por favor, complete todos los campos obligatorios' });
      return;
    }

    if (createUserData.password !== createUserData.confirmPassword) {
      setAlert({ type: 'error', message: 'Las contraseñas no coinciden' });
      return;
    }

    if (createUserData.password.length < 8) {
      setAlert({ type: 'error', message: 'La contraseña debe tener al menos 8 caracteres' });
      return;
    }

    // Validación de formato de DNI/NIE básica
    const dniRegex = /^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]$/i;
    const nieRegex = /^[XYZ][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$/i;
    if (!dniRegex.test(createUserData.dni_nie) && !nieRegex.test(createUserData.dni_nie)) {
      setAlert({ type: 'error', message: 'Formato de DNI/NIE inválido. Ejemplo: 12345678A o X1234567A' });
      return;
    }

    // Validación de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createUserData.email)) {
      setAlert({ type: 'error', message: 'Formato de email inválido' });
      return;
    }

    setCreateUserLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...userData } = createUserData;
      await usersAPI.createUser(userData);
      setAlert({ 
        type: 'success', 
        message: `Usuario ${createUserData.first_name} ${createUserData.last_name} creado exitosamente. Se ha creado automáticamente su carpeta personal para documentos.` 
      });
      handleCloseCreateModal();
      await loadUsers(); // Recargar la lista
    } catch (error: unknown) {
      console.error('Error al crear usuario:', error);
      
      // Manejo específico de errores del backend
      interface ApiError {
        response?: {
          data?: {
            detail?: string;
          };
        };
        message?: string;
      }
      
      const apiError = error as ApiError;
      const errorMessage = apiError?.response?.data?.detail || apiError?.message;
      
      if (errorMessage?.includes('DNI/NIE')) {
        setAlert({ type: 'error', message: '❌ Este DNI/NIE ya está registrado en el sistema. Cada DNI/NIE debe ser único.' });
      } else if (errorMessage?.includes('email')) {
        setAlert({ type: 'error', message: '❌ Este email ya está registrado en el sistema. Use un email diferente.' });
      } else {
        setAlert({ type: 'error', message: '❌ Error al crear el usuario. Verifique los datos e inténtelo de nuevo.' });
      }
    } finally {
      setCreateUserLoading(false);
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
      {/* Encabezado con título y botón de añadir */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Gestión de Usuarios
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PersonAdd />}
          onClick={handleAddUser}
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Añadir Usuario
        </Button>
      </Box>

      {alert && (
        <Alert 
          severity={alert.type} 
          sx={{ mb: 2 }} 
          onClose={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      {/* Sección de Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FilterList sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" color="primary">
              Filtros de Búsqueda
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {/* Campo de búsqueda por texto */}
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <TextField
                fullWidth
                label="Buscar usuario"
                placeholder="Nombre, apellidos o DNI/NIE"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
            </Box>

            {/* Filtro por estado */}
            <Box sx={{ flex: '1 1 200px', minWidth: '180px' }}>
              <FormControl fullWidth size="small">
                <InputLabel>Estado</InputLabel>
                <Select
                  value={statusFilter}
                  label="Estado"
                  onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                >
                  <MenuItem value="all">Todos los estados</MenuItem>
                  <MenuItem value="active">Activos</MenuItem>
                  <MenuItem value="inactive">Inactivos</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Filtro por rol */}
            <Box sx={{ flex: '1 1 200px', minWidth: '180px' }}>
              <FormControl fullWidth size="small">
                <InputLabel>Rol</InputLabel>
                <Select
                  value={roleFilter}
                  label="Rol"
                  onChange={(e: SelectChangeEvent) => setRoleFilter(e.target.value as 'all' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE')}
                >
                  <MenuItem value="all">Todos los roles</MenuItem>
                  <MenuItem value="ADMIN">Administrador</MenuItem>
                  <MenuItem value="MANAGER">Gerente</MenuItem>
                  <MenuItem value="EMPLOYEE">Empleado</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Información de resultados */}
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" color="textSecondary">
              Mostrando {filteredUsers.length} de {users.length} usuarios
              {searchTerm && ` • Búsqueda: "${searchTerm}"`}
              {statusFilter !== 'all' && ` • Estado: ${statusFilter === 'active' ? 'Activos' : 'Inactivos'}`}
              {roleFilter !== 'all' && ` • Rol: ${getRoleText(roleFilter)}`}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Lista de Usuarios ({filteredUsers.length})
        </Typography>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Usuario</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Rol</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Departamento</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Acciones</TableCell>
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
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="body2" color="textSecondary">
                      {users.length === 0 ? 'No se encontraron usuarios' : 'No hay usuarios que coincidan con los filtros aplicados'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: '#1565C0',
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
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Typography variant="body2">{user.email}</Typography>
                      {user.phone && (
                        <Typography variant="caption" color="textSecondary">
                          {user.phone}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Chip
                        label={getRoleText(user.role)}
                        size="small"
                        color={getRoleColor(user.role)}
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Typography variant="body2">{user.department}</Typography>
                      {user.position && (
                        <Typography variant="caption" color="textSecondary">
                          {user.position}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Chip
                        label={user.is_active ? 'Activo' : 'Inactivo'}
                        size="small"
                        color={user.is_active ? 'success' : 'default'}
                        icon={user.is_active ? <CheckCircle /> : <Block />}
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
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

      {/* Modal para crear usuario */}
      <Dialog 
        open={openCreateModal} 
        onClose={handleCloseCreateModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }
        }}
      >
        <Box sx={{ 
          bgcolor: '#1976d2', 
          color: 'white', 
          p: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <PersonAdd sx={{ fontSize: 28 }} />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Crear Nuevo Usuario
          </Typography>
        </Box>
        
        <Box sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Primera fila: DNI y Email */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
              <TextField
                label="DNI/NIE"
                required
                value={createUserData.dni_nie}
                onChange={(e) => {
                  const dni = e.target.value.toUpperCase();
                  setCreateUserData(prev => ({ ...prev, dni_nie: dni }));
                  checkDniExists(dni);
                }}
                placeholder="12345678A"
                variant="outlined"
                fullWidth
                error={dniValidation.exists}
                helperText={dniValidation.message}
                InputProps={{
                  endAdornment: dniValidation.checking ? (
                    <InputAdornment position="end">
                      <CircularProgress size={20} />
                    </InputAdornment>
                  ) : null,
                }}
              />
            
              <TextField
                label="Email"
                type="email"
                required
                value={createUserData.email}
                onChange={(e) => setCreateUserData(prev => ({ ...prev, email: e.target.value.toLowerCase() }))}
                placeholder="usuario@empresa.com"
                variant="outlined"
                fullWidth
              />
            </Box>

            {/* Segunda fila: Nombre y Apellidos */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
              <TextField
                label="Nombre"
                required
                value={createUserData.first_name}
                onChange={(e) => setCreateUserData(prev => ({ ...prev, first_name: e.target.value }))}
                variant="outlined"
                fullWidth
              />
            
              <TextField
                label="Apellidos"
                required
                value={createUserData.last_name}
                onChange={(e) => setCreateUserData(prev => ({ ...prev, last_name: e.target.value }))}
                variant="outlined"
                fullWidth
              />
            </Box>

            {/* Tercera fila: Departamento y Rol */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
              <TextField
                label="Departamento"
                required
                value={createUserData.department}
                onChange={(e) => setCreateUserData(prev => ({ ...prev, department: e.target.value }))}
                placeholder="IT, RRHH, Administración..."
                variant="outlined"
                fullWidth
              />
            
              <FormControl variant="outlined" fullWidth required>
                <InputLabel>Rol</InputLabel>
                <Select
                  value={createUserData.role}
                  label="Rol"
                  onChange={(e: SelectChangeEvent) => 
                    setCreateUserData(prev => ({ ...prev, role: e.target.value as 'ADMIN' | 'MANAGER' | 'EMPLOYEE' }))
                  }
                >
                  <MenuItem value="EMPLOYEE">Empleado</MenuItem>
                  <MenuItem value="MANAGER">Gerente</MenuItem>
                  <MenuItem value="ADMIN">Administrador</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Cuarta fila: Contraseñas */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
              <TextField
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                required
                value={createUserData.password}
                onChange={(e) => setCreateUserData(prev => ({ ...prev, password: e.target.value }))}
                variant="outlined"
                fullWidth
                error={
                  createUserData.password !== '' && 
                  createUserData.confirmPassword !== '' && 
                  createUserData.password !== createUserData.confirmPassword
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                helperText={
                  createUserData.password !== '' && 
                  createUserData.confirmPassword !== '' && 
                  createUserData.password !== createUserData.confirmPassword
                    ? "Las contraseñas no coinciden"
                    : createUserData.password !== '' && createUserData.password.length < 8
                    ? "Mínimo 8 caracteres"
                    : "Mínimo 8 caracteres"
                }
              />
            
              <TextField
                label="Confirmar Contraseña"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={createUserData.confirmPassword}
                onChange={(e) => setCreateUserData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                variant="outlined"
                fullWidth
                error={
                  createUserData.confirmPassword !== '' && 
                  createUserData.password !== createUserData.confirmPassword
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                helperText={
                  createUserData.confirmPassword !== '' && createUserData.password !== createUserData.confirmPassword 
                    ? "Las contraseñas no coinciden" 
                    : createUserData.confirmPassword !== '' && createUserData.password === createUserData.confirmPassword
                    ? "Las contraseñas coinciden ✓"
                    : "Repite la contraseña"
                }
              />
            </Box>
          </Box>
        </Box>
        
        <Box sx={{ 
          p: 3, 
          borderTop: '1px solid #e0e0e0',
          display: 'flex', 
          justifyContent: 'flex-end',
          gap: 2,
          bgcolor: '#fafafa'
        }}>
          <Button 
            onClick={handleCloseCreateModal}
            variant="outlined"
            size="large"
            disabled={createUserLoading}
            sx={{ minWidth: 120 }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleCreateUser}
            variant="contained"
            size="large"
            startIcon={createUserLoading ? <CircularProgress size={20} color="inherit" /> : <PersonAdd />}
            disabled={
              createUserLoading ||
              dniValidation.exists ||
              !createUserData.dni_nie || 
              !createUserData.first_name || 
              !createUserData.last_name || 
              !createUserData.email || 
              !createUserData.department || 
              !createUserData.password ||
              createUserData.password !== createUserData.confirmPassword ||
              createUserData.password.length < 8
            }
            sx={{ minWidth: 140 }}
          >
            {createUserLoading ? 'Creando...' : 'Crear Usuario'}
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
};

export default Users;
