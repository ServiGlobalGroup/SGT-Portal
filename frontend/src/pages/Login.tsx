import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Container,
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

// Styled Components - Diseño limpio y funcional
const LoginContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'url(/portada.png)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  padding: theme.spacing(2),
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(128, 0, 32, 0.2)', // Color granate con opacidad ajustada
    zIndex: 1,
  },
  '& > *': {
    position: 'relative',
    zIndex: 2,
  }
}));

const LoginCard = styled(Card)(({ theme }) => ({
  maxWidth: 420,
  width: '100%',
  borderRadius: theme.spacing(2),
  boxShadow: '0 12px 50px rgba(0, 0, 0, 0.25)',
  overflow: 'visible',
  background: 'rgba(255, 255, 255, 0.95)', // Fondo semi-transparente para ver el fondo
  backdropFilter: 'blur(10px)', // Efecto de desenfoque
  border: '1px solid rgba(255, 255, 255, 0.2)',
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: theme.spacing(1),
    backgroundColor: theme.palette.background.paper,
    cursor: 'text',
    pointerEvents: 'auto',
    '& fieldset': {
      borderColor: theme.palette.divider,
      transition: 'border-color 0.2s ease-in-out',
    },
    '&:hover fieldset': {
      borderColor: '#501B39',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#501B39',
      borderWidth: 2,
    },
    '& input': {
      cursor: 'text',
      userSelect: 'text',
      pointerEvents: 'auto',
      WebkitUserSelect: 'text',
      MozUserSelect: 'text',
      msUserSelect: 'text',
      '&::placeholder': {
        color: theme.palette.text.secondary,
        opacity: 0.7,
      },
      '&:focus': {
        outline: 'none',
      },
    },
  },
  '& .MuiInputLabel-root': {
    fontWeight: 500,
    cursor: 'text',
    pointerEvents: 'auto',
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
  borderRadius: theme.spacing(1),
  padding: theme.spacing(1.5, 3),
  fontSize: '1rem',
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: 'none',
  backgroundColor: '#501B39',
  color: 'white',
  '&:hover': {
    backgroundColor: '#3d1428',
    boxShadow: `0 4px 12px ${alpha('#501B39', 0.3)}`,
  },
  '&:disabled': {
    backgroundColor: theme.palette.grey[400],
    color: theme.palette.grey[600],
  },
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
  const [mounted, setMounted] = useState(false);
  const [inputErrors, setInputErrors] = useState({
    username: '',
    password: ''
  });

  useEffect(() => {
    setMounted(true);
  }, []);

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
      <Container maxWidth="sm">
        <Fade in={mounted} timeout={800}>
          <LoginCard elevation={3}>
            <CardContent sx={{ p: 4 }}>
              {/* Logo */}
              <Box sx={{ 
                textAlign: 'center', 
                mb: 2,
                '& img': {
                  maxWidth: '180px',
                  height: 'auto',
                  maxHeight: '70px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.1))'
                }
              }}>
                <img 
                  src="/images/logosgt.png" 
                  alt="Logo SGT" 
                  style={{ width: '100%' }}
                />
              </Box>

              <Typography 
                variant="subtitle1" 
                align="center" 
                color="text.secondary"
                sx={{ mb: 4 }}
              >
                Sistema de Gestión Empresarial
              </Typography>

              {/* Formulario */}
              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
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
                  label="DNI/NIE"
                  value={credentials.username}
                  onChange={handleInputChange('username')}
                  onKeyPress={handleKeyPress}
                  margin="normal"
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
                        <Person sx={{ color: inputErrors.username ? "error.main" : "#501B39" }} />
                      </InputAdornment>
                    ),
                    style: {
                      cursor: 'text',
                      pointerEvents: 'auto'
                    }
                  }}
                  placeholder="Ingrese su DNI/NIE"
                />

                <StyledTextField
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  label="Contraseña"
                  value={credentials.password}
                  onChange={handleInputChange('password')}
                  onKeyPress={handleKeyPress}
                  margin="normal"
                  disabled={loading || authLoading}
                  error={!!inputErrors.password}
                  helperText={inputErrors.password || "Ingrese su contraseña"}
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
                        <Lock sx={{ color: inputErrors.password ? "error.main" : "#501B39" }} />
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
                          sx={{ color: '#501B39' }}
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

                <LoginButton
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading || authLoading || !isFormValid()}
                  sx={{ 
                    mt: 4, 
                    mb: 2,
                    cursor: (loading || authLoading || !isFormValid()) ? 'not-allowed' : 'pointer',
                    pointerEvents: 'auto'
                  }}
                  startIcon={!loading && !authLoading ? <LoginOutlined /> : undefined}
                  onClick={!loading && !authLoading ? undefined : (e) => e.preventDefault()}
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
                sx={{ mt: 3, fontSize: '0.875rem' }}
              >
                © 2025 Grupo SGT
              </Typography>
            </CardContent>
          </LoginCard>
        </Fade>
      </Container>
    </LoginContainer>
  );
};

export default Login;
