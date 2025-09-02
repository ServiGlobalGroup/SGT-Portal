import React, { useState } from 'react';
import { Box, Typography, Paper, TextField, Button, Fade, GlobalStyles, Alert, Switch, FormControlLabel, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Stack, IconButton, Tooltip, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { WorkOutline, DeleteOutline } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { hasPermission, Permission } from '../utils/permissions';

interface PernoctaEntry { id: string; orderNumber: string; pernocta: boolean; festivo: boolean; nota: string; createdAt: string; eventDate: string; userName: string; }

export const Trips: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = !!user && hasPermission(user, Permission.MANAGE_TRIPS);
  const [orderNumber, setOrderNumber] = useState('');
  const [pernocta, setPernocta] = useState(false);
  const [festivo, setFestivo] = useState(false);
  const [nota, setNota] = useState('');
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().slice(0,10)); // YYYY-MM-DD
  const [entries, setEntries] = useState<PernoctaEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  const handleAdd = () => {
    if (!orderNumber.trim()) { setError('El número de Albarán / OC es obligatorio'); return; }
    if (!eventDate) { setError('La fecha del evento es obligatoria'); return; }
    const newEntry: PernoctaEntry = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, orderNumber: orderNumber.trim(), pernocta, festivo, nota: nota.trim(), createdAt: new Date().toISOString(), eventDate, userName: user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || '—' };
    setEntries(p => [newEntry, ...p]);
    setOrderNumber(''); setPernocta(false); setFestivo(false); setNota(''); setEventDate(new Date().toISOString().slice(0,10)); setError(null); setSuccess('Registro guardado'); setTimeout(() => setSuccess(null), 3000);
  };
  const handleClear = () => { setOrderNumber(''); setPernocta(false); setFestivo(false); setNota(''); setEventDate(new Date().toISOString().slice(0,10)); setError(null); };
  const handleDelete = (id: string) => setEntries(p => p.filter(e => e.id !== id));
  const handleChangeTab = (_: React.SyntheticEvent, v: number) => { if(v!==null) setTab(v); };

  return (<>
    <GlobalStyles styles={{ body: { paddingRight: '0px !important', overflow: 'auto !important', overflowX: 'hidden !important' } }} />
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Box sx={{ mb: 4 }}>
        <Fade in timeout={700}>
          <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 }, background: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 55%, #d4a574 100%)', color: 'white', borderRadius: 3, position: 'relative', overflow: 'hidden', '&::before': { content: '""', position: 'absolute', inset: 0, backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\\"60\\" height=\\"60\\" viewBox=\\"0 0 60 60\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cg fill=\\"none\\" fill-rule=\\"evenodd\\"%3E%3Cg fill=\\"%23ffffff\\" fill-opacity=\\"0.08\\"%3E%3Cpath d=\\"m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' } }}>
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.18)', borderRadius: 2, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <WorkOutline sx={{ fontSize: 32, color: '#ffffff' }} />
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Registro de Viajes (Pernocta / Festivo)</Typography>
                  <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400, fontSize: { xs: '1rem', sm: '1.1rem' } }}>Indica si una orden tuvo pernocta y/o fue en día festivo</Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Fade>
      </Box>
      {error && <Fade in timeout={300}><Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert></Fade>}
      {success && <Fade in timeout={300}><Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccess(null)}>{success}</Alert></Fade>}
      {/* Selector estilo Dietas */}
      <Box sx={{ mb:3, display:'flex', justifyContent:'flex-start' }}>
        <Box
          sx={{
            p:0.5,
            borderRadius:3,
            background:'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
            border:'2px solid #e0e0e0',
            boxShadow:'inset 0 1px 3px rgba(0,0,0,0.1)',
            display:'inline-block'
          }}
        >
          <ToggleButtonGroup
            value={tab}
            exclusive
            onChange={handleChangeTab}
            size="small"
            sx={{
              '& .MuiToggleButtonGroup-grouped': {
                border:'none',
                '&:not(:first-of-type)': { borderRadius:3, marginLeft:'4px' },
                '&:first-of-type': { borderRadius:3 }
              },
              '& .MuiToggleButton-root': {
                borderRadius:'20px !important',
                px:2.5, py:1,
                textTransform:'none',
                fontSize:'0.8rem', fontWeight:700,
                border:'none !important', minWidth:140,
                transition:'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position:'relative', overflow:'hidden',
                '&::before': { content:'""', position:'absolute', inset:0, background:'linear-gradient(135deg, rgba(80,27,54,0.1) 0%, rgba(80,27,54,0.05) 100%)', opacity:0, transition:'opacity 0.3s ease' },
                '&:hover::before': { opacity:1 },
                '&.Mui-selected': {
                  background:'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 70%, #501b36 100%)',
                  color:'white',
                  boxShadow:'0 4px 12px rgba(80,27,54,0.3), 0 2px 4px rgba(80,27,54,0.2)',
                  transform:'translateY(-1px)',
                  '&:hover': { background:'linear-gradient(135deg, #3d1429 0%, #5a1d3a 30%, #6b2545 70%, #3d1429 100%)', boxShadow:'0 6px 16px rgba(80,27,54,0.4), 0 2px 8px rgba(80,27,54,0.3)' },
                  '&::before': { opacity:0 }
                },
                '&:not(.Mui-selected)': {
                  color:'#501b36', backgroundColor:'rgba(255,255,255,0.8)', backdropFilter:'blur(10px)',
                  '&:hover': { backgroundColor:'rgba(255,255,255,0.95)', transform:'translateY(-0.5px)', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }
                }
              }
            }}
          >
            <ToggleButton value={0}>Nuevo Registro</ToggleButton>
            {isAdmin && <ToggleButton value={1}>{`Registros (${entries.length})`}</ToggleButton>}
          </ToggleButtonGroup>
        </Box>
      </Box>

      {tab === 0 && (
        <Fade in timeout={600}>
          <Paper elevation={0} sx={{ p:3, mb:3, borderRadius:2, border:'1px solid #e0e0e0', background:'#ffffff', width:'100%', maxWidth:900 }}>
            <Stack spacing={2} sx={{ width:'100%' }}>
              <TextField fullWidth label="Albarán / OC" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} required size="small" helperText={!orderNumber.trim() ? 'Obligatorio' : ' '} error={!orderNumber.trim() && !!orderNumber} />
              <TextField fullWidth label="Fecha pernocta / festivo" type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} size="small" InputLabelProps={{ shrink:true }} required />
              <Box sx={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                <FormControlLabel control={<Switch checked={pernocta} onChange={e => setPernocta(e.target.checked)} />} label="Pernocta" />
                <FormControlLabel control={<Switch checked={festivo} onChange={e => setFestivo(e.target.checked)} />} label="Festivo" />
              </Box>
              <TextField fullWidth label="Nota (opcional)" value={nota} onChange={e => setNota(e.target.value)} multiline minRows={2} size="small" inputProps={{ maxLength:300 }} helperText={`${nota.length}/300`} />
              <Box sx={{ display:'flex', flexWrap:'wrap', gap:2 }}>
                <Button variant="contained" onClick={handleAdd} disabled={!orderNumber.trim() || !eventDate} sx={{ fontWeight:600 }}>Guardar</Button>
                <Button variant="outlined" onClick={handleClear}>Limpiar</Button>
              </Box>
            </Stack>
          </Paper>
        </Fade>
      )}

      {isAdmin && tab === 1 && (
        <Fade in timeout={600}>
          <Paper elevation={0} sx={{ p:2, mb:3, borderRadius:2, border:'1px solid #e0e0e0', background:'#ffffff' }}>
            <TableContainer sx={{ border:'1px solid #e0e0e0', borderRadius:2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ background:'linear-gradient(180deg,#fafafa,#f0f0f0)', '& th': { fontWeight:600 } }}>
                    <TableCell>Conductor</TableCell>
                    <TableCell>Albarán / OC</TableCell>
                    <TableCell>Pernocta</TableCell>
                    <TableCell>Festivo</TableCell>
                    <TableCell>Fecha Evento</TableCell>
                    <TableCell>Fecha Registro</TableCell>
                    <TableCell>Nota</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py:6 }}>
                        <Typography variant="body2" sx={{ opacity:0.7 }}>Sin registros todavía</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {entries.map(e => (
                    <TableRow key={e.id} hover>
                      <TableCell sx={{ fontWeight:500 }}>{e.userName || '—'}</TableCell>
                      <TableCell sx={{ fontWeight:600 }}>{e.orderNumber}</TableCell>
                      <TableCell>{e.pernocta ? 'Sí' : 'No'}</TableCell>
                      <TableCell>{e.festivo ? 'Sí' : 'No'}</TableCell>
                      <TableCell>{new Date(e.eventDate + 'T00:00:00').toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'2-digit' })}</TableCell>
                      <TableCell>{new Date(e.createdAt).toLocaleString('es-ES', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })}</TableCell>
                      <TableCell>
                        <Tooltip title={e.nota || ''} disableInteractive placement="top-start">
                          <Typography variant="body2" sx={{ maxWidth:200, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.nota || '-'}</Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleDelete(e.id)}>
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Fade>
      )}
    </Box>
  </>);
};
