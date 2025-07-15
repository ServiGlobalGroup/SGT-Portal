import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Avatar,
  Badge,
  Alert,
} from '@mui/material';
import {
  MenuBook,
  ExpandMore,
  Person,
  Download,
  Visibility,
  Search,
  FilterList,
  PictureAsPdf,
  AttachMoney,
  Restaurant,
  AdminPanelSettings,
} from '@mui/icons-material';
import { PdfPreview } from '../components/PdfPreview';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  is_active: boolean;
}

interface PayrollDocument {
  id: number;
  user_id: number;
  user_name: string;
  type: 'nomina' | 'dieta';
  month: string;
  file_name: string;
  file_size: number;
  upload_date: Date;
  status: 'active' | 'archived';
}

export const Gestor: React.FC = () => {
  const [users] = useState<User[]>([]);

  const [documents] = useState<PayrollDocument[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [expandedUser, setExpandedUser] = useState<number | false>(false);
  const [success, setSuccess] = useState('');
  const [pdfPreview, setPdfPreview] = useState<{ open: boolean; fileUrl: string; fileName: string }>({
    open: false, fileUrl: '', fileName: ''
  });

  // Obtener departamentos únicos
  const departments = Array.from(new Set(users.map(user => user.department)));

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || user.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && user.is_active) ||
                         (filterStatus === 'inactive' && !user.is_active);
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const getUserDocuments = (userId: number) => {
    return documents.filter(doc => doc.user_id === userId);
  };

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.is_active).length,
    totalDocuments: documents.length,
    usersWithDocuments: new Set(documents.map(d => d.user_id)).size,
    totalSize: documents.reduce((sum, doc) => sum + doc.file_size, 0)
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const getTypeIcon = (type: string) => {
    return type === 'nomina' ? <AttachMoney color="success" /> : <Restaurant color="info" />;
  };

  const getTypeColor = (type: string) => {
    return type === 'nomina' ? 'success' : 'info';
  };

  const handleAccordionChange = (userId: number) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedUser(isExpanded ? userId : false);
  };

  const handleDownload = (document: PayrollDocument) => {
    setSuccess(`Descargando ${document.file_name}...`);
    // En una aplicación real, aquí se haría una llamada al backend
  };

  const handleView = (document: PayrollDocument) => {
    // Abrir preview de PDF
    setPdfPreview({
      open: true,
      fileUrl: "", // URL del archivo real
      fileName: document.file_name
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterDepartment('all');
    setFilterStatus('all');
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#1565C0' }}>
        Panel de Documentación
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Estadísticas */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <MenuBook sx={{ fontSize: 40, color: '#1565C0' }} />
          <Box>
            <Typography variant="h6">Sistema de Gestión Documental Administrativo</Typography>
            <Typography variant="body2" color="textSecondary">
              Vista consolidada de todos los usuarios y sus documentos
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person color="primary" />
                <Box>
                  <Typography variant="h4" color="primary.main">{stats.totalUsers}</Typography>
                  <Typography variant="body2">Total Usuarios</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AdminPanelSettings color="success" />
                <Box>
                  <Typography variant="h4" color="success.main">{stats.activeUsers}</Typography>
                  <Typography variant="body2">Usuarios Activos</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PictureAsPdf color="error" />
                <Box>
                  <Typography variant="h4" color="error.main">{(stats.totalSize / (1024 * 1024)).toFixed(1)} MB</Typography>
                  <Typography variant="body2">Tamaño Total</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MenuBook color="info" />
                <Box>
                  <Typography variant="h4" color="info.main">{stats.usersWithDocuments}</Typography>
                  <Typography variant="body2">Con Documentos</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Paper>

      {/* Filtros */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          <FilterList sx={{ mr: 1, verticalAlign: 'middle' }} />
          Filtros de Usuario
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <Box sx={{ flex: '1 1 300px' }}>
            <TextField
              fullWidth
              size="small"
              label="Buscar usuarios"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Box>
          
          <Box sx={{ flex: '1 1 200px' }}>
            <FormControl fullWidth size="small">
              <InputLabel>Departamento</InputLabel>
              <Select
                value={filterDepartment}
                label="Departamento"
                onChange={(e) => setFilterDepartment(e.target.value)}
              >
                <MenuItem value="all">Todos</MenuItem>
                {departments.map(dept => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ flex: '1 1 150px' }}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select
                value={filterStatus}
                label="Estado"
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="active">Activos</MenuItem>
                <MenuItem value="inactive">Inactivos</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ flex: '0 0 auto' }}>
            <Button
              variant="outlined"
              onClick={clearFilters}
              disabled={searchTerm === '' && filterDepartment === 'all' && filterStatus === 'all'}
            >
              Limpiar
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Lista de usuarios con documentos */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Usuarios y sus Documentos ({filteredUsers.length})
        </Typography>

        {filteredUsers.map((user) => {
          const userDocuments = getUserDocuments(user.id);
          return (
            <Accordion
              key={user.id}
              expanded={expandedUser === user.id}
              onChange={handleAccordionChange(user.id)}
              sx={{ mb: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Badge
                    badgeContent={userDocuments.length}
                    color="primary"
                    showZero
                  >
                    <Avatar sx={{ bgcolor: user.is_active ? 'primary.main' : 'grey.400' }}>
                      {getUserInitials(user.name)}
                    </Avatar>
                  </Badge>
                  
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {user.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {user.email} • {user.department}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label={user.role === 'admin' ? 'Administrador' : 'Usuario'}
                      color={user.role === 'admin' ? 'warning' : 'default'}
                      size="small"
                    />
                    <Chip
                      label={user.is_active ? 'Activo' : 'Inactivo'}
                      color={user.is_active ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                </Box>
              </AccordionSummary>
              
              <AccordionDetails>
                {userDocuments.length > 0 ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Tipo</TableCell>
                          <TableCell>Archivo</TableCell>
                          <TableCell>Mes</TableCell>
                          <TableCell>Tamaño</TableCell>
                          <TableCell>Fecha</TableCell>
                          <TableCell align="center">Acciones</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {userDocuments.map((document) => (
                          <TableRow key={document.id}>
                            <TableCell>
                              <Chip
                                icon={getTypeIcon(document.type)}
                                label={document.type === 'nomina' ? 'Nómina' : 'Dieta'}
                                color={getTypeColor(document.type) as 'success' | 'info'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" noWrap>
                                {document.file_name}
                              </Typography>
                            </TableCell>
                            <TableCell>{formatMonth(document.month)}</TableCell>
                            <TableCell>{formatFileSize(document.file_size)}</TableCell>
                            <TableCell>
                              {document.upload_date.toLocaleDateString('es-ES')}
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleView(document)}
                                  title="Visualizar"
                                >
                                  <Visibility />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleDownload(document)}
                                  title="Descargar"
                                >
                                  <Download />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Este usuario no tiene documentos disponibles
                    </Typography>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}

        {filteredUsers.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary">
              No se encontraron usuarios
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Intenta ajustar los filtros de búsqueda
            </Typography>
          </Box>
        )}
      </Paper>

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
