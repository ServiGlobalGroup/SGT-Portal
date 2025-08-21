import React, { ReactNode } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Fade,
  useTheme,
  useMediaQuery,
  Backdrop,
} from '@mui/material';
import { Close } from '@mui/icons-material';

export interface ModernModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  fullScreen?: boolean;
  disableEscapeKeyDown?: boolean;
  disableBackdropClick?: boolean;
  showCloseButton?: boolean;
  headerColor?: string;
  footerColor?: string;
  customHeaderGradient?: string;
}

export const ModernModal: React.FC<ModernModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  actions,
  maxWidth = 'sm',
  fullWidth = true,
  fullScreen = false,
  disableEscapeKeyDown = false,
  disableBackdropClick = false,
  showCloseButton = true,
  headerColor = '#501b36',
  footerColor,
  customHeaderGradient,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleClose = (_event: {}, reason?: string) => {
    if (disableBackdropClick && reason === 'backdropClick') {
      return;
    }
    if (disableEscapeKeyDown && reason === 'escapeKeyDown') {
      return;
    }
    onClose();
  };

  const headerBackground = customHeaderGradient || 
    `linear-gradient(135deg, ${headerColor} 0%, ${headerColor}dd 50%, ${headerColor}bb 100%)`;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      fullScreen={fullScreen || isMobile}
      TransitionComponent={Fade}
      transitionDuration={300}
      slots={{
        backdrop: Backdrop,
      }}
      slotProps={{
        backdrop: {
          timeout: 300,
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
          },
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 4,
          boxShadow: isMobile 
            ? 'none' 
            : '0 24px 64px rgba(0, 0, 0, 0.12), 0 8px 32px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          position: 'relative',
          maxHeight: isMobile ? '100vh' : '90vh',
          margin: isMobile ? 0 : 2,
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          background: headerBackground,
          color: 'white',
          py: 3,
          px: 3,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath d="m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            opacity: 0.1,
          },
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
            {icon && (
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: 2.5,
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 48,
                  height: 48,
                  '& svg': {
                    fontSize: 28,
                    color: 'white',
                  },
                }}
              >
                {icon}
              </Box>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography 
                variant="h5" 
                component="div" 
                sx={{ 
                  fontWeight: 700,
                  mb: subtitle ? 0.5 : 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    opacity: 0.9,
                    fontWeight: 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
          
          {showCloseButton && (
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                color: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                ml: 2,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <Close />
            </IconButton>
          )}
        </Box>
      </DialogTitle>

      {/* Content */}
      <DialogContent
        sx={{
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            p: 4,
            flex: 1,
            overflowY: 'auto',
            backgroundColor: '#fafafa',
            '&::-webkit-scrollbar': {
              width: 8,
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              borderRadius: 4,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: 4,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
              },
            },
          }}
        >
          {children}
        </Box>
      </DialogContent>

      {/* Footer */}
      {actions && (
        <DialogActions
          sx={{
            p: 3,
            backgroundColor: footerColor || '#f8f9fa',
            borderTop: '1px solid rgba(0, 0, 0, 0.08)',
            gap: 1.5,
            justifyContent: 'flex-end',
            flexShrink: 0,
          }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
};

// Componente de botón moderno para usar en los modales
export const ModernButton: React.FC<{
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  size?: 'small' | 'medium' | 'large';
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  fullWidth?: boolean;
  children: ReactNode;
  customColor?: string;
}> = ({
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  startIcon,
  endIcon,
  disabled = false,
  loading = false,
  onClick,
  fullWidth = false,
  children,
  customColor,
}) => {
  const getPrimaryColor = () => {
    if (customColor) return customColor;
    switch (color) {
      case 'primary': return '#501b36';
      case 'success': return '#4caf50';
      case 'error': return '#f44336';
      case 'warning': return '#ff9800';
      case 'info': return '#2196f3';
      default: return '#501b36';
    }
  };

  const getButtonStyles = () => {
    const primaryColor = getPrimaryColor();
    
    if (variant === 'contained') {
      // Para color primario (granate) o customColor granate aplicamos el gradiente y sombras modernas
      if (color === 'primary' || primaryColor.toLowerCase() === '#501b36') {
        return {
          background: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 70%, #501b36 100%)',
          color: 'white',
          boxShadow: '0 4px 12px rgba(80,27,54,0.3), 0 2px 4px rgba(80,27,54,0.2)',
          '&:hover': {
            background: 'linear-gradient(135deg, #3d1429 0%, #5a1d3a 30%, #6b2545 70%, #3d1429 100%)',
            transform: 'translateY(-1px)',
            boxShadow: '0 6px 16px rgba(80,27,54,0.4), 0 2px 8px rgba(80,27,54,0.3)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
          '&:disabled': {
            opacity: 0.6,
          },
        };
      }
      // Para otros colores mantenemos el comportamiento sólido
      return {
        backgroundColor: primaryColor,
        color: 'white',
        '&:hover': {
          backgroundColor: `${primaryColor}dd`,
          transform: 'translateY(-1px)',
          boxShadow: `0 6px 20px ${primaryColor}40`,
        },
        '&:active': {
          transform: 'translateY(0)',
        },
      };
    } else if (variant === 'outlined') {
      return {
        borderColor: primaryColor,
        color: primaryColor,
        backgroundColor: 'transparent',
        '&:hover': {
          backgroundColor: `${primaryColor}08`,
          borderColor: `${primaryColor}dd`,
          transform: 'translateY(-1px)',
        },
        '&:active': {
          transform: 'translateY(0)',
        },
      };
    }
    
    return {
      color: primaryColor,
      '&:hover': {
        backgroundColor: `${primaryColor}08`,
      },
    };
  };

  return (
    <Box
      component="button"
      disabled={disabled || loading}
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        px: size === 'large' ? 4 : size === 'small' ? 2 : 3,
        py: size === 'large' ? 2 : size === 'small' ? 1.25 : 1.5, // Aumentado el padding vertical
        minHeight: size === 'large' ? 48 : size === 'small' ? 36 : 42, // Altura mínima fija
        borderRadius: 2.5,
        border: variant === 'outlined' ? '2px solid' : 'none',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        textTransform: 'none',
        fontWeight: 600,
        fontSize: size === 'large' ? '1rem' : size === 'small' ? '0.875rem' : '0.9375rem',
        lineHeight: 1.2, // Altura de línea específica
        minWidth: size === 'large' ? 120 : size === 'small' ? 80 : 100,
        width: fullWidth ? '100%' : 'auto',
        opacity: disabled ? 0.6 : 1,
        ...getButtonStyles(),
        '&:disabled': {
          cursor: 'not-allowed',
          transform: 'none !important',
          boxShadow: 'none !important',
        },
      }}
    >
      {loading ? (
        <Box
          sx={{
            width: 16,
            height: 16,
            border: '2px solid currentColor',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' },
            },
          }}
        />
      ) : (
        <>
          {startIcon && startIcon}
          {children}
          {endIcon && endIcon}
        </>
      )}
    </Box>
  );
};
