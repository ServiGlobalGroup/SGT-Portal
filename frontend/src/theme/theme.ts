import { createTheme } from '@mui/material/styles';

// Colores principales
const colors = {
  primary: {
    main: '#501b36',
    light: '#7d2d52',
    dark: '#3d1429',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#455A64',
    light: '#78909C',
    dark: '#263238',
    contrastText: '#ffffff',
  },
  background: {
    default: '#f5f5f5',
    paper: '#ffffff',
  },
  text: {
    primary: '#212121',
    secondary: '#757575',
  },
};

// Gradientes personalizados
const gradients = {
  primary: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 70%, #501b36 100%)',
  secondary: 'linear-gradient(135deg, #455A64 0%, #78909C 100%)',
  success: 'linear-gradient(135deg, #2E7D32 0%, #66BB6A 100%)',
  warning: 'linear-gradient(135deg, #F57C00 0%, #FFB74D 100%)',
  error: 'linear-gradient(135deg, #D32F2F 0%, #EF5350 100%)',
  info: 'linear-gradient(135deg, #1976D2 0%, #64B5F6 100%)',
};

// Sombras personalizadas
const shadows = {
  light: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
  medium: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
  heavy: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
};

const theme = createTheme({
  palette: {
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    text: colors.text,
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.5px',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.25px',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
      letterSpacing: '0.25px',
    },
    body2: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
      letterSpacing: '0.25px',
    },
    button: {
      textTransform: 'uppercase',
      fontWeight: 500,
      letterSpacing: '0.5px',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          boxSizing: 'border-box',
        },
        html: {
          width: '100%',
          height: '100%',
          margin: 0,
          padding: 0,
          overflowX: 'hidden',
        },
        body: {
          width: '100%',
          margin: 0,
          padding: 0,
          overflowX: 'hidden',
          maxWidth: '100vw',
          boxSizing: 'border-box',
        },
        '#root': {
          width: '100%',
          minHeight: '100vh',
          margin: 0,
          padding: 0,
          maxWidth: '100vw',
          overflowX: 'hidden',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          fontWeight: 700,
          textTransform: 'none',
          fontSize: '0.875rem',
          letterSpacing: '0.2px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: 'none',
        },
        contained: {
          background: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 70%, #501b36 100%)',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(80,27,54,0.3), 0 2px 4px rgba(80,27,54,0.2)',
          '&:hover': {
            background: 'linear-gradient(135deg, #3d1429 0%, #5a1d3a 30%, #6b2545 70%, #3d1429 100%)',
            boxShadow: '0 6px 16px rgba(80,27,54,0.4), 0 2px 8px rgba(80,27,54,0.3)',
            transform: 'translateY(-1px)',
          },
          '&.Mui-disabled': {
            background: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 70%, #501b36 100%)',
            color: '#fff',
            opacity: 0.6,
          },
        },
        outlined: {
          borderWidth: '1.5px',
          borderColor: '#501b36',
          color: '#501b36',
          '&:hover': {
            borderWidth: '1.5px',
            backgroundColor: 'rgba(80,27,54,0.06)',
            borderColor: '#3d1429',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: '#ffffff',
          borderRadius: 8,
          border: '1px solid #e0e0e0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
          transition: 'box-shadow 0.2s ease',
          '&:hover': {
            boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          background: '#ffffff',
          borderRadius: 8,
          border: '1px solid #e0e0e0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        },
        elevation2: {
          boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 4,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          borderBottom: '1px solid #e0e0e0',
          color: '#212121',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: '#263238',
          borderRight: 'none',
          boxShadow: '2px 0 4px rgba(0,0,0,0.12)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          margin: '2px 8px',
          '&.Mui-selected': {
            background: 'rgba(33, 150, 243, 0.12)',
            color: '#1976D2',
            '&:hover': {
              background: 'rgba(33, 150, 243, 0.16)',
            },
          },
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.08)',
          },
          transition: 'all 0.2s ease',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 4,
          borderRadius: 2,
          background: 'rgba(0, 0, 0, 0.1)',
        },
        bar: {
          background: colors.primary.main,
          borderRadius: 2,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          background: colors.primary.main,
          color: '#ffffff',
          fontWeight: 600,
        },
      },
    },
  },
});

// Agregar propiedades personalizadas al tema
declare module '@mui/material/styles' {
  interface Theme {
    gradients: typeof gradients;
    customShadows: typeof shadows;
  }
  
  interface ThemeOptions {
    gradients?: typeof gradients;
    customShadows?: typeof shadows;
  }
}

theme.gradients = gradients;
theme.customShadows = shadows;

export default theme;
