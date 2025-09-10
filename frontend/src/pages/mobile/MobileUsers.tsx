import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  Fade,
  Snackbar,
  Stack,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { People, SupervisorAccount } from '@mui/icons-material';

import { usePagination } from '../../hooks/usePagination';
import { usersAPI } from '../../services/api';
import { MobileUserCard } from '../../components/mobile/MobileUserCard';
import { MobileFilters } from '../../components/mobile/MobileFilters';
import { MobilePagination } from '../../components/mobile/MobilePagination';
import { MobileStatsCard } from '../../components/mobile/MobileStatsCard';
import { MobileLoading } from '../../components/mobile/MobileLoading';

type Role = 'ADMINISTRADOR' | 'ADMINISTRACION' | 'TRAFICO' | 'TRABAJADOR' | string;

interface User {
  id: number;
  dni_nie: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: Role;
  department: string;
  position?: string;
  is_active: boolean;
  created_at: string;
  full_name: string;
  initials: string;
}

export const MobileUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info'; }>({ open: false, message: '', severity: 'info' });

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  // Para simplificar en móvil, filtraremos por estado y búsqueda; el rol puede añadirse más tarde

  // Expand/collapase users
  const [expandedUsers, setExpandedUsers] = useState<Array<number | string>>([]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await usersAPI.getAllUsers({ per_page: 100, active_only: false });
      setUsers(data.users || []);
    } catch (e) {
      console.error(e);
      setAlert({ type: 'error', message: 'Error al cargar los usuarios' });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(t);
  }, [alert]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return users.filter(u => {
      const matchesTerm = !term ||
        u.first_name?.toLowerCase().includes(term) ||
        u.last_name?.toLowerCase().includes(term) ||
        u.full_name?.toLowerCase().includes(term) ||
        u.dni_nie?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? u.is_active : !u.is_active);
    return matchesTerm && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  const pagination = usePagination({ data: filteredUsers, initialItemsPerPage: 8, initialPage: 1 });
  useEffect(() => { pagination.setCurrentPage(1); }, [searchTerm, statusFilter]);

  const stats = {
    total_users: users.length,
    active_users: users.filter(u => u.is_active).length,
    total_documents: 0,
    users_with_documents: 0,
    total_size: 0,
  };

  const statusOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
  ];

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  // no-op para rol en esta versión
  };

  const toggleExpand = (id: number | string) => {
    setExpandedUsers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <Box sx={{ p: 2, maxWidth: '100%', bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Fade in timeout={600}>
        <Paper elevation={0} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 50%, #d4a574 100%)', color: 'white', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
              <SupervisorAccount sx={{ fontSize: 24 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>Gestión de Usuarios</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Administra usuarios, roles y permisos</Typography>
            </Box>
          </Box>
        </Paper>
      </Fade>

      {/* Stats */}
      <Fade in timeout={800}>
        <Box sx={{ mb: 2 }}>
          <MobileStatsCard stats={stats} />
        </Box>
      </Fade>

      {/* Alerts */}
      {alert && (
        <Fade in timeout={400}>
          <Alert severity={alert.type} sx={{ mb: 2, borderRadius: 2 }} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        </Fade>
      )}

      {/* Filters */}
      <Fade in timeout={900}>
        <Box sx={{ mb: 2 }}>
      <MobileFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterOptions={{
        status: { value: statusFilter, onChange: (v: string) => setStatusFilter(v as any), options: statusOptions },
            }}
            onRefresh={loadUsers}
            onClearFilters={clearFilters}
            loading={loading}
            searchPlaceholder="Buscar por nombre, DNI/NIE o email..."
          />
        </Box>
      </Fade>

      {/* Users list */}
      <Fade in timeout={1000}>
        <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #e0e0e0', background: '#ffffff', overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', background: alpha('#501b36', 0.02) }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <People sx={{ color: '#501b36', fontSize: 24 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#501b36', fontSize: '1.1rem' }}>
                Lista de Usuarios ({filteredUsers.length})
              </Typography>
            </Box>
          </Box>

          {loading ? (
            <MobileLoading message="Cargando usuarios..." />
          ) : filteredUsers.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <People sx={{ fontSize: 40, color: '#501b36', mb: 1 }} />
              <Typography variant="body1" color="text.secondary">No hay usuarios para mostrar</Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ p: 2 }}>
                <Stack spacing={1.5}>
                  {pagination.paginatedData.map((u) => (
                    <MobileUserCard
                      key={u.id}
                      user={{
                        id: String(u.id),
                        dni: u.dni_nie,
                        first_name: u.first_name,
                        last_name: u.last_name,
                        email: u.email,
                        role: u.role,
                        is_active: u.is_active,
                        total_documents: 0,
                        total_size: 0,
                        documents: [],
                      }}
                      isExpanded={expandedUsers.includes(u.id)}
                      onToggleExpand={(id) => toggleExpand(Number(id))}
                      onMenuClick={() => {}}
                      onDownloadDocument={() => {}}
                      onPreviewDocument={() => {}}
                      loadingActions={{}}
                    />
                  ))}
                </Stack>
              </Box>
              <MobilePagination
                currentPage={pagination.currentPage}
                totalPages={Math.ceil(filteredUsers.length / pagination.itemsPerPage)}
                totalItems={filteredUsers.length}
                itemsPerPage={pagination.itemsPerPage}
                onPageChange={pagination.setCurrentPage}
              />
            </>
          )}
        </Paper>
      </Fade>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MobileUsers;
