import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  IconButton,
  Avatar,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  People,
  Edit,
  Delete,
  MoreVert,
  PersonAdd,
  AdminPanelSettings,
  WorkOutline,
  PersonOutline,
  Email,
  Phone,
  Lock,
  Visibility,
  VisibilityOff,
  Search,
  FilterList,
  Block,
  CheckCircle,
} from '@mui/icons-material';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'employee' | 'manager';
  department: string;
  status: 'active' | 'inactive';
  lastLogin: string;
  createdAt: string;
  avatar?: string;
}

export const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([
    {
      id: 1,
      name: "Juan Pérez",
      email: "juan.perez@empresa.com",
      phone: "+34 666 123 456",
      role: "admin",
      department: "IT",
      status: "active",
      lastLogin: "2025-07-14",
      createdAt: "2025-01-15",
      avatar: "JP"
    },
    {
      id: 2,
      name: "María García",
      email: "maria.garcia@empresa.com",
      phone: "+34 666 234 567",
      role: "manager",
      department: "RRHH",
      status: "active",
      lastLogin: "2025-07-13",
      createdAt: "2025-02-10",
      avatar: "MG"
    },
    {
      id: 3,
      name: "Carlos López",
      email: "carlos.lopez@empresa.com",
      phone: "+34 666 345 678",
      role: "employee",
      department: "Ventas",
      status: "inactive",
      lastLogin: "2025-07-10",
      createdAt: "2025-03-05",
      avatar: "CL"
    },
    {
      id: 4,
      name: "Ana Martínez",
      email: "ana.martinez@empresa.com",
      phone: "+34 666 456 789",
      role: "employee",
      department: "Marketing",
      status: "active",
      lastLogin: "2025-07-14",
      createdAt: "2025-04-20",
      avatar: "AM"
    },
    {
      id: 5,
      name: "Pedro Ruiz",
      email: "pedro.ruiz@empresa.com",
      phone: "+34 666 567 890",
      role: "manager",
      department: "Operaciones",
      status: "active",
      lastLogin: "2025-07-12",
      createdAt: "2025-05-15",
      avatar: "PR"
    }
  ]);

  // Estados para formularios y filtros
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'employee' as 'admin' | 'employee' | 'manager',
    department: '',
    password: ''
  });

  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'employee' | 'manager'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Estados para menú contextual
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Funciones auxiliares
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <AdminPanelSettings sx={{ color: '#f44336' }} />;
      case 'manager': return <WorkOutline sx={{ color: '#ff9800' }} />;
      case 'employee': return <PersonOutline sx={{ color: '#2196f3' }} />;
      default: return <PersonOutline sx={{ color: '#757575' }} />;
    }
  };

  const getRoleColor = (role: string): 'error' | 'warning' | 'info' | 'default' => {
    switch (role) {
      case 'admin': return 'error';
      case 'manager': return 'warning';
      case 'employee': return 'info';
      default: return 'default';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      case 'employee': return 'Empleado';
      default: return role;
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' => {
    return status === 'active' ? 'success' : 'error';
  };

  const getStatusText = (status: string) => {
    return status === 'active' ? 'Activo' : 'Inactivo';
  };

  // Handlers para formulario
  const handleSubmitUser = () => {
    if (!newUser.name || !newUser.email || !newUser.department) {
      setAlert({ type: 'error', message: 'Por favor completa todos los campos obligatorios' });
      return;
    }

    if (editingUser) {
      // Editar usuario existente
      setUsers(prev => prev.map(user => 
        user.id === editingUser.id 
          ? { 
              ...user, 
              name: newUser.name,
              email: newUser.email,
              phone: newUser.phone,
              role: newUser.role,
              department: newUser.department
            }
          : user
      ));
      setAlert({ type: 'success', message: 'Usuario actualizado correctamente' });
    } else {
      // Crear nuevo usuario
      const user: User = {
        id: Date.now(),
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        department: newUser.department,
        status: 'active',
        lastLogin: '',
        createdAt: new Date().toISOString().split('T')[0],
        avatar: newUser.name.split(' ').map(n => n[0]).join('').toUpperCase()
      };
      setUsers(prev => [user, ...prev]);
      setAlert({ type: 'success', message: 'Usuario creado exitosamente' });
    }

    handleCloseDialog();
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setNewUser({
      name: '',
      email: '',
      phone: '',
      role: 'employee',
      department: '',
      password: ''
    });
    setShowPassword(false);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setNewUser({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department: user.department,
      password: ''
    });
    setOpenDialog(true);
    handleCloseMenu();
  };

  const handleDeleteUser = (id: number) => {
    setUsers(prev => prev.filter(user => user.id !== id));
    setAlert({ type: 'success', message: 'Usuario eliminado correctamente' });
    handleCloseMenu();
  };

  const handleToggleStatus = (id: number) => {
    setUsers(prev => prev.map(user => 
      user.id === id 
        ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
        : user
    ));
    handleCloseMenu();
  };

  const handleResetPassword = (user: User) => {
    setAlert({ type: 'success', message: `Contraseña restablecida para ${user.name}` });
    handleCloseMenu();
  };

  // Handlers para menú contextual
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  // Filtrar usuarios
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    const matchesDepartment = filterDepartment === 'all' || user.department === filterDepartment;
    
    return matchesSearch && matchesRole && matchesStatus && matchesDepartment;
  });

  // Obtener departamentos únicos
  const departments = Array.from(new Set(users.map(user => user.department)));

  return (
    <Box>
      {/* Alerta */}
      {alert && (
        <Alert 
          severity={alert.type} 
          sx={{ mb: 2 }} 
          onClose={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <People sx={{ fontSize: 40, color: '#1565C0' }} />
        </Box>
        
        {/* Acciones y filtros */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Button
            variant="contained" 
            startIcon={<PersonAdd />}
            onClick={() => setOpenDialog(true)}
          >
            Nuevo Usuario
          </Button>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ color: '#757575', mr: 1 }} />
              }}
              sx={{ minWidth: 200 }}
            />
            <FilterList sx={{ color: '#757575' }} />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Rol</InputLabel>
            <Select
              value={filterRole}
              label="Rol"
              onChange={(e) => setFilterRole(e.target.value as typeof filterRole)}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="admin">Administrador</MenuItem>
              <MenuItem value="manager">Gerente</MenuItem>
              <MenuItem value="employee">Empleado</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Estado</InputLabel>
            <Select
              value={filterStatus}
              label="Estado"
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="active">Activos</MenuItem>
              <MenuItem value="inactive">Inactivos</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Departamento</InputLabel>
            <Select
              value={filterDepartment}
              label="Departamento"
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <MenuItem value="all">Todos</MenuItem>
              {departments.map(dept => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Tabla de usuarios */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <People />
          Lista de Usuarios ({filteredUsers.length})
        </Typography>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Usuario</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Contacto</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Rol</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Departamento</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Último acceso</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: '#1565C0' }}>
                        {user.avatar}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {user.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          ID: {user.id}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Email sx={{ fontSize: 16, color: '#757575' }} />
                        <Typography variant="body2">{user.email}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Phone sx={{ fontSize: 16, color: '#757575' }} />
                        <Typography variant="body2">{user.phone}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getRoleIcon(user.role)}
                      <Chip
                        label={getRoleText(user.role)}
                        size="small"
                        color={getRoleColor(user.role)}
                        variant="outlined"
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{user.department}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusText(user.status)}
                      size="small"
                      color={getStatusColor(user.status)}
                      icon={user.status === 'active' ? <CheckCircle /> : <Block />}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {user.lastLogin ? formatDate(user.lastLogin) : 'Nunca'}
                    </Typography>
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
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredUsers.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <People sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No se encontraron usuarios
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Ajusta los filtros de búsqueda o crea un nuevo usuario
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Menú contextual */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => selectedUser && handleEditUser(selectedUser)}>
          <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => selectedUser && handleToggleStatus(selectedUser.id)}>
          <ListItemIcon>
            {selectedUser?.status === 'active' ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
          </ListItemIcon>
          <ListItemText>
            {selectedUser?.status === 'active' ? 'Desactivar' : 'Activar'}
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={() => selectedUser && handleResetPassword(selectedUser)}>
          <ListItemIcon><Lock fontSize="small" /></ListItemIcon>
          <ListItemText>Restablecer contraseña</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={() => selectedUser && handleDeleteUser(selectedUser.id)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Eliminar</ListItemText>
        </MenuItem>
      </Menu>

      {/* Diálogo para crear/editar usuario */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {editingUser ? <Edit /> : <PersonAdd />}
            {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="Nombre completo"
              fullWidth
              value={newUser.name}
              onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={newUser.email}
              onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
              required
            />
            <TextField
              label="Teléfono"
              fullWidth
              value={newUser.phone}
              onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
            />
            <FormControl fullWidth required>
              <InputLabel>Rol</InputLabel>
              <Select
                value={newUser.role}
                label="Rol"
                onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as typeof newUser.role }))}
              >
                <MenuItem value="employee">Empleado</MenuItem>
                <MenuItem value="manager">Gerente</MenuItem>
                <MenuItem value="admin">Administrador</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Departamento"
              fullWidth
              value={newUser.department}
              onChange={(e) => setNewUser(prev => ({ ...prev, department: e.target.value }))}
              required
            />
            {!editingUser && (
              <TextField
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                value={newUser.password}
                onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  )
                }}
                required
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmitUser} 
            variant="contained"
            disabled={!newUser.name || !newUser.email || !newUser.department || (!editingUser && !newUser.password)}
          >
            {editingUser ? 'Actualizar' : 'Crear Usuario'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
