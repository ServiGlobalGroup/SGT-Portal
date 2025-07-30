import React, { useState, useEffect } from 'react';
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
  Divider,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import {
  Close,
  Download,
  ZoomIn,
  ZoomOut,
  Fullscreen,
  Print,
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
  const [zoom, setZoom] = useState(100);
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

  const handleDownload = () => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrint = () => {
    if (fileUrl) {
      const printWindow = window.open(fileUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25));
  };

  const handleZoomReset = () => {
    setZoom(100);
  };

  const handleFullscreen = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

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

  const getPdfUrl = () => {
    if (!fileUrl) return '';
    return `${fileUrl}#zoom=${zoom}&toolbar=0&navpanes=0&scrollbar=1`;
  };

  const resetState = () => {
    setLoading(true);
    setError(false);
    setZoom(100);
  };

  useEffect(() => {
    if (open) {
      resetState();
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          height: isMobile ? '100vh' : '95vh',
          maxHeight: isMobile ? '100vh' : '95vh',
          display: 'flex',
          flexDirection: 'column',
          m: isMobile ? 0 : 2,
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 1.5,
          px: 2,
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <PictureAsPdf sx={{ color: '#d32f2f', fontSize: 24 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography 
              variant={isSmall ? "subtitle1" : "h6"} 
              component="div" 
              sx={{ 
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {title || 'Vista previa de PDF'}
            </Typography>
            {!isSmall && (
              <Typography variant="caption" color="text.secondary">
                {fileName}
              </Typography>
            )}
          </Box>
        </Box>
        <IconButton 
          onClick={onClose} 
          size="small"
          sx={{
            ml: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.08)',
            },
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      {/* Toolbar de controles */}
      <Box
        sx={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
          px: 2,
          py: 1,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: isSmall ? 'wrap' : 'nowrap',
            justifyContent: isSmall ? 'center' : 'flex-start',
          }}
        >
          {/* Grupo 1: Acciones principales */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Descargar PDF">
              <Button
                startIcon={!isSmall ? <Download /> : undefined}
                size="small"
                onClick={handleDownload}
                variant="outlined"
                disabled={!fileUrl}
                sx={{ minWidth: isSmall ? 40 : 'auto' }}
              >
                {isSmall ? <Download /> : 'Descargar'}
              </Button>
            </Tooltip>
            
            <Tooltip title="Imprimir">
              <Button
                startIcon={!isSmall ? <Print /> : undefined}
                size="small"
                onClick={handlePrint}
                variant="outlined"
                disabled={!fileUrl}
                sx={{ minWidth: isSmall ? 40 : 'auto' }}
              >
                {isSmall ? <Print /> : 'Imprimir'}
              </Button>
            </Tooltip>

            <Tooltip title="Recargar">
              <Button
                startIcon={!isSmall ? <Refresh /> : undefined}
                size="small"
                onClick={handleRefresh}
                variant="outlined"
                disabled={!fileUrl}
                sx={{ minWidth: isSmall ? 40 : 'auto' }}
              >
                {isSmall ? <Refresh /> : 'Recargar'}
              </Button>
            </Tooltip>
          </Box>

          {!isSmall && (
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          )}

          {/* Grupo 2: Controles de zoom */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Reducir zoom">
              <IconButton 
                size="small" 
                onClick={handleZoomOut} 
                disabled={zoom <= 25 || !fileUrl}
                sx={{
                  border: '1px solid rgba(0, 0, 0, 0.23)',
                  '&:disabled': {
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                  },
                }}
              >
                <ZoomOut />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Resetear zoom">
              <Button
                variant="outlined"
                size="small"
                onClick={handleZoomReset}
                disabled={!fileUrl}
                sx={{
                  minWidth: 70,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                {zoom}%
              </Button>
            </Tooltip>
            
            <Tooltip title="Aumentar zoom">
              <IconButton 
                size="small" 
                onClick={handleZoomIn} 
                disabled={zoom >= 300 || !fileUrl}
                sx={{
                  border: '1px solid rgba(0, 0, 0, 0.23)',
                  '&:disabled': {
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                  },
                }}
              >
                <ZoomIn />
              </IconButton>
            </Tooltip>
          </Box>

          {!isSmall && (
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          )}

          {/* Grupo 3: Pantalla completa */}
          <Tooltip title="Abrir en nueva ventana">
            <Button
              startIcon={!isSmall ? <Fullscreen /> : undefined}
              size="small"
              onClick={handleFullscreen}
              variant="outlined"
              disabled={!fileUrl}
              sx={{ minWidth: isSmall ? 40 : 'auto' }}
            >
              {isSmall ? <Fullscreen /> : 'Pantalla completa'}
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {/* Content */}
      <DialogContent
        sx={{
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
          backgroundColor: '#f5f5f5',
        }}
      >
        {loading && fileUrl && (
          <Box sx={{ p: 3 }}>
            <LinearProgress 
              sx={{ 
                mb: 2,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: '#501b36',
                },
              }} 
            />
            <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
              Cargando documento PDF...
            </Typography>
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
              gap: 2,
            }}
          >
            <PictureAsPdf sx={{ fontSize: 80, color: 'text.disabled' }} />
            <Alert severity="info" sx={{ maxWidth: 400 }}>
              <Typography variant="body1" gutterBottom>
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
              gap: 2,
            }}
          >
            <PictureAsPdf sx={{ fontSize: 80, color: 'error.main' }} />
            <Alert severity="error" sx={{ maxWidth: 500 }}>
              <Typography variant="body1" gutterBottom>
                Error al cargar el documento
              </Typography>
              <Typography variant="body2">
                No se pudo cargar el archivo PDF. Verifique que el archivo existe y es válido.
              </Typography>
              <Button 
                onClick={handleRefresh} 
                size="small" 
                sx={{ mt: 1 }}
                startIcon={<Refresh />}
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
              p: isMobile ? 1 : 2,
            }}
          >
            <Box
              sx={{
                flex: 1,
                backgroundColor: 'white',
                borderRadius: 1,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
                border: '1px solid rgba(0, 0, 0, 0.12)',
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
                }}
                title={fileName}
                onLoad={handleLoad}
                onError={handleError}
              />
            </Box>
          </Box>
        )}
      </DialogContent>

      {/* Footer */}
      <DialogActions 
        sx={{ 
          px: 2, 
          py: 1.5, 
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid rgba(0, 0, 0, 0.12)',
          flexShrink: 0,
          justifyContent: 'space-between',
        }}
      >
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            mr: 2,
          }}
        >
          {fileName}
        </Typography>
        <Button 
          onClick={onClose} 
          variant="contained"
          size={isSmall ? "small" : "medium"}
          sx={{
            minWidth: 80,
            fontWeight: 600,
          }}
        >
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
