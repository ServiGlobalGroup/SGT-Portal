import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Fade,
  Backdrop,
} from '@mui/material';
import { Close, ZoomIn, ZoomOut, Download, Fullscreen } from '@mui/icons-material';

interface ImagePreviewModalProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  alt?: string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  open,
  onClose,
  imageUrl,
  title = 'Vista previa de imagen',
  alt = 'Imagen de inspección'
}) => {
  const [zoom, setZoom] = React.useState(100);
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setZoom(100);
      setImageError(false);
    }
  }, [open]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFullscreen = () => {
    window.open(imageUrl, '_blank');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      TransitionComponent={Fade}
      transitionDuration={300}
      slots={{
        backdrop: Backdrop,
      }}
      slotProps={{
        backdrop: {
          timeout: 300,
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
          },
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          maxHeight: '95vh',
          backgroundColor: '#1e1e1e',
          color: 'white',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
          {title}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            {zoom}%
          </Typography>
          
          <IconButton
            onClick={handleZoomOut}
            disabled={zoom <= 25}
            sx={{ 
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
            }}
          >
            <ZoomOut />
          </IconButton>
          
          <IconButton
            onClick={handleZoomIn}
            disabled={zoom >= 300}
            sx={{ 
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
            }}
          >
            <ZoomIn />
          </IconButton>
          
          <IconButton
            onClick={handleDownload}
            sx={{ 
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
            }}
          >
            <Download />
          </IconButton>
          
          <IconButton
            onClick={handleFullscreen}
            sx={{ 
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
            }}
          >
            <Fullscreen />
          </IconButton>
          
          <IconButton
            onClick={onClose}
            sx={{ 
              color: 'white',
              ml: 1,
              '&:hover': { 
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <Close />
          </IconButton>
        </Box>
      </Box>

      {/* Content */}
      <DialogContent
        sx={{
          p: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#000',
          minHeight: '60vh',
          overflow: 'auto',
        }}
      >
        {imageError ? (
          <Box sx={{ textAlign: 'center', p: 4, color: 'rgba(255, 255, 255, 0.7)' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Error al cargar la imagen
            </Typography>
            <Typography variant="body2">
              No se pudo cargar la imagen. Es posible que el archivo no exista o haya un problema de conexión.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              height: '100%',
              p: 2,
            }}
          >
            <img
              src={imageUrl}
              alt={alt}
              onError={() => setImageError(true)}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                transform: `scale(${zoom / 100})`,
                transition: 'transform 0.2s ease',
                borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              }}
            />
          </Box>
        )}
      </DialogContent>

      {/* Footer */}
      <DialogActions
        sx={{
          p: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          justifyContent: 'center',
        }}
      >
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            borderRadius: 999,
            px: 4,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
            },
          }}
        >
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};