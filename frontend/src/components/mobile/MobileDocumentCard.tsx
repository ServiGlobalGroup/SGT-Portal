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
} from '@mui/material';
import {
  PictureAsPdf,
  Description,
  CloudDownload,
  FilePresent,
  Visibility,
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
  onView?: (document: UserDocument) => void;
  onDownload?: (document: UserDocument) => Promise<void>;
  corporateColor?: string;
}

export const MobileDocumentCard: React.FC<MobileDocumentCardProps> = ({
  document,
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
    const iconProps = { sx: { fontSize: 24 } };
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

  return (
    <Card
      elevation={0}
      sx={{
        width: '100%',
        border: '1px solid #e8eaf6',
        borderRadius: 2.5,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          borderColor: corporateColor,
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 25px ${alpha(corporateColor, 0.15)}`,
        },
      }}
    >
      <CardContent 
        sx={{ 
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          width: '100%',
          '&:last-child': {
            pb: 2,
          },
        }}
      >
        {/* Icono del archivo */}
        <Avatar
          sx={{
            width: 48,
            height: 48,
            bgcolor: alpha(getFileColor(document.type), 0.1),
            border: `2px solid ${alpha(getFileColor(document.type), 0.2)}`,
            flexShrink: 0,
          }}
        >
          {getFileIcon(document.type)}
        </Avatar>

        {/* Información del archivo */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              lineHeight: 1.3,
              fontSize: '0.9rem',
              mb: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={document.name}
          >
            {document.name}
          </Typography>

          <Stack 
            direction="row" 
            spacing={1} 
            sx={{ 
              mb: 0.5,
              alignItems: 'center',
            }}
          >
            <Chip
              label={formatFileSize(document.size)}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.7rem',
                fontWeight: 500,
                bgcolor: alpha(corporateColor, 0.1),
                color: corporateColor,
                border: `1px solid ${alpha(corporateColor, 0.2)}`,
                '& .MuiChip-label': {
                  px: 1,
                },
              }}
            />
            <Chip
              label={document.type.toUpperCase().replace('.', '')}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.7rem',
                fontWeight: 500,
                bgcolor: alpha(getFileColor(document.type), 0.1),
                color: getFileColor(document.type),
                border: `1px solid ${alpha(getFileColor(document.type), 0.2)}`,
                '& .MuiChip-label': {
                  px: 1,
                },
              }}
            />
          </Stack>

          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.7rem',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            📅 {formatDate(document.created_date)}
          </Typography>
        </Box>

        {/* Botones de acción */}
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          {/* Botón de previsualización */}
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              if (onView) onView(document);
            }}
            sx={{
              width: 40,
              height: 40,
              bgcolor: alpha(corporateColor, 0.1),
              color: corporateColor,
              border: `1px solid ${alpha(corporateColor, 0.2)}`,
              '&:hover': {
                bgcolor: alpha(corporateColor, 0.2),
                transform: 'scale(1.1)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <Visibility sx={{ fontSize: 20 }} />
          </IconButton>

          {/* Botón de descarga */}
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              if (onDownload) onDownload(document);
            }}
            sx={{
              width: 40,
              height: 40,
              bgcolor: alpha('#4caf50', 0.1),
              color: '#4caf50',
              border: `1px solid ${alpha('#4caf50', 0.2)}`,
              '&:hover': {
                bgcolor: alpha('#4caf50', 0.2),
                transform: 'scale(1.1)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <CloudDownload sx={{ fontSize: 20 }} />
          </IconButton>
        </Stack>
      </CardContent>
    </Card>
  );
};
