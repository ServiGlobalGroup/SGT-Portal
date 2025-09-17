import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, Paper, TextField, Button, Fade, GlobalStyles, Alert, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Stack, IconButton, Tooltip, ToggleButtonGroup, ToggleButton, Pagination, Autocomplete, CircularProgress, Chip } from '@mui/material';
import { WorkOutline, DeleteOutline, History, Calculate } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { hasPermission, Permission } from '../utils/permissions';
import { tripsAPI, type TripRecord } from '../services/api';

interface TripEntry { id: string; orderNumber: string; pernocta: boolean; festivo: boolean; canonTti: boolean; nota: string; createdAt: string; eventDate: string; userName: string; }

export const Trips: React.FC = () => {
  const { user, selectedCompany } = useAuth();
  const isAdmin = !!user && hasPermission(user, Permission.MANAGE_TRIPS);
  const canViewAllTrips = !!user && (hasPermission(user, Permission.MANAGE_TRIPS) || hasPermission(user, Permission.VIEW_TRIPS));
  const [orderNumber, setOrderNumber] = useState('');
  const [pernocta, setPernocta] = useState(false);
  const [festivo, setFestivo] = useState(false);
  const [canonTti, setCanonTti] = useState(false);
  const [nota, setNota] = useState('');
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [entries, setEntries] = useState<TripEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);
  // Filtros admin
  const [filterUserId, setFilterUserId] = useState<string>('');
  const [filterStart, setFilterStart] = useState<string>('');
  const [filterEnd, setFilterEnd] = useState<string>('');
  // Autocomplete usuarios
  const [userSearch, setUserSearch] = useState('');
  const [userOptions, setUserOptions] = useState<{ id:number; label:string; role?:string; }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id:number; label:string; role?:string; } | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);
  const lastQueryRef = useRef<string>('');

  // Cargar registros (mis viajes o todos si admin)
  useEffect(() => {
    let active = true;
    setLoading(true);
    const mapTrip = (t: TripRecord): TripEntry => ({
      id: String(t.id),
      orderNumber: t.order_number,
      pernocta: t.pernocta,
      festivo: t.festivo,
      canonTti: t.canon_tti,
      nota: t.note || '',
      createdAt: t.created_at,
      eventDate: t.event_date,
      userName: t.user_name || '—'
    });
    if (canViewAllTrips) {
      tripsAPI.listAll({
        user_id: filterUserId ? Number(filterUserId) : undefined,
        start: filterStart || undefined,
        end: filterEnd || undefined,
        page,
        page_size: pageSize
      }).then(data => {
        if(!active) return;
        setTotal(data.total);
  const mapped = data.items.map(mapTrip);
  setEntries(mapped);
      }).catch(err => { if(active) setError(err?.response?.data?.detail || 'Error cargando registros'); }).finally(()=> active && setLoading(false));
    } else {
      tripsAPI.listMine().then(data => {
        if(!active) return;
  const mapped = data.map(mapTrip);
  setEntries(mapped);
  setTotal(mapped.length);
      }).catch(err => { if(active) setError(err?.response?.data?.detail || 'Error cargando registros'); }).finally(()=> active && setLoading(false));
    }
    return () => { active = false; };
  }, [canViewAllTrips, page, filterUserId, filterStart, filterEnd, pageSize, selectedCompany]);

  // Cuando cambia la empresa seleccionada, reiniciar paginación y limpiar filtro de usuario
  useEffect(() => {
    // Si el usuario cambia de empresa, conviene reiniciar a página 1 y limpiar el conductor seleccionado
    setPage(1);
    setSelectedUser(null);
    setFilterUserId('');
  }, [selectedCompany]);

  const handleAdd = async () => {
    if (!orderNumber.trim()) { setError('El número de Albarán / OC es obligatorio'); return; }
    if (!eventDate) { setError('La fecha del evento es obligatoria'); return; }
    setError(null);
    try {
      const created = await tripsAPI.create({
        order_number: orderNumber.trim(),
        pernocta,
        festivo,
        canon_tti: canonTti,
        event_date: eventDate,
        note: nota.trim() || undefined
      } as any);
      const entry: TripEntry = {
        id: String(created.id),
        orderNumber: created.order_number,
        pernocta: created.pernocta,
        festivo: created.festivo,
        canonTti: created.canon_tti,
        nota: created.note || '',
        createdAt: created.created_at,
        eventDate: created.event_date,
        userName: created.user_name || user?.full_name || '—'
      };
      setEntries(p => [entry, ...p]);
      setOrderNumber(''); setPernocta(false); setFestivo(false); setCanonTti(false); setNota(''); setEventDate(new Date().toISOString().slice(0,10)); setSuccess('Registro guardado'); setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Error guardando');
    }
  };
  const handleClear = () => { setOrderNumber(''); setPernocta(false); setFestivo(false); setCanonTti(false); setNota(''); setEventDate(new Date().toISOString().slice(0,10)); setError(null); };
  const handleDelete = async (id: string) => {
    const prev = entries;
    setEntries(p => p.filter(e => e.id !== id));
    try {
      await tripsAPI.remove(Number(id));
    } catch (e) {
      setEntries(prev);
      setError('No se pudo eliminar');
    }
  };
  const handleChangeTab = (_: React.SyntheticEvent, v: number) => { if(v!==null) setTab(v); };

  // Autocomplete usuarios (solo admin o quienes pueden ver todos los viajes)
  useEffect(() => {
    if (!canViewAllTrips) return;
    const term = userSearch.trim();
    if (searchTimeoutRef.current) window.clearTimeout(searchTimeoutRef.current);
    if (term.length < 2) { setUserOptions([]); setLoadingUsers(false); lastQueryRef.current=''; return; }
    searchTimeoutRef.current = window.setTimeout(async () => {
      if (lastQueryRef.current === term) return;
      lastQueryRef.current = term;
      setLoadingUsers(true);
      try {
        const res = await tripsAPI.userSuggestions(term);
        setUserOptions(res.map(u => ({ id: u.id, label: `${u.label} (${u.role})`, role: u.role })));
      } catch {
        setUserOptions([]);
      } finally {
        setLoadingUsers(false);
      }
    }, 300);
    return () => { if (searchTimeoutRef.current) window.clearTimeout(searchTimeoutRef.current); };
  }, [userSearch, canViewAllTrips, selectedCompany]);

  // Valores y manejador de indicadores (pill multi-select)
  const indicatorValues: string[] = [];
  if (pernocta) indicatorValues.push('pernocta');
  if (festivo) indicatorValues.push('festivo');
  if (canonTti) indicatorValues.push('canonTti');
  const handleIndicator = useCallback((_: React.SyntheticEvent, values: string[]) => {
    setPernocta(values.includes('pernocta'));
    setFestivo(values.includes('festivo'));
    setCanonTti(values.includes('canonTti'));
  }, []);

  return (<>
    <GlobalStyles styles={{ body: { paddingRight: '0px !important', overflow: 'auto !important', overflowX: 'hidden !important' } }} />
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Box sx={{ mb: 4 }}>
        <Fade in timeout={700}>
          <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 }, background: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 55%, #d4a574 100%)', color: 'white', borderRadius: 3, position: 'relative', overflow: 'hidden', '&::before': { content: '""', position: 'absolute', inset: 0, backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\\"60\\" height=\\"60\\" viewBox=\\"0 0 60 60\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cg fill=\\"none\\" fill-rule=\\"evenodd\\"%3E%3Cg fill=\\"%23ffffff\\" fill-opacity=\\"0.08\\"%3E%3Cpath d=\\"m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' } }}>
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap:'wrap' }}>
                <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.18)', borderRadius: 2, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <WorkOutline sx={{ fontSize: 32, color: '#ffffff' }} />
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Viajes (Pernocta / Festivo)</Typography>
                  <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400, fontSize: { xs: '1rem', sm: '1.1rem' } }}>Registra si una orden tuvo pernocta y/o fue en día festivo</Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Fade>
      </Box>
      {error && <Fade in timeout={300}><Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert></Fade>}
      {success && <Fade in timeout={300}><Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccess(null)}>{success}</Alert></Fade>}

      {/* Selector estilo Dietas */}
      <Box sx={{ mb:4, display:'flex', justifyContent:'flex-start' }}>
        <Box
          sx={{
            p: 0.5,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
            border: '2px solid #e0e0e0',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
            display: 'inline-block'
          }}
        >
          <ToggleButtonGroup
            value={tab}
            exclusive
            onChange={handleChangeTab}
            size="small"
            sx={{
              '& .MuiToggleButtonGroup-grouped': {
                border: 'none',
                '&:not(:first-of-type)': {
                  borderRadius: 3,
                  marginLeft: '4px'
                },
                '&:first-of-type': { borderRadius: 3 }
              },
              '& .MuiToggleButton-root': {
                borderRadius: '20px !important',
                px: 2.5,
                py: 1,
                textTransform: 'none',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: 'none !important',
                minWidth: 140,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(135deg, rgba(80,27,54,0.1) 0%, rgba(80,27,54,0.05) 100%)',
                  opacity: 0,
                  transition: 'opacity 0.3s ease'
                },
                '&:hover::before': { opacity: 1 },
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 70%, #501b36 100%)',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(80,27,54,0.3), 0 2px 4px rgba(80,27,54,0.2)',
                  transform: 'translateY(-1px)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #3d1429 0%, #5a1d3a 30%, #6b2545 70%, #3d1429 100%)',
                    boxShadow: '0 6px 16px rgba(80,27,54,0.4), 0 2px 8px rgba(80,27,54,0.3)'
                  },
                  '&::before': { opacity: 0 }
                },
                '&:not(.Mui-selected)': {
                  color: '#501b36',
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    transform: 'translateY(-0.5px)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }
                }
              }
            }}
          >
            <ToggleButton value={0}>
              <Calculate sx={{ mr:0.6, fontSize:18 }} /> Nuevo Registro
            </ToggleButton>
            {canViewAllTrips && <ToggleButton value={1}>
              <History sx={{ mr:0.6, fontSize:18 }} /> {`Registros (${total})`}
            </ToggleButton>}
          </ToggleButtonGroup>
        </Box>
      </Box>

      {tab === 0 && (
        <Fade in timeout={800}>
          <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3, border: '1px solid #e0e0e0', position: 'relative' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Registro de Viaje</Typography>
            <Stack spacing={3}>
              <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
                <TextField 
                  fullWidth 
                  label="Albarán / OC" 
                  value={orderNumber} 
                  onChange={e => setOrderNumber(e.target.value.toUpperCase())} 
                  required 
                  size="small" 
                  helperText={!orderNumber.trim() ? 'Obligatorio' : ' '} 
                  error={!orderNumber.trim() && !!orderNumber} 
                />
                <TextField 
                  fullWidth 
                  label="Fecha pernocta / festivo" 
                  type="date" 
                  value={eventDate} 
                  onChange={e => setEventDate(e.target.value)} 
                  size="small" 
                  InputLabelProps={{ shrink:true }} 
                  required 
                />
              </Stack>
              
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>Indicadores</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <ToggleButtonGroup
                    value={indicatorValues}
                    onChange={handleIndicator}
                    size="small"
                    sx={{
                      '& .MuiToggleButtonGroup-grouped': {
                        border: 'none',
                        '&:not(:first-of-type)': {
                          borderRadius: 3,
                          marginLeft: '4px'
                        },
                        '&:first-of-type': { borderRadius: 3 }
                      },
                      '& .MuiToggleButton-root': {
                        borderRadius: '20px !important',
                        px: 2.5,
                        py: 1,
                        textTransform: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        border: 'none !important',
                        minWidth: 110,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'linear-gradient(135deg, rgba(80,27,54,0.1) 0%, rgba(80,27,54,0.05) 100%)',
                          opacity: 0,
                          transition: 'opacity 0.3s ease'
                        },
                        '&:hover::before': { opacity: 1 },
                        '&.Mui-selected': {
                          background: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 70%, #501b36 100%)',
                          color: 'white',
                          boxShadow: '0 4px 12px rgba(80,27,54,0.3), 0 2px 4px rgba(80,27,54,0.2)',
                          transform: 'translateY(-1px)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #3d1429 0%, #5a1d3a 30%, #6b2545 70%, #3d1429 100%)',
                            boxShadow: '0 6px 16px rgba(80,27,54,0.4), 0 2px 8px rgba(80,27,54,0.3)'
                          },
                          '&::before': { opacity: 0 }
                        },
                        '&:not(.Mui-selected)': {
                          color: '#501b36',
                          backgroundColor: 'rgba(255,255,255,0.8)',
                          backdropFilter: 'blur(10px)',
                          '&:hover': {
                            backgroundColor: 'rgba(255,255,255,0.95)',
                            transform: 'translateY(-0.5px)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }
                        }
                      }
                    }}
                  >
                    <ToggleButton value="pernocta">Pernocta</ToggleButton>
                    <ToggleButton value="festivo">Festivo</ToggleButton>
                    <ToggleButton value="canonTti">Canon TTI</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
              </Box>

              <TextField 
                fullWidth 
                label="Nota (opcional)" 
                value={nota} 
                onChange={e => setNota(e.target.value)} 
                multiline 
                minRows={3} 
                size="small" 
                inputProps={{ maxLength:300 }} 
                helperText={`${nota.length}/300`} 
              />
              
              <Box sx={{ display:'flex', flexWrap:'wrap', gap:2 }}>
                <Button variant="contained" onClick={handleAdd} disabled={!orderNumber.trim() || !eventDate} sx={{ fontWeight:600, px:3 }}>Guardar</Button>
                <Button variant="outlined" onClick={handleClear} sx={{ fontWeight:500 }}>Limpiar</Button>
              </Box>
            </Stack>
          </Paper>
        </Fade>
      )}

      {canViewAllTrips && tab === 1 && (
        <Fade in timeout={800}>
          <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3, border: '1px solid #e0e0e0', position: 'relative' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Registros de Viajes</Typography>
            <Stack spacing={2} sx={{ mb:3 }}>
              <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
                <Autocomplete
                  sx={{ 
                    minWidth: 260,
                    '& .MuiAutocomplete-popupIndicator': {
                      backgroundColor: 'transparent',
                      boxShadow: 'none',
                      borderRadius: 0,
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                        boxShadow: 'none'
                      }
                    },
                    '& .MuiAutocomplete-clearIndicator': {
                      backgroundColor: 'transparent',
                      boxShadow: 'none',
                      borderRadius: 0,
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                        boxShadow: 'none'
                      }
                    }
                  }}
                  size="small"
                  options={userOptions}
                  loading={loadingUsers}
                  value={selectedUser}
                  onChange={(_, val) => { setSelectedUser(val); setFilterUserId(val ? String(val.id) : ''); setPage(1); }}
                  onInputChange={(_, val, reason) => {
                    if (reason === 'input') setUserSearch(val);
                    if (!val) { setSelectedUser(null); setFilterUserId(''); setPage(1); }
                  }}
                  filterOptions={(opts) => opts}
                  isOptionEqualToValue={(o,v)=> o.id===v.id }
                  getOptionLabel={(o)=> o.label }
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      <Box sx={{ display:'flex', flexDirection:'column' }}>
                        <Typography variant="body2" fontWeight={600}>{option.label}</Typography>
                      </Box>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Conductor"
                      placeholder="Nombre o apellidos"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingUsers ? <CircularProgress color="inherit" size={16} sx={{ mr:1 }} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        )
                      }}
                    />
                  )}
                  noOptionsText={userSearch.length < 2 ? 'Teclee 2+ letras' : 'Sin resultados'}
                  clearText="Limpiar"
                />
                <TextField 
                  label="Desde" 
                  type="date" 
                  size="small" 
                  value={filterStart} 
                  onChange={e=>{ setPage(1); setFilterStart(e.target.value); }} 
                  InputLabelProps={{ shrink:true }} 
                  sx={{ minWidth:150 }} 
                />
                <TextField 
                  label="Hasta" 
                  type="date" 
                  size="small" 
                  value={filterEnd} 
                  onChange={e=>{ setPage(1); setFilterEnd(e.target.value); }} 
                  InputLabelProps={{ shrink:true }} 
                  sx={{ minWidth:150 }} 
                />
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={()=>{ setSelectedUser(null); setUserSearch(''); setFilterUserId(''); setFilterStart(''); setFilterEnd(''); setPage(1); }}
                >
                  Limpiar
                </Button>
              </Stack>
            </Stack>
            
            <TableContainer sx={{ border:'1px solid #e0e0e0', borderRadius:2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ background:'linear-gradient(180deg,#fafafa,#f0f0f0)', '& th': { fontWeight:600 } }}>
                    <TableCell>Conductor</TableCell>
                    <TableCell>Albarán / OC</TableCell>
                    <TableCell>Pernocta</TableCell>
                    <TableCell>Festivo</TableCell>
                    <TableCell>Canon TTI</TableCell>
                    <TableCell>Fecha Evento</TableCell>
                    <TableCell>Fecha Registro</TableCell>
                    <TableCell>Nota</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py:6 }}>
                        <Typography variant="body2" sx={{ opacity:0.7 }}>Sin registros todavía</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {entries.map(e => (
                    <TableRow key={e.id} hover>
                      <TableCell sx={{ fontWeight:500 }}>{e.userName || '—'}</TableCell>
                      <TableCell sx={{ fontWeight:600, fontFamily:'monospace', letterSpacing:.5 }}>{e.orderNumber}</TableCell>
                      <TableCell>
                        <Chip size="small" label={e.pernocta ? 'Sí' : 'No'} sx={{ bgcolor: e.pernocta ? '#6d2548' : '#e4e4e4', color: e.pernocta ? '#fff' : '#555', fontWeight:500 }} />
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={e.festivo ? 'Sí' : 'No'} sx={{ bgcolor: e.festivo ? '#d4a574' : '#e4e4e4', color: e.festivo ? '#4a2c12' : '#555', fontWeight:500 }} />
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={e.canonTti ? 'Sí' : 'No'} sx={{ bgcolor: e.canonTti ? '#388e3c' : '#e4e4e4', color: e.canonTti ? '#fff' : '#555', fontWeight:500 }} />
                      </TableCell>
                      <TableCell>{new Date(e.eventDate + 'T00:00:00').toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'2-digit' })}</TableCell>
                      <TableCell>{new Date(e.createdAt).toLocaleString('es-ES', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })}</TableCell>
                      <TableCell>
                        <Tooltip title={e.nota || ''} disableInteractive placement="top-start">
                          <Typography variant="body2" sx={{ maxWidth:200, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.nota || '-'}</Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        {isAdmin && (
                          <IconButton 
                            size="small" 
                            onClick={() => handleDelete(e.id)}
                            sx={{
                              backgroundColor: 'transparent',
                              boxShadow: 'none',
                              border: 'none',
                              '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                boxShadow: 'none'
                              },
                              '&:focus': {
                                boxShadow: 'none'
                              }
                            }}
                          >
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {total > pageSize && (
              <Box sx={{ display:'flex', justifyContent:'center', mt:2 }}>
                <Pagination count={Math.ceil(total / pageSize)} page={page} onChange={(_,v)=> setPage(v)} size="small" />
              </Box>
            )}
          </Paper>
        </Fade>
      )}

      {loading && <Box sx={{ position:'fixed', top:70, right:20, zIndex:2000, background:'#501b36', color:'#fff', px:2, py:1, borderRadius:2, boxShadow:3 }}>Cargando...</Box>}
    </Box>
  </>);
};

export default Trips;
