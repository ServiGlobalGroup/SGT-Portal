import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Breadcrumbs,
  Link,
  Chip,
  Menu,
  MenuItem as MenuItemComponent,
  Alert,
  CircularProgress,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Folder,
  FolderOpen,
  Upload,
  ArrowBack,
  Delete,
  Edit,
  Download,
  CreateNewFolder,
  Description,
  Home,
  NavigateNext,
  Visibility,
} from '@mui/icons-material';
import { PdfPreview } from '../components/PdfPreview';

interface TrafficFolder {
  id: number;
  name: string;
  parentId: number | null;
  createdDate: string;
  type: 'folder' | 'company' | 'vehicle_type' | 'vehicle';
}

interface TrafficFile {
  id: number;
  name: string;
  size: number;
  type: string;
  folderId: number;
  uploadDate: string;
  url: string;
}

export const Traffic: React.FC = () => {
  // Estados principales
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [folders, setFolders] = useState<TrafficFolder[]>([
    { id: 1, name: "Empresa A", parentId: null, createdDate: "2024-01-15", type: "company" },
    { id: 2, name: "Empresa B", parentId: null, createdDate: "2024-01-20", type: "company" },
    { id: 3, name: "Camiones", parentId: 1, createdDate: "2024-01-16", type: "vehicle_type" },
    { id: 4, name: "Furgonetas", parentId: 1, createdDate: "2024-01-17", type: "vehicle_type" },
    { id: 5, name: "Truck-001", parentId: 3, createdDate: "2024-01-18", type: "vehicle" },
    { id: 6, name: "Van-002", parentId: 4, createdDate: "2024-01-19", type: "vehicle" },
  ]);
  
  const [files, setFiles] = useState<TrafficFile[]>([
    { id: 1, name: "Permiso_Circulacion.pdf", size: 1024000, type: "pdf", folderId: 5, uploadDate: "2024-01-20", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
    { id: 2, name: "Seguro_Vehiculo.pdf", size: 2048000, type: "pdf", folderId: 5, uploadDate: "2024-01-21", url: "https://www.africau.edu/images/default/sample.pdf" },
    { id: 3, name: "ITV_Certificado.pdf", size: 1536000, type: "pdf", folderId: 6, uploadDate: "2024-01-22", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
  ]);

  // Estados de UI
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'folder' | 'file'; id: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Estados de diálogos
  const [createFolderDialog, setCreateFolderDialog] = useState(false);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; type: 'folder' | 'file'; id: number; currentName: string }>({
    open: false, type: 'folder', id: 0, currentName: ''
  });
  const [pdfPreview, setPdfPreview] = useState<{ open: boolean; fileUrl: string; fileName: string }>({
    open: false, fileUrl: '', fileName: ''
  });

  // Estados de formularios
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderType, setNewFolderType] = useState<'folder' | 'company' | 'vehicle_type' | 'vehicle'>('folder');
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);

  // Funciones auxiliares
  const getCurrentFolders = () => {
    return folders.filter(folder => folder.parentId === currentFolderId);
  };

  const getCurrentFiles = () => {
    return files.filter(file => file.folderId === (currentFolderId || 0));
  };

  const getBreadcrumbs = (): TrafficFolder[] => {
    const breadcrumbs: TrafficFolder[] = [];
    let currentId = currentFolderId;
    
    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (folder) {
        breadcrumbs.unshift(folder);
        currentId = folder.parentId;
      } else {
        break;
      }
    }
    
    return breadcrumbs;
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getTypeIcon = (type: 'folder' | 'company' | 'vehicle_type' | 'vehicle') => {
    switch (type) {
      case 'company': return <FolderOpen sx={{ color: '#1565C0' }} />;
      case 'vehicle_type': return <Folder sx={{ color: '#43A047' }} />;
      case 'vehicle': return <Folder sx={{ color: '#FF9800' }} />;
      default: return <Folder sx={{ color: '#757575' }} />;
    }
  };

  // Handlers
  const handleFolderClick = (folderId: number) => {
    setCurrentFolderId(folderId);
  };

  const handleBackClick = () => {
    const currentFolder = folders.find(f => f.id === currentFolderId);
    setCurrentFolderId(currentFolder?.parentId || null);
  };

  const handleContextMenu = (event: React.MouseEvent, type: 'folder' | 'file', id: number) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, type, id });
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const newFolder: TrafficFolder = {
      id: Date.now(),
      name: newFolderName,
      parentId: currentFolderId,
      createdDate: new Date().toISOString().split('T')[0],
      type: newFolderType,
    };

    setFolders([...folders, newFolder]);
    setCreateFolderDialog(false);
    setNewFolderName('');
    setNewFolderType('folder');
    setAlert({ type: 'success', message: 'Carpeta creada exitosamente' });
  };

  const handleFileUpload = async () => {
    if (!uploadFiles || uploadFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];
      
      // Simular progreso de subida
      for (let progress = 0; progress <= 100; progress += 10) {
        setUploadProgress(progress);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const newFile: TrafficFile = {
        id: Date.now() + i,
        name: file.name,
        size: file.size,
        type: file.type,
        folderId: currentFolderId || 0,
        uploadDate: new Date().toISOString().split('T')[0],
        url: URL.createObjectURL(file),
      };

      setFiles(prev => [...prev, newFile]);
    }

    setIsUploading(false);
    setUploadProgress(0);
    setUploadDialog(false);
    setUploadFiles(null);
    setAlert({ type: 'success', message: `${uploadFiles.length} archivo(s) subido(s) exitosamente` });
  };

  const handleDelete = (type: 'folder' | 'file', id: number) => {
    if (type === 'folder') {
      // Eliminar carpeta y todo su contenido recursivamente
      const deleteRecursively = (folderId: number) => {
        const subfolders = folders.filter(f => f.parentId === folderId);
        subfolders.forEach(subfolder => deleteRecursively(subfolder.id));
        
        setFolders(prev => prev.filter(f => f.id !== folderId));
        setFiles(prev => prev.filter(f => f.folderId !== folderId));
      };
      
      deleteRecursively(id);
    } else {
      setFiles(prev => prev.filter(f => f.id !== id));
    }
    
    setContextMenu(null);
    setAlert({ type: 'success', message: `${type === 'folder' ? 'Carpeta' : 'Archivo'} eliminado exitosamente` });
  };

  const handleRename = () => {
    const { type, id, currentName } = renameDialog;
    if (!currentName.trim()) return;

    if (type === 'folder') {
      setFolders(prev => prev.map(f => f.id === id ? { ...f, name: currentName } : f));
    } else {
      setFiles(prev => prev.map(f => f.id === id ? { ...f, name: currentName } : f));
    }

    setRenameDialog({ open: false, type: 'folder', id: 0, currentName: '' });
    setAlert({ type: 'success', message: `${type === 'folder' ? 'Carpeta' : 'Archivo'} renombrado exitosamente` });
  };

  const handleDownload = (file: TrafficFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.click();
    setContextMenu(null);
  };

  const handlePreview = (file: TrafficFile) => {
    if (file.type === 'pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      setPdfPreview({
        open: true,
        fileUrl: file.url,
        fileName: file.name
      });
    }
    setContextMenu(null);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    setUploadFiles(droppedFiles);
    setUploadDialog(true);
  }, []);

  // Estadísticas
  const stats = {
    totalFolders: folders.length,
    totalFiles: files.length,
    currentFolders: getCurrentFolders().length,
    currentFiles: getCurrentFiles().length,
    totalSize: files.reduce((acc, file) => acc + file.size, 0),
  };

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: { xs: '100%', sm: '100%', md: '1200px', lg: '1400px' },
      mx: 'auto',
      px: { xs: 0, sm: 1, md: 2 }
    }}>
      {/* Alerta */}
      {alert && (
        <Alert 
          severity={alert.type} 
          sx={{ mb: 2 }} 
          onClose={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      {/* Header */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: { xs: 'flex-start', sm: 'center' }, 
          gap: 2, 
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' }
        }}>
          <FolderOpen sx={{ fontSize: { xs: 30, sm: 40 }, color: '#1565C0' }} />
          <Box>
            <Typography variant="h4" sx={{ 
              fontWeight: 'bold', 
              color: '#1565C0',
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
            }}>
              Gestor de Archivos de Tráfico
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Organiza documentos por empresas, tipos de vehículos y vehículos específicos
            </Typography>
          </Box>
        </Box>

        {/* Estadísticas */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { 
            xs: 'repeat(2, 1fr)', 
            sm: 'repeat(3, 1fr)', 
            md: 'repeat(auto-fit, minmax(150px, 1fr))' 
          }, 
          gap: 2 
        }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="primary.main" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                {stats.totalFolders}
              </Typography>
              <Typography variant="body2">Carpetas Totales</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="success.main" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                {stats.totalFiles}
              </Typography>
              <Typography variant="body2">Archivos Totales</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="info.main" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                {stats.currentFolders}
              </Typography>
              <Typography variant="body2">Carpetas Actuales</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="warning.main" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                {stats.currentFiles}
              </Typography>
              <Typography variant="body2">Archivos Actuales</Typography>
            </CardContent>
          </Card>
          <Card sx={{ gridColumn: { xs: 'span 2', sm: 'span 1' } }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" color="error.main" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                {formatFileSize(stats.totalSize)}
              </Typography>
              <Typography variant="body2">Tamaño Total</Typography>
            </CardContent>
          </Card>
        </Box>
      </Paper>

      {/* Navegación y acciones */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Breadcrumbs */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {currentFolderId && (
              <Button
                startIcon={<ArrowBack />}
                onClick={handleBackClick}
                variant="outlined"
                size="small"
              >
                Volver
              </Button>
            )}
            
            <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
              <Link
                component="button"
                variant="body1"
                onClick={() => setCurrentFolderId(null)}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                <Home sx={{ mr: 0.5, fontSize: 18 }} />
                Inicio
              </Link>
              {getBreadcrumbs().map((folder) => (
                <Link
                  key={folder.id}
                  component="button"
                  variant="body1"
                  onClick={() => setCurrentFolderId(folder.id)}
                  sx={{ 
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  {folder.name}
                </Link>
              ))}
            </Breadcrumbs>
          </Box>

          {/* Botones de acción */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<CreateNewFolder />}
              onClick={() => setCreateFolderDialog(true)}
            >
              Nueva Carpeta
            </Button>
            <Button
              variant="contained"
              startIcon={<Upload />}
              onClick={() => setUploadDialog(true)}
            >
              Subir Archivos
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Área principal con drag & drop */}
      <Paper 
        sx={{ p: 3, minHeight: 400 }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
          {/* Carpetas */}
          {getCurrentFolders().map((folder) => (
            <Card
              key={`folder-${folder.id}`}
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                },
              }}
              onClick={() => handleFolderClick(folder.id)}
              onContextMenu={(e) => handleContextMenu(e, 'folder', folder.id)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  {getTypeIcon(folder.type)}
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {folder.name}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip
                    label={folder.type}
                    size="small"
                    color={
                      folder.type === 'company' ? 'primary' :
                      folder.type === 'vehicle_type' ? 'success' :
                      folder.type === 'vehicle' ? 'warning' : 'default'
                    }
                  />
                  <Typography variant="caption" color="textSecondary">
                    {folder.createdDate}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}

          {/* Archivos */}
          {getCurrentFiles().map((file) => (
            <Card
              key={`file-${file.id}`}
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                },
              }}
              onContextMenu={(e) => handleContextMenu(e, 'file', file.id)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Description sx={{ color: '#f44336' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
                    {file.name.length > 20 ? `${file.name.substring(0, 20)}...` : file.name}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="caption" color="textSecondary">
                    {formatFileSize(file.size)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {file.uploadDate}
                  </Typography>
                </Box>
                
                {/* Botones de acción */}
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  {(file.type === 'pdf' || file.name.toLowerCase().endsWith('.pdf')) && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Visibility />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(file);
                      }}
                      sx={{ flex: 1 }}
                    >
                      Preview
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(file);
                    }}
                    sx={{ flex: 1 }}
                  >
                    Descargar
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}

          {/* Mensaje cuando está vacío */}
          {getCurrentFolders().length === 0 && getCurrentFiles().length === 0 && (
            <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 8 }}>
              <FolderOpen sx={{ fontSize: 80, color: '#ccc', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Esta carpeta está vacía
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Arrastra archivos aquí o usa los botones para crear carpetas y subir archivos
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  startIcon={<CreateNewFolder />}
                  onClick={() => setCreateFolderDialog(true)}
                >
                  Crear Carpeta
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Upload />}
                  onClick={() => setUploadDialog(true)}
                >
                  Subir Archivos
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Menú contextual */}
      <Menu
        open={Boolean(contextMenu)}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined
        }
      >
        <MenuItemComponent
          onClick={() => {
            const item = contextMenu?.type === 'folder' 
              ? folders.find(f => f.id === contextMenu.id)
              : files.find(f => f.id === contextMenu.id);
            setRenameDialog({
              open: true,
              type: contextMenu?.type || 'folder',
              id: contextMenu?.id || 0,
              currentName: item?.name || ''
            });
            setContextMenu(null);
          }}
        >
          <Edit sx={{ mr: 1 }} />
          Renombrar
        </MenuItemComponent>
        
        {contextMenu?.type === 'file' && (
          <MenuItemComponent
            onClick={() => {
              const file = files.find(f => f.id === contextMenu.id);
              if (file) handleDownload(file);
            }}
          >
            <Download sx={{ mr: 1 }} />
            Descargar
          </MenuItemComponent>
        )}
        
        <Divider />
        
        <MenuItemComponent
          onClick={() => {
            if (contextMenu) {
              handleDelete(contextMenu.type, contextMenu.id);
            }
          }}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} />
          Eliminar
        </MenuItemComponent>
      </Menu>

      {/* Diálogo crear carpeta */}
      <Dialog open={createFolderDialog} onClose={() => setCreateFolderDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Crear Nueva Carpeta</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nombre de la carpeta"
            fullWidth
            variant="outlined"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Tipo de carpeta</InputLabel>
            <Select
              value={newFolderType}
              label="Tipo de carpeta"
              onChange={(e) => setNewFolderType(e.target.value as TrafficFolder['type'])}
            >
              <MenuItem value="company">Empresa</MenuItem>
              <MenuItem value="vehicle_type">Tipo de Vehículo</MenuItem>
              <MenuItem value="vehicle">Vehículo</MenuItem>
              <MenuItem value="folder">Carpeta General</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateFolderDialog(false)}>Cancelar</Button>
          <Button onClick={handleCreateFolder} variant="contained">Crear</Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo subir archivos */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Subir Archivos</DialogTitle>
        <DialogContent>
          <input
            type="file"
            multiple
            onChange={(e) => setUploadFiles(e.target.files)}
            style={{ marginBottom: 16 }}
          />
          {isUploading && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Subiendo archivo... {uploadProgress}%
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: '100%' }}>
                  <LinearProgress variant="determinate" value={uploadProgress} />
                </Box>
                <CircularProgress size={20} />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)} disabled={isUploading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleFileUpload} 
            variant="contained" 
            disabled={!uploadFiles || isUploading}
          >
            Subir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo renombrar */}
      <Dialog open={renameDialog.open} onClose={() => setRenameDialog({ open: false, type: 'folder', id: 0, currentName: '' })}>
        <DialogTitle>Renombrar {renameDialog.type === 'folder' ? 'Carpeta' : 'Archivo'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nuevo nombre"
            fullWidth
            variant="outlined"
            value={renameDialog.currentName}
            onChange={(e) => setRenameDialog(prev => ({ ...prev, currentName: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialog({ open: false, type: 'folder', id: 0, currentName: '' })}>
            Cancelar
          </Button>
          <Button onClick={handleRename} variant="contained">
            Renombrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Componente de preview de PDF */}
      <PdfPreview
        open={pdfPreview.open}
        onClose={() => setPdfPreview({ open: false, fileUrl: '', fileName: '' })}
        fileUrl={pdfPreview.fileUrl}
        fileName={pdfPreview.fileName}
        title={`Vista previa: ${pdfPreview.fileName}`}
      />
    </Box>
  );
};
