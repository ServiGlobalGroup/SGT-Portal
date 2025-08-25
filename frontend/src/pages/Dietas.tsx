import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, Paper, Alert, TextField, Autocomplete, MenuItem, IconButton, Tooltip, Divider, Button, Table, TableHead, TableRow, TableCell, TableBody, Chip, Stack, Fade, GlobalStyles, Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab, Snackbar, Alert as MuiAlert } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { hasPermission, Permission } from '../utils/permissions';
import { usersAPI } from '../services/api';
import type { User } from '../types';
import { calculateDietas, DIETA_RATES, DietaConceptInput, DietaCalculationResult, findKilometerRangeAntiguo } from '../config/dietas';
import { dietasAPI } from '../services/api';
import { Add, Delete, Calculate, RestaurantMenu, History, FiberNew, Close, ArrowUpward, ArrowDownward, PictureAsPdf, Download } from '@mui/icons-material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ConceptRow extends DietaConceptInput { tempId: string; }

interface DietaRecordRow {
  id: number;
  user_id: number;
  worker_type: string;
  order_number?: string;
  month: string;
  total_amount: number;
  concepts: { code: string; label: string; quantity: number; rate: number; subtotal: number }[];
  created_at: string;
  user_name?: string;
}

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
  const [showSuccess, setShowSuccess] = useState(false);
  const [flashSaved, setFlashSaved] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [openExtraDialog, setOpenExtraDialog] = useState(false);
  const [extraName, setExtraName] = useState('');
  const [extraAmount, setExtraAmount] = useState('');
  const [extraMode, setExtraMode] = useState<'fijo'|'porcentaje'>('fijo');
  const [extraPercent, setExtraPercent] = useState('');
  const [extraPercentBase, setExtraPercentBase] = useState<'kmTramo'|'totalBase'>('kmTramo');

  // Tab state
  const [tab, setTab] = useState(0);

  // Listado registros
  const [records, setRecords] = useState<DietaRecordRow[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [filterUser, setFilterUser] = useState<User | null>(null);
  const [filterWorkerType, setFilterWorkerType] = useState<string>('');
  const [filterOrder, setFilterOrder] = useState('');
  const [filterStart, setFilterStart] = useState<string>('');
  const [filterEnd, setFilterEnd] = useState<string>('');
  const [recordDetail, setRecordDetail] = useState<DietaRecordRow | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  // Columnas dinámicas para registros
  type RecordColumn = { key: string; label: string; width?: number; align?: 'left'|'right'|'center' };
  const [recordColumns, setRecordColumns] = useState<RecordColumn[]>([
    { key: 'index', label: '#', width: 50 },
    { key: 'month', label: 'Fecha', width: 110 },
    { key: 'user_name', label: 'Conductor', width: 190 },
    { key: 'worker_type', label: 'Tipo', width: 90 },
    { key: 'order_number', label: 'OC / Albarán', width: 130 },
    { key: 'created_at', label: 'Creado', width: 170 },
    { key: 'total_amount', label: 'Total (€)', width: 110, align: 'right' },
    // "concepts" será flexible para ocupar espacio restante
    { key: 'concepts', label: 'Conceptos' },
  ]);
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc'|'desc'|''>('');
  const [resizingKey, setResizingKey] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const RECORD_GRID_HEIGHT = 560; // altura fija deseada para el grid de registros
  const recordsBodyRef = useRef<HTMLDivElement | null>(null);
  const exportingRef = useRef(false);
  // Handlers redimensionar columnas
  const beginResize = (e: React.MouseEvent, key: string, currentWidth?: number) => {
    e.preventDefault(); e.stopPropagation();
    if(!currentWidth) return; // sólo con width fijo
    setResizingKey(key);
    setResizeStartX(e.clientX);
    setResizeStartWidth(currentWidth);
  };

  useEffect(() => {
    if(!resizingKey) return;
    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      const delta = e.clientX - resizeStartX;
      setRecordColumns(prev => prev.map(c => c.key===resizingKey ? { ...c, width: Math.max(50, Math.min(900, (resizeStartWidth||0)+delta)) } : c));
    };
    const onUp = () => { setResizingKey(null); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp, { once:true });
    return () => { window.removeEventListener('mousemove', onMove); };
  }, [resizingKey, resizeStartX, resizeStartWidth]);


  const autoSizeColumnPrecise = (key: string) => {
    // Solo autoajustar columnas con width explícito (no la flexible concepts)
    const target = recordColumns.find(c => c.key===key);
    if(!target) return;
    requestAnimationFrame(() => {
      const headerSpan = document.querySelector(`[data-col-header-inner="${key}"]`) as HTMLElement | null;
      const cellSpans = Array.from(document.querySelectorAll(`[data-col-cell-inner="${key}"]`)) as HTMLElement[];
      if(!headerSpan && cellSpans.length===0) return;
      let max = headerSpan ? headerSpan.scrollWidth : 0;
      cellSpans.forEach(el => { const w = el.scrollWidth; if(w>max) max = w; });
      // Añadir padding horizontal de la celda + margen iconos sort/resize
      const padding = 16 /* izquierda */ + 16 /* derecha */ + 8 /* icono sort espacio */;
      const finalWidth = Math.min(900, Math.max(55, max + padding));
      setRecordColumns(prev => prev.map(c => c.key===key ? { ...c, width: finalWidth } : c));
    });
  };
  const formatDate = (iso:string) => {
    if(!iso) return '';
    const d = new Date(iso);
    if(isNaN(d.getTime())) return iso;
    return d.toLocaleDateString();
  };
  const formatDateTime = (iso:string) => {
    if(!iso) return '';
    const d = new Date(iso);
    if(isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };

  const buildExportRows = () => {
    // Usar orden y columnas visibles actuales excepto 'concepts' que se representa resumido
    return records.map((r, idx) => {
      const resumenConceptos = r.concepts.map(c=>`${c.label||c.code} x${c.quantity} = ${c.subtotal.toFixed(2)}`).join('; ');
      return {
        '#': idx + 1,
        Fecha: formatDate(r.month),
        Conductor: r.user_name || r.user_id,
        Tipo: r.worker_type,
        'OC / Albarán': r.order_number || '',
        Creado: formatDateTime(r.created_at),
        'Total (€)': r.total_amount.toFixed(2),
        Conceptos: resumenConceptos
      };
    });
  };

  const exportExcel = () => {
    // Generar CSV seguro (UTF-8 con BOM) para abrir en Excel
    if(exportingRef.current) return; exportingRef.current = true;
    try {
      const rows = buildExportRows();
      const headers = ['#','Fecha','Conductor','Tipo','OC / Albarán','Creado','Total (€)','Conceptos'];
      const escape = (val: any) => {
        const s = String(val ?? '');
        if(/[";,\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
        return s;
      };
      const csv = [headers.join(';'), ...rows.map(r => headers.map(h=> escape((r as any)[h])).join(';'))].join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const fecha = new Date().toISOString().slice(0,10);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `dietas_${fecha}.csv`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      setTimeout(()=> URL.revokeObjectURL(link.href), 2000);
    } finally { exportingRef.current = false; }
  };

  const exportPDF = () => {
    if(exportingRef.current) return; exportingRef.current = true;
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      const rows = buildExportRows();
      const head = [['#','Fecha','Conductor','Tipo','OC / Albarán','Creado','Total (€)','Conceptos']];
      const body = rows.map(r => [r['#'], r['Fecha'], r['Conductor'], r['Tipo'], r['OC / Albarán'], r['Creado'], r['Total (€)'], r['Conceptos']]);
      autoTable(doc, { head, body, styles:{ fontSize:8, cellPadding:2 }, headStyles:{ fillColor:[33,150,243] }, bodyStyles:{ valign:'top' }, columnStyles:{7:{ cellWidth:120 }} });
      const fecha = new Date().toLocaleString();
      doc.save(`dietas_${fecha.replace(/[:/]/g,'-')}.pdf`);
    } finally { exportingRef.current = false; }
  };

  const loadRecords = () => {
    setRecordsLoading(true);
    const params: any = {};
    if (filterUser) params.user_id = filterUser.id;
    if (filterWorkerType) params.worker_type = filterWorkerType;
    if (filterOrder.trim()) params.order_number = filterOrder.trim();
    if (filterStart) params.start_date = filterStart; // backend usa start_date/end_date
    if (filterEnd) params.end_date = filterEnd;
    dietasAPI.list(params)
      .then((data: any) => setRecords(Array.isArray(data) ? data as DietaRecordRow[] : []))
      .catch(()=>{})
      .finally(()=>setRecordsLoading(false));
  };

  // Auto cargar registros al cambiar filtros (debounce 400ms) cuando estamos en la pestaña de registros
  useEffect(() => {
    if (tab !== 1) return; // sólo pestaña registros
    const handle = setTimeout(() => { loadRecords(); }, 400);
    return () => clearTimeout(handle);
  }, [tab, filterUser, filterWorkerType, filterOrder, filterStart, filterEnd]);

  useEffect(() => { if (tab === 1) loadRecords(); /* cargar al entrar */ }, [tab]);

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
      setShowSuccess(true);
      setFlashSaved(true);
      // Tras breve pausa permitir feedback visual y luego resetear para nuevo registro
      setTimeout(() => {
        // Limpiar también el conductor (pedido del usuario)
        setSelectedDriver(null);
        setRows([]);
        setResult(null);
        setOrderNumber('');
        setKmsAntiguo('');
        setMonth(new Date().toISOString().slice(0,10));
        setOpenExtraDialog(false);
        setExtraName('');
        setExtraAmount('');
        setExtraPercent('');
        setExtraPercentBase('kmTramo');
        setSaveMessage(null);
        setFlashSaved(false);
      }, 1200);
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

        {/* Tabs */}
        <Paper sx={{ mb:3, borderRadius:3, bgcolor:'transparent', boxShadow:'none' }}>
          <Tabs value={tab} onChange={(_,v)=>{setTab(v);}} variant="scrollable" scrollButtons allowScrollButtonsMobile>
            <Tab label="Cálculo" />
            <Tab label="Registros" />
          </Tabs>
        </Paper>

        {tab === 0 && (
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
              value={selectedDriver || undefined}
              onChange={(_, val) => { setSelectedDriver(val); setRows([]); setResult(null); }}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderOption={(props, option) => {
                const anyOpt: any = option as any;
                const wType = anyOpt.worker_type === 'nuevo' ? 'nuevo' : 'antiguo';
                return (
                  <Box component="li" {...props} key={anyOpt.id} sx={{ display:'flex', alignItems:'center', gap:1.5, py:0.8 }}>
                    <Box sx={{ flexGrow:1, minWidth:0 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight:600 }}>{anyOpt.full_name || `${anyOpt.first_name} ${anyOpt.last_name}`}</Typography>
                      {anyOpt.hire_date && <Typography variant="caption" color="text.secondary">Alta: {anyOpt.hire_date}</Typography>}
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
        )}

        {tab === 1 && (
          <Fade in timeout={600}>
            <Paper sx={{ p:{ xs:2.5, sm:3}, borderRadius:3, border:'1px solid #e0e0e0', background:'linear-gradient(180deg,#ffffff,#fafafa)' }}>
              <Box display="flex" flexWrap="wrap" gap={2} mb={2.5} alignItems="flex-end">
                <Box minWidth={{ xs:'100%', md:300 }} flex={1}>
                  <Autocomplete
                    options={drivers}
                    size="small"
                    value={filterUser}
                    onChange={(_,v)=>setFilterUser(v)}
                    getOptionLabel={(o)=> (o?.full_name || `${o?.first_name||''} ${o?.last_name||''}`).trim()}
                    renderInput={(p)=><TextField {...p} label="Conductor" placeholder="Todos" />}
                  />
                </Box>
                <TextField select size="small" label="Tipo" value={filterWorkerType} onChange={e=>setFilterWorkerType(e.target.value)} sx={{ width:140 }}>
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="antiguo">Antiguo</MenuItem>
                  <MenuItem value="nuevo">Nuevo</MenuItem>
                </TextField>
                <TextField size="small" label="OC / Albarán" value={filterOrder} onChange={e=>setFilterOrder(e.target.value)} sx={{ width:160 }} />
                <TextField size="small" type="date" label="Desde" InputLabelProps={{ shrink:true }} value={filterStart} onChange={e=>setFilterStart(e.target.value)} />
                <TextField size="small" type="date" label="Hasta" InputLabelProps={{ shrink:true }} value={filterEnd} onChange={e=>setFilterEnd(e.target.value)} />
                <Button variant="outlined" size="small" onClick={()=>{setFilterUser(null);setFilterWorkerType('');setFilterOrder('');setFilterStart('');setFilterEnd(''); loadRecords();}}>Limpiar</Button>
              </Box>
              {/* Contenedor tabla personalizado */}
              <Box sx={{
                position:'relative',
                borderRadius:'20px',
                border:'1px solid #d2d6da',
                overflow:'hidden',
                boxShadow:'0 3px 10px rgba(0,0,0,0.06)',
                background:'#fff',
                '&::before':{
                  content:'""',
                  position:'absolute',
                  inset:0,
                  pointerEvents:'none',
                  background:'linear-gradient(180deg,rgba(92,35,64,0.06),rgba(255,255,255,0) 60%)'
                }
              }}>
                {/* Leyenda (cabecera unificada con resize) */}
                <Box sx={{
                  display:'flex',
                  alignItems:'stretch',
                  flexWrap:'nowrap',
                  overflow:'hidden',
                  background:'linear-gradient(90deg,#eceff3,#e3e6ea)',
                  borderBottom:'1px solid #c8ccd0',
                  borderRadius:'20px 20px 0 0'
                }}>
                  {recordColumns.map((col, idx) => {
                    const sorted = sortKey === col.key && sortDir !== '';
                    const isFlexible = !col.width; // concepts
                    return (
                      <Box key={col.key}
                        draggable
                        onDragStart={e=>{ e.dataTransfer.setData('text/colKey', col.key); }}
                        onDragOver={e=>{ e.preventDefault(); }}
                        onDrop={e=>{
                          e.preventDefault();
                          const key = e.dataTransfer.getData('text/colKey');
                          if(!key || key===col.key) return;
                          setRecordColumns(prev => {
                            const from = prev.findIndex(c=>c.key===key);
                            const to = idx;
                            if(from===-1) return prev;
                            const copy = [...prev];
                            const [moved] = copy.splice(from,1);
                            copy.splice(to,0,moved);
                            return copy;
                          });
                        }}
                        onClick={(e)=>{
                          // evitar interferir si se hace click en el handle
                          if((e.target as HTMLElement).dataset?.resize) return;
                          setSortKey(col.key === sortKey && sortDir==='' ? '' : col.key);
                          setSortDir(prev => {
                            if(col.key !== sortKey) return 'asc';
                            if(prev==='asc') return 'desc';
                            if(prev==='desc') return '';
                            return 'asc';
                          });
                        }}
                        onDoubleClick={()=> autoSizeColumnPrecise(col.key)}
                        sx={{
                          position:'relative',
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'center',
                          gap:0.5,
                          px:1.1, py:0.6,
                          fontSize:12.5,
                          fontWeight:600,
                          letterSpacing:0.15,
                          userSelect:'none',
                          cursor:'grab',
                          color: sorted ? '#fff' : '#2d3135',
                          background: sorted ? 'linear-gradient(90deg,#5c2340,#7d3456)' : 'transparent',
                          borderRight: idx < recordColumns.length-1 ? '1px solid #d0d4d8' : 'none',
                          flex: isFlexible ? '1 1 auto' : `0 0 ${col.width}px`,
                          minWidth: isFlexible ? 120 : col.width,
                          transition:'background .25s, color .25s',
                          '&:hover':{ background: sorted? 'linear-gradient(90deg,#5c2340,#7d3456)' : 'rgba(255,255,255,0.35)' }
                        }}
                        data-col-header={col.key}
                      >
                        <span data-col-header-inner={col.key} style={{ display:'block', width:'100%', textAlign:'center', whiteSpace:'nowrap', pointerEvents:'none' }}>{col.label}</span>
                        {sortKey===col.key && sortDir==='asc' && <ArrowUpward sx={{ fontSize:14, position:'absolute', right: col.width ? 8 : 8 }} />}
                        {sortKey===col.key && sortDir==='desc' && <ArrowDownward sx={{ fontSize:14, position:'absolute', right: col.width ? 8 : 8 }} />}
            {col.width && (
                          <Box
                            data-resize
              onMouseDown={(e)=> beginResize(e, col.key, col.width)}
              onDoubleClick={(e)=> { e.stopPropagation(); autoSizeColumnPrecise(col.key); }}
                            sx={{ position:'absolute', top:0, right:0, width:6, height:'100%', cursor:'col-resize', '&:hover':{ background:'rgba(0,0,0,0.08)' }, userSelect:'none' }}
                          />
                        )}
                      </Box>
                    );
                  })}
                </Box>
                {/* Filas */}
                <Box ref={recordsBodyRef} sx={{
                  height: RECORD_GRID_HEIGHT,
                  overflowY:'auto',
                  fontSize:13,
                  position:'relative',
                  background:'#fbfcfd'
                }}>
                  <Box sx={{ display:'flex', flexDirection:'column' }}>
                    {(() => {
                      let list = records; // búsqueda textual eliminada por redundante
                      if(sortKey && sortDir){
                        list = [...list].sort((a:any,b:any) => {
                          const av = sortKey==='index'?0:a[sortKey];
                          const bv = sortKey==='index'?0:b[sortKey];
                          if(av==null && bv==null) return 0;
                          if(av==null) return 1;
                          if(bv==null) return -1;
                          if(typeof av === 'number' && typeof bv === 'number') return sortDir==='asc'? av-bv : bv-av;
                          return sortDir==='asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
                        });
                      }
                      if(recordsLoading) return <Box sx={{ p:4, textAlign:'center' }}>Cargando...</Box>;
                      if(list.length===0) return <Box sx={{ p:4, textAlign:'center', color:'text.secondary' }}>Sin registros</Box>;
                      return list.map((r, idx) => (
                        <Box key={r.id}
                          onClick={()=>{ setRecordDetail(r); setSelectedRecordId(r.id); }}
                          sx={{
                            display:'flex',
                            alignItems:'stretch',
                            cursor:'pointer',
                            background: selectedRecordId===r.id ? 'linear-gradient(90deg,#e8f1fb,#d8e9f7)' : (idx % 2 === 0 ? '#ffffff' : '#f7f9fb'),
                            borderBottom:'1px solid #e3e7ea',
                            position:'relative',
                            '&:hover':{ background: selectedRecordId===r.id ? 'linear-gradient(90deg,#dcebf8,#cfe3f2)' : '#eef4fa' },
                            '&::before': selectedRecordId===r.id ? { content:'""', position:'absolute', left:0, top:0, bottom:0, width:4, background:'#5c2340' } : {},
                            transition:'background .25s'
                          }}
                        >
                          {recordColumns.map(col => {
                            let content: React.ReactNode = null;
                            switch(col.key){
                              case 'index': content = idx+1; break;
                              case 'month': content = formatDate(r.month); break;
                              case 'user_name': content = r.user_name ? r.user_name : '-'; break;
                              case 'worker_type': content = <Chip size="small" label={r.worker_type==='nuevo'?'NUEVO':'ANTIGUO'} color={r.worker_type==='nuevo'?'warning':'success'} variant="outlined" />; break;
                              case 'order_number': content = r.order_number || '-'; break;
                              case 'total_amount': content = Number(r.total_amount).toFixed(2); break;
                              case 'concepts': content = (
                                <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ maxHeight:46, overflow:'hidden' }}>
                                  {r.concepts.slice(0,5).map(c => <Chip key={c.code+String(c.quantity)} size="small" label={`${c.label||c.code} x${c.quantity}`} />)}
                                  {r.concepts.length>5 && <Chip size="small" label={`+${r.concepts.length-5}`}/>}
                                </Stack>
                              ); break;
                              case 'created_at': content = formatDateTime(r.created_at); break;
                              default: content = (r as any)[col.key];
                            }
                            return (
                              <Box key={col.key} data-col-cell={col.key} sx={{
                                flex: col.width? `0 0 ${col.width}px` : '1 1 auto',
                                minWidth: col.width? col.width : 140,
                                padding:'7px 10px',
                                display:'flex', alignItems:'center',
                                justifyContent: col.align==='right' ? 'flex-end' : (col.align==='center' ? 'center' : 'flex-start'),
                                fontVariantNumeric: col.key==='total_amount' ? 'tabular-nums' : 'normal',
                                fontWeight: col.key==='total_amount' ? 600 : 400,
                                fontSize:13,
                                gap:0.4,
                                overflow:'hidden',
                                color: col.key==='total_amount' ? '#222' : 'inherit'
                              }}>
                                <span data-col-cell-inner={col.key} style={{ display:'inline-block', whiteSpace: col.key==='concepts' ? 'normal' : 'nowrap', maxWidth:'100%' }}>
                                  {content}
                                </span>
                              </Box>
                            );
                          })}
                        </Box>
                      ));
                    })()}
                  </Box>
                </Box>
                {/* Resumen */}
                {(() => {
                  const total = records.reduce((a,b)=> a + Number(b.total_amount||0), 0);
                  const totalAntiguo = records.filter(r=>r.worker_type==='antiguo').reduce((a,b)=> a+Number(b.total_amount||0),0);
                  const totalNuevo = records.filter(r=>r.worker_type==='nuevo').reduce((a,b)=> a+Number(b.total_amount||0),0);
                  return (
                    <Box px={1.75} py={1.1} display="flex" flexWrap="wrap" alignItems="center" gap={2}
                      sx={{ fontSize:12, background:'linear-gradient(90deg,#f9fafb,#f2f4f6)', borderTop:'1px solid #e3e6e8' }}>
                      <Typography variant="caption" sx={{ fontWeight:600 }}>{records.length} registro(s)</Typography>
                      <Typography variant="caption">Total: <strong>{total.toFixed(2)}€</strong></Typography>
                      <Typography variant="caption">Antiguo: <strong>{totalAntiguo.toFixed(2)}€</strong></Typography>
                      <Typography variant="caption">Nuevo: <strong>{totalNuevo.toFixed(2)}€</strong></Typography>
                      <Typography variant="caption" sx={{ ml:'auto' }}>Actualizado {new Date().toLocaleTimeString()}</Typography>
                      <Divider flexItem orientation="vertical" sx={{ mx:1 }} />
                      <Tooltip title="Exportar Excel"><span><IconButton size="small" onClick={exportExcel} disabled={records.length===0}><Download fontSize="inherit" /></IconButton></span></Tooltip>
                      <Tooltip title="Exportar PDF"><span><IconButton size="small" onClick={exportPDF} disabled={records.length===0}><PictureAsPdf fontSize="inherit" /></IconButton></span></Tooltip>
                    </Box>
                  );
                })()}
              </Box>
            </Paper>
          </Fade>
        )}

  {result && tab === 0 && (
          <Fade in timeout={600}>
      <Paper sx={{ p: { xs:2, sm:3 }, borderRadius: 3, border: '1px solid #e0e0e0', position:'relative', transition:'box-shadow .4s, border-color .4s', boxShadow: flashSaved ? '0 0 0 3px rgba(46,160,67,0.3)' : undefined, borderColor: flashSaved ? 'success.main' : 'rgba(0,0,0,0.12)' }}>
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
      {/* Dialog Detalle Registro */}
      <Dialog open={Boolean(recordDetail)} onClose={()=>setRecordDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <Typography variant="h6" fontWeight={600}>Detalle Dieta</Typography>
          <IconButton size="small" onClick={()=>setRecordDetail(null)}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ pt:1 }}>
          {recordDetail && (
            <Stack spacing={1} mb={2}>
              <Typography variant="body2"><strong>Conductor:</strong> {recordDetail.user_name || recordDetail.user_id}</Typography>
              <Typography variant="body2"><strong>Fecha:</strong> {formatDate(recordDetail.month)}</Typography>
              <Typography variant="body2"><strong>OC / Albarán:</strong> {recordDetail.order_number || '-'}</Typography>
              <Typography variant="body2"><strong>Tipo:</strong> {recordDetail.worker_type}</Typography>
              <Typography variant="body2"><strong>Total:</strong> {Number(recordDetail.total_amount).toFixed(2)}€</Typography>
              <Typography variant="body2"><strong>Creado:</strong> {formatDateTime(recordDetail.created_at)}</Typography>
            </Stack>
          )}
          {recordDetail && (
            <Table size="small" sx={{ border:'1px solid #ececec', borderRadius:1 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Concepto</TableCell>
                  <TableCell align="right">Cant.</TableCell>
                  <TableCell align="right">Importe</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recordDetail.concepts.map(c => (
                  <TableRow key={c.code+String(c.quantity)}>
                    <TableCell>{c.label || c.code}</TableCell>
                    <TableCell align="right">{c.quantity}</TableCell>
                    <TableCell align="right">{c.rate.toFixed(2)}€</TableCell>
                    <TableCell align="right">{c.subtotal.toFixed(2)}€</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} align="right" sx={{ fontWeight:600 }}>TOTAL</TableCell>
                  <TableCell align="right" sx={{ fontWeight:600 }}>{Number(recordDetail.total_amount).toFixed(2)}€</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setRecordDetail(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={showSuccess} autoHideDuration={2500} onClose={()=>setShowSuccess(false)} anchorOrigin={{ vertical:'top', horizontal:'center' }}>
        <MuiAlert elevation={6} variant="filled" severity="success" onClose={()=>setShowSuccess(false)} sx={{ fontWeight:600 }}>
          Registro guardado correctamente
        </MuiAlert>
      </Snackbar>
    </>
  );
};

export default Dietas;
