import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  IconButton,
  Menu,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tabs,
  Tab,
  MenuItem,
} from '@mui/material';
import {
  Description,
  Download,
  Visibility,
  MoreVert,
  Search,
  PictureAsPdf,
  Upload,
  Delete,
  Refresh,
  Folder,
} from '@mui/icons-material';
import { PdfPreview } from '../components/PdfPreview';
import { userFilesAPI } from '../services/api';

interface UserDocument {
  id: number;
  name: string;
  size: number;
  type: string;
  created_date: string;
  modified_date: string;
  download_url: string;
}

interface FolderData {
  documents: UserDocument[];
  folder_type: string;
  total_files: number;
  total_size: number;
}

export const Documents: React.FC = () => {
  const [currentFolder, setCurrentFolder] = useState('nominas');
  const [folderData, setFolderData] = useState<FolderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ open: boolean; fileUrl: string; fileName: string }>({
    open: false, fileUrl: '', fileName: ''
  });

  const folderTabs = [
    { value: 'nominas', label: 'Nóminas', icon: <PictureAsPdf /> },
    { value: 'dietas', label: 'Dietas', icon: <Description /> },
  ];

  // Cargar documentos del usuario actual
  useEffect(() => {
    loadDocuments();
  }, [currentFolder]);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      console.log('Loading documents for folder:', currentFolder);
      const data = await userFilesAPI.getUserDocuments(currentFolder);
      console.log('Documents loaded successfully:', data);
      setFolderData(data);
    } catch (error: any) {
      console.error('Error loading documents:', error);
      console.error('Error details:', error.response?.data || error.message);
      setAlert({ type: 'error', message: 'Error al cargar los documentos' });
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = folderData?.documents.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const stats = {
    total: folderData?.total_files || 0,
    totalSize: folderData?.total_size || 0
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === '.pdf') return <PictureAsPdf color="error" />;
    return <Description color="primary" />;
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setCurrentFolder(newValue);
    setSearchTerm('');
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, document: UserDocument) => {
    setAnchorEl(event.currentTarget);
    setSelectedDocument(document);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedDocument(null);
  };

  const handleDownload = async (document: UserDocument) => {
    try {
      // Usar el método del API para descarga directa
      const blob = await userFilesAPI.downloadFileBlob(document.download_url);
      
      // Crear un enlace temporal para la descarga
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.name;
      window.document.body.appendChild(link);
      link.click();
      
      // Limpiar
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setAlert({ type: 'success', message: 'Archivo descargado exitosamente' });
    } catch (error) {
      console.error('Error downloading file:', error);
      setAlert({ type: 'error', message: 'Error al descargar el archivo' });
    }
    handleCloseMenu();
  };

  const handleView = (document: UserDocument) => {
    if (document.type === '.pdf') {
      // Obtener el token del localStorage
      const token = localStorage.getItem('access_token');
      if (!token) {
        setAlert({ type: 'error', message: 'No se puede mostrar el archivo. Por favor, inicia sesión nuevamente.' });
        return;
      }
      
      // Construir URL de preview con token
      const previewUrl = document.download_url.replace('/download/', '/preview/') + `?token=${token}`;
      const fullUrl = previewUrl.startsWith('http') 
        ? previewUrl 
        : `http://127.0.0.1:8000${previewUrl}`;
      
      setPdfPreview({
        open: true,
        fileUrl: fullUrl,
        fileName: document.name
      });
    } else {
      window.open(document.download_url, '_blank');
    }
    handleCloseMenu();
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    setUploading(true);
    try {
      await userFilesAPI.uploadFile(currentFolder, uploadFile);
      setAlert({ type: 'success', message: 'Archivo subido exitosamente' });
      setUploadDialog(false);
      setUploadFile(null);
      loadDocuments();
    } catch (error) {
      console.error('Error uploading file:', error);
      setAlert({ type: 'error', message: 'Error al subir el archivo' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (document: UserDocument) => {
    if (!window.confirm(`¿Está seguro de que desea eliminar "${document.name}"?`)) {
      return;
    }

    try {
      await userFilesAPI.deleteFile(currentFolder, document.name);
      setAlert({ type: 'success', message: 'Archivo eliminado exitosamente' });
      loadDocuments();
    } catch (error) {
      console.error('Error deleting file:', error);
      setAlert({ type: 'error', message: 'Error al eliminar el archivo' });
    }
    handleCloseMenu();
  };

  const getFolderDisplayName = (folder: string) => {
    const folderNames: { [key: string]: string } = {
      'nominas': 'Nóminas', 
      'dietas': 'Dietas'
    };
    return folderNames[folder] || folder;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Alertas */}
      {alert && (
        <Alert 
          severity={alert.type} 
          sx={{ mb: 2 }} 
          onClose={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      {/* Encabezado */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Description sx={{ fontSize: 40, color: '#1565C0' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#1565C0' }}>
              Nóminas y Dietas
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Consulta tus nóminas y dietas disponibles
            </Typography>
          </Box>
        </Box>

        {/* Estadísticas */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { 
            xs: 'repeat(2, 1fr)', 
            sm: 'repeat(2, 1fr)', 
            md: 'repeat(2, 1fr)' 
          }, 
          gap: { xs: 1.5, sm: 2 }
        }}>
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                flexDirection: { xs: 'column', sm: 'row' },
                textAlign: { xs: 'center', sm: 'left' }
              }}>
                <Description color="primary" sx={{ fontSize: { xs: 20, sm: 24 } }} />
                <Box>
                  <Typography variant="h6" color="primary.main">{stats.total}</Typography>
                  <Typography variant="body2">Total Archivos</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                flexDirection: { xs: 'column', sm: 'row' },
                textAlign: { xs: 'center', sm: 'left' }
              }}>
                <Folder color="info" sx={{ fontSize: { xs: 20, sm: 24 } }} />
                <Box>
                  <Typography variant="h6" color="info.main">{formatFileSize(stats.totalSize)}</Typography>
                  <Typography variant="body2">Tamaño Total</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Paper>

      {/* Tabs de carpetas */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentFolder}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 60,
              textTransform: 'none'
            }
          }}
        >
          {folderTabs.map((tab) => (
            <Tab
              key={tab.value}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {tab.icon}
                  {tab.label}
                </Box>
              }
              value={tab.value}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Controles */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          alignItems: 'center',
          flexDirection: { xs: 'column', sm: 'row' }
        }}>
          <TextField
            placeholder={`Buscar en ${getFolderDisplayName(currentFolder)}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ flex: 1 }}
            size="small"
          />
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadDocuments}
              disabled={loading}
            >
              Actualizar
            </Button>
            
            <Button
              variant="contained"
              startIcon={<Upload />}
              onClick={() => setUploadDialog(true)}
            >
              Subir Archivo
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Lista de documentos */}
      <Paper>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">
            {getFolderDisplayName(currentFolder)} ({filteredDocuments.length} archivos)
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredDocuments.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Description sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No hay archivos en esta carpeta
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Sube archivos usando el botón "Subir Archivo"
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Archivo</TableCell>
                  <TableCell>Tamaño</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDocuments.map((document) => (
                  <TableRow key={document.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getFileIcon(document.type)}
                        <Typography variant="body2" fontWeight={500}>
                          {document.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatFileSize(document.size)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={document.type.toUpperCase()}
                        size="small"
                        color={document.type === '.pdf' ? 'error' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {new Date(document.created_date).toLocaleDateString('es-ES')}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuClick(e, document)}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Menú contextual */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => selectedDocument && handleView(selectedDocument)}>
          <Visibility sx={{ mr: 1 }} />
          Ver
        </MenuItem>
        <MenuItem onClick={() => selectedDocument && handleDownload(selectedDocument)}>
          <Download sx={{ mr: 1 }} />
          Descargar
        </MenuItem>
        <MenuItem 
          onClick={() => selectedDocument && handleDelete(selectedDocument)}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} />
          Eliminar
        </MenuItem>
      </Menu>

      {/* Dialog de subida */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Subir archivo a {getFolderDisplayName(currentFolder)}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <input
              type="file"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              style={{ marginBottom: 16 }}
            />
            {uploadFile && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Archivo seleccionado: {uploadFile.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Tamaño: {formatFileSize(uploadFile.size)}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)}>Cancelar</Button>
          <Button 
            onClick={handleUpload} 
            variant="contained" 
            disabled={!uploadFile || uploading}
          >
            {uploading ? <CircularProgress size={20} /> : 'Subir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview de PDF */}
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
