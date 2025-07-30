import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Menu,
  MenuItem as MenuItemComponent,
  Alert,
  Button,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Assignment,
  Email,
  Search,
  MoreVert,
  Visibility,
  Business,
  Schedule,
  PriorityHigh,
  CheckCircle,
  Pending,
  Cancel,
  HourglassTop,
  AttachFile,
  Refresh,
  MailOutline,
} from '@mui/icons-material';
import { PdfPreview } from '../components/PdfPreview';
import { ordersAPI } from '../services/api';
import type { Order, OrderDocument } from '../types';

export const Orders: React.FC = () => {
  // Estados principales
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderDocuments, setOrderDocuments] = useState<OrderDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'processing' | 'completed' | 'cancelled'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'normal' | 'high' | 'urgent'>('all');

  // Estados UI
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{ open: boolean; fileUrl: string; fileName: string }>({
    open: false,
    fileUrl: '',
    fileName: ''
  });

  // Cargar datos
  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const ordersData = await ordersAPI.getOrders();
      setOrders(ordersData);
      
      // Cargar documentos para cada orden
      const allDocuments: OrderDocument[] = [];
      for (const order of ordersData) {
        const orderDocs = await ordersAPI.getOrderDocuments(order.id!);
        allDocuments.push(...orderDocs);
      }
      setOrderDocuments(allDocuments);
    } catch {
      setError('Error al cargar las órdenes');
    } finally {
      setLoading(false);
    }
  };

  const simulateNewEmail = async () => {
    try {
      setLoading(true);
      const result = await ordersAPI.simulateEmail();
      setSuccess(`Nueva orden recibida: ${result.order.order_number} de ${result.order.company_name}`);
      await loadOrders();
    } catch {
      setError('Error al simular correo electrónico');
    } finally {
      setLoading(false);
    }
  };

  // Funciones auxiliares
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Pending sx={{ color: '#ed6c02' }} />;
      case 'processing': return <HourglassTop sx={{ color: '#501b36' }} />;
      case 'completed': return <CheckCircle sx={{ color: '#2e7d32' }} />;
      case 'cancelled': return <Cancel sx={{ color: '#d32f2f' }} />;
      default: return <Pending sx={{ color: '#757575' }} />;
    }
  };

  const getStatusColor = (status: string): 'error' | 'warning' | 'info' | 'success' | 'default' => {
    switch (status) {
      case 'pending': return 'warning';
      case 'processing': return 'info';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string): 'error' | 'warning' | 'info' | 'success' | 'default' => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'normal': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return <PriorityHigh sx={{ fontSize: 16 }} />;
      default:
        return null;
    }
  };

  // Handlers
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, order: Order) => {
    setAnchorEl(event.currentTarget);
    setSelectedOrder(order);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedOrder(null);
  };

  const handleViewDocuments = async () => {
    if (selectedOrder) {
      const docs = orderDocuments.filter(doc => doc.order_id === selectedOrder.id);
      if (docs.length > 0) {
        try {
          const blob = await ordersAPI.viewDocument(docs[0].id!);
          const url = URL.createObjectURL(blob);
          setPdfPreview({
            open: true,
            fileUrl: url,
            fileName: docs[0].file_name
          });
        } catch {
          setError('Error al cargar el documento');
        }
      }
    }
    handleMenuClose();
  };

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    try {
      await ordersAPI.updateOrderStatus(orderId, newStatus);
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus as Order['status'] } : order
      ));
      setSuccess(`Estado actualizado a "${newStatus}"`);
    } catch {
      setError('Error al actualizar el estado');
    }
    handleMenuClose();
  };

  const getOrderDocumentsCount = (orderId: number): number => {
    return orderDocuments.filter(doc => doc.order_id === orderId).length;
  };

  // Filtrar órdenes
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.email_received_from.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || order.priority === filterPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: { xs: '100%', sm: '100%', md: '1200px', lg: '1400px' },
      mx: 'auto',
      px: { xs: 0, sm: 1, md: 2 }
    }}>
      <Typography variant="h4" gutterBottom sx={{ 
        fontWeight: 700, 
        color: '#501b36',
        fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
        mb: { xs: 2, sm: 3 }
      }}>
        Gestión de Órdenes
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Filtros */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: { xs: 'stretch', sm: 'center' }, 
          justifyContent: 'space-between', 
          gap: 2, 
          flexDirection: { xs: 'column', lg: 'row' },
          flexWrap: 'wrap' 
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: { xs: 'stretch', sm: 'center' }, 
            gap: 2, 
            flexDirection: { xs: 'column', sm: 'row' },
            flexWrap: 'wrap',
            width: { xs: '100%', lg: 'auto' }
          }}>
            <TextField
              placeholder="Buscar órdenes..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ 
                minWidth: { xs: '100%', sm: 250 },
                flex: { xs: 1, sm: 0 }
              }}
            />
            
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
              <InputLabel>Estado</InputLabel>
              <Select
                value={filterStatus}
                label="Estado"
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="pending">Pendientes</MenuItem>
                <MenuItem value="processing">En Proceso</MenuItem>
                <MenuItem value="completed">Completadas</MenuItem>
                <MenuItem value="cancelled">Canceladas</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
              <InputLabel>Prioridad</InputLabel>
              <Select
                value={filterPriority}
                label="Prioridad"
                onChange={(e) => setFilterPriority(e.target.value as typeof filterPriority)}
              >
                <MenuItem value="all">Todas</MenuItem>
                <MenuItem value="urgent">Urgente</MenuItem>
                <MenuItem value="high">Alta</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="low">Baja</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ 
            display: 'flex', 
            gap: 2,
            flexDirection: { xs: 'column', sm: 'row' },
            width: { xs: '100%', lg: 'auto' }
          }}>
            <Button
              variant="contained"
              startIcon={<MailOutline />}
              onClick={simulateNewEmail}
              disabled={loading}
              sx={{ 
                bgcolor: '#501b36',
                '&:hover': { bgcolor: '#3d1429' },
                width: { xs: '100%', sm: 'auto' }
              }}
            >
              Simular Nuevo Correo
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadOrders}
              disabled={loading}
            >
              Actualizar
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Tabla de órdenes / Cards en móvil */}
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" sx={{ 
          mb: 2, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}>
          <Email />
          Órdenes Recibidas por Correo
        </Typography>
        
        {/* Vista de tabla para desktop */}
        <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Número de Orden</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Empresa</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Asunto</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Fecha Recibida</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Prioridad</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Documentos</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {order.order_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Business sx={{ color: '#501b36', fontSize: 20 }} />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {order.company_name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {order.email_received_from}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={order.subject}>
                        <Typography variant="body2" sx={{ 
                          maxWidth: 200, 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {order.subject}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Schedule sx={{ color: '#757575', fontSize: 16 }} />
                        <Typography variant="body2">
                          {formatDate(order.received_date)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusIcon(order.status)}
                        <Chip
                          label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          size="small"
                          color={getStatusColor(order.status)}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {getPriorityIcon(order.priority)}
                        <Chip
                          label={order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}
                          size="small"
                          variant="outlined"
                          color={getPriorityColor(order.priority)}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Badge badgeContent={getOrderDocumentsCount(order.id)} color="primary">
                        <AttachFile sx={{ color: '#757575' }} />
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        size="small"
                        onClick={(e) => handleMenuClick(e, order)}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Vista de cards para móvil y tablet */}
        <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
          {filteredOrders.map((order) => (
            <Paper 
              key={order.id} 
              elevation={2} 
              sx={{ 
                mb: 2, 
                p: 2,
                border: '1px solid #e0e0e0',
                '&:hover': {
                  boxShadow: 3,
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s ease'
                }
              }}
            >
              {/* Header de la card con número de orden y acciones */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                mb: 2,
                flexWrap: 'wrap',
                gap: 1
              }}>
                <Typography variant="h6" fontWeight={600} color="primary">
                  {order.order_number}
                </Typography>
                <IconButton 
                  size="small"
                  onClick={(e) => handleMenuClick(e, order)}
                >
                  <MoreVert />
                </IconButton>
              </Box>

              {/* Información de la empresa */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Business sx={{ color: '#501b36', fontSize: 20 }} />
                  <Typography variant="subtitle1" fontWeight={500}>
                    {order.company_name}
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary" sx={{ ml: 3 }}>
                  {order.email_received_from}
                </Typography>
              </Box>

              {/* Asunto */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                  Asunto:
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {order.subject}
                </Typography>
              </Box>

              {/* Fecha y documentos */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 2,
                flexWrap: 'wrap',
                gap: 1
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Schedule sx={{ color: '#757575', fontSize: 16 }} />
                  <Typography variant="body2">
                    {formatDate(order.received_date)}
                  </Typography>
                </Box>
                <Badge badgeContent={getOrderDocumentsCount(order.id)} color="primary">
                  <AttachFile sx={{ color: '#757575' }} />
                </Badge>
              </Box>

              {/* Estado y prioridad */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                pt: 2,
                borderTop: '1px solid #e0e0e0',
                flexWrap: 'wrap',
                gap: 1
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getStatusIcon(order.status)}
                  <Chip
                    label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    size="small"
                    color={getStatusColor(order.status)}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {getPriorityIcon(order.priority)}
                  <Chip
                    label={order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}
                    size="small"
                    variant="outlined"
                    color={getPriorityColor(order.priority)}
                  />
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>

        {filteredOrders.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Assignment sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No hay órdenes disponibles
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {searchTerm || filterStatus !== 'all' || filterPriority !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Las órdenes aparecerán aquí cuando se reciban por correo electrónico'
              }
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Menú contextual */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItemComponent onClick={handleViewDocuments}>
          <Visibility sx={{ mr: 1 }} />
          Ver Documentos
        </MenuItemComponent>
        {selectedOrder?.status === 'pending' && (
          <MenuItemComponent onClick={() => selectedOrder && handleUpdateStatus(selectedOrder.id, 'processing')}>
            <HourglassTop sx={{ mr: 1 }} />
            Marcar en Proceso
          </MenuItemComponent>
        )}
        {selectedOrder?.status === 'processing' && (
          <MenuItemComponent onClick={() => selectedOrder && handleUpdateStatus(selectedOrder.id, 'completed')}>
            <CheckCircle sx={{ mr: 1 }} />
            Marcar Completada
          </MenuItemComponent>
        )}
        {(selectedOrder?.status === 'pending' || selectedOrder?.status === 'processing') && (
          <MenuItemComponent onClick={() => selectedOrder && handleUpdateStatus(selectedOrder.id, 'cancelled')}>
            <Cancel sx={{ mr: 1 }} />
            Cancelar Orden
          </MenuItemComponent>
        )}
      </Menu>

      {/* Preview de PDF */}
      <PdfPreview
        open={pdfPreview.open}
        onClose={() => setPdfPreview({ open: false, fileUrl: '', fileName: '' })}
        fileUrl={pdfPreview.fileUrl}
        fileName={pdfPreview.fileName}
        title="Documento de Orden"
      />
    </Box>
  );
};
