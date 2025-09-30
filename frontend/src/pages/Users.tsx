import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useDeviceType } from '../hooks/useDeviceType';
import { MobileUsers } from './mobile/MobileUsers';
import { usersAPI } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { PaginationComponent } from '../components/PaginationComponent';
import { usePagination } from '../hooks/usePagination';
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
  InputAdornment,
  Button,
  Stack,
  Fade,
  GlobalStyles,
  alpha,
  Snackbar,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  MoreVert,
  Edit,
  Delete,
  Lock,
  Block,
  CheckCircle,
  RemoveCircle,
  Search,
  PersonAdd,
  Visibility,
  VisibilityOff,
  Person,
  Email,
  Badge,
  Business,
  Key,
  People,
  SupervisorAccount,
  Build,
  Warning,
} from '@mui/icons-material';
import { ModernModal } from '../components/ModernModal';
import { ModernField, InfoCard } from '../components/ModernFormComponents';

interface User {
  id: number;
  dni_nie: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: 'ADMINISTRADOR' | 'ADMINISTRACION' | 'TRAFICO' | 'TRABAJADOR' | 'P_TALLER';
  department: string;
  position?: string;
  worker_type?: 'antiguo' | 'nuevo';
  status?: 'ACTIVO' | 'INACTIVO' | 'BAJA';  // Nuevo sistema de estados
  is_active: boolean;  // Campo legacy
  created_at: string;
  full_name: string;
  initials: string;
}

export const Users: React.FC = () => {
  const { useMobileVersion } = useDeviceType();
  if (useMobileVersion) {
    return <MobileUsers />;
  }
  // Contexto de autenticación
  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error('Users must be used within an AuthProvider');
  }
  const { user: currentUser, selectedCompany } = authContext;

  // Helper para verificar si el usuario actual es administrador o maestro
  const isAdmin = currentUser?.role === 'ADMINISTRADOR' || currentUser?.role === 'ADMINISTRACION' || currentUser?.role === 'MASTER_ADMIN';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estado para notificaciones
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'baja'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'ADMINISTRADOR' | 'ADMINISTRACION' | 'TRAFICO' | 'TRABAJADOR' | 'P_TALLER'>('all');
  
  // Estados para modal de creación de usuario
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [createUserData, setCreateUserData] = useState({
    dni_nie: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  role: 'TRABAJADOR' as 'ADMINISTRADOR' | 'ADMINISTRACION' | 'TRAFICO' | 'TRABAJADOR' | 'P_TALLER',
    department: '',
    position: '',
  worker_type: 'antiguo' as 'antiguo' | 'nuevo',
    password: '',
    confirmPassword: ''
  });
  // Empresa seleccionada para la creación (solo visible para admins)
  const initialCreateCompany = (selectedCompany === 'SERVIGLOBAL' || selectedCompany === 'EMATRA')
    ? selectedCompany
    : ((typeof window !== 'undefined' && (localStorage.getItem('selected_company') === 'SERVIGLOBAL' || localStorage.getItem('selected_company') === 'EMATRA'))
        ? (localStorage.getItem('selected_company') as 'SERVIGLOBAL' | 'EMATRA')
        : 'SERVIGLOBAL');
  const [createUserCompany, setCreateUserCompany] = useState<'SERVIGLOBAL' | 'EMATRA'>(initialCreateCompany);
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
  
  // Estados para modal de restablecer contraseña
  const [openResetPasswordModal, setOpenResetPasswordModal] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  // Estados para modal de edición de usuarios
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editUserData, setEditUserData] = useState({
    dni_nie: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  role: 'TRABAJADOR' as 'ADMINISTRADOR' | 'ADMINISTRACION' | 'TRAFICO' | 'TRABAJADOR' | 'P_TALLER',
    department: '',
  position: '',
  worker_type: 'antiguo' as 'antiguo' | 'nuevo'
  });
  const [editUserLoading, setEditUserLoading] = useState(false);

  // Función para cargar usuarios desde la API
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Traer todas las páginas para no quedarnos en 100
      const response = await usersAPI.getAllUsers({ per_page: 100, active_only: false });
      setUsers(response.users || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      setSnackbar({
        open: true,
        message: 'Error al cargar los usuarios',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para actualizar un usuario específico sin recargar toda la lista
  const updateSingleUser = useCallback(async (userId: number) => {
    try {
      const response = await usersAPI.getUserById(userId);
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? response : user
        )
      );
    } catch (error) {
      console.error('Error actualizando usuario específico:', error);
      // Si falla la actualización específica, recargar toda la lista como fallback
      await loadUsers();
    }
  }, [loadUsers]);

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
      (statusFilter === 'active' && (user.status === 'ACTIVO' || (user.status === undefined && user.is_active))) ||
      (statusFilter === 'inactive' && (user.status === 'INACTIVO' || (user.status === undefined && !user.is_active))) ||
      (statusFilter === 'baja' && user.status === 'BAJA');

    // Filtro por rol
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  // Estados para paginación
  const pagination = usePagination({
    data: filteredUsers,
    initialItemsPerPage: 10,
    initialPage: 1
  });

  // Reset página cuando cambian los filtros
  useEffect(() => {
    pagination.setCurrentPage(1);
  }, [searchTerm, statusFilter, roleFilter]);

  // Cargar usuarios al montar el componente
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Función para cargar usuarios de forma silenciosa (sin loading ni errores)
  const loadUsersSilent = useCallback(async () => {
    try {
      const response = await usersAPI.getAllUsers({ per_page: 100, active_only: false });
      setUsers(response.users || []);
    } catch (error) {
      console.warn('Error en auto-refresh silencioso de usuarios:', error);
      // No mostrar notificación de error en auto-refresh
    }
  }, []);

  // Auto-refresh silencioso para evitar parpadeos
  useEffect(() => {
    const intervalMs = 30000; // 30 segundos
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadUsersSilent();
      }
    }, intervalMs);

    // Refrescar cuando la ventana vuelve a estar visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadUsersSilent();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadUsersSilent]);

  // Handlers para menú contextual
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    // No hacer setSelectedUser(null) aquí porque puede interferir con los modales
  };

  // Funciones de acciones
  const handleDeleteUser = async (id: number) => {
    // Verificar permisos de administrador
    if (!isAdmin) {
      setSnackbar({
        open: true,
        message: '❌ No tienes permisos para eliminar usuarios. Solo los administradores pueden realizar esta acción.',
        severity: 'error'
      });
      handleCloseMenu();
      return;
    }

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
      // Cerrar el menú después de las confirmaciones pero antes de la operación
      handleCloseMenu();
      
      await usersAPI.deleteUserPermanently(id);
      await loadUsers(); // Recargar la lista
      setSnackbar({
        open: true,
        message: 'Usuario y carpeta eliminados permanentemente',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      setSnackbar({
        open: true,
        message: 'Error al eliminar el usuario',
        severity: 'error'
      });
    }
  };

  const handleSetUserStatus = async (id: number, status: 'ACTIVO' | 'INACTIVO' | 'BAJA') => {
    // Verificar permisos de administrador
    if (!isAdmin) {
      setSnackbar({
        open: true,
        message: '❌ No tienes permisos para cambiar el estado de usuarios. Solo los administradores pueden realizar esta acción.',
        severity: 'error'
      });
      handleCloseMenu();
      return;
    }

    // Cerrar el menú primero para evitar problemas de posicionamiento
    handleCloseMenu();

    try {
      await usersAPI.setUserStatus(id, status);
      const statusLabels = {
        'ACTIVO': 'activo',
        'INACTIVO': 'inactivo', 
        'BAJA': 'de baja'
      };
      setSnackbar({ 
        open: true,
        message: `Usuario establecido como ${statusLabels[status]} correctamente`,
        severity: 'success'
      });
      await updateSingleUser(id); // Actualizar solo este usuario
    } catch (error) {
      console.error('Error al cambiar estado del usuario:', error);
      setSnackbar({
        open: true,
        message: 'Error al cambiar el estado del usuario',
        severity: 'error'
      });
    }
  };

  const handleResetPassword = async (user: User) => {
    // Verificar permisos de administrador
    if (!isAdmin) {
      setSnackbar({
        open: true,
        message: '❌ No tienes permisos para restablecer contraseñas. Solo los administradores pueden realizar esta acción.',
        severity: 'error'
      });
      return;
    }

    setSelectedUser(user);
    setOpenResetPasswordModal(true);
  };

  const handleCloseResetPasswordModal = () => {
    setOpenResetPasswordModal(false);
    setSelectedUser(null);
  };

  const handleConfirmResetPassword = async () => {
    if (!selectedUser) return;

    setResetPasswordLoading(true);
    try {
      await usersAPI.resetPassword(selectedUser.id);
      
      setSnackbar({
        open: true,
        message: `✅ Contraseña restablecida exitosamente para ${selectedUser.first_name} ${selectedUser.last_name}. La contraseña temporal es "12345678". El usuario deberá cambiarla en su próximo inicio de sesión.`,
        severity: 'success'
      });
      
      handleCloseResetPasswordModal();
      
    } catch (error: any) {
      console.error('Error al restablecer contraseña:', error);
      
      // Manejo específico de errores del backend
      const errorMessage = error?.response?.data?.detail || error?.message;
      
      if (errorMessage?.includes('permission') || errorMessage?.includes('unauthorized')) {
        setSnackbar({
          open: true,
          message: '❌ No tienes permisos suficientes para restablecer contraseñas',
          severity: 'error'
        });
      } else if (errorMessage?.includes('user not found')) {
        setSnackbar({
          open: true,
          message: '❌ Usuario no encontrado. Por favor, recarga la página e inténtalo de nuevo',
          severity: 'error'
        });
      } else {
        setSnackbar({
          open: true,
          message: '❌ Error al restablecer la contraseña. Verifica tu conexión e inténtalo de nuevo',
          severity: 'error'
        });
      }
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleAddUser = () => {
    // Verificar permisos de administrador
    if (!isAdmin) {
      setSnackbar({
        open: true,
        message: '❌ No tienes permisos para crear usuarios. Solo los administradores pueden realizar esta acción.',
        severity: 'error'
      });
      return;
    }
    
    // Al abrir, sincronizar la empresa por defecto con la empresa activa en la app
    if (selectedCompany === 'SERVIGLOBAL' || selectedCompany === 'EMATRA') {
      setCreateUserCompany(selectedCompany);
    }
    setOpenCreateModal(true);
  };

  // Función para abrir modal de edición
  const handleEditUser = (user: any) => {
    // Verificar permisos de administrador
    if (!isAdmin) {
      setSnackbar({
        open: true,
        message: '❌ No tienes permisos para editar usuarios. Solo los administradores pueden realizar esta acción.',
        severity: 'error'
      });
      return;
    }

    setEditUserData({
      dni_nie: user.dni_nie,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      department: user.department || '',
  position: user.position || '',
  worker_type: user.worker_type || 'antiguo'
    });
    setOpenEditModal(true);
    handleCloseMenu();
  };

  const handleCloseEditModal = () => {
    setOpenEditModal(false);
    setEditUserData({
      dni_nie: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      role: 'TRABAJADOR',
      department: '',
  position: '',
  worker_type: 'antiguo'
    });
  };

  // Función para actualizar usuario
  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    // Validaciones básicas
    if (!editUserData.dni_nie.trim() || !editUserData.first_name.trim() || 
        !editUserData.last_name.trim() || !editUserData.email.trim()) {
      setSnackbar({
        open: true,
        message: '❌ Por favor, completa todos los campos obligatorios (DNI/NIE, nombre, apellidos y email)',
        severity: 'error'
      });
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editUserData.email)) {
      setSnackbar({
        open: true,
        message: '❌ Por favor, ingresa un email válido',
        severity: 'error'
      });
      return;
    }

    setEditUserLoading(true);
    try {
      await usersAPI.updateUser(selectedUser.id, editUserData);
      
      setSnackbar({
        open: true,
        message: `✅ Usuario ${editUserData.first_name} ${editUserData.last_name} actualizado exitosamente`,
        severity: 'success'
      });
      
      handleCloseEditModal();
      await updateSingleUser(selectedUser.id); // Actualizar solo este usuario
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      setSnackbar({
        open: true,
        message: '❌ Error al actualizar el usuario. Verifica tu conexión e inténtalo de nuevo',
        severity: 'error'
      });
    } finally {
      setEditUserLoading(false);
    }
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
      role: 'TRABAJADOR',
      department: '',
      position: '',
  worker_type: 'antiguo',
      password: '',
      confirmPassword: ''
    });
    // Reset empresa al valor activo global
    if (selectedCompany === 'SERVIGLOBAL' || selectedCompany === 'EMATRA') {
      setCreateUserCompany(selectedCompany);
    } else {
      setCreateUserCompany('SERVIGLOBAL');
    }
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
      setSnackbar({
        open: true,
        message: 'Por favor, complete todos los campos obligatorios',
        severity: 'error'
      });
      return;
    }

    if (createUserData.password !== createUserData.confirmPassword) {
      setSnackbar({
        open: true,
        message: 'Las contraseñas no coinciden',
        severity: 'error'
      });
      return;
    }

    if (createUserData.password.length < 8) {
      setSnackbar({
        open: true,
        message: 'La contraseña debe tener al menos 8 caracteres',
        severity: 'error'
      });
      return;
    }

    // Validación de formato de DNI/NIE básica
    const dniRegex = /^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]$/i;
    const nieRegex = /^[XYZ][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$/i;
    if (!dniRegex.test(createUserData.dni_nie) && !nieRegex.test(createUserData.dni_nie)) {
      setSnackbar({
        open: true,
        message: 'Formato de DNI/NIE inválido. Ejemplo: 12345678A o X1234567A',
        severity: 'error'
      });
      return;
    }

    // Validación de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createUserData.email)) {
      setSnackbar({
        open: true,
        message: 'Formato de email inválido',
        severity: 'error'
      });
      return;
    }

    setCreateUserLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...userData } = createUserData;
  // Enviar header X-Company solo para esta petición (sin cambiar selección global)
  await usersAPI.createUser(userData, createUserCompany);
      setSnackbar({ 
        open: true,
        message: `Usuario ${createUserData.first_name} ${createUserData.last_name} creado exitosamente. Se ha creado automáticamente su carpeta personal para documentos.`,
        severity: 'success'
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
        setSnackbar({
          open: true,
          message: '❌ Este DNI/NIE ya está registrado en el sistema. Cada DNI/NIE debe ser único.',
          severity: 'error'
        });
      } else if (errorMessage?.includes('email')) {
        setSnackbar({
          open: true,
          message: '❌ Este email ya está registrado en el sistema. Use un email diferente.',
          severity: 'error'
        });
      } else {
        setSnackbar({
          open: true,
          message: '❌ Error al crear el usuario. Verifique los datos e inténtelo de nuevo.',
          severity: 'error'
        });
      }
    } finally {
      setCreateUserLoading(false);
    }
  };

  // Funciones auxiliares
  const getRoleColor = (role: string): 'error' | 'warning' | 'info' | 'default' => {
    switch (role) {
  case 'ADMINISTRADOR': return 'error';
  case 'ADMINISTRACION': return 'warning';
      case 'TRAFICO': return 'warning';
      case 'TRABAJADOR': return 'info';
      case 'P_TALLER': return 'info';
      default: return 'default';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
  case 'ADMINISTRADOR': return 'Administrador';
  case 'ADMINISTRACION': return 'Administración';
      case 'TRAFICO': return 'Tráfico';
      case 'TRABAJADOR': return 'Trabajador';
      case 'P_TALLER': return 'P. Taller';
      default: return role;
    }
  };

  return (
    <>
      <GlobalStyles
        styles={{
          body: {
            paddingRight: '0px !important',
            overflow: 'auto !important',
            overflowX: 'hidden !important',
          },
          '.MuiModal-root': {
            paddingRight: '0px !important',
          },
          '.MuiPopover-root': {
            paddingRight: '0px !important',
          },
          '.MuiTableContainer-root': {
            overflowX: 'hidden !important',
          },
          '.MuiTable-root': {
            overflowX: 'hidden !important',
          },
        }}
      />
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', bgcolor: '#f5f5f5', minHeight: '100vh' }}>
        {/* Header Principal */}
        <Box sx={{ mb: 4 }}>
          <Fade in timeout={800}>
            <Paper 
              elevation={0}
              sx={{
                p: { xs: 3, sm: 4 },
                background: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 55%, #d4a574 100%)',
                color: 'white',
                borderRadius: 3,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\\"60\\" height=\\"60\\" viewBox=\\"0 0 60 60\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cg fill=\\"none\\" fill-rule=\\"evenodd\\"%3E%3Cg fill=\\"%23ffffff\\" fill-opacity=\\"0.08\\"%3E%3Cpath d=\\"m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                },
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: 'rgba(255,255,255,0.18)',
                      borderRadius: 2,
                      backdropFilter: 'blur(8px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <SupervisorAccount sx={{ fontSize: 32 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Gestión de Usuarios
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
                      Administra usuarios, roles y permisos del sistema
                    </Typography>
                  </Box>
                  {isAdmin && (
                    <Button
                      variant="contained"
                      startIcon={<PersonAdd />}
                      onClick={handleAddUser}
                      sx={{ 
                        textTransform: 'none',
                        fontWeight: 600,
                        ml: 'auto',
                        borderRadius: 999,
                        bgcolor: 'rgba(255,255,255,0.18)',
                        color: 'white',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        px: 2.5,
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' }
                      }}
                    >
                      Añadir Usuario
                    </Button>
                  )}
                </Box>
              </Box>
            </Paper>
          </Fade>
        </Box>

        {/* Mensaje informativo para usuarios no administradores */}
        {!isAdmin && (
          <Fade in timeout={600}>
            <Alert 
              severity="info" 
              sx={{ 
                mb: 3,
                borderRadius: 2,
                bgcolor: 'rgba(2, 136, 209, 0.04)',
                border: '1px solid rgba(2, 136, 209, 0.2)',
                '& .MuiAlert-icon': {
                  fontSize: 24,
                  color: '#0288d1'
                }
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                <strong>Acceso de solo lectura:</strong> Puedes consultar la información de usuarios, pero solo los administradores pueden crear, editar o gestionar usuarios.
              </Typography>
            </Alert>
          </Fade>
        )}

        {/* Panel de Control */}
        <Fade in timeout={1000}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 2,
              border: '1px solid #e0e0e0',
              background: '#ffffff',
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              alignItems: 'center',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between'
            }}>
              <TextField
                placeholder="Buscar usuarios por nombre, apellidos o DNI/NIE..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
                sx={{ 
                  flex: 1,
                  maxWidth: { xs: '100%', sm: 400 },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#501b36',
                      },
                    },
                  },
                }}
                size="small"
              />
              
              <Stack direction="row" spacing={1}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel sx={{ 
                    '&.Mui-focused': { 
                      color: '#501b36' 
                    } 
                  }}>
                    Estado
                  </InputLabel>
                  <Select
                    value={statusFilter}
                    label="Estado"
                    onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive' | 'baja')}
                    sx={{
                      borderRadius: 2,
                      '&:hover': {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#501b36',
                        },
                      },
                      '&.Mui-focused': {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#501b36',
                        },
                      },
                    }}
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    <MenuItem value="active">Activos</MenuItem>
                    <MenuItem value="inactive">Inactivos</MenuItem>
                    <MenuItem value="baja">De Baja</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel sx={{ 
                    '&.Mui-focused': { 
                      color: '#501b36' 
                    } 
                  }}>
                    Rol
                  </InputLabel>
                  <Select
                    value={roleFilter}
                    label="Rol"
                    onChange={(e: SelectChangeEvent) => setRoleFilter(e.target.value as 'all' | 'ADMINISTRADOR' | 'ADMINISTRACION' | 'TRAFICO' | 'TRABAJADOR' | 'P_TALLER')}
                    sx={{
                      borderRadius: 2,
                      '&:hover': {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#501b36',
                        },
                      },
                      '&.Mui-focused': {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#501b36',
                        },
                      },
                    }}
                  >
                    <MenuItem value="all">Todos los roles</MenuItem>
                    <MenuItem value="ADMINISTRADOR">Administrador</MenuItem>
                    <MenuItem value="ADMINISTRACION">Administración</MenuItem>
                    <MenuItem value="TRAFICO">Tráfico</MenuItem>
                    <MenuItem value="TRABAJADOR">Trabajador</MenuItem>
                    <MenuItem value="P_TALLER">P. Taller</MenuItem>
                  </Select>
                </FormControl>

                {/* Botón Actualizar eliminado: hay auto-refresh silencioso */}
              </Stack>
            </Box>

            {/* Información de resultados */}
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="textSecondary">
                Mostrando {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} - {Math.min(pagination.currentPage * pagination.itemsPerPage, filteredUsers.length)} de {filteredUsers.length} usuarios
                {searchTerm && ` • Búsqueda: "${searchTerm}"`}
                {statusFilter !== 'all' && ` • Estado: ${
                  statusFilter === 'active' ? 'Activos' : 
                  statusFilter === 'baja' ? 'De Baja' : 
                  'Inactivos'
                }`}
                {roleFilter !== 'all' && ` • Rol: ${getRoleText(roleFilter)}`}
              </Typography>
            </Box>
          </Paper>
        </Fade>

        {/* Contenido Principal - Lista de Usuarios */}
        <Fade in timeout={1200}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              border: '1px solid #e0e0e0',
              background: '#ffffff',
            }}
          >
            {/* Header de la tabla */}
            <Box sx={{ 
              p: 3, 
              borderBottom: 1, 
              borderColor: 'divider',
              background: alpha('#501b36', 0.02),
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <People sx={{ color: '#501b36', fontSize: 28 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#501b36' }}>
                    Lista de usuarios
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Contenido de usuarios */}
            {loading ? (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 6,
                gap: 2
              }}>
                <CircularProgress size={48} sx={{ color: '#501b36' }} />
                <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                  Cargando usuarios...
                </Typography>
              </Box>
            ) : filteredUsers.length === 0 ? (
              <Box sx={{ 
                p: 6, 
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2
              }}>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: '50%',
                    bgcolor: alpha('#501b36', 0.1),
                    mb: 2,
                  }}
                >
                  <People sx={{ fontSize: 48, color: '#501b36' }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                  No se encontraron usuarios
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, maxWidth: 400 }}>
                  {users.length === 0 ? 'No hay usuarios registrados en el sistema' : 'No hay usuarios que coincidan con los filtros aplicados'}
                </Typography>
              </Box>
            ) : (
              <TableContainer
                sx={{
                  overflowX: 'hidden !important',
                  '&::-webkit-scrollbar': {
                    display: 'none',
                  },
                  '-ms-overflow-style': 'none',
                  'scrollbar-width': 'none',
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow 
                      sx={{ 
                        bgcolor: alpha('#501b36', 0.02),
                        '& .MuiTableCell-head': {
                          fontWeight: 700,
                          color: '#501b36',
                          borderBottom: `2px solid ${alpha('#501b36', 0.1)}`,
                          py: 2,
                        }
                      }}
                    >
                      <TableCell>Usuario</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Rol</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Departamento</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagination.paginatedData.map((user: any) => (
                      <TableRow 
                        key={user.id} 
                        hover
                        sx={{
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: alpha('#501b36', 0.02),
                            transform: 'translateX(4px)',
                          },
                          '& .MuiTableCell-root': {
                            borderBottom: `1px solid ${alpha('#501b36', 0.06)}`,
                            py: 2,
                          }
                        }}
                      >
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
                              <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
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
                            sx={{
                              borderRadius: 2,
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {(user.role === 'TRABAJADOR' || user.role === 'P_TALLER') && (
                            <Chip
                              label={user.worker_type === 'nuevo' ? 'Nuevo' : 'Antiguo'}
                              size="small"
                              variant="outlined"
                              color={user.worker_type === 'nuevo' ? 'success' : 'default'}
                              sx={{
                                borderRadius: 2,
                                fontWeight: 600,
                                fontSize: '0.65rem',
                              }}
                            />
                          )}
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
                            label={user.status || (user.is_active ? 'Activo' : 'Inactivo')}
                            size="small"
                            color={
                              user.status === 'ACTIVO' ? 'success' : 
                              user.status === 'BAJA' ? 'warning' : 
                              'error'
                            }
                            variant={
                              user.status === 'ACTIVO' ? 'filled' : 
                              user.status === 'BAJA' ? 'filled' : 
                              'outlined'
                            }
                            icon={
                              user.status === 'ACTIVO' ? <CheckCircle /> :
                              user.status === 'BAJA' ? <RemoveCircle /> :
                              <Block />
                            }
                            sx={{
                              borderRadius: 2,
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton 
                            onClick={(e) => handleMenuClick(e, user)}
                            size="small"
                            sx={{
                              borderRadius: 2,
                              bgcolor: alpha('#501b36', 0.08),
                              color: '#501b36',
                              '&:hover': {
                                bgcolor: alpha('#501b36', 0.12),
                              },
                            }}
                          >
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            
            {/* Información de paginación y controles */}
            {filteredUsers.length > 0 && (
              <Box sx={{ 
                p: 3, 
                borderTop: '1px solid #e0e0e0',
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'stretch', sm: 'center' },
                gap: 2,
                bgcolor: alpha('#501b36', 0.02),
              }}>
                <PaginationComponent
                  currentPage={pagination.currentPage}
                  itemsPerPage={pagination.itemsPerPage}
                  totalItems={filteredUsers.length}
                  onPageChange={pagination.setCurrentPage}
                  onItemsPerPageChange={pagination.setItemsPerPage}
                />
              </Box>
            )}
            </Paper>
          </Fade>

        {/* Menú contextual mejorado */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseMenu}
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              border: '1px solid #e0e0e0',
              mt: 1,
              minWidth: 200,
            }
          }}
        >
          {isAdmin && (
            <MenuItem onClick={() => selectedUser && handleEditUser(selectedUser)}>
              <ListItemIcon>
                <Edit fontSize="small" />
              </ListItemIcon>
              <ListItemText>Editar</ListItemText>
            </MenuItem>
          )}
          
          {isAdmin && selectedUser && (
            <>
              <MenuItem 
                onClick={() => handleSetUserStatus(selectedUser.id, 'ACTIVO')}
                disabled={selectedUser.status === 'ACTIVO'}
              >
                <ListItemIcon>
                  <CheckCircle fontSize="small" color={selectedUser.status === 'ACTIVO' ? 'success' : 'inherit'} />
                </ListItemIcon>
                <ListItemText>Establecer como Activo</ListItemText>
              </MenuItem>
              
              <MenuItem 
                onClick={() => handleSetUserStatus(selectedUser.id, 'INACTIVO')}
                disabled={selectedUser.status === 'INACTIVO'}
              >
                <ListItemIcon>
                  <Block fontSize="small" color={selectedUser.status === 'INACTIVO' ? 'error' : 'inherit'} />
                </ListItemIcon>
                <ListItemText>Establecer como Inactivo</ListItemText>
              </MenuItem>
              
              <MenuItem 
                onClick={() => handleSetUserStatus(selectedUser.id, 'BAJA')}
                disabled={selectedUser.status === 'BAJA'}
              >
                <ListItemIcon>
                  <RemoveCircle fontSize="small" color={selectedUser.status === 'BAJA' ? 'warning' : 'inherit'} />
                </ListItemIcon>
                <ListItemText>Establecer como Baja</ListItemText>
              </MenuItem>
            </>
          )}
          
          {isAdmin && (
            <MenuItem onClick={() => {
              if (selectedUser) {
                const userToReset = selectedUser; // Capturar el usuario antes de cerrar el menú
                handleCloseMenu(); // Cerrar menú primero
                handleResetPassword(userToReset); // Luego abrir modal con usuario correcto
              }
            }}>
              <ListItemIcon>
                <Lock fontSize="small" />
              </ListItemIcon>
              <ListItemText>Restablecer contraseña</ListItemText>
            </MenuItem>
          )}
          
          {isAdmin && (
            <MenuItem 
              onClick={() => selectedUser && handleDeleteUser(selectedUser.id)}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon>
                <Delete fontSize="small" sx={{ color: 'error.main' }} />
              </ListItemIcon>
              <ListItemText>Eliminar</ListItemText>
            </MenuItem>
          )}
        </Menu>

              {/* Modal para restablecer contraseña */}
        <ModernModal
          open={openResetPasswordModal}
          onClose={handleCloseResetPasswordModal}
          title="Restablecer Contraseña"
          subtitle={selectedUser ? `Cambiar contraseña para ${selectedUser.first_name} ${selectedUser.last_name}` : "Restablecer contraseña de usuario"}
          icon={<Lock />}
          maxWidth="sm"
          headerColor="#501b36"
          actions={
            <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={handleCloseResetPasswordModal}
                disabled={resetPasswordLoading}
                size="large"
                sx={{
                  borderRadius: 2,
                  px: 4,
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: '#501b36',
                  color: '#501b36',
                  '&:hover': {
                    borderColor: '#3d1429',
                    bgcolor: alpha('#501b36', 0.04),
                  },
                  '&:disabled': {
                    borderColor: alpha('#501b36', 0.3),
                    color: alpha('#501b36', 0.5),
                  },
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleConfirmResetPassword}
                disabled={resetPasswordLoading}
                size="large"
                sx={{
                  borderRadius: 2,
                  px: 4,
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  bgcolor: '#501b36',
                  color: 'white',
                  minWidth: 180,
                  '&:hover': {
                    bgcolor: '#3d1429',
                  },
                  '&:disabled': {
                    bgcolor: alpha('#501b36', 0.3),
                    color: alpha('#ffffff', 0.7),
                  },
                }}
              >
                {resetPasswordLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} color="inherit" />
                    Restableciendo...
                  </Box>
                ) : (
                  'Confirmar Restablecimiento'
                )}
              </Button>
            </Box>
          }
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {selectedUser && (
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  border: '1px solid #e0e0e0',
                  bgcolor: alpha('#501b36', 0.02),
                  mb: 1,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#501b36', mb: 2 }}>
                  Usuario Seleccionado
                </Typography>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: '#501b36',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.9rem'
                    }}>
                      {selectedUser.initials}
                    </Box>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {selectedUser.first_name} {selectedUser.last_name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {selectedUser.dni_nie} • {selectedUser.email}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            )}

            <Alert 
              severity="info" 
              sx={{ 
                borderRadius: 2,
                bgcolor: alpha('#2196f3', 0.08),
                border: '1px solid #2196f3',
                mb: 2
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                ¿Estás seguro de que deseas restablecer la contraseña?
              </Typography>
              <Typography variant="body2">
                La contraseña se establecerá automáticamente como <strong>"12345678"</strong> y el usuario deberá cambiarla en su próximo inicio de sesión.
              </Typography>
            </Alert>
            
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 2,
                border: '1px solid #e0e0e0',
                bgcolor: alpha('#ff9800', 0.05),
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#f57c00', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Warning />
                Información Importante
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  El usuario recibirá la contraseña temporal: <strong>12345678</strong>
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Deberá cambiar la contraseña obligatoriamente en su próximo inicio de sesión
                </Typography>
                <Typography component="li" variant="body2">
                  No podrá acceder al sistema hasta que cambie la contraseña temporal
                </Typography>
              </Box>
            </Paper>
          </Box>
        </ModernModal>

        {/* Modal para editar usuario */}
        <ModernModal
          open={openEditModal}
          onClose={handleCloseEditModal}
          title="Editar Usuario"
          subtitle="Modifica la información del colaborador"
          icon={<Edit />}
          maxWidth="lg"
          headerColor="#501b36"
          actions={
            <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={handleCloseEditModal}
                disabled={editUserLoading}
                size="large"
                sx={{
                  borderRadius: 2,
                  px: 4,
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: '#501b36',
                  color: '#501b36',
                  minHeight: 48,
                  '&:hover': {
                    borderColor: '#3d1429',
                    bgcolor: alpha('#501b36', 0.04),
                  },
                  '&:disabled': {
                    borderColor: alpha('#501b36', 0.3),
                    color: alpha('#501b36', 0.5),
                  },
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleUpdateUser}
                disabled={
                  editUserLoading ||
                  !editUserData.dni_nie || 
                  !editUserData.first_name || 
                  !editUserData.last_name || 
                  !editUserData.email
                }
                size="large"
                sx={{
                  borderRadius: 2,
                  bgcolor: '#501b36',
                  px: 4,
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  minHeight: 48,
                  boxShadow: '0 4px 12px rgba(80, 27, 54, 0.3)',
                  '&:hover': {
                    bgcolor: '#3d1429',
                    boxShadow: '0 6px 16px rgba(80, 27, 54, 0.4)',
                  },
                  '&:disabled': {
                    bgcolor: alpha('#501b36', 0.3),
                    boxShadow: 'none',
                  },
                }}
                startIcon={editUserLoading ? <CircularProgress size={18} color="inherit" /> : <Edit />}
              >
                {editUserLoading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </Box>
          }
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Información Personal */}
            <Box>
              <Typography variant="h6" sx={{ 
                color: '#501b36', 
                fontWeight: 700, 
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Person fontSize="small" />
                Información Personal
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                <TextField
                  fullWidth
                  label="DNI/NIE"
                  value={editUserData.dni_nie}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, dni_nie: e.target.value.toUpperCase() }))}
                  disabled={editUserLoading}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '& fieldset': {
                        borderColor: 'rgba(0, 0, 0, 0.15)',
                        borderWidth: '1px',
                      },
                      '&:hover fieldset': {
                        borderColor: '#501b36',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#501b36',
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      fontWeight: 600,
                      '&.Mui-focused': {
                        color: '#501b36',
                      },
                    },
                  }}
                />
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={editUserData.email}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={editUserLoading}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '& fieldset': {
                        borderColor: 'rgba(0, 0, 0, 0.15)',
                        borderWidth: '1px',
                      },
                      '&:hover fieldset': {
                        borderColor: '#501b36',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#501b36',
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      fontWeight: 600,
                      '&.Mui-focused': {
                        color: '#501b36',
                      },
                    },
                  }}
                />
                <TextField
                  fullWidth
                  label="Nombre"
                  value={editUserData.first_name}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, first_name: e.target.value.toUpperCase() }))}
                  disabled={editUserLoading}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '& fieldset': {
                        borderColor: 'rgba(0, 0, 0, 0.15)',
                        borderWidth: '1px',
                      },
                      '&:hover fieldset': {
                        borderColor: '#501b36',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#501b36',
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      fontWeight: 600,
                      '&.Mui-focused': {
                        color: '#501b36',
                      },
                    },
                  }}
                />
                <TextField
                  fullWidth
                  label="Apellidos"
                  value={editUserData.last_name}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, last_name: e.target.value.toUpperCase() }))}
                  disabled={editUserLoading}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '& fieldset': {
                        borderColor: 'rgba(0, 0, 0, 0.15)',
                        borderWidth: '1px',
                      },
                      '&:hover fieldset': {
                        borderColor: '#501b36',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#501b36',
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      fontWeight: 600,
                      '&.Mui-focused': {
                        color: '#501b36',
                      },
                    },
                  }}
                />
                <TextField
                  fullWidth
                  label="Teléfono"
                  value={editUserData.phone}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, phone: e.target.value }))}
                  disabled={editUserLoading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '& fieldset': {
                        borderColor: 'rgba(0, 0, 0, 0.15)',
                        borderWidth: '1px',
                      },
                      '&:hover fieldset': {
                        borderColor: '#501b36',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#501b36',
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      fontWeight: 600,
                      '&.Mui-focused': {
                        color: '#501b36',
                      },
                    },
                  }}
                />
              </Box>
            </Box>

            {/* Información Laboral */}
            <Box>
              <Typography variant="h6" sx={{ 
                color: '#501b36', 
                fontWeight: 700, 
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Business fontSize="small" />
                Información Laboral
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                <FormControl fullWidth required>
                  <InputLabel sx={{ fontWeight: 600, '&.Mui-focused': { color: '#501b36' } }}>
                    Rol
                  </InputLabel>
                  <Select
                    value={editUserData.role}
                    label="Rol"
                    onChange={(e) => setEditUserData(prev => ({ ...prev, role: e.target.value as any }))}
                    disabled={editUserLoading}
                    sx={{
                      borderRadius: 2,
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#501b36',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#501b36',
                      },
                    }}
                  >
                    <MenuItem value="ADMINISTRADOR">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Key fontSize="small" sx={{ color: '#d32f2f' }} />
                        Administrador
                      </Box>
                    </MenuItem>
                    <MenuItem value="ADMINISTRACION">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Business fontSize="small" sx={{ color: '#d4a574' }} />
                        Administración
                      </Box>
                    </MenuItem>
                    <MenuItem value="TRAFICO">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Badge fontSize="small" sx={{ color: '#ed6c02' }} />
                        Tráfico
                      </Box>
                    </MenuItem>
                    <MenuItem value="TRABAJADOR">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <People fontSize="small" sx={{ color: '#2e7d32' }} />
                        Trabajador
                      </Box>
                    </MenuItem>
                    <MenuItem value="P_TALLER">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Build fontSize="small" sx={{ color: '#ff9800' }} />
                        P. Taller
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
                {(editUserData.role === 'TRABAJADOR' || editUserData.role === 'P_TALLER') && (
                  <FormControl fullWidth>
                    <InputLabel sx={{ fontWeight: 600, '&.Mui-focused': { color: '#501b36' } }}>
                      Tipo Trabajador
                    </InputLabel>
                    <Select
                      value={editUserData.worker_type}
                      label="Tipo Trabajador"
                      onChange={(e) => setEditUserData(prev => ({ ...prev, worker_type: e.target.value as 'antiguo' | 'nuevo' }))}
                      disabled={editUserLoading}
                      sx={{
                        borderRadius: 2,
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#501b36',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#501b36',
                        },
                      }}
                    >
                      <MenuItem value="antiguo">Antiguo</MenuItem>
                      <MenuItem value="nuevo">Nuevo</MenuItem>
                    </Select>
                  </FormControl>
                )}
                <TextField
                  fullWidth
                  label="Departamento"
                  value={editUserData.department}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, department: e.target.value.toUpperCase() }))}
                  disabled={editUserLoading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '& fieldset': {
                        borderColor: 'rgba(0, 0, 0, 0.15)',
                        borderWidth: '1px',
                      },
                      '&:hover fieldset': {
                        borderColor: '#501b36',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#501b36',
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      fontWeight: 600,
                      '&.Mui-focused': {
                        color: '#501b36',
                      },
                    },
                  }}
                />
                <TextField
                  fullWidth
                  label="Cargo"
                  value={editUserData.position}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, position: e.target.value.toUpperCase() }))}
                  disabled={editUserLoading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '& fieldset': {
                        borderColor: 'rgba(0, 0, 0, 0.15)',
                        borderWidth: '1px',
                      },
                      '&:hover fieldset': {
                        borderColor: '#501b36',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#501b36',
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      fontWeight: 600,
                      '&.Mui-focused': {
                        color: '#501b36',
                      },
                    },
                  }}
                />
              </Box>
            </Box>
          </Box>
        </ModernModal>

        {/* Modal para crear usuario */}
      <ModernModal
        open={openCreateModal}
        onClose={handleCloseCreateModal}
        title="Crear Nuevo Usuario"
        subtitle="Completa la información del nuevo colaborador"
        icon={<PersonAdd />}
        maxWidth="lg"
        headerColor="#501b36"
        actions={
          <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={handleCloseCreateModal}
              disabled={createUserLoading}
              size="large"
              sx={{
                borderRadius: 2,
                px: 4,
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                borderColor: '#501b36',
                color: '#501b36',
                minHeight: 48,
                '&:hover': {
                  borderColor: '#3d1429',
                  bgcolor: alpha('#501b36', 0.04),
                },
                '&:disabled': {
                  borderColor: alpha('#501b36', 0.3),
                  color: alpha('#501b36', 0.5),
                },
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleCreateUser}
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
              size="large"
              sx={{
                borderRadius: 2,
                px: 4,
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                bgcolor: '#501b36',
                color: 'white',
                minWidth: 160,
                minHeight: 48,
                '&:hover': {
                  bgcolor: '#3d1429',
                },
                '&:disabled': {
                  bgcolor: alpha('#501b36', 0.3),
                  color: alpha('#ffffff', 0.7),
                },
              }}
            >
              {createUserLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} color="inherit" />
                  Creando...
                </Box>
              ) : (
                'Crear Usuario'
              )}
            </Button>
          </Box>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Información personal */}
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#501b36', mb: 2 }}>
            Información Personal
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
            <ModernField
              label="DNI/NIE"
              value={createUserData.dni_nie}
              onChange={(value) => {
                const dni = String(value).toUpperCase();
                setCreateUserData(prev => ({ ...prev, dni_nie: dni }));
                checkDniExists(dni);
              }}
              required
              startIcon={<Badge />}
              placeholder="12345678A"
              error={dniValidation.exists ? dniValidation.message : undefined}
              helperText={dniValidation.checking ? "Verificando disponibilidad..." : "Documento de identidad único"}
            />

            <ModernField
              label="Email"
              type="email"
              value={createUserData.email}
              onChange={(value) => setCreateUserData(prev => ({ ...prev, email: String(value).toLowerCase() }))}
              required
              startIcon={<Email />}
              placeholder="usuario@empresa.com"
              helperText="Correo electrónico corporativo"
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
            <ModernField
              label="Nombre"
              value={createUserData.first_name}
              onChange={(value) => setCreateUserData(prev => ({ ...prev, first_name: String(value).toUpperCase() }))}
              required
              startIcon={<Person />}
              placeholder="Nombre del empleado"
            />

            <ModernField
              label="Apellidos"
              value={createUserData.last_name}
              onChange={(value) => setCreateUserData(prev => ({ ...prev, last_name: String(value).toUpperCase() }))}
              required
              startIcon={<Person />}
              placeholder="Apellidos del empleado"
            />
          </Box>

          {/* Información laboral */}
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#501b36', mb: 2, mt: 3 }}>
            Información Laboral
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
            <ModernField
              label="Departamento"
              value={createUserData.department}
              onChange={(value) => setCreateUserData(prev => ({ ...prev, department: String(value).toUpperCase() }))}
              required
              startIcon={<Business />}
              placeholder="IT, RRHH, Administración..."
              helperText="Área de trabajo del empleado"
            />

            <ModernField
              label="Rol"
              type="select"
              value={createUserData.role}
              onChange={(value) => setCreateUserData(prev => ({ ...prev, role: value as 'ADMINISTRADOR' | 'ADMINISTRACION' | 'TRAFICO' | 'TRABAJADOR' | 'P_TALLER' }))}
              required
              options={[
                { value: 'TRABAJADOR', label: 'Trabajador' },
                { value: 'P_TALLER', label: 'P. Taller' },
                { value: 'TRAFICO', label: 'Tráfico' },
                { value: 'ADMINISTRACION', label: 'Administración' },
                { value: 'ADMINISTRADOR', label: 'Administrador' },
              ]}
              helperText="Nivel de acceso del usuario"
            />
          </Box>
          {/* Campo Cargo (nuevo) */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
            {/* Selector de Empresa (solo admins) */}
            {isAdmin && (
              <ModernField
                label="Empresa"
                type="select"
                value={createUserCompany}
                onChange={(value) => setCreateUserCompany((value as 'SERVIGLOBAL' | 'EMATRA'))}
                options={[
                  { value: 'SERVIGLOBAL', label: 'SERVIGLOBAL' },
                  { value: 'EMATRA', label: 'EMATRA' },
                ]}
                helperText="La empresa a la que se asignará el usuario"
              />
            )}
            <ModernField
              label="Cargo"
              value={createUserData.position}
              onChange={(value) => setCreateUserData(prev => ({ ...prev, position: String(value).toUpperCase() }))}
              startIcon={<Badge />}
              placeholder="Puesto/Cargo del empleado"
              helperText="Se guardará siempre en MAYÚSCULAS"
            />
          </Box>
          {(createUserData.role === 'TRABAJADOR' || createUserData.role === 'P_TALLER') && (
            <Box sx={{ mt: 1 }}>
              <ModernField
                label="Tipo de Empleado"
                type="select"
                value={createUserData.worker_type}
                onChange={(value) => setCreateUserData(prev => ({ ...prev, worker_type: value as 'antiguo' | 'nuevo' }))}
                options={[
                  { value: 'antiguo', label: 'Antiguo' },
                  { value: 'nuevo', label: 'Nuevo' },
                ]}
                helperText="Clasificación para dietas / cálculos"
              />
            </Box>
          )}

          {/* Configuración de acceso */}
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#501b36', mb: 2, mt: 3 }}>
            Configuración de Acceso
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <TextField
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                required
                fullWidth
                value={createUserData.password}
                onChange={(e) => setCreateUserData(prev => ({ ...prev, password: e.target.value }))}
                error={
                  createUserData.password !== '' && 
                  createUserData.confirmPassword !== '' && 
                  createUserData.password !== createUserData.confirmPassword
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Key sx={{ color: 'rgba(0, 0, 0, 0.54)' }} />
                    </InputAdornment>
                  ),
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
                    : "Mínimo 8 caracteres requeridos"
                }
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2.5,
                    backgroundColor: 'white',
                    '& fieldset': {
                      borderColor: 'rgba(0, 0, 0, 0.15)',
                      borderWidth: '2px',
                    },
                    '&:hover fieldset': {
                      borderColor: '#501b36',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#501b36',
                      borderWidth: '2px',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    fontWeight: 600,
                    '&.Mui-focused': {
                      color: '#501b36',
                    },
                  },
                  mb: 3,
                }}
              />
            </Box>

            <Box>
              <TextField
                label="Confirmar Contraseña"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                fullWidth
                value={createUserData.confirmPassword}
                onChange={(e) => setCreateUserData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                error={
                  createUserData.confirmPassword !== '' && 
                  createUserData.password !== createUserData.confirmPassword
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Key sx={{ color: 'rgba(0, 0, 0, 0.54)' }} />
                    </InputAdornment>
                  ),
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
                    : "Confirma la contraseña"
                }
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2.5,
                    backgroundColor: 'white',
                    '& fieldset': {
                      borderColor: 'rgba(0, 0, 0, 0.15)',
                      borderWidth: '2px',
                    },
                    '&:hover fieldset': {
                      borderColor: '#501b36',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#501b36',
                      borderWidth: '2px',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    fontWeight: 600,
                    '&.Mui-focused': {
                      color: '#501b36',
                    },
                  },
                  mb: 3,
                }}
              />
            </Box>
          </Box>

          {/* Resumen del usuario */}
          {createUserData.first_name && createUserData.last_name && createUserData.role && (
            <InfoCard
              title="Resumen del Usuario"
              color="#501b36"
              items={[
                {
                  icon: <Person sx={{ fontSize: 16 }} />,
                  label: "Nombre completo",
                  value: `${createUserData.first_name} ${createUserData.last_name}`
                },
                {
                  icon: <Email sx={{ fontSize: 16 }} />,
                  label: "Email",
                  value: createUserData.email || "No especificado"
                },
                {
                  icon: <Business sx={{ fontSize: 16 }} />,
                  label: "Departamento",
                  value: createUserData.department || "No especificado"
                },
                {
                  icon: <Business sx={{ fontSize: 16 }} />,
                  label: "Empresa",
                  value: createUserCompany
                },
                {
                  icon: <Badge sx={{ fontSize: 16 }} />,
                  label: "Rol asignado",
      value: createUserData.role === 'ADMINISTRADOR' ? 'Administrador' : 
        createUserData.role === 'ADMINISTRACION' ? 'Administración' :
        createUserData.role === 'TRAFICO' ? 'Tráfico' : 
        createUserData.role === 'P_TALLER' ? 'P. Taller' : 'Trabajador'
                }
                ,
                ...((createUserData.role === 'TRABAJADOR' || createUserData.role === 'P_TALLER') ? [{
                  icon: <People sx={{ fontSize: 16 }} />,
                  label: 'Tipo',
                  value: createUserData.worker_type === 'nuevo' ? 'Nuevo' : 'Antiguo'
                }] : [])
              ]}
            />
          )}
        </Box>

        {/* Snackbar para notificaciones */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </ModernModal>

      {/* Snackbar global para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      </Box>
    </>
  );
};

export default Users;
