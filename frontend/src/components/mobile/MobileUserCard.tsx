import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Avatar,
  IconButton,
  Collapse,
  Badge,
  alpha,
  Stack,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  MoreVert,
  PictureAsPdf,
  Description,
  CloudDownload,
  Visibility,
} from '@mui/icons-material';

interface UserDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  folder: string;
  created_date: string;
  path: string;
  user_dni: string;
}

interface User {
  id: string;
  dni: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  total_documents: number;
  total_size: number;
  documents: UserDocument[];
}

interface MobileUserCardProps {
  user: User;
  isExpanded: boolean;
  onToggleExpand: (userId: string) => void;
  onMenuClick: (event: React.MouseEvent<HTMLElement>, user: User) => void;
  onDownloadDocument?: (document: UserDocument) => void;
  onPreviewDocument?: (document: UserDocument) => void;
  loadingActions?: Record<string, 'downloading' | 'previewing'>;
  corporateColor?: string;
}

export const MobileUserCard: React.FC<MobileUserCardProps> = ({
  user,
  isExpanded,
  onToggleExpand,
  onMenuClick,
  onDownloadDocument,
  onPreviewDocument,
  loadingActions = {},
  corporateColor = '#501b36'
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getUserInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleColor = (role: string): string => {
    switch (role) {
      case 'CHOFER': return '#2196f3';
      case 'ADMIN': return '#4caf50';
      case 'IT': return '#ff9800';
      default: return corporateColor;
    }
  };

  const getDocumentsByFolder = (documents: UserDocument[]) => {
    return documents.reduce((acc, doc) => {
      if (!acc[doc.folder]) {
        acc[doc.folder] = [];
      }
      acc[doc.folder].push(doc);
      return acc;
    }, {} as Record<string, UserDocument[]>);
  };

  const getFolderDisplayName = (folder: string): string => {
    const names: Record<string, string> = {
      'documentos': 'Documentos',
      'nominas': 'Nóminas',
      'vacaciones': 'Vacaciones',
      'permisos': 'Permisos',
      'circulacion': 'Circulación',
      'perfil': 'Perfil',
      'dietas': 'Dietas'
    };
    return names[folder] || folder.charAt(0).toUpperCase() + folder.slice(1);
  };

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid #e0e0e0',
        borderRadius: 2,
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: corporateColor,
          boxShadow: `0 2px 8px ${alpha(corporateColor, 0.1)}`,
        },
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Header del usuario */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: isExpanded ? 2 : 0 }}>
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: getRoleColor(user.role),
              color: 'white',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            {getUserInitials(user.first_name, user.last_name)}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                fontWeight: 600,
                mb: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {user.first_name} {user.last_name}
            </Typography>
            
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {user.dni}
              </Typography>
              <Chip
                label={user.role}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  bgcolor: alpha(getRoleColor(user.role), 0.1),
                  color: getRoleColor(user.role),
                }}
              />
              <Chip
                label={user.is_active ? 'Activo' : 'Inactivo'}
                size="small"
                color={user.is_active ? 'success' : 'error'}
                variant="outlined"
                sx={{ height: 18, fontSize: '0.65rem' }}
              />
            </Stack>
          </Box>

          {/* Estadísticas compactas */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#2196f3', lineHeight: 1 }}>
              {user.total_documents}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
              docs
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#ff9800', lineHeight: 1 }}>
              {formatFileSize(user.total_size)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
              size
            </Typography>
          </Box>

          {/* Botones de acción */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={() => onToggleExpand(user.id)}
              sx={{
                width: 28,
                height: 28,
                bgcolor: alpha(corporateColor, 0.08),
                color: corporateColor,
                '&:hover': {
                  bgcolor: alpha(corporateColor, 0.12),
                },
              }}
            >
              {isExpanded ? 
                <ExpandLess sx={{ fontSize: 16 }} /> : 
                <ExpandMore sx={{ fontSize: 16 }} />
              }
            </IconButton>

            <IconButton
              size="small"
              onClick={(e) => onMenuClick(e, user)}
              sx={{
                width: 28,
                height: 28,
                bgcolor: alpha(corporateColor, 0.08),
                color: corporateColor,
                '&:hover': {
                  bgcolor: alpha(corporateColor, 0.12),
                },
              }}
            >
              <MoreVert sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Sección expandible de documentos */}
        <Collapse in={isExpanded}>
          <Divider sx={{ mb: 2 }} />
          
          {user.documents.length === 0 ? (
            <Box sx={{ 
              textAlign: 'center', 
              py: 2,
              bgcolor: alpha(corporateColor, 0.02),
              borderRadius: 1
            }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Este usuario no tiene documentos
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gap: 1 }}>
              {Object.entries(getDocumentsByFolder(user.documents)).map(([folder, docs]) => (
                <Box
                  key={folder}
                  sx={{
                    p: 1.5,
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    bgcolor: alpha(corporateColor, 0.02),
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: corporateColor }}>
                      {getFolderDisplayName(folder)}
                    </Typography>
                    <Badge
                      badgeContent={docs.length}
                      color="primary"
                      sx={{
                        '& .MuiBadge-badge': {
                          bgcolor: corporateColor,
                          fontSize: '0.6rem',
                          minWidth: 14,
                          height: 14,
                        },
                      }}
                    >
                      <Box />
                    </Badge>
                  </Box>
                  
                  <Box sx={{ display: 'grid', gap: 0.5 }}>
                    {docs.map((doc) => (
                      <Box
                        key={doc.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 1,
                          bgcolor: 'white',
                          borderRadius: 0.5,
                          border: '1px solid #f0f0f0',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                          <Box
                            sx={{
                              p: 0.5,
                              borderRadius: 0.5,
                              bgcolor: doc.type === '.pdf' ? alpha('#d32f2f', 0.1) : alpha(corporateColor, 0.1),
                            }}
                          >
                            {doc.type === '.pdf' ? (
                              <PictureAsPdf sx={{ fontSize: 14, color: '#d32f2f' }} />
                            ) : (
                              <Description sx={{ fontSize: 14, color: corporateColor }} />
                            )}
                          </Box>
                          
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontWeight: 600,
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: '0.7rem'
                              }}
                            >
                              {doc.name}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: 'text.secondary',
                                fontSize: '0.6rem'
                              }}
                            >
                              {formatFileSize(doc.size)}
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Stack direction="row" spacing={0.5}>
                          {onDownloadDocument && (
                            <IconButton
                              size="small"
                              onClick={() => onDownloadDocument(doc)}
                              disabled={loadingActions[doc.id] === 'downloading'}
                              sx={{
                                width: 24,
                                height: 24,
                                color: '#4caf50',
                                '&:hover': { bgcolor: alpha('#4caf50', 0.1) },
                                '&:disabled': { color: alpha('#4caf50', 0.5) },
                              }}
                            >
                              {loadingActions[doc.id] === 'downloading' ? (
                                <CircularProgress size={14} sx={{ color: '#4caf50' }} />
                              ) : (
                                <CloudDownload sx={{ fontSize: 14 }} />
                              )}
                            </IconButton>
                          )}
                          
                          {onPreviewDocument && (
                            <IconButton
                              size="small"
                              onClick={() => onPreviewDocument(doc)}
                              disabled={loadingActions[doc.id] === 'previewing'}
                              sx={{
                                width: 24,
                                height: 24,
                                color: '#2196f3',
                                '&:hover': { bgcolor: alpha('#2196f3', 0.1) },
                                '&:disabled': { color: alpha('#2196f3', 0.5) },
                              }}
                            >
                              {loadingActions[doc.id] === 'previewing' ? (
                                <CircularProgress size={14} sx={{ color: '#2196f3' }} />
                              ) : (
                                <Visibility sx={{ fontSize: 14 }} />
                              )}
                            </IconButton>
                          )}
                        </Stack>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
};
