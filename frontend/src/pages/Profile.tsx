import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Card,
  CardContent,
  Divider,
  Chip,
  Button,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Alert,
  IconButton,
  Badge,
} from '@mui/material';
import {
  Person,
  Edit,
  Save,
  Cancel,
  Email,
  Phone,
  LocationOn,
  Work,
  CalendarToday,
  ContactEmergency,
  AdminPanelSettings,
  WorkOutline,
  PersonOutline,
  Verified,
  PhotoCamera,
} from '@mui/icons-material';
import type { UserProfile } from '../types';

export const Profile: React.FC = () => {
  // Estado del perfil del usuario (se debe cargar desde la API)
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: 0,
    dni_nie: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "",
    department: "",
    position: "",
    hire_date: "",
    birth_date: "",
    address: "",
    city: "",
    postal_code: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    avatar: "",
    is_active: false,
    created_at: "",
    updated_at: ""
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile>(userProfile);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

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

  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const calculateYearsWorked = (hireDate: string): number => {
    const today = new Date();
    const hire = new Date(hireDate);
    let years = today.getFullYear() - hire.getFullYear();
    const monthDiff = today.getMonth() - hire.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < hire.getDate())) {
      years--;
    }
    return years;
  };

  // Handlers
  const handleEdit = () => {
    setEditedProfile(userProfile);
    setIsEditing(true);
  };

  const handleSave = () => {
    // Validaciones básicas
    if (!editedProfile.first_name || !editedProfile.last_name || !editedProfile.email) {
      setAlert({ type: 'error', message: 'Los campos nombre, apellidos y email son obligatorios' });
      return;
    }

    // Simular guardado
    setUserProfile({ ...editedProfile, updated_at: new Date().toISOString() });
    setIsEditing(false);
    setAlert({ type: 'success', message: 'Perfil actualizado correctamente' });
  };

  const handleCancel = () => {
    setEditedProfile(userProfile);
    setIsEditing(false);
  };

  const handleAvatarChange = () => {
    // Simular cambio de avatar
    setAlert({ type: 'success', message: 'Función de cambio de avatar disponible próximamente' });
  };

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: { xs: '100%', sm: '100%', md: '1200px', lg: '1400px' },
      mx: 'auto',
      px: { xs: 0, sm: 1, md: 2 }
    }}>
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

      {/* Header del perfil */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: { xs: 'flex-start', sm: 'center' }, 
          justifyContent: 'space-between', 
          mb: 3,
          flexDirection: { xs: 'column', lg: 'row' },
          gap: { xs: 2, lg: 0 }
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: { xs: 'flex-start', sm: 'center' }, 
            gap: { xs: 2, sm: 3 },
            flexDirection: { xs: 'column', sm: 'row' },
            textAlign: { xs: 'center', sm: 'left' },
            width: { xs: '100%', lg: 'auto' }
          }}>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                <IconButton
                  size="small"
                  onClick={handleAvatarChange}
                  sx={{
                    bgcolor: '#501b36',
                    color: 'white',
                    '&:hover': { bgcolor: '#0d47a1' },
                    width: { xs: 28, sm: 32 },
                    height: { xs: 28, sm: 32 }
                  }}
                >
                  <PhotoCamera sx={{ fontSize: { xs: 14, sm: 16 } }} />
                </IconButton>
              }
            >
              <Avatar
                sx={{
                  bgcolor: '#501b36',
                  width: { xs: 80, sm: 120 },
                  height: { xs: 80, sm: 120 },
                  fontSize: { xs: '1.5rem', sm: '2.5rem' },
                  fontWeight: 'bold',
                  mx: { xs: 'auto', sm: 0 }
                }}
              >
                {userProfile.avatar}
              </Avatar>
            </Badge>
            
            <Box>
              <Typography variant="h4" sx={{ 
                fontWeight: 'bold', 
                color: '#501b36', 
                mb: 1,
                fontSize: { xs: '1.5rem', sm: '2.125rem' }
              }}>
                {userProfile.first_name} {userProfile.last_name}
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2, 
                mb: 1,
                flexWrap: 'wrap',
                justifyContent: { xs: 'center', sm: 'flex-start' }
              }}>
                {getRoleIcon(userProfile.role)}
                <Chip
                  label={getRoleText(userProfile.role)}
                  color={getRoleColor(userProfile.role)}
                  variant="outlined"
                  size="small"
                />
                {userProfile.is_active && (
                  <Chip
                    label="Activo"
                    color="success"
                    size="small"
                    icon={<Verified />}
                  />
                )}
              </Box>
              <Typography variant="body1" color="textSecondary" sx={{ mb: 1 }}>
                {userProfile.position} • {userProfile.department}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                ID: {userProfile.id} • {calculateYearsWorked(userProfile.hire_date)} años en la empresa
              </Typography>
            </Box>
          </Box>

          <Button
            variant={isEditing ? "outlined" : "contained"}
            startIcon={isEditing ? <Cancel /> : <Edit />}
            onClick={isEditing ? handleCancel : handleEdit}
            color={isEditing ? "error" : "primary"}
            sx={{ 
              width: { xs: '100%', sm: 'auto' },
              mt: { xs: 2, lg: 0 }
            }}
          >
            {isEditing ? 'Cancelar' : 'Editar Perfil'}
          </Button>
        </Box>
      </Paper>

      {/* Contenido principal */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, 
        gap: { xs: 2, sm: 3 }
      }}>
        {/* Información Personal */}
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" sx={{ 
              mb: 2, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              fontSize: { xs: '1.1rem', sm: '1.25rem' }
            }}>
              <Person color="primary" />
              Información Personal
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'grid', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">DNI/NIE</Typography>
                {isEditing ? (
                  <TextField
                    fullWidth
                    size="small"
                    value={editedProfile.dni_nie}
                    onChange={(e) => setEditedProfile(prev => ({ ...prev, dni_nie: e.target.value }))}
                    sx={{ mt: 0.5 }}
                  />
                ) : (
                  <Typography variant="body1">{userProfile.dni_nie}</Typography>
                )}
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Nombre</Typography>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={editedProfile.first_name}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, first_name: e.target.value }))}
                      sx={{ mt: 0.5 }}
                      required
                    />
                  ) : (
                    <Typography variant="body1">{userProfile.first_name}</Typography>
                  )}
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Apellidos</Typography>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={editedProfile.last_name}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, last_name: e.target.value }))}
                      sx={{ mt: 0.5 }}
                      required
                    />
                  ) : (
                    <Typography variant="body1">{userProfile.last_name}</Typography>
                  )}
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary">Fecha de Nacimiento</Typography>
                {isEditing ? (
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    value={editedProfile.birth_date}
                    onChange={(e) => setEditedProfile(prev => ({ ...prev, birth_date: e.target.value }))}
                    sx={{ mt: 0.5 }}
                  />
                ) : (
                  <Typography variant="body1">
                    {formatDate(userProfile.birth_date)} ({calculateAge(userProfile.birth_date)} años)
                  </Typography>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Información de Contacto */}
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" sx={{ 
              mb: 2, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              fontSize: { xs: '1.1rem', sm: '1.25rem' }
            }}>
              <Email color="primary" />
              Información de Contacto
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'grid', gap: 2 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Email sx={{ fontSize: 20, color: '#757575' }} />
                  <Typography variant="subtitle2" color="textSecondary">Email</Typography>
                </Box>
                {isEditing ? (
                  <TextField
                    fullWidth
                    size="small"
                    type="email"
                    value={editedProfile.email}
                    onChange={(e) => setEditedProfile(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                ) : (
                  <Typography variant="body1">{userProfile.email}</Typography>
                )}
              </Box>

              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Phone sx={{ fontSize: 20, color: '#757575' }} />
                  <Typography variant="subtitle2" color="textSecondary">Teléfono</Typography>
                </Box>
                {isEditing ? (
                  <TextField
                    fullWidth
                    size="small"
                    value={editedProfile.phone}
                    onChange={(e) => setEditedProfile(prev => ({ ...prev, phone: e.target.value }))}
                  />
                ) : (
                  <Typography variant="body1">{userProfile.phone}</Typography>
                )}
              </Box>

              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <LocationOn sx={{ fontSize: 20, color: '#757575' }} />
                  <Typography variant="subtitle2" color="textSecondary">Dirección</Typography>
                </Box>
                {isEditing ? (
                  <TextField
                    fullWidth
                    size="small"
                    value={editedProfile.address}
                    onChange={(e) => setEditedProfile(prev => ({ ...prev, address: e.target.value }))}
                  />
                ) : (
                  <Typography variant="body1">{userProfile.address}</Typography>
                )}
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Ciudad</Typography>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={editedProfile.city}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, city: e.target.value }))}
                      sx={{ mt: 0.5 }}
                    />
                  ) : (
                    <Typography variant="body1">{userProfile.city}</Typography>
                  )}
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Código Postal</Typography>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={editedProfile.postal_code}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, postal_code: e.target.value }))}
                      sx={{ mt: 0.5 }}
                    />
                  ) : (
                    <Typography variant="body1">{userProfile.postal_code}</Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Información Laboral */}
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" sx={{ 
              mb: 2, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              fontSize: { xs: '1.1rem', sm: '1.25rem' }
            }}>
              <Work color="primary" />
              Información Laboral
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'grid', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Puesto</Typography>
                {isEditing ? (
                  <TextField
                    fullWidth
                    size="small"
                    value={editedProfile.position}
                    onChange={(e) => setEditedProfile(prev => ({ ...prev, position: e.target.value }))}
                    sx={{ mt: 0.5 }}
                  />
                ) : (
                  <Typography variant="body1">{userProfile.position}</Typography>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary">Departamento</Typography>
                {isEditing ? (
                  <TextField
                    fullWidth
                    size="small"
                    value={editedProfile.department}
                    onChange={(e) => setEditedProfile(prev => ({ ...prev, department: e.target.value }))}
                    sx={{ mt: 0.5 }}
                  />
                ) : (
                  <Typography variant="body1">{userProfile.department}</Typography>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary">Rol</Typography>
                {isEditing ? (
                  <FormControl fullWidth size="small" sx={{ mt: 0.5 }}>
                    <Select
                      value={editedProfile.role}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, role: e.target.value as UserProfile['role'] }))}
                    >
                      <MenuItem value="employee">Empleado</MenuItem>
                      <MenuItem value="manager">Gerente</MenuItem>
                      <MenuItem value="admin">Administrador</MenuItem>
                    </Select>
                  </FormControl>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getRoleIcon(userProfile.role)}
                    <Typography variant="body1">{getRoleText(userProfile.role)}</Typography>
                  </Box>
                )}
              </Box>

              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CalendarToday sx={{ fontSize: 20, color: '#757575' }} />
                  <Typography variant="subtitle2" color="textSecondary">Fecha de Ingreso</Typography>
                </Box>
                {isEditing ? (
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    value={editedProfile.hire_date}
                    onChange={(e) => setEditedProfile(prev => ({ ...prev, hire_date: e.target.value }))}
                  />
                ) : (
                  <Typography variant="body1">
                    {formatDate(userProfile.hire_date)} ({calculateYearsWorked(userProfile.hire_date)} años)
                  </Typography>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Contacto de Emergencia */}
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" sx={{ 
              mb: 2, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              fontSize: { xs: '1.1rem', sm: '1.25rem' }
            }}>
              <ContactEmergency color="primary" />
              Contacto de Emergencia
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'grid', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Nombre</Typography>
                {isEditing ? (
                  <TextField
                    fullWidth
                    size="small"
                    value={editedProfile.emergency_contact_name}
                    onChange={(e) => setEditedProfile(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                    sx={{ mt: 0.5 }}
                  />
                ) : (
                  <Typography variant="body1">{userProfile.emergency_contact_name}</Typography>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary">Teléfono</Typography>
                {isEditing ? (
                  <TextField
                    fullWidth
                    size="small"
                    value={editedProfile.emergency_contact_phone}
                    onChange={(e) => setEditedProfile(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                    sx={{ mt: 0.5 }}
                  />
                ) : (
                  <Typography variant="body1">{userProfile.emergency_contact_phone}</Typography>
                )}
              </Box>
            </Box>

            {/* Información del sistema */}
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
              Información del Sistema
            </Typography>
            <Typography variant="caption" color="textSecondary" display="block">
              Perfil creado: {formatDate(userProfile.created_at)}
            </Typography>
            <Typography variant="caption" color="textSecondary" display="block">
              Última actualización: {formatDate(userProfile.updated_at)}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Botón de guardar flotante cuando está editando */}
      {isEditing && (
        <Box
          sx={{
            position: 'fixed',
            bottom: { xs: 16, sm: 24 },
            right: { xs: 16, sm: 24 },
            left: { xs: 16, sm: 'auto' },
            zIndex: 1000
          }}
        >
          <Button
            variant="contained"
            size="large"
            startIcon={<Save />}
            onClick={handleSave}
            fullWidth
            sx={{
              bgcolor: '#4caf50',
              '&:hover': { bgcolor: '#45a049' },
              boxShadow: 3,
              px: { xs: 2, sm: 3 },
              py: { xs: 1.2, sm: 1.5 },
              fontSize: { xs: '0.9rem', sm: '1rem' }
            }}
          >
            Guardar Cambios
          </Button>
        </Box>
      )}
    </Box>
  );
};
