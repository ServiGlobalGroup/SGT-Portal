import React, { useState, useEffect } from 'react';
import {
  Slide,
  Box,
  Typography,
  IconButton,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Close,
  CheckCircle,
  Error,
  Warning,
  Info,
  Notifications,
} from '@mui/icons-material';

export interface NotificationProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  progress?: number; // Para notificaciones de progreso
}

interface ModernNotificationSystemProps {
  notifications: NotificationProps[];
  onClose: (id: string) => void;
  position?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
}

export const ModernNotificationSystem: React.FC<ModernNotificationSystemProps> = ({
  notifications,
  onClose,
  position = { vertical: 'top', horizontal: 'right' },
}) => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: position.vertical === 'top' ? 24 : 'auto',
        bottom: position.vertical === 'bottom' ? 24 : 'auto',
        ...(position.horizontal === 'left' && { left: 24 }),
        ...(position.horizontal === 'right' && { right: 24 }),
        ...(position.horizontal === 'center' && { 
          left: '50%', 
          transform: 'translateX(-50%)' 
        }),
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        maxWidth: 400,
        width: '100%',
      }}
    >
      {notifications.map((notification) => (
        <ModernNotification
          key={notification.id}
          notification={notification}
          onClose={() => onClose(notification.id)}
        />
      ))}
    </Box>
  );
};

const ModernNotification: React.FC<{
  notification: NotificationProps;
  onClose: () => void;
}> = ({ notification, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(notification.duration || 5000);

  useEffect(() => {
    setVisible(true);
    
    if (!notification.persistent && notification.duration) {
      const timer = setTimeout(() => {
        handleClose();
      }, notification.duration);

      // Actualizar tiempo restante cada 100ms
      const progressTimer = setInterval(() => {
        setTimeLeft(prev => Math.max(0, prev - 100));
      }, 100);

      return () => {
        clearTimeout(timer);
        clearInterval(progressTimer);
      };
    }
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300); // Esperar a que termine la animación
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle sx={{ fontSize: 24 }} />;
      case 'error':
        return <Error sx={{ fontSize: 24 }} />;
      case 'warning':
        return <Warning sx={{ fontSize: 24 }} />;
      case 'info':
        return <Info sx={{ fontSize: 24 }} />;
      default:
        return <Notifications sx={{ fontSize: 24 }} />;
    }
  };

  const getColors = () => {
    switch (notification.type) {
      case 'success':
        return {
          background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
          border: '#4caf50',
          progressColor: '#66bb6a',
        };
      case 'error':
        return {
          background: 'linear-gradient(135deg, #f44336 0%, #e53935 100%)',
          border: '#f44336',
          progressColor: '#ef5350',
        };
      case 'warning':
        return {
          background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
          border: '#ff9800',
          progressColor: '#ffb74d',
        };
      case 'info':
        return {
          background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
          border: '#2196f3',
          progressColor: '#42a5f5',
        };
      default:
        return {
          background: 'linear-gradient(135deg, #757575 0%, #616161 100%)',
          border: '#757575',
          progressColor: '#9e9e9e',
        };
    }
  };

  const colors = getColors();
  const progressPercentage = notification.duration 
    ? ((notification.duration - timeLeft) / notification.duration) * 100 
    : 0;

  return (
    <Slide direction="left" in={visible} timeout={300}>
      <Box
        sx={{
          position: 'relative',
          backgroundColor: 'white',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
          border: `2px solid ${colors.border}20`,
          overflow: 'hidden',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateX(-4px)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        {/* Header colorido */}
        <Box
          sx={{
            background: colors.background,
            color: 'white',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Cpath d="m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              opacity: 0.1,
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <Box
              sx={{
                p: 1,
                bgcolor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: 2,
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {getIcon()}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {notification.title}
              </Typography>
              {notification.message && (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    opacity: 0.9,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {notification.message}
                </Typography>
              )}
            </Box>
          </Box>
          
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{
              color: 'white',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              position: 'relative',
              zIndex: 1,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <Close sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        {/* Contenido adicional */}
        {(notification.action || typeof notification.progress === 'number') && (
          <Box sx={{ p: 2, backgroundColor: '#fafafa' }}>
            {typeof notification.progress === 'number' && (
              <Box sx={{ mb: notification.action ? 2 : 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Progreso
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {Math.round(notification.progress)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={notification.progress}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: `${colors.border}20`,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: colors.progressColor,
                      borderRadius: 3,
                    },
                  }}
                />
              </Box>
            )}
            
            {notification.action && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Chip
                  label={notification.action.label}
                  onClick={notification.action.onClick}
                  clickable
                  size="small"
                  sx={{
                    backgroundColor: colors.border,
                    color: 'white',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: `${colors.border}dd`,
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                />
              </Box>
            )}
          </Box>
        )}

        {/* Barra de progreso de tiempo */}
        {!notification.persistent && notification.duration && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: 3,
              backgroundColor: colors.progressColor,
              width: `${progressPercentage}%`,
              transition: 'width 0.1s linear',
              borderRadius: '0 0 0 12px',
            }}
          />
        )}
      </Box>
    </Slide>
  );
};

// Hook para manejar notificaciones
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationProps[]>([]);

  const addNotification = (notification: Omit<NotificationProps, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { ...notification, id }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
  };
};
