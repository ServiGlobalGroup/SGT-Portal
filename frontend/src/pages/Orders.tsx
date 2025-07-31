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
  CircularProgress,
  Stack,
  Fade,
  GlobalStyles,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
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
  ListAlt,
  WorkOutline,
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

  // Auto-hide alerts
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

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
    <>
      <GlobalStyles
        styles={{
          body: {
            paddingRight: '0px !important',
            overflow: 'auto !important',
            overflowX: 'hidden !important',
          },
          '.MuiModal-root': {
            paddingRight: '0px !important',
          },
          '.MuiPopover-root': {
            paddingRight: '0px !important',
          },
          '.MuiTableContainer-root': {
            overflowX: 'hidden !important',
          },
          '.MuiTable-root': {
            overflowX: 'hidden !important',
          },
        }}
      />
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', bgcolor: '#f5f5f5', minHeight: '100vh' }}>
        {/* Header Principal */}
        <Box sx={{ mb: 4 }}>
          <Fade in timeout={800}>
            <Paper 
              elevation={0}
              sx={{
                p: { xs: 3, sm: 4 },
                background: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 50%, #d4a574 100%)',
                color: 'white',
                borderRadius: 3,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Cpath d="m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                },
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: 2,
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <WorkOutline sx={{ fontSize: 32 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Gestión de Órdenes
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
                      Administra y procesa las órdenes recibidas por correo electrónico
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Fade>
        </Box>

        {/* Alertas */}
        {error && (
          <Fade in timeout={400}>
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                borderRadius: 2,
                '& .MuiAlert-icon': {
                  fontSize: 24
                }
              }} 
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          </Fade>
        )}

        {success && (
          <Fade in timeout={400}>
            <Alert 
              severity="success" 
              sx={{ 
                mb: 3,
                borderRadius: 2,
                '& .MuiAlert-icon': {
                  fontSize: 24
                }
              }} 
              onClose={() => setSuccess(null)}
            >
              {success}
            </Alert>
          </Fade>
        )}

        {/* Panel de Control */}
        <Fade in timeout={1000}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 2,
              border: '1px solid #e0e0e0',
              background: '#ffffff',
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              alignItems: 'center',
              flexDirection: { xs: 'column', lg: 'row' },
              justifyContent: 'space-between'
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
                  placeholder="Buscar por número, empresa, asunto o email..."
                  variant="outlined"
                  size="small"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                  sx={{ 
                    minWidth: { xs: '100%', sm: 300 },
                    flex: { xs: 1, sm: 0 },
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover': {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#501b36',
                        },
                      },
                    },
                  }}
                />
                
                <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
                  <InputLabel sx={{ 
                    '&.Mui-focused': { 
                      color: '#501b36' 
                    } 
                  }}>
                    Estado
                  </InputLabel>
                  <Select
                    value={filterStatus}
                    label="Estado"
                    onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                    sx={{
                      borderRadius: 2,
                      '&:hover': {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#501b36',
                        },
                      },
                      '&.Mui-focused': {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#501b36',
                        },
                      },
                      '& .MuiSelect-select:focus': {
                        backgroundColor: 'transparent',
                      },
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          borderRadius: 2,
                          mt: 0.5,
                          '& .MuiMenuItem-root': {
                            '&:hover': {
                              backgroundColor: alpha('#501b36', 0.08),
                              color: '#501b36',
                            },
                            '&.Mui-selected': {
                              backgroundColor: alpha('#501b36', 0.12),
                              color: '#501b36',
                              '&:hover': {
                                backgroundColor: alpha('#501b36', 0.16),
                              },
                            },
                          },
                        },
                      },
                    }}
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    <MenuItem value="pending">Pendientes</MenuItem>
                    <MenuItem value="processing">En Proceso</MenuItem>
                    <MenuItem value="completed">Completadas</MenuItem>
                    <MenuItem value="cancelled">Canceladas</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
                  <InputLabel sx={{ 
                    '&.Mui-focused': { 
                      color: '#501b36' 
                    } 
                  }}>
                    Prioridad
                  </InputLabel>
                  <Select
                    value={filterPriority}
                    label="Prioridad"
                    onChange={(e) => setFilterPriority(e.target.value as typeof filterPriority)}
                    sx={{
                      borderRadius: 2,
                      '&:hover': {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#501b36',
                        },
                      },
                      '&.Mui-focused': {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#501b36',
                        },
                      },
                      '& .MuiSelect-select:focus': {
                        backgroundColor: 'transparent',
                      },
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          borderRadius: 2,
                          mt: 0.5,
                          '& .MuiMenuItem-root': {
                            '&:hover': {
                              backgroundColor: alpha('#501b36', 0.08),
                              color: '#501b36',
                            },
                            '&.Mui-selected': {
                              backgroundColor: alpha('#501b36', 0.12),
                              color: '#501b36',
                              '&:hover': {
                                backgroundColor: alpha('#501b36', 0.16),
                              },
                            },
                          },
                        },
                      },
                    }}
                  >
                    <MenuItem value="all">Todas</MenuItem>
                    <MenuItem value="urgent">Urgente</MenuItem>
                    <MenuItem value="high">Alta</MenuItem>
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="low">Baja</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={loadOrders}
                  disabled={loading}
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: '#501b36',
                    color: '#501b36',
                    '&:hover': {
                      borderColor: '#3d1429',
                      bgcolor: alpha('#501b36', 0.04),
                    },
                  }}
                >
                  {loading ? 'Actualizando...' : 'Actualizar'}
                </Button>

                <Button
                  variant="contained"
                  startIcon={<MailOutline />}
                  onClick={simulateNewEmail}
                  disabled={loading}
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    textTransform: 'none',
                    fontWeight: 600,
                    backgroundColor: '#501b36',
                    '&:hover': {
                      backgroundColor: '#3d1429',
                    },
                  }}
                >
                  Simular Nuevo Correo
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Fade>

        {/* Contenido Principal */}
        <Fade in timeout={1200}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              border: '1px solid #e0e0e0',
              background: '#ffffff',
            }}
          >
            {/* Header de la tabla */}
            <Box sx={{ 
              p: 3, 
              borderBottom: 1, 
              borderColor: 'divider',
              background: alpha('#501b36', 0.02),
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ListAlt sx={{ color: '#501b36', fontSize: 28 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#501b36' }}>
                    Órdenes Recibidas por Correo
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {filteredOrders.length} orden{filteredOrders.length !== 1 ? 'es' : ''} encontrada{filteredOrders.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Contenido de órdenes */}
            {loading ? (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 6,
                gap: 2
              }}>
                <CircularProgress size={48} sx={{ color: '#501b36' }} />
                <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                  Cargando órdenes...
                </Typography>
              </Box>
            ) : filteredOrders.length === 0 ? (
              <Box sx={{ 
                p: 6, 
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2
              }}>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: '50%',
                    bgcolor: alpha('#501b36', 0.1),
                    mb: 2,
                  }}
                >
                  <Assignment sx={{ fontSize: 48, color: '#501b36' }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                  No hay órdenes disponibles
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, maxWidth: 400 }}>
                  {searchTerm || filterStatus !== 'all' || filterPriority !== 'all'
                    ? 'No se encontraron órdenes que coincidan con los filtros aplicados'
                    : 'Las órdenes aparecerán aquí cuando se reciban por correo electrónico'
                  }
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<MailOutline />}
                  onClick={simulateNewEmail}
                  disabled={loading}
                  sx={{
                    borderRadius: 2,
                    px: 4,
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    backgroundColor: '#501b36',
                    '&:hover': {
                      backgroundColor: '#3d1429',
                    },
                  }}
                >
                  Simular Nueva Orden
                </Button>
              </Box>
            ) : (
              <TableContainer
                sx={{
                  overflowX: 'hidden !important',
                  '&::-webkit-scrollbar': {
                    display: 'none',
                  },
                  '-ms-overflow-style': 'none',
                  'scrollbar-width': 'none',
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow 
                      sx={{ 
                        bgcolor: alpha('#501b36', 0.02),
                        '& .MuiTableCell-head': {
                          fontWeight: 700,
                          color: '#501b36',
                          borderBottom: `2px solid ${alpha('#501b36', 0.1)}`,
                          py: 2,
                        }
                      }}
                    >
                      <TableCell>Número de Orden</TableCell>
                      <TableCell>Empresa</TableCell>
                      <TableCell>Asunto</TableCell>
                      <TableCell>Fecha Recibida</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Prioridad</TableCell>
                      <TableCell>Documentos</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow 
                        key={order.id} 
                        hover
                        sx={{
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: alpha('#501b36', 0.02),
                            transform: 'translateX(4px)',
                          },
                          '& .MuiTableCell-root': {
                            borderBottom: `1px solid ${alpha('#501b36', 0.06)}`,
                            py: 2,
                          }
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: alpha('#501b36', 0.1),
                              }}
                            >
                              <Assignment sx={{ color: '#501b36' }} />
                            </Box>
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                                {order.order_number}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                Orden de trabajo
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: alpha('#501b36', 0.1),
                              }}
                            >
                              <Business sx={{ color: '#501b36' }} />
                            </Box>
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                                {order.company_name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
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
                              whiteSpace: 'nowrap',
                              fontWeight: 500
                            }}>
                              {order.subject}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Schedule sx={{ color: '#757575', fontSize: 16 }} />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {formatDate(order.received_date)}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                Fecha de recepción
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getStatusIcon(order.status)}
                            <Chip
                              label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              size="small"
                              color={getStatusColor(order.status)}
                              sx={{
                                borderRadius: 2,
                                fontWeight: 600,
                                fontSize: '0.75rem',
                              }}
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
                              sx={{
                                borderRadius: 2,
                                fontWeight: 600,
                                fontSize: '0.75rem',
                              }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            badgeContent={getOrderDocumentsCount(order.id)} 
                            color="primary"
                            sx={{
                              '& .MuiBadge-badge': {
                                borderRadius: 2,
                                fontWeight: 600,
                              }
                            }}
                          >
                            <Box
                              sx={{
                                p: 1,
                                borderRadius: 2,
                                bgcolor: alpha('#501b36', 0.1),
                              }}
                            >
                              <AttachFile sx={{ color: '#501b36' }} />
                            </Box>
                          </Badge>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton 
                            size="small"
                            onClick={(e) => handleMenuClick(e, order)}
                            sx={{
                              borderRadius: 2,
                              bgcolor: alpha('#501b36', 0.08),
                              color: '#501b36',
                              '&:hover': {
                                bgcolor: alpha('#501b36', 0.12),
                              },
                            }}
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
        </Fade>

        {/* Menú contextual mejorado */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              border: '1px solid #e0e0e0',
              mt: 1,
              minWidth: 180,
            }
          }}
        >
          <MenuItemComponent 
            onClick={handleViewDocuments}
            sx={{
              py: 1.5,
              px: 2,
              gap: 2,
              '&:hover': {
                bgcolor: alpha('#501b36', 0.08),
                color: '#501b36',
              },
            }}
          >
            <Visibility sx={{ fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Ver Documentos
            </Typography>
          </MenuItemComponent>
          
          {selectedOrder?.status === 'pending' && (
            <MenuItemComponent 
              onClick={() => selectedOrder && handleUpdateStatus(selectedOrder.id, 'processing')}
              sx={{
                py: 1.5,
                px: 2,
                gap: 2,
                '&:hover': {
                  bgcolor: alpha('#2196f3', 0.08),
                  color: '#2196f3',
                },
              }}
            >
              <HourglassTop sx={{ fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Marcar en Proceso
              </Typography>
            </MenuItemComponent>
          )}
          
          {selectedOrder?.status === 'processing' && (
            <MenuItemComponent 
              onClick={() => selectedOrder && handleUpdateStatus(selectedOrder.id, 'completed')}
              sx={{
                py: 1.5,
                px: 2,
                gap: 2,
                '&:hover': {
                  bgcolor: alpha('#4caf50', 0.08),
                  color: '#4caf50',
                },
              }}
            >
              <CheckCircle sx={{ fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Marcar Completada
              </Typography>
            </MenuItemComponent>
          )}
          
          {(selectedOrder?.status === 'pending' || selectedOrder?.status === 'processing') && (
            <MenuItemComponent 
              onClick={() => selectedOrder && handleUpdateStatus(selectedOrder.id, 'cancelled')}
              sx={{
                py: 1.5,
                px: 2,
                gap: 2,
                '&:hover': {
                  bgcolor: alpha('#f44336', 0.08),
                  color: '#f44336',
                },
              }}
            >
              <Cancel sx={{ fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Cancelar Orden
              </Typography>
            </MenuItemComponent>
          )}
        </Menu>

        {/* Preview de PDF mejorado */}
        <PdfPreview
          open={pdfPreview.open}
          onClose={() => setPdfPreview({ open: false, fileUrl: '', fileName: '' })}
          fileUrl={pdfPreview.fileUrl}
          fileName={pdfPreview.fileName}
          title="Documento de Orden"
        />
      </Box>
    </>
  );
};
