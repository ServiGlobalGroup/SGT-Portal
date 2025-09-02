import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Avatar,
  Fade,
  Slide,
  LinearProgress,
  Chip,
  Stack,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { alpha } from '@mui/material/styles';
import {
  Construction,
  Code,
  Schedule,
  Lightbulb,
  Warning,
  CheckCircle,
} from '@mui/icons-material';

const Transition = React.forwardRef<unknown, TransitionProps & { children: React.ReactElement<any, any> }>(
  function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
  }
);

interface DevelopmentModalProps {
  open: boolean;
  onClose: () => void;
  pageTitle: string;
  description?: string;
  features?: string[];
  estimatedCompletion?: string;
  progressValue?: number;
  corporateColor?: string;
}

export const DevelopmentModal: React.FC<DevelopmentModalProps> = ({
  open,
  onClose,
  pageTitle,
  description = "Esta página está actualmente en desarrollo. Nuestro equipo está trabajando para implementar todas las funcionalidades.",
  features = [],
  estimatedCompletion,
  progressValue = 65,
  corporateColor = '#501b36',
}) => {
  return (
    <Dialog
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }
      }}
    >
      {/* Header con gradiente */}
      <DialogTitle
        sx={{
          background: `linear-gradient(135deg, ${corporateColor} 0%, ${alpha(corporateColor, 0.8)} 100%)`,
          color: 'white',
          p: 4,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Cpath d="m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                width: 56,
                height: 56,
              }}
            >
              <Construction sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {pageTitle}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Página en desarrollo
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 4, bgcolor: '#f8f9fa' }}>
        <Fade in={open} timeout={800}>
          <Box>
            {/* Mensaje principal */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: alpha('#ff9800', 0.1),
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <Warning sx={{ fontSize: 40, color: '#ff9800' }} />
              </Avatar>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: corporateColor,
                  mb: 2,
                }}
              >
                Funcionalidad en Desarrollo
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.6,
                }}
              >
                {description}
              </Typography>
            </Box>

            {/* Progreso de desarrollo */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Code sx={{ fontSize: 20, color: corporateColor }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: corporateColor }}>
                    Progreso de desarrollo
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: corporateColor }}>
                  {progressValue}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progressValue}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: alpha(corporateColor, 0.1),
                  '& .MuiLinearProgress-bar': {
                    bgcolor: corporateColor,
                    borderRadius: 4,
                  },
                }}
              />
            </Box>

            {/* Información adicional */}
            <Stack spacing={2}>
              {estimatedCompletion && (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  p: 2,
                  bgcolor: 'white',
                  borderRadius: 2,
                  border: '1px solid #e0e0e0',
                }}>
                  <Avatar sx={{ bgcolor: alpha('#2196f3', 0.1), width: 40, height: 40 }}>
                    <Schedule sx={{ color: '#2196f3', fontSize: 20 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Fecha estimada de finalización
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {estimatedCompletion}
                    </Typography>
                  </Box>
                </Box>
              )}

              {features.length > 0 && (
                <Box sx={{ 
                  p: 2,
                  bgcolor: 'white',
                  borderRadius: 2,
                  border: '1px solid #e0e0e0',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: alpha('#4caf50', 0.1), width: 40, height: 40 }}>
                      <Lightbulb sx={{ color: '#4caf50', fontSize: 20 }} />
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Características planeadas
                    </Typography>
                  </Box>
                  <Stack spacing={1}>
                    {features.map((feature, index) => (
                      <Chip
                        key={index}
                        label={feature}
                        size="small"
                        icon={<CheckCircle sx={{ fontSize: 16 }} />}
                        variant="outlined"
                        sx={{
                          justifyContent: 'flex-start',
                          borderColor: alpha(corporateColor, 0.3),
                          color: corporateColor,
                          '& .MuiChip-icon': {
                            color: '#4caf50',
                          },
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Nota de disculpa */}
              <Box sx={{ 
                p: 2,
                bgcolor: alpha(corporateColor, 0.02),
                borderRadius: 2,
                border: `1px solid ${alpha(corporateColor, 0.1)}`,
                textAlign: 'center',
              }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                  Disculpa las molestias. Estamos trabajando para ofrecerte la mejor experiencia posible.
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Fade>
      </DialogContent>

      <DialogActions sx={{ 
        p: 3, 
        bgcolor: '#f8f9fa',
        borderTop: '1px solid #e0e0e0',
      }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            borderRadius: 2,
            px: 4,
            py: 1.5,
            textTransform: 'none',
            fontWeight: 600,
            bgcolor: corporateColor,
            '&:hover': {
              bgcolor: alpha(corporateColor, 0.8),
            },
          }}
        >
          Entendido
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DevelopmentModal;
