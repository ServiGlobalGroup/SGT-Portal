import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  IconButton,
  alpha,
  Stack,
  Avatar,
  Divider,
} from '@mui/material';
import {
  PictureAsPdf,
  Description,
  MoreVert,
  CloudDownload,
  Visibility,
  FilePresent,
} from '@mui/icons-material';

interface UserDocument {
  id: number;
  name: string;
  size: number;
  type: string;
  created_date: string;
  modified_date?: string;
  download_url: string;
}

interface MobileDocumentCardProps {
  document: UserDocument;
  onMenuClick: (event: React.MouseEvent<HTMLElement, MouseEvent>, document: UserDocument) => void;
  onView?: (document: UserDocument) => void;
  onDownload?: (document: UserDocument) => Promise<void>;
  corporateColor?: string;
}

export const MobileDocumentCard: React.FC<MobileDocumentCardProps> = ({
  document,
  onMenuClick,
  onView,
  onDownload,
  corporateColor = '#501b36'
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    const iconProps = { sx: { fontSize: 32 } };
    if (fileType === '.pdf' || fileType === 'pdf') return <PictureAsPdf {...iconProps} sx={{ ...iconProps.sx, color: '#d32f2f' }} />;
    if (fileType === '.doc' || fileType === '.docx') return <Description {...iconProps} sx={{ ...iconProps.sx, color: '#1976d2' }} />;
    return <FilePresent {...iconProps} sx={{ ...iconProps.sx, color: corporateColor }} />;
  };

  const getFileColor = (fileType: string) => {
    if (fileType === '.pdf' || fileType === 'pdf') return '#d32f2f';
    if (fileType === '.doc' || fileType === '.docx') return '#1976d2';
    return corporateColor;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const truncateFileName = (name: string, maxLength: number = 25) => {
    if (name.length <= maxLength) return name;
    const extension = name.split('.').pop();
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
    const truncated = nameWithoutExt.substring(0, maxLength - 3 - (extension?.length || 0));
    return `${truncated}...${extension ? `.${extension}` : ''}`;
  };

  return (
    <Card
      elevation={0}
      sx={{
        width: '100%',
        border: '1px solid #e8eaf6',
        borderRadius: 3,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          borderColor: corporateColor,
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 25px ${alpha(corporateColor, 0.15)}`,
        },
        '&:active': {
          transform: 'translateY(0)',
        },
      }}
    >
      <CardContent 
        sx={{ 
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Header con icono y acciones */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            p: 2,
            pb: 1,
            width: '100%',
          }}
        >
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: alpha(getFileColor(document.type), 0.1),
              border: `2px solid ${alpha(getFileColor(document.type), 0.2)}`,
            }}
          >
            {getFileIcon(document.type)}
          </Avatar>

          <IconButton
            size="small"
            onClick={(e) => onMenuClick(e, document)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'text.secondary',
              '&:hover': {
                bgcolor: alpha(corporateColor, 0.1),
                color: corporateColor,
              },
            }}
          >
            <MoreVert />
          </IconButton>
        </Box>

        {/* Información del archivo */}
        <Box 
          sx={{ 
            px: 2, 
            pb: 2,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              mb: 1,
              color: 'text.primary',
              lineHeight: 1.3,
              fontSize: '0.95rem',
              minHeight: '2.6rem',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textAlign: 'center',
              width: '100%',
            }}
            title={document.name}
          >
            {document.name}
          </Typography>

          <Stack 
            direction="row" 
            spacing={1} 
            sx={{ 
              mb: 1.5, 
              flexWrap: 'wrap', 
              gap: 0.5,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Chip
              label={formatFileSize(document.size)}
              size="small"
              sx={{
                height: 24,
                fontSize: '0.75rem',
                fontWeight: 500,
                bgcolor: alpha(corporateColor, 0.1),
                color: corporateColor,
                border: `1px solid ${alpha(corporateColor, 0.2)}`,
              }}
            />
            <Chip
              label={document.type.toUpperCase().replace('.', '')}
              size="small"
              sx={{
                height: 24,
                fontSize: '0.75rem',
                fontWeight: 500,
                bgcolor: alpha(getFileColor(document.type), 0.1),
                color: getFileColor(document.type),
                border: `1px solid ${alpha(getFileColor(document.type), 0.2)}`,
              }}
            />
          </Stack>

          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              display: 'block',
              mb: 2,
              fontSize: '0.75rem',
              textAlign: 'center',
            }}
          >
            📅 {formatDate(document.created_date)}
          </Typography>

          <Divider sx={{ my: 1.5, width: '100%' }} />

          {/* Botones de acción */}
          <Stack 
            direction="row" 
            spacing={1} 
            sx={{ 
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
            }}
          >
            {onView && (
              <IconButton
                onClick={() => onView(document)}
                sx={{
                  flex: 1,
                  maxWidth: 120,
                  height: 44,
                  bgcolor: alpha('#2196f3', 0.1),
                  color: '#2196f3',
                  borderRadius: 2,
                  border: `1px solid ${alpha('#2196f3', 0.2)}`,
                  '&:hover': {
                    bgcolor: alpha('#2196f3', 0.2),
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Visibility sx={{ fontSize: 18 }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                    Ver
                  </Typography>
                </Stack>
              </IconButton>
            )}

            {onDownload && (
              <IconButton
                onClick={() => onDownload(document)}
                sx={{
                  flex: 1,
                  maxWidth: 120,
                  height: 44,
                  bgcolor: alpha('#4caf50', 0.1),
                  color: '#4caf50',
                  borderRadius: 2,
                  border: `1px solid ${alpha('#4caf50', 0.2)}`,
                  '&:hover': {
                    bgcolor: alpha('#4caf50', 0.2),
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <CloudDownload sx={{ fontSize: 18 }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                    Descargar
                  </Typography>
                </Stack>
              </IconButton>
            )}
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};
