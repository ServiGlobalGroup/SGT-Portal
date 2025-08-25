import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Paper, Alert, TextField, Autocomplete, MenuItem, IconButton, Tooltip, Divider, Button, Table, TableHead, TableRow, TableCell, TableBody, Chip, Stack, Fade, GlobalStyles, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../hooks/useAuth';
import { hasPermission, Permission } from '../utils/permissions';
import { usersAPI } from '../services/api';
import type { User } from '../types';
import { calculateDietas, DIETA_RATES, DietaConceptInput, DietaCalculationResult, findKilometerRangeAntiguo } from '../config/dietas';
import { dietasAPI } from '../services/api';
import { Add, Delete, Calculate, RestaurantMenu, History, FiberNew } from '@mui/icons-material';

interface ConceptRow extends DietaConceptInput { tempId: string; }

export const Dietas: React.FC = () => {
  const { user } = useAuth();
  const canView = hasPermission(user, Permission.VIEW_DIETAS);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<User | null>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0,10));
  const [rows, setRows] = useState<ConceptRow[]>([]);
  const [kmsAntiguo, setKmsAntiguo] = useState<string>('');
  const [result, setResult] = useState<DietaCalculationResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [openExtraDialog, setOpenExtraDialog] = useState(false);
  const [extraName, setExtraName] = useState('');
  const [extraAmount, setExtraAmount] = useState('');
  const [extraMode, setExtraMode] = useState<'fijo'|'porcentaje'>('fijo');
  const [extraPercent, setExtraPercent] = useState('');
  const [extraPercentBase, setExtraPercentBase] = useState<'kmTramo'|'totalBase'>('kmTramo');

  const addExtraConcept = () => {
    const name = extraName.trim();
    if (!name) return;
    let code: string;
    if (extraMode === 'fijo') {
  const amountNum = Number(extraAmount.replace(',', '.'));
      if (isNaN(amountNum)) return;
      code = `extra:${name}:${amountNum}`;
    } else {
  const percentNum = Number(extraPercent.replace(',', '.'));
      if (isNaN(percentNum)) return;
      code = `extraPct:${name}:${percentNum}:${extraPercentBase}`;
    }
    setRows(prev => [...prev, { tempId: crypto.randomUUID(), code, quantity: 1 }]);
    setOpenExtraDialog(false);
    setExtraName('');
    setExtraAmount('');
    setExtraPercent('');
    setResult(null);
  };

  // Cargar conductores (TRABAJADOR + quizá TRAFICO si aplica, se asume TRABAJADOR)
  useEffect(() => {
    if (!canView) return;
    setLoadingDrivers(true);
  // Backend limita per_page <= 100. Antes: 500 causaba 422 Unprocessable Content.
    usersAPI.getUsers({ per_page: 100, role: 'TRABAJADOR', active_only: true })
      .then(data => {
        // El backend devuelve un objeto { users: [...], total, ... }
        const list = Array.isArray(data)
          ? data
          : Array.isArray((data as any).users)
            ? (data as any).users
            : Array.isArray((data as any).items)
              ? (data as any).items
              : [];
        setDrivers(list as User[]);
      })
      .catch(() => {})
      .finally(() => setLoadingDrivers(false));
  }, [canView]);

  const driverType = useMemo<'nuevo'|'antiguo'>(() => (selectedDriver?.worker_type === 'nuevo' ? 'nuevo' : 'antiguo'), [selectedDriver]);

  const availableRates = useMemo(() => DIETA_RATES.filter(r => (!r.onlyFor || r.onlyFor === driverType)), [driverType]);

  // Si cambia a 'nuevo', eliminar filas no permitidas (recargos, tramos etc.)
  useEffect(() => {
    if (driverType === 'nuevo') {
      setRows(prev => prev.filter(r => {
        if (r.code.startsWith('extra')) return true; // extras siempre
        const rate = DIETA_RATES.find(x => x.code === r.code);
        return rate && (!rate.onlyFor || rate.onlyFor === 'nuevo');
      }));
      setKmsAntiguo('');
    }
  }, [driverType]);

  const kmTramoAmount = useMemo(() => {
    if (driverType !== 'antiguo') return 0;
    const kms = Number(kmsAntiguo);
    if (isNaN(kms) || kms < 0) return 0;
    const tramo = findKilometerRangeAntiguo(kms);
    return tramo?.amount || 0;
  }, [driverType, kmsAntiguo]);

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
        kmsAntiguo: driverType === 'antiguo' && kmsAntiguo ? Number(kmsAntiguo) : undefined,
      };
      const calc = calculateDietas(input);
      setResult(calc);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!result || !selectedDriver) return;
    setSaving(true); setSaveMessage(null);
    try {
      await dietasAPI.createRecord({
        user_id: selectedDriver.id,
        worker_type: driverType,
        order_number: orderNumber || undefined,
        month,
        total_amount: result.total,
        concepts: result.concepts.map(c => ({ code: c.code, label: c.label, quantity: c.quantity, rate: c.rate, subtotal: c.subtotal })),
      });
      setSaveMessage('Guardado correctamente');
    } catch (e:any) {
      setSaveMessage('Error al guardar');
    } finally {
      setSaving(false);
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
          <Box flex={1} minWidth={{ xs: '100%', md: '420px' }}>
            <Autocomplete
              loading={loadingDrivers}
              options={drivers}
              forcePopupIcon={false}
              disableClearable
              ListboxProps={{ style:{ maxHeight: 300 }}}
              getOptionLabel={(o) => (o?.full_name || `${o?.first_name || ''} ${o?.last_name || ''}` || o?.dni_nie || '').trim()}
              noOptionsText={loadingDrivers ? 'Cargando...' : 'Sin resultados'}
              value={selectedDriver}
              onChange={(_, val) => { setSelectedDriver(val); setRows([]); setResult(null); }}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderOption={(props, option) => {
                const wType = option.worker_type === 'nuevo' ? 'nuevo' : 'antiguo';
                return (
                  <Box component="li" {...props} key={option.id} sx={{ display:'flex', alignItems:'center', gap:1.5, py:0.8 }}>
                    <Box sx={{ flexGrow:1, minWidth:0 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight:600 }}>{option.full_name || `${option.first_name} ${option.last_name}`}</Typography>
                      {option.hire_date && <Typography variant="caption" color="text.secondary">Alta: {option.hire_date}</Typography>}
                    </Box>
                    <Chip size="small" variant="outlined" color={wType==='nuevo'?'warning':'success'} label={wType==='nuevo'?'NUEVO':'ANTIGUO'} sx={{ fontSize:11, fontWeight:600 }} />
                  </Box>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Conductor"
                  size="small"
                  placeholder={loadingDrivers? 'Cargando...' : 'Buscar...'}
                  InputProps={{ ...params.InputProps, sx:{ borderRadius:2, pr:1 } }}
                />
              )}
            />
            {selectedDriver && (
              <Box mt={1} display="flex" alignItems="center" gap={1}>
                <Chip
                  size="small"
                  variant="outlined"
                  color={driverType==='nuevo'?'warning':'success'}
                  icon={driverType==='nuevo'? <FiberNew sx={{fontSize:16}} /> : <History sx={{fontSize:16}} />} 
                  label={driverType==='nuevo' ? 'NUEVO' : 'ANTIGUO'}
                  sx={{ fontWeight:600, letterSpacing:0.5 }}
                />
                {selectedDriver.hire_date && <Typography variant="caption" color="text.secondary">Alta: {selectedDriver.hire_date}</Typography>}
              </Box>
            )}
          </Box>
          <Box minWidth={{ xs: '100%', sm: '200px' }} flexGrow={0} flexBasis={{ xs: '100%', sm: '200px' }}>
            <TextField required label="OC / Albarán" value={orderNumber} onChange={e=>setOrderNumber(e.target.value)} fullWidth size="small" error={!orderNumber.trim()} helperText={!orderNumber.trim()?'Obligatorio':''} />
          </Box>
          <Box minWidth={{ xs: '100%', sm: '200px' }} flexGrow={0} flexBasis={{ xs: '100%', sm: '200px' }}>
            <TextField label="Fecha" type="date" value={month} onChange={e=>setMonth(e.target.value)} fullWidth size="small" />
          </Box>
          {selectedDriver && driverType==='antiguo' && (
            <Box minWidth={{ xs: '100%', sm: '160px' }} flexGrow={0} flexBasis={{ xs: '100%', sm: '160px' }}>
              <TextField label="Kms" type="number" size="small" value={kmsAntiguo} onChange={e=>{setKmsAntiguo(e.target.value); setResult(null);}} inputProps={{min:0}} fullWidth />
              {kmsAntiguo && kmTramoAmount > 0 && (
                <Typography variant="caption" sx={{ mt:0.5, display:'block', fontWeight:600, color:'success.main', textAlign:'center' }}>+{kmTramoAmount.toFixed(2)}€</Typography>
              )}
            </Box>
          )}
        </Box>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Conceptos</Typography>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="text.secondary">Selecciona y ajusta las cantidades.</Typography>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" size="small" startIcon={<Add />} disabled={!selectedDriver} onClick={handleAddRow}>Añadir</Button>
                <Button variant="outlined" size="small" disabled={!selectedDriver} onClick={()=>setOpenExtraDialog(true)}>Extra</Button>
              </Stack>
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
                  let displayRate = 0;
                  if (r.code.startsWith('extra:')) {
                    // extra fijo código: extra:Nombre:importe
                    const amt = Number(r.code.split(':')[2] || '0');
                    displayRate = isNaN(amt) ? 0 : amt;
                  } else if (r.code.startsWith('extraPct:')) {
                    const parts = r.code.split(':');
                    const rawPct = Number((parts[2] || '0').replace(',', '.'));
                    const pct = isNaN(rawPct) ? 0 : (rawPct > 1 ? rawPct/100 : rawPct);
                    const baseKey = parts[3] || 'kmTramo';
                    // Base total similar al cálculo final (sin incluir extras porcentuales)
                    const recargosPct = availableRates.filter(ar => ar.percentKmTramo).reduce((acc, rr)=> acc + (kmTramoAmount * (rr.percentKmTramo||0)),0);
                    const fixedManual = rows.filter(x => !x.code.startsWith('extraPct:') && !x.code.startsWith('extra:'))
                      .reduce((acc, x) => {
                        const rr = availableRates.find(ar => ar.code === x.code);
                        if (!rr) return acc;
                        if (rr.percentKmTramo) return acc + (kmTramoAmount * (rr.percentKmTramo||0)) * (x.quantity||0); // unlikely user changes quantity of recargo, pero por coherencia
                        return acc + (rr.amount || 0) * (x.quantity||0);
                      },0);
                    const baseTotal = kmTramoAmount + recargosPct + fixedManual;
                    const baseVal = baseKey === 'totalBase' ? baseTotal : kmTramoAmount;
                    displayRate = +(baseVal * pct).toFixed(2);
                  } else if (rate) {
                    displayRate = rate.amount || 0;
                    if (rate.percentKmTramo) displayRate = kmTramoAmount * (rate.percentKmTramo||0);
                  }
                  const subtotal = (r.quantity || 0) * displayRate;
                  return (
                    <TableRow key={r.tempId}>
                      <TableCell>
                        {r.code.startsWith('extra:') || r.code.startsWith('extraPct:') ? (
                          <TextField value={r.code.split(':')[1]} size="small" disabled fullWidth />
                        ) : (
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
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <TextField type="number" size="small" value={r.quantity} inputProps={{min:0, step:0.5}} onChange={e=>handleChangeRow(r.tempId,{quantity:Number(e.target.value)})} />
                      </TableCell>
                      <TableCell align="right">
                        {displayRate.toFixed(2)}€
                      </TableCell>
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
              <Button variant="contained" startIcon={<Calculate />} disabled={!selectedDriver || rows.length===0 || !orderNumber.trim()} onClick={handleCalculate}>Calcular</Button>
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
              <Box mt={3} display="flex" justifyContent="space-between" alignItems="center">
                {saveMessage && <Typography variant="body2" color={saveMessage.startsWith('Error')? 'error':'success.main'}>{saveMessage}</Typography>}
                <Button variant="outlined" disabled={saving || !orderNumber.trim()} onClick={handleSave}>{saving? 'Guardando...' : 'Guardar'}</Button>
              </Box>
            </Paper>
          </Fade>
        )}
      </Box>
      <Dialog open={openExtraDialog} onClose={()=>setOpenExtraDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Añadir Extra</DialogTitle>
        <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, mt:1, pt:3 }}>
          <TextField label="Nombre" value={extraName} onChange={e=>setExtraName(e.target.value)} autoFocus size="small" sx={{ mt:0.5 }} />
          <TextField select label="Tipo" value={extraMode} onChange={e=>setExtraMode(e.target.value as any)} size="small">
            <MenuItem value="fijo">Importe fijo</MenuItem>
            <MenuItem value="porcentaje">Porcentaje</MenuItem>
          </TextField>
          {extraMode==='fijo' && (
            <TextField label="Importe (€)" type="number" value={extraAmount} onChange={e=>setExtraAmount(e.target.value)} size="small" />
          )}
          {extraMode==='porcentaje' && (
            <Stack direction="row" spacing={1}>
              <TextField label="%" type="number" value={extraPercent} onChange={e=>setExtraPercent(e.target.value)} size="small" sx={{flex:1}} />
              <TextField select label="Base" value={extraPercentBase} onChange={e=>setExtraPercentBase(e.target.value as any)} size="small" sx={{flex:1}}>
                <MenuItem value="kmTramo">Tramo Kms</MenuItem>
                <MenuItem value="totalBase">Total Base</MenuItem>
              </TextField>
            </Stack>
          )}
          <Typography variant="caption" color="text.secondary">El total base excluye otros extras porcentuales.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpenExtraDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={addExtraConcept} disabled={!extraName.trim() || (extraMode==='fijo' ? !extraAmount : !extraPercent)}>Añadir</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Dietas;
