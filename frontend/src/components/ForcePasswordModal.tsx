import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, Lock, Close } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

interface ForcePasswordModalProps {
  open: boolean;
}

export const ForcePasswordModal: React.FC<ForcePasswordModalProps> = ({ open }) => {
  const { token, logout, updatePasswordChanged } = useAuth() as any;
  
  // Estados del formulario
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validación de contraseña
  const validatePassword = (password: string) => {
    if (!password) return 'Campo requerido';
    if (password.length < 8) return 'Mínimo 8 caracteres';
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return 'Debe incluir mayúscula, minúscula y número';
    }
    return '';
  };

  const passwordError = validatePassword(newPassword);
  const confirmError = confirmPassword && newPassword !== confirmPassword ? 'Las contraseñas no coinciden' : '';
  const isFormValid = currentPassword && newPassword && confirmPassword && !passwordError && !confirmError && !loading && !success;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/change-password-first', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          current_password: currentPassword, 
          new_password: newPassword 
        })
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ detail: 'Error desconocido' }));
        throw new Error(data.detail || 'Error al cambiar contraseña');
      }
      
      setSuccess(true);
      updatePasswordChanged();
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      onClose={() => {}}
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'white',
          color: '#333',
          p: 0,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }
      }}
    >
      <DialogContent sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          mb: 3,
          p: 2,
          background: 'linear-gradient(135deg, #501B39 0%, #6B2449 100%)',
          color: 'white',
          borderRadius: '12px 12px 0 0',
          mx: -4,
          mt: -4,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Lock />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Cambio de contraseña requerido
            </Typography>
          </Box>
          <IconButton 
            onClick={logout}
            sx={{ 
              color: 'white',
              '&:hover': { 
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            <Close />
          </IconButton>
        </Box>

        {/* Descripción */}
        <Typography sx={{ mb: 3, opacity: 0.7, color: '#666' }}>
          Por seguridad, debes establecer una nueva contraseña antes de continuar.
        </Typography>

        {/* Alertas */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              backgroundColor: '#ffebee',
              color: '#d32f2f',
              '& .MuiAlert-icon': { color: '#d32f2f' },
              border: '1px solid #ffcdd2'
            }}
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 3,
              backgroundColor: '#e8f5e8',
              color: '#2e7d32',
              '& .MuiAlert-icon': { color: '#2e7d32' },
              border: '1px solid #c8e6c9'
            }}
          >
            Contraseña actualizada correctamente. Recargando...
          </Alert>
        )}

        {/* Formulario */}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="Contraseña actual"
            type={showCurrentPassword ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            fullWidth
            disabled={loading || success}
            sx={{ 
              mb: 3,
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#f8f9fa',
                borderRadius: 2,
                '& fieldset': {
                  border: '1px solid #e0e0e0',
                },
                '&:hover fieldset': {
                  borderColor: '#501B39',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#501B39',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#666',
                '&.Mui-focused': {
                  color: '#501B39',
                },
              },
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Box
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    sx={{
                      color: '#666',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                  </Box>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="Nueva contraseña"
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            disabled={loading || success}
            error={!!passwordError && newPassword.length > 0}
            helperText={passwordError || 'Mínimo 8 caracteres con mayúscula, minúscula y número'}
            sx={{ 
              mb: 3,
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#f8f9fa',
                borderRadius: 2,
                '& fieldset': {
                  border: '1px solid #e0e0e0',
                },
                '&:hover fieldset': {
                  borderColor: '#501B39',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#501B39',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#666',
                '&.Mui-focused': {
                  color: '#501B39',
                },
              },
              '& .MuiFormHelperText-root': {
                color: '#666',
                '&.Mui-error': {
                  color: '#d32f2f',
                },
              },
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Box
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    sx={{
                      color: '#666',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </Box>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="Confirmar nueva contraseña"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
            disabled={loading || success}
            error={!!confirmError}
            helperText={confirmError || ' '}
            sx={{ 
              mb: 4,
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#f8f9fa',
                borderRadius: 2,
                '& fieldset': {
                  border: '1px solid #e0e0e0',
                },
                '&:hover fieldset': {
                  borderColor: '#501B39',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#501B39',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#666',
                '&.Mui-focused': {
                  color: '#501B39',
                },
              },
              '& .MuiFormHelperText-root': {
                color: '#666',
                '&.Mui-error': {
                  color: '#d32f2f',
                },
              },
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Box
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    sx={{
                      color: '#666',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </Box>
                </InputAdornment>
              ),
            }}
          />

          {/* Botones */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={!isFormValid}
              sx={{ 
                flex: 1,
                py: 1.5,
                backgroundColor: '#501B39',
                color: 'white',
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: '#3d1428',
                },
                '&:disabled': {
                  backgroundColor: '#e0e0e0',
                  color: '#9e9e9e',
                },
              }}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? 'Cambiando...' : 'Cambiar contraseña'}
            </Button>

            <Button
              variant="outlined"
              onClick={logout}
              disabled={loading || success}
              sx={{ 
                border: '1px solid #501B39',
                color: '#501B39',
                '&:hover': {
                  backgroundColor: 'rgba(80, 27, 57, 0.04)',
                  borderColor: '#3d1428',
                },
              }}
            >
              Salir
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ForcePasswordModal;
