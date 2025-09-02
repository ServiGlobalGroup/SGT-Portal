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
          borderRadius: { xs: 3, sm: 3 },
          background: 'white',
          color: '#333',
          p: 0,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          margin: { xs: 2, sm: 2 },
          maxHeight: { xs: 'calc(100vh - 32px)', sm: 'calc(100vh - 64px)' },
          width: { xs: 'calc(100vw - 32px)', sm: 'auto' },
        }
      }}
    >
      <DialogContent sx={{ p: { xs: 3, sm: 4 } }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          mb: { xs: 2, sm: 3 },
          p: { xs: 2, sm: 2 },
          background: 'linear-gradient(135deg, #501B39 0%, #6B2449 100%)',
          color: 'white',
          borderRadius: { xs: '12px 12px 0 0', sm: '12px 12px 0 0' },
          mx: { xs: -3, sm: -4 },
          mt: { xs: -3, sm: -4 },
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
            <Lock sx={{ fontSize: { xs: 20, sm: 24 } }} />
            <Typography variant="h6" sx={{ 
              fontWeight: 600,
              fontSize: { xs: '1rem', sm: '1.25rem' }
            }}>
              Cambio de contraseña requerido
            </Typography>
          </Box>
          <IconButton 
            onClick={logout}
            sx={{ 
              color: 'white',
              padding: { xs: 0.5, sm: 1 },
              '&:hover': { 
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            <Close sx={{ fontSize: { xs: 20, sm: 24 } }} />
          </IconButton>
        </Box>

        {/* Descripción */}
        <Typography sx={{ 
          mb: { xs: 2, sm: 3 }, 
          opacity: 0.7, 
          color: '#666',
          fontSize: { xs: '0.875rem', sm: '1rem' },
          lineHeight: { xs: 1.4, sm: 1.5 }
        }}>
          Por seguridad, debes establecer una nueva contraseña antes de continuar.
        </Typography>

        {/* Alertas */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: { xs: 2, sm: 3 },
              backgroundColor: '#ffebee',
              color: '#d32f2f',
              '& .MuiAlert-icon': { color: '#d32f2f' },
              border: '1px solid #ffcdd2',
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: { xs: 2, sm: 3 },
              backgroundColor: '#e8f5e8',
              color: '#2e7d32',
              '& .MuiAlert-icon': { color: '#2e7d32' },
              border: '1px solid #c8e6c9',
              fontSize: { xs: '0.875rem', sm: '1rem' }
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
              mb: { xs: 2, sm: 3 },
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#f8f9fa',
                borderRadius: { xs: 12, sm: 8 },
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
                fontSize: { xs: '0.875rem', sm: '1rem' },
                '&.Mui-focused': {
                  color: '#501B39',
                },
              },
              '& .MuiOutlinedInput-input': {
                fontSize: { xs: '0.875rem', sm: '1rem' },
                padding: { xs: '14px 16px', sm: '14px 16px' }
              }
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
              mb: { xs: 2, sm: 3 },
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#f8f9fa',
                borderRadius: { xs: 12, sm: 8 },
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
                fontSize: { xs: '0.875rem', sm: '1rem' },
                '&.Mui-focused': {
                  color: '#501B39',
                },
              },
              '& .MuiOutlinedInput-input': {
                fontSize: { xs: '0.875rem', sm: '1rem' },
                padding: { xs: '14px 16px', sm: '14px 16px' }
              },
              '& .MuiFormHelperText-root': {
                color: '#666',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
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
              mb: { xs: 3, sm: 4 },
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#f8f9fa',
                borderRadius: { xs: 12, sm: 8 },
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
                fontSize: { xs: '0.875rem', sm: '1rem' },
                '&.Mui-focused': {
                  color: '#501B39',
                },
              },
              '& .MuiOutlinedInput-input': {
                fontSize: { xs: '0.875rem', sm: '1rem' },
                padding: { xs: '14px 16px', sm: '14px 16px' }
              },
              '& .MuiFormHelperText-root': {
                color: '#666',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
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
          <Box sx={{ 
            display: 'flex', 
            gap: { xs: 1.5, sm: 2 },
            flexDirection: { xs: 'column', sm: 'row' }
          }}>
            <Button
              type="submit"
              variant="contained"
              disabled={!isFormValid}
              sx={{ 
                flex: 1,
                py: { xs: 1.5, sm: 1.5 },
                fontSize: { xs: '0.875rem', sm: '1rem' },
                backgroundColor: '#501B39',
                color: 'white',
                fontWeight: 600,
                borderRadius: { xs: 12, sm: 8 },
                order: { xs: 2, sm: 1 },
                '&:hover': {
                  backgroundColor: '#3d1428',
                },
                '&:disabled': {
                  backgroundColor: '#e0e0e0',
                  color: '#9e9e9e',
                },
              }}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
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
                py: { xs: 1.5, sm: 1.5 },
                fontSize: { xs: '0.875rem', sm: '1rem' },
                fontWeight: 600,
                borderRadius: { xs: 12, sm: 8 },
                order: { xs: 1, sm: 2 },
                minWidth: { xs: 'auto', sm: '100px' },
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
