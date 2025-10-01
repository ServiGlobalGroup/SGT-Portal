import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  LinearProgress,
  Alert,
  useTheme,
  useMediaQuery,
  alpha,
  Backdrop,
  Fade,
} from '@mui/material';
import {
  Close,
  PictureAsPdf,
  Refresh,
} from '@mui/icons-material';

interface PdfPreviewProps {
  open: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  title?: string;
}

export const PdfPreview: React.FC<PdfPreviewProps> = ({
  open,
  onClose,
  fileUrl,
  fileName,
  title,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  // Función adicional para manejar la carga en móvil
  const handleIframeLoad = useCallback(() => {
    // Pequeño delay para asegurarse de que el contenido se renderice
    setTimeout(() => {
      setLoading(false);
      setError(false);
    }, 500);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setError(false);
    // Force iframe reload
    const iframe = document.querySelector('#pdf-preview-iframe') as HTMLIFrameElement;
    if (iframe) {
      const currentSrc = iframe.src;
      iframe.src = '';
      setTimeout(() => {
        iframe.src = currentSrc;
      }, 100);
    }
  };

  const getPdfUrl = useCallback(() => {
    if (!fileUrl) return '';
    return fileUrl;
  }, [fileUrl]);

  const resetState = () => {
    setLoading(true);
    setError(false);
  };

  useEffect(() => {
    if (open) {
      resetState();
      
      // En móvil, agregar un timeout de seguridad para quitar el loading
      // ya que los iframes con PDFs no siempre disparan onLoad correctamente
      if (isMobile && fileUrl) {
        const timeoutId = setTimeout(() => {
          setLoading(false);
        }, 3000); // 3 segundos máximo de loading
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [open, isMobile, fileUrl]);



  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      fullScreen={isMobile}
      TransitionComponent={Fade}
      transitionDuration={300}
      slots={{
        backdrop: Backdrop,
      }}
      slotProps={{
        backdrop: {
          timeout: 300,
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
          },
        },
      }}
      PaperProps={{
        sx: {
          height: isMobile ? '100vh' : '98vh',
          maxHeight: isMobile ? '100vh' : '98vh',
          // Permitir zoom y gestos táctiles en móvil
          touchAction: isMobile ? 'pinch-zoom' : 'auto',
          userSelect: isMobile ? 'none' : 'auto',
          // Prevenir el zoom del viewport pero permitir zoom interno
          ...(isMobile && {
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
          }),
          display: 'flex',
          flexDirection: 'column',
          m: isMobile ? 0 : 1,
          borderRadius: isMobile ? 0 : 4,
          boxShadow: isMobile 
            ? 'none' 
            : '0 24px 64px rgba(0, 0, 0, 0.12), 0 8px 32px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 50%, #d4a574 100%)',
          color: 'white',
          py: 3,
          px: 3,
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Cpath d="m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
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
              }}
            >
              <PictureAsPdf sx={{ fontSize: 28, color: 'white' }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography 
                variant={isSmall ? "subtitle1" : "h5"} 
                component="div" 
                sx={{ 
                  fontWeight: 700,
                  mb: !isSmall && fileName ? 0.5 : 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {title || 'Vista previa de PDF'}
              </Typography>
              {!isSmall && fileName && (
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
                  {fileName}
                </Typography>
              )}
            </Box>
          </Box>
          
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
          backgroundColor: alpha('#501b36', 0.02),
        }}
      >
        {loading && fileUrl && (
          <Box sx={{ p: 4 }}>
            <LinearProgress 
              sx={{ 
                mb: 2,
                height: 6,
                borderRadius: 3,
                backgroundColor: alpha('#501b36', 0.1),
                '& .MuiLinearProgress-bar': {
                  backgroundColor: '#501b36',
                  borderRadius: 3,
                },
              }} 
            />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <PictureAsPdf sx={{ color: '#501b36', fontSize: 28 }} />
              <Typography variant="body1" sx={{ color: '#501b36', fontWeight: 600 }}>
                Cargando documento PDF...
              </Typography>
            </Box>
          </Box>
        )}

        {!fileUrl && (
          <Box 
            sx={{ 
              p: 4, 
              textAlign: 'center', 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <Box
              sx={{
                p: 4,
                bgcolor: alpha('#501b36', 0.1),
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PictureAsPdf sx={{ fontSize: 80, color: '#501b36' }} />
            </Box>
            <Alert 
              severity="info" 
              sx={{ 
                maxWidth: 400,
                '& .MuiAlert-icon': {
                  color: '#501b36',
                },
              }}
            >
              <Typography variant="body1" gutterBottom sx={{ fontWeight: 600 }}>
                No hay archivo disponible
              </Typography>
              <Typography variant="body2">
                No se ha proporcionado una URL válida para mostrar el documento PDF.
              </Typography>
            </Alert>
          </Box>
        )}

        {error && fileUrl && (
          <Box 
            sx={{ 
              p: 4, 
              textAlign: 'center', 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <Box
              sx={{
                p: 4,
                bgcolor: alpha('#f44336', 0.1),
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PictureAsPdf sx={{ fontSize: 80, color: '#f44336' }} />
            </Box>
            <Alert severity="error" sx={{ maxWidth: 500 }}>
              <Typography variant="body1" gutterBottom sx={{ fontWeight: 600 }}>
                Error al cargar el documento
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                No se pudo cargar el archivo PDF. Verifique que el archivo existe y es válido.
              </Typography>
              <Button 
                onClick={handleRefresh} 
                size="small" 
                variant="outlined"
                startIcon={<Refresh />}
                sx={{
                  borderColor: '#f44336',
                  color: '#f44336',
                  '&:hover': {
                    backgroundColor: alpha('#f44336', 0.08),
                  },
                }}
              >
                Intentar de nuevo
              </Button>
            </Alert>
          </Box>
        )}

        {fileUrl && !error && (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              overflow: 'hidden',
              p: isMobile ? 0.5 : 1,
            }}
          >
            <Box
              sx={{
                flex: 1,
                backgroundColor: 'white',
                borderRadius: isMobile ? 1 : 2,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                // Permitir zoom con gestos en móvil
                touchAction: isMobile ? 'pinch-zoom' : 'auto',
              }}
            >
              <iframe
                id="pdf-preview-iframe"
                src={getPdfUrl()}
                width="100%"
                height="100%"
                style={{
                  border: 'none',
                  display: 'block',
                  // Permitir zoom en móvil
                  touchAction: isMobile ? 'pinch-zoom' : 'auto',
                }}
                title={fileName}
                onLoad={isMobile ? handleIframeLoad : handleLoad}
                onError={handleError}
              />
            </Box>
          </Box>
        )}
      </DialogContent>

      {/* Footer */}
      <DialogActions 
        sx={{ 
          px: 3, 
          py: 2, 
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid rgba(0, 0, 0, 0.08)',
          flexShrink: 0,
          justifyContent: 'space-between',
        }}
      >
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            mr: 2,
            fontWeight: 500,
          }}
        >
          {fileName}
        </Typography>
        <Button 
          onClick={onClose} 
          variant="contained"
          size="medium"
          sx={{
            minWidth: 100,
            fontWeight: 600,
            backgroundColor: '#501b36',
            color: 'white',
            px: 4,
            py: 1,
            borderRadius: 2.5,
            textTransform: 'none',
            '&:hover': {
              backgroundColor: '#501b36dd',
              transform: 'translateY(-1px)',
              boxShadow: '0 6px 20px rgba(80, 27, 54, 0.3)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
