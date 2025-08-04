import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  alpha,
  Fade,
  CircularProgress
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person,
  Lock,
  LoginOutlined
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../hooks/useAuth';
import '../styles/login-fixes.css';

// Interfaces
interface LoginCredentials {
  username: string;
  password: string;
}

// Styled Components - Diseño moderno de dos columnas
const LoginContainer = styled(Box)(() => ({
  minHeight: '100vh',
  display: 'flex',
  position: 'relative',
  overflow: 'hidden',
}));

const LeftSection = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f8f9fa',
  padding: theme.spacing(4),
  position: 'relative',
  zIndex: 2,
  [theme.breakpoints.down('md')]: {
    flex: 'none',
    width: '100%',
    minHeight: '100vh',
  },
}));

const RightSection = styled(Box)(({ theme }) => ({
  flex: 1,
  background: 'linear-gradient(135deg, #501B39 0%, #3d1428 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(6),
  position: 'relative',
  overflow: 'hidden',
  [theme.breakpoints.down('md')]: {
    display: 'none',
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'url(/portada.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: 0.1,
    zIndex: 1,
  },
}));

const LoginCard = styled(Box)(({ theme }) => ({
  maxWidth: 400,
  width: '100%',
  backgroundColor: 'white',
  borderRadius: '16px',
  padding: theme.spacing(4),
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  border: '1px solid rgba(0, 0, 0, 0.05)',
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    cursor: 'text',
    pointerEvents: 'auto',
    border: '1px solid #e0e0e0',
    '& fieldset': {
      border: 'none',
    },
    '&:hover': {
      borderColor: '#501B39',
    },
    '&.Mui-focused': {
      borderColor: '#501B39',
      borderWidth: 2,
      boxShadow: '0 0 0 1px rgba(80, 27, 57, 0.1)',
    },
    '& input': {
      cursor: 'text',
      userSelect: 'text',
      pointerEvents: 'auto',
      WebkitUserSelect: 'text',
      MozUserSelect: 'text',
      msUserSelect: 'text',
      padding: '14px 12px',
      fontSize: '16px',
      '&::placeholder': {
        color: '#9e9e9e',
        opacity: 1,
      },
      '&:focus': {
        outline: 'none',
      },
    },
  },
  '& .MuiInputLabel-root': {
    fontWeight: 500,
    fontSize: '14px',
    color: '#666',
    cursor: 'text',
    pointerEvents: 'auto',
    transform: 'translate(14px, -9px) scale(0.75)',
    backgroundColor: '#ffffff',
    padding: '0 4px',
    '&.Mui-focused': {
      color: '#501B39',
    },
  },
  '& .MuiFormHelperText-root': {
    fontSize: '0.75rem',
    marginTop: theme.spacing(0.5),
  },
}));

const LoginButton = styled(Button)(({ theme }) => ({
  borderRadius: '8px',
  padding: '14px 24px',
  fontSize: '16px',
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: 'none',
  backgroundColor: '#501B39',
  color: 'white',
  marginTop: theme.spacing(2),
  '&:hover': {
    backgroundColor: '#3d1428',
    boxShadow: `0 4px 12px ${alpha('#501B39', 0.3)}`,
  },
  '&:disabled': {
    backgroundColor: '#e0e0e0',
    color: '#9e9e9e',
  },
}));

// Componente para la sección promocional
const PromoContent = styled(Box)(() => ({
  color: 'white',
  textAlign: 'left',
  position: 'relative',
  zIndex: 2,
  maxWidth: '500px',
}));

const PromoCard = styled(Box)(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(10px)',
  borderRadius: '16px',
  padding: theme.spacing(3),
  border: '1px solid rgba(255, 255, 255, 0.2)',
  marginTop: theme.spacing(4),
}));

const Login: React.FC = () => {
  const { login, isLoading: authLoading } = useAuth();

  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputErrors, setInputErrors] = useState({
    username: '',
    password: ''
  });

  // Validaciones básicas
  const validateUsername = (username: string) => {
    if (!username.trim()) {
      return 'Este campo es obligatorio';
    }
    const dniRegex = /^\d{8}[A-Za-z]$/;
    const nieRegex = /^[XYZ]\d{7}[A-Za-z]$/;
    
    if (!dniRegex.test(username) && !nieRegex.test(username)) {
      return 'Formato inválido. Use DNI o NIE';
    }
    return '';
  };

  const validatePassword = (password: string) => {
    if (!password.trim()) {
      return 'Este campo es obligatorio';
    }
    if (password.length < 3) {
      return 'Mínimo 3 caracteres';
    }
    return '';
  };

  const handleInputChange = (field: keyof LoginCredentials) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpiar errores
    if (error) setError(null);
    
    // Validar en tiempo real
    if (field === 'username') {
      const usernameError = validateUsername(value);
      setInputErrors(prev => ({ ...prev, username: usernameError }));
    } else if (field === 'password') {
      const passwordError = validatePassword(value);
      setInputErrors(prev => ({ ...prev, password: passwordError }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    const usernameError = validateUsername(credentials.username);
    const passwordError = validatePassword(credentials.password);
    
    setInputErrors({
      username: usernameError,
      password: passwordError
    });

    if (usernameError || passwordError) {
      setError('Por favor, corrige los errores antes de continuar');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(credentials.username, credentials.password);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const formEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSubmit(formEvent);
    }
  };

  const isFormValid = () => {
    return credentials.username.trim() && 
           credentials.password.trim() && 
           !inputErrors.username && 
           !inputErrors.password;
  };

  return (
    <LoginContainer>
      {/* Sección Izquierda - Formulario */}
      <LeftSection>
        <LoginCard>
          {/* Logo pequeño */}
          <Box sx={{ 
            textAlign: 'center', 
            mb: 1,
            '& img': {
              maxWidth: '120px',
              height: 'auto',
              maxHeight: '40px',
              objectFit: 'contain',
            }
          }}>
            <img 
              src="/images/logosgt.png" 
              alt="Logo SGT" 
              style={{ width: '100%' }}
            />
          </Box>

          <Typography 
            variant="h4" 
            align="center" 
            sx={{ 
              mb: 1,
              fontWeight: 700,
              color: '#333',
              fontSize: '28px'
            }}
          >
            Bienvenido
          </Typography>

          <Typography 
            variant="subtitle1" 
            align="center" 
            color="text.secondary"
            sx={{ mb: 4, fontSize: '14px' }}
          >
            Sistema de Gestión Empresarial
          </Typography>

          {/* Formulario */}
          <Box component="form" onSubmit={handleSubmit}>
            {error && (
              <Fade in={!!error}>
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 1
                  }}
                >
                  {error}
                </Alert>
              </Fade>
            )}

            <StyledTextField
              fullWidth
              label="Email"
              type="email"
              value={credentials.username}
              onChange={handleInputChange('username')}
              onKeyPress={handleKeyPress}
              disabled={loading || authLoading}
              error={!!inputErrors.username}
              helperText={inputErrors.username || ""}
              autoComplete="username"
              spellCheck={false}
              inputProps={{
                style: {
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                  MozUserSelect: 'text',
                  cursor: 'text',
                  pointerEvents: 'auto'
                },
                'data-testid': 'username-input'
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person sx={{ color: inputErrors.username ? "error.main" : "#666" }} />
                  </InputAdornment>
                ),
                style: {
                  cursor: 'text',
                  pointerEvents: 'auto'
                }
              }}
              placeholder="tu@ejemplo.com"
            />

            <StyledTextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Contraseña"
              value={credentials.password}
              onChange={handleInputChange('password')}
              onKeyPress={handleKeyPress}
              disabled={loading || authLoading}
              error={!!inputErrors.password}
              helperText={inputErrors.password || ""}
              autoComplete="current-password"
              spellCheck={false}
              inputProps={{
                style: {
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                  MozUserSelect: 'text',
                  cursor: 'text',
                  pointerEvents: 'auto'
                },
                'data-testid': 'password-input'
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: inputErrors.password ? "error.main" : "#666" }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={loading || authLoading}
                      tabIndex={-1}
                      style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                      sx={{ color: '#666' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
                style: {
                  cursor: 'text',
                  pointerEvents: 'auto'
                }
              }}
              placeholder="••••••••"
            />

            <Typography 
              variant="body2" 
              align="right" 
              sx={{ 
                mb: 3,
                color: '#501B39',
                cursor: 'pointer',
                fontSize: '14px',
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              ¿Olvidaste tu contraseña?
            </Typography>

            <LoginButton
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || authLoading || !isFormValid()}
              sx={{ 
                cursor: (loading || authLoading || !isFormValid()) ? 'not-allowed' : 'pointer',
                pointerEvents: 'auto'
              }}
              startIcon={!loading && !authLoading ? <LoginOutlined /> : undefined}
            >
              {loading || authLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} color="inherit" />
                  Iniciando sesión...
                </Box>
              ) : (
                'Iniciar Sesión'
              )}
            </LoginButton>
          </Box>

          {/* Footer */}
          <Typography 
            variant="body2" 
            color="text.secondary" 
            align="center" 
            sx={{ mt: 3, fontSize: '12px' }}
          >
            ¿No tienes cuenta? <span style={{ color: '#501B39', cursor: 'pointer' }}>Regístrate</span>
          </Typography>
        </LoginCard>
      </LeftSection>

      {/* Sección Derecha - Promocional */}
      <RightSection>
        <PromoContent>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 300,
              fontSize: '48px',
              lineHeight: 1.2,
              mb: 2,
              fontStyle: 'italic'
            }}
          >
            Ingresa al Futuro
          </Typography>
          
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 600,
              fontSize: '36px',
              lineHeight: 1.2,
              mb: 1
            }}
          >
            de la Gestión Empresarial,
          </Typography>
          
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 600,
              fontSize: '36px',
              lineHeight: 1.2,
              mb: 4
            }}
          >
            hoy
          </Typography>

          <PromoCard>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{ 
                width: 40, 
                height: 40, 
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Typography sx={{ fontSize: '20px', fontWeight: 'bold' }}>
                  SGT
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '24px', fontWeight: 'bold' }}>
                  Portal Integrado
                </Typography>
                <Typography sx={{ fontSize: '14px', opacity: 0.8 }}>
                  Gestión Completa
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mt: 2 
            }}>
              <Typography sx={{ fontSize: '16px', fontWeight: 500 }}>
                Dashboard Principal
              </Typography>
              <Typography sx={{ fontSize: '14px', opacity: 0.8 }}>
                Ver Todo
              </Typography>
            </Box>
          </PromoCard>
        </PromoContent>
      </RightSection>
    </LoginContainer>
  );
};

export default Login;
