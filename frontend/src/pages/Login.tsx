import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
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
import { validateUsername } from '../utils/validation';
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
  backgroundColor: '#ffffff', // Fondo blanco para toda la pantalla
}));

const LeftSection = styled(Box)(({ theme }) => ({
  flex: '0 0 35%', // Reducir el ancho de la sección izquierda
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'transparent',
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
  flex: '0 0 65%', // Expandir la sección derecha
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(3),
  position: 'relative',
  overflow: 'hidden',
  [theme.breakpoints.down('md')]: {
    display: 'none',
  },
}));

const RightSectionInner = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '100%',
  minHeight: '500px',
  background: 'linear-gradient(135deg, #501B39 0%, #3d1428 100%)',
  borderRadius: '24px',
  padding: theme.spacing(6),
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 8px 32px rgba(80, 27, 57, 0.2)',
}));

// Componentes del carrusel
const CarouselContainer = styled(Box)(() => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderRadius: '24px',
  overflow: 'hidden',
}));

const CarouselSlide = styled(Box)<{ active: boolean }>(({ active }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  opacity: active ? 0.25 : 0, // Menos opacidad por defecto
  transition: 'opacity 1s ease-in-out',
  zIndex: 1,
}));

const CarouselControls = styled(Box)(() => ({
  position: 'absolute',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: '8px',
  zIndex: 3,
}));

const CarouselDot = styled(Box)<{ active: boolean }>(({ active }) => ({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: active ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.3)',
  cursor: 'pointer',
  transition: 'background-color 0.3s ease',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
}));

const LoginCard = styled(Box)(() => ({
  maxWidth: 400,
  width: '100%',
  backgroundColor: 'transparent', // Sin fondo de tarjeta
  borderRadius: 0, // Sin esquinas redondeadas
  padding: 0, // Sin padding extra
  boxShadow: 'none', // Sin sombra
  border: 'none', // Sin borde
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

const Login: React.FC = () => {
  const { login, isLoading: authLoading } = useAuth();

  // Estados del formulario
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

  // Estados del carrusel
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselImages = [
    '/portada.webp',
    '/portada.webp', // Podrías agregar más imágenes aquí cuando las tengas
    '/portada.webp', // Por ahora usando la misma imagen
  ];

  // Efecto para el carrusel automático
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000); // Cambia cada 5 segundos

    return () => clearInterval(interval);
  }, [carouselImages.length]);

  // Validación de contraseña
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
          {/* Logo más grande y más arriba */}
          <Box sx={{ 
            textAlign: 'center', 
            mb: 4, // Más espacio ya que no hay subtítulo
            mt: -2, // Margen superior negativo para subirlo más
            '& img': {
              maxWidth: '220px', // Más grande
              height: 'auto',
              maxHeight: '70px', // Más alto
              objectFit: 'contain',
            }
          }}>
            <img 
              src="/images/logosgt.webp" 
              alt="Logo SGT" 
              style={{ width: '100%' }}
            />
          </Box>

          <Typography 
            variant="h4" 
            align="center" 
            sx={{ 
              mb: 4,
              fontWeight: 700,
              color: '#333',
              fontSize: '28px'
            }}
          >
            INICIAR SESIÓN
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
              label="DNI/NIE"
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
              placeholder="12345678A"
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
                    <Box
                      onClick={() => setShowPassword(!showPassword)}
                      sx={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#666',
                        padding: '4px',
                        '& svg': {
                          fontSize: '20px'
                        }
                      }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </Box>
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

            {/* Línea separadora */}
            <Box sx={{ 
              width: '100%',
              height: '1px',
              backgroundColor: '#e0e0e0',
              mt: 4,
              mb: 3
            }} />

            {/* Texto de contacto */}
            <Typography 
              variant="body2" 
              align="center" 
              sx={{ 
                color: '#666',
                fontSize: '12px',
                lineHeight: 1.4
              }}
            >
              Para cualquier duda o pregunta al respecto,
              <br />
              contactar con administración.
            </Typography>
          </Box>
        </LoginCard>
      </LeftSection>

      {/* Sección Derecha - Solo fondo con carrusel */}
      <RightSection>
        <RightSectionInner>
          {/* Texto de marca en la esquina inferior */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 40,
              right: 40,
              zIndex: 10,
              textAlign: 'right',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: 'white',
                fontWeight: 700,
                fontSize: '20px',
                mb: 0.5,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              ServiGlobal Group
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: '14px',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              }}
            >
              Portal de Gestión Empresarial
            </Typography>
          </Box>

          {/* Carrusel de imágenes */}
          <CarouselContainer>
            {carouselImages.map((image, index) => (
              <CarouselSlide
                key={index}
                active={index === currentSlide}
                sx={{
                  backgroundImage: `url(${image})`,
                }}
              />
            ))}
            
            {/* Indicadores del carrusel */}
            <CarouselControls>
              {carouselImages.map((_, index) => (
                <CarouselDot
                  key={index}
                  active={index === currentSlide}
                  onClick={() => setCurrentSlide(index)}
                />
              ))}
            </CarouselControls>
          </CarouselContainer>
        </RightSectionInner>
      </RightSection>
    </LoginContainer>
  );
};

export default Login;
