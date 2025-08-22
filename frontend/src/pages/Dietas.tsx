import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Paper, Alert, TextField, Autocomplete, MenuItem, IconButton, Tooltip, Divider, Button, Table, TableHead, TableRow, TableCell, TableBody, Chip, Stack, Fade, GlobalStyles } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { hasPermission, Permission } from '../utils/permissions';
import { usersAPI } from '../services/api';
import type { User } from '../types';
import { calculateDietas, classifyDriverByHireDate, DIETA_RATES, DietaConceptInput, DietaCalculationResult } from '../config/dietas';
import { Add, Delete, Calculate, RestaurantMenu } from '@mui/icons-material';

interface ConceptRow extends DietaConceptInput { tempId: string; }

export const Dietas: React.FC = () => {
  const { user } = useAuth();
  const canView = hasPermission(user, Permission.VIEW_DIETAS);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<User | null>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0,7));
  const [rows, setRows] = useState<ConceptRow[]>([]);
  const [result, setResult] = useState<DietaCalculationResult | null>(null);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  // Cargar conductores (TRABAJADOR + quizá TRAFICO si aplica, se asume TRABAJADOR)
  useEffect(() => {
    if (!canView) return;
    setLoadingDrivers(true);
    usersAPI.getUsers({ per_page: 500, role: 'TRABAJADOR', active_only: true })
      .then(data => setDrivers(data?.items || data)) // backend puede devolver items o lista
      .catch(() => {})
      .finally(() => setLoadingDrivers(false));
  }, [canView]);

  const driverType = useMemo(() => classifyDriverByHireDate(selectedDriver?.hire_date), [selectedDriver]);

  const availableRates = useMemo(() => DIETA_RATES.filter(r => !r.onlyFor || r.onlyFor === driverType), [driverType]);

  const handleAddRow = () => {
    setRows(prev => [...prev, { tempId: crypto.randomUUID(), code: availableRates[0]?.code || '', quantity: 1 }]);
  };

  const handleChangeRow = (tempId: string, patch: Partial<ConceptRow>) => {
    setRows(prev => prev.map(r => r.tempId === tempId ? { ...r, ...patch } : r));
  };

  const handleRemoveRow = (tempId: string) => {
    setRows(prev => prev.filter(r => r.tempId !== tempId));
  };

  const handleCalculate = () => {
    try {
      if (!selectedDriver) return;
      const input = {
        driverId: selectedDriver.id,
        driverName: selectedDriver.full_name,
        driverType,
        orderNumber,
        month,
        concepts: rows.map(r => ({ code: r.code, quantity: r.quantity })),
      };
      const calc = calculateDietas(input);
      setResult(calc);
    } catch (e) {
      console.error(e);
    }
  };

  if (!canView) {
    return (
      <Box p={3}>
        <Alert severity="error">No tienes permisos para ver esta página.</Alert>
      </Box>
    );
  }

  return (
    <>
      <GlobalStyles
        styles={{
          body: { paddingRight: '0px !important', overflow: 'auto !important' },
          '.MuiTableContainer-root': { overflowX: 'hidden !important' },
        }}
      />
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', bgcolor: '#f5f5f5', minHeight: '100vh' }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Fade in timeout={700}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, sm: 4 },
                background: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 55%, #d4a574 100%)',
                color: 'white',
                borderRadius: 3,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\\"60\\" height=\\"60\\" viewBox=\\"0 0 60 60\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cg fill=\\"none\\" fill-rule=\\"evenodd\\"%3E%3Cg fill=\\"%23ffffff\\" fill-opacity=\\"0.08\\"%3E%3Cpath d=\\"m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                },
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display:'flex', alignItems:'center', gap:2 }}>
                  <Box
                    sx={{
                      p:2,
                      bgcolor:'rgba(255,255,255,0.18)',
                      borderRadius:2,
                      backdropFilter:'blur(8px)',
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center'
                    }}
                  >
                    <RestaurantMenu sx={{ fontSize:32, color:'#ffffff' }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Cálculo de Dietas
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400, fontSize: { xs: '1rem', sm: '1.1rem' } }}>
                      Gestiona y calcula los suplementos diarios de los conductores
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Fade>
        </Box>

        {/* Formulario principal */}
        <Fade in timeout={800}>
          <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3, border: '1px solid #e0e0e0', position: 'relative' }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Datos Generales</Typography>
            <Box display="flex" flexWrap="wrap" gap={2}>
          <Box flex={1} minWidth={{ xs: '100%', md: '380px' }}>
            <Autocomplete
              loading={loadingDrivers}
              options={drivers}
              getOptionLabel={(o) => o.full_name || `${o.first_name} ${o.last_name}`}
              value={selectedDriver}
              onChange={(_, val) => { setSelectedDriver(val); setRows([]); setResult(null); }}
              renderInput={(params) => <TextField {...params} label="Conductor" size="small" />} 
            />
            {selectedDriver && (
              <Stack direction="row" spacing={1} mt={1}>
                <Chip label={`Tipo: ${driverType}`} color={driverType==='nuevo' ? 'warning' : 'success'} size="small" />
                {selectedDriver.hire_date && <Chip label={`Alta: ${selectedDriver.hire_date}`} size="small" />}
              </Stack>
            )}
          </Box>
          <Box minWidth={{ xs: '100%', sm: '200px' }} flexGrow={0} flexBasis={{ xs: '100%', sm: '200px' }}>
            <TextField label="OC / Albarán" value={orderNumber} onChange={e=>setOrderNumber(e.target.value)} fullWidth size="small" />
          </Box>
          <Box minWidth={{ xs: '100%', sm: '200px' }} flexGrow={0} flexBasis={{ xs: '100%', sm: '200px' }}>
            <TextField label="Mes" type="month" value={month} onChange={e=>setMonth(e.target.value)} fullWidth size="small" />
          </Box>
        </Box>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Conceptos</Typography>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="text.secondary">Selecciona y ajusta las cantidades.</Typography>
              <Button variant="outlined" size="small" startIcon={<Add />} disabled={!selectedDriver} onClick={handleAddRow}>Añadir</Button>
            </Stack>
            {rows.length === 0 && (
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderStyle: 'dashed', bgcolor: '#fafafa' }}>
                <Typography variant="body2" color="text.secondary">Añade conceptos para comenzar el cálculo.</Typography>
              </Paper>
            )}
            {rows.length > 0 && (
              <Table size="small" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <TableHead>
                <TableRow>
                  <TableCell style={{width:230}}>Concepto</TableCell>
                  <TableCell align="right">Cant.</TableCell>
                  <TableCell align="right">Importe</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(r => {
                  const rate = availableRates.find(ar => ar.code === r.code);
                  const subtotal = (r.quantity || 0) * (rate?.amount || 0);
                  return (
                    <TableRow key={r.tempId}>
                      <TableCell>
                        <TextField
                          select
                          value={r.code}
                          size="small"
                          onChange={e=>handleChangeRow(r.tempId,{code:e.target.value})}
                          fullWidth
                        >
                          {availableRates.map(rt => (
                            <MenuItem key={rt.code} value={rt.code}>{rt.label}</MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell align="right">
                        <TextField type="number" size="small" value={r.quantity} inputProps={{min:0}} onChange={e=>handleChangeRow(r.tempId,{quantity:Number(e.target.value)})} />
                      </TableCell>
                      <TableCell align="right">{rate?.amount.toFixed(2)}€</TableCell>
                      <TableCell align="right">{subtotal.toFixed(2)}€</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Eliminar">
                          <IconButton size="small" onClick={()=>handleRemoveRow(r.tempId)}><Delete fontSize="small" /></IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
            <Box mt={3} textAlign="right">
              <Button variant="contained" startIcon={<Calculate />} disabled={!selectedDriver || rows.length===0} onClick={handleCalculate}>Calcular</Button>
            </Box>
          </Paper>
        </Fade>

        {result && (
          <Fade in timeout={600}>
            <Paper sx={{ p: { xs:2, sm:3 }, borderRadius: 3, border: '1px solid #e0e0e0' }}>
              <Typography variant="h6" sx={{ fontWeight:600, mb:2 }}>Resumen del Cálculo</Typography>
              <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Concepto</TableCell>
                <TableCell align="right">Cant.</TableCell>
                <TableCell align="right">Importe</TableCell>
                <TableCell align="right">Subtotal</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {result.concepts.map(c => (
                <TableRow key={c.code}>
                  <TableCell>{c.label}</TableCell>
                  <TableCell align="right">{c.quantity}</TableCell>
                  <TableCell align="right">{c.rate.toFixed(2)}€</TableCell>
                  <TableCell align="right">{c.subtotal.toFixed(2)}€</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} align="right" style={{fontWeight:600}}>TOTAL</TableCell>
                <TableCell align="right" style={{fontWeight:600}}>{result.total.toFixed(2)}€</TableCell>
              </TableRow>
            </TableBody>
          </Table>
              <Box mt={3} textAlign="right">
                <Button variant="outlined">Guardar (Pendiente backend)</Button>
              </Box>
            </Paper>
          </Fade>
        )}
      </Box>
    </>
  );
};

export default Dietas;
