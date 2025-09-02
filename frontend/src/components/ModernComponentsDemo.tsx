import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
} from '@mui/material';
import {
  Visibility,
  Add,
  Person,
  Settings,
  CheckCircle,
  Error,
  Warning,
  Info,
  Upload,
  Download,
  Edit,
  Delete,
  Save,
} from '@mui/icons-material';
import { ModernModal, ModernButton } from './ModernModal';
import { ModernField, InfoCard, StatusChip } from './ModernFormComponents';
import { ModernNotificationSystem, useNotifications } from './ModernNotifications';

export const ModernComponentsDemo: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    role: 'TRABAJADOR',
    message: '',
    date: '',
  });

  const { notifications, addNotification, removeNotification } = useNotifications();

  const handleShowNotification = (type: 'success' | 'error' | 'warning' | 'info') => {
    const messages = {
      success: {
        title: '¡Operación exitosa!',
        message: 'Los datos se han guardado correctamente.',
      },
      error: {
        title: 'Error en la operación',
        message: 'No se pudo completar la acción solicitada.',
      },
      warning: {
        title: 'Advertencia del sistema',
        message: 'Revisa los datos antes de continuar.',
      },
      info: {
        title: 'Información importante',
        message: 'Se han actualizado las configuraciones.',
      },
    };

    addNotification({
      type,
      ...messages[type],
      duration: 5000,
      action: {
        label: 'Ver detalles',
        onClick: () => console.log('Action clicked'),
      },
    });
  };

  return (
    <Box sx={{ p: 4, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Typography variant="h3" sx={{ fontWeight: 700, mb: 4, color: '#501b36' }}>
        Demostración de Componentes Modernos
      </Typography>

      {/* Sistema de notificaciones */}
      <ModernNotificationSystem
        notifications={notifications}
        onClose={removeNotification}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
        {/* Sección de Modales */}
        <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: '#501b36' }}>
            🪟 Modales Modernos
          </Typography>
          <Stack spacing={2}>
            <ModernButton
              variant="contained"
              onClick={() => setModalOpen(true)}
              startIcon={<Add />}
              fullWidth
            >
              Modal Básico
            </ModernButton>
            <ModernButton
              variant="contained"
              onClick={() => setUserModalOpen(true)}
              startIcon={<Person />}
              customColor="#2196f3"
              fullWidth
            >
              Modal de Usuario
            </ModernButton>
            <ModernButton
              variant="contained"
              onClick={() => setSettingsModalOpen(true)}
              startIcon={<Settings />}
              customColor="#ff9800"
              fullWidth
            >
              Modal de Configuración
            </ModernButton>
          </Stack>
        </Paper>

        {/* Sección de Notificaciones */}
        <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: '#501b36' }}>
            🔔 Notificaciones Modernas
          </Typography>
          <Stack spacing={2}>
            <ModernButton
              variant="contained"
              onClick={() => handleShowNotification('success')}
              startIcon={<CheckCircle />}
              customColor="#4caf50"
              size="small"
              fullWidth
            >
              Éxito
            </ModernButton>
            <ModernButton
              variant="contained"
              onClick={() => handleShowNotification('error')}
              startIcon={<Error />}
              customColor="#f44336"
              size="small"
              fullWidth
            >
              Error
            </ModernButton>
            <ModernButton
              variant="contained"
              onClick={() => handleShowNotification('warning')}
              startIcon={<Warning />}
              customColor="#ff9800"
              size="small"
              fullWidth
            >
              Advertencia
            </ModernButton>
            <ModernButton
              variant="contained"
              onClick={() => handleShowNotification('info')}
              startIcon={<Info />}
              customColor="#2196f3"
              size="small"
              fullWidth
            >
              Información
            </ModernButton>
          </Stack>
        </Paper>

        {/* Sección de Botones */}
        <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: '#501b36' }}>
            🔘 Botones Modernos
          </Typography>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <ModernButton variant="contained" startIcon={<Save />}>
                Guardar
              </ModernButton>
              <ModernButton variant="outlined" startIcon={<Edit />}>
                Editar
              </ModernButton>
              <ModernButton variant="contained" customColor="#f44336" startIcon={<Delete />}>
                Eliminar
              </ModernButton>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <ModernButton variant="contained" size="large" startIcon={<Upload />} customColor="#4caf50">
                Subir archivo
              </ModernButton>
              <ModernButton variant="outlined" size="large" startIcon={<Download />}>
                Descargar
              </ModernButton>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <ModernButton variant="contained" size="small" loading>
                Cargando...
              </ModernButton>
              <ModernButton variant="outlined" size="small" disabled>
                Deshabilitado
              </ModernButton>
            </Box>
          </Stack>
        </Paper>

        {/* Sección de Chips de Estado */}
        <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: '#501b36' }}>
            🏷️ Chips de Estado
          </Typography>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <StatusChip status="approved" />
              <StatusChip status="pending" />
              <StatusChip status="rejected" />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <StatusChip status="active" />
              <StatusChip status="inactive" />
              <StatusChip status="En proceso" customColor="#9c27b0" />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <StatusChip status="Completado" customColor="#00bcd4" size="small" />
              <StatusChip status="Cancelado" customColor="#795548" size="small" />
            </Box>
          </Stack>
        </Paper>
      </Box>

      {/* Modal Básico */}
      <ModernModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Modal de Demostración"
        subtitle="Este es un ejemplo de modal moderno"
        icon={<Visibility />}
        actions={
          <>
            <ModernButton variant="outlined" onClick={() => setModalOpen(false)}>
              Cancelar
            </ModernButton>
            <ModernButton variant="contained" onClick={() => setModalOpen(false)}>
              Aceptar
            </ModernButton>
          </>
        }
      >
        <Typography variant="body1" sx={{ mb: 3 }}>
          Este es el contenido del modal. Puedes agregar cualquier elemento aquí.
        </Typography>
        
        <InfoCard
          title="Información del Modal"
          items={[
            { label: "Tipo", value: "Modal de demostración" },
            { label: "Versión", value: "1.0.0" },
            { label: "Estado", value: <StatusChip status="active" size="small" /> },
          ]}
        />
      </ModernModal>

      {/* Modal de Usuario */}
      <ModernModal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title="Crear Usuario"
        subtitle="Completa la información del nuevo usuario"
        icon={<Person />}
        maxWidth="md"
        headerColor="#2196f3"
        actions={
          <>
            <ModernButton variant="outlined" onClick={() => setUserModalOpen(false)}>
              Cancelar
            </ModernButton>
            <ModernButton 
              variant="contained" 
              onClick={() => setUserModalOpen(false)}
              customColor="#2196f3"
            >
              Crear Usuario
            </ModernButton>
          </>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ModernField
            label="Nombre completo"
            value={formData.name}
            onChange={(value) => setFormData(prev => ({ ...prev, name: value as string }))}
            startIcon={<Person />}
            placeholder="Ingresa el nombre completo"
          />
          
          <ModernField
            label="Correo electrónico"
            type="email"
            value={formData.email}
            onChange={(value) => setFormData(prev => ({ ...prev, email: value as string }))}
            placeholder="usuario@empresa.com"
          />
          
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <ModernField
              label="Departamento"
              value={formData.department}
              onChange={(value) => setFormData(prev => ({ ...prev, department: value as string }))}
              placeholder="IT, RRHH, etc."
            />
            
            <ModernField
              label="Rol"
              type="select"
              value={formData.role}
              onChange={(value) => setFormData(prev => ({ ...prev, role: value as string }))}
              options={[
                { value: 'TRABAJADOR', label: 'Trabajador' },
                { value: 'ADMINISTRADOR', label: 'Administrador' },
                { value: 'TRAFICO', label: 'Tráfico' },
              ]}
            />
          </Box>
        </Box>
      </ModernModal>

      {/* Modal de Configuración */}
      <ModernModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        title="Configuración del Sistema"
        subtitle="Ajusta las configuraciones avanzadas"
        icon={<Settings />}
        headerColor="#ff9800"
        customHeaderGradient="linear-gradient(135deg, #ff9800 0%, #f57c00 50%, #ef6c00 100%)"
        actions={
          <>
            <ModernButton variant="outlined" onClick={() => setSettingsModalOpen(false)}>
              Cancelar
            </ModernButton>
            <ModernButton 
              variant="contained" 
              onClick={() => setSettingsModalOpen(false)}
              customColor="#ff9800"
              startIcon={<Save />}
            >
              Guardar Cambios
            </ModernButton>
          </>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <ModernField
            label="Mensaje del sistema"
            type="multiline"
            value={formData.message}
            onChange={(value) => setFormData(prev => ({ ...prev, message: value as string }))}
            rows={4}
            placeholder="Ingresa un mensaje para mostrar en el sistema..."
            maxLength={500}
          />
          
          <ModernField
            label="Fecha de configuración"
            type="date"
            value={formData.date}
            onChange={(value) => setFormData(prev => ({ ...prev, date: value as string }))}
          />
          
          <InfoCard
            title="Estado del Sistema"
            color="#ff9800"
            items={[
              { label: "Versión", value: "2.1.0" },
              { label: "Estado", value: <StatusChip status="active" size="small" /> },
              { label: "Última actualización", value: "Hace 2 horas" },
              { label: "Usuarios conectados", value: "24" },
            ]}
          />
        </Box>
      </ModernModal>
    </Box>
  );
};
