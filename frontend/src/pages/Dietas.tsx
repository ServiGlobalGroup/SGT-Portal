import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, Paper, Alert, TextField, Autocomplete, MenuItem, IconButton, Tooltip, Divider, Button, Table, TableHead, TableRow, TableCell, TableBody, Chip, Stack, Fade, GlobalStyles, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert as MuiAlert, ToggleButtonGroup, ToggleButton, Checkbox, FormControlLabel } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { hasPermission, Permission } from '../utils/permissions';
import { usersAPI } from '../services/api';
import type { User } from '../types';
import { calculateDietas, DIETA_RATES, DietaConceptInput, DietaCalculationResult, findKilometerRangeAntiguo } from '../config/dietas';
import { dietasAPI, distancierosAPI } from '../services/api';
import { Add, Delete, Calculate, RestaurantMenu, History, FiberNew, Close, ArrowUpward, ArrowDownward, PictureAsPdf, ArrowDropDown, Map, ArrowRightAlt, Flag, TripOrigin, Close as CloseIcon, Undo, Toll, RemoveCircleOutline, CheckCircle, Storage, Cloud, Save } from '@mui/icons-material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Declaraciones suaves para evitar errores de TS si no se tienen @types/google.maps instalados
// Se pueden reemplazar instalando: npm i -D @types/google.maps
// y eliminando este bloque.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare global {
  // eslint-disable-next-line no-var
  var google: any; // simplificado
}

interface ConceptRow extends DietaConceptInput { tempId: string; }

interface DietaRecordRow {
  id: number;
  user_id: number;
  worker_type: string;
  order_number?: string;
  month: string;
  total_amount: number;
  created_at: string;
  concepts: { code:string; label:string; quantity:number; rate:number; subtotal:number; }[];
  user_name?: string;
}

// Icono Excel inline para evitar imports adicionales pesados
const ExcelIcon: React.FC<{ size?: number }> = ({ size=20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h7l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
    <path d="M11 4v5h5" />
    <path d="m10 12 4 6" />
    <path d="m14 12-4 6" />
  </svg>
);

export const Dietas: React.FC = () => {
  const { user } = useAuth();
  const canView = !!user && hasPermission(user, Permission.VIEW_DIETAS);

  // Estado pestañas
  const [tab, setTab] = useState<number>(0);

  // Distancieros
  const [distGrouped, setDistGrouped] = useState<{ client_name:string; total_routes:number; active_routes:number; min_km:number; max_km:number; }[]>([]);
  const [loadingDist, setLoadingDist] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>('');
  // Para pestaña cálculo: selección cliente/ruta
  const [calcClient, setCalcClient] = useState<string>('');
  const [calcRoutes, setCalcRoutes] = useState<{ id:number; destination:string; km:number; active:boolean; uses_tolls?:boolean; }[]>([]);
  const [loadingCalcRoutes, setLoadingCalcRoutes] = useState(false);
  const [calcRouteFilter, setCalcRouteFilter] = useState('');
  const [selectedCalcRoute, setSelectedCalcRoute] = useState<{ id:number; destination:string; km:number; uses_tolls?:boolean;} | null>(null);
  const [clientRoutes, setClientRoutes] = useState<{ id:number; client_name:string; destination:string; destination_normalized:string; km:number; active:boolean; notes?:string; created_at:string; updated_at:string; }[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [showOnlyActiveRoutes, setShowOnlyActiveRoutes] = useState(true);
  const [routesTotal, setRoutesTotal] = useState(0);
  const routesBodyRef = useRef<HTMLDivElement | null>(null);

  // (efecto se reubicará tras definición de driverType)

  // Carga completa de rutas (sin scroll infinito) para pestaña Distancieros
  useEffect(()=>{
    let cancelled = false;
    const loadAll = async () => {
      if(tab!==3 || !selectedClient){ return; }
      setClientRoutes([]); setRoutesTotal(0); setLoadingRoutes(true);
      try {
        const PAGE = 500;
        let offset = 0; let total = Infinity; const acc:any[] = [];
        while(offset < total){
          const data = await distancierosAPI.listRoutes(selectedClient, { onlyActive: showOnlyActiveRoutes, limit: PAGE, offset });
          if(cancelled) return;
          acc.push(...data.items);
          total = data.total ?? acc.length;
          if(data.items.length === 0) break;
          offset += data.items.length;
          if(offset >= 20000) break; // salvaguarda
        }
        if(!cancelled){ setClientRoutes(acc); setRoutesTotal(acc.length); }
      } catch {
        if(!cancelled){ setClientRoutes([]); setRoutesTotal(0); }
      } finally { if(!cancelled) setLoadingRoutes(false); }
    };
    loadAll();
    return ()=> { cancelled = true; };
  },[tab, selectedClient, showOnlyActiveRoutes]);

  // Carga rutas para cálculo (trae TODAS las activas vía paginado)
  useEffect(()=>{
    let cancelled = false;
    const fetchAll = async () => {
      if(!calcClient){ setCalcRoutes([]); setSelectedCalcRoute(null); return; }
      setLoadingCalcRoutes(true);
      try {
        const PAGE = 500; // tamaño página alto para reducir peticiones
        let offset = 0;
        let total = Infinity;
        const all: { id:number; destination:string; km:number; active:boolean; uses_tolls?:boolean; }[] = [];
        while(offset < total){
          const data = await distancierosAPI.listRoutes(calcClient, { onlyActive: true, limit: PAGE, offset });
          if(cancelled) return;
            const simple = data.items.map((r:any)=>({ id:r.id, destination:r.destination, km:r.km, active:r.active, uses_tolls:r.uses_tolls }));
          console.log('🔍 Datos cargados para', calcClient, ':', simple.slice(0, 3)); // Log primeros 3 elementos
          all.push(...simple);
          total = data.total ?? all.length; // fallback
          if(data.items.length === 0) break;
          offset += data.items.length;
          // corte seguridad por si backend no devuelve total correcto
          if(offset >= 10000) break;
        }
        if(!cancelled){
          setCalcRoutes(all);
          setSelectedCalcRoute(null); // limpiar selección previa
        }
      } catch(e){
        if(!cancelled){ setCalcRoutes([]); }
      } finally {
        if(!cancelled) setLoadingCalcRoutes(false);
      }
    };
    fetchAll();
    return ()=> { cancelled = true; };
  },[calcClient]);

  // Eliminado scroll infinito (carga completa arriba)

  // Conductores
  const [drivers, setDrivers] = useState<User[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<User | null>(null);

  // Cálculo
  const [rows, setRows] = useState<ConceptRow[]>([]);
  const [orderNumber, setOrderNumber] = useState('');
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,10));
  const [kmsAntiguo, setKmsAntiguo] = useState('');
  const [result, setResult] = useState<DietaCalculationResult | null>(null);
  const [flashSaved, setFlashSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Extras
  const [openExtraDialog, setOpenExtraDialog] = useState(false);
  const [extraName, setExtraName] = useState('');
  const [extraAmount, setExtraAmount] = useState('');
  const [extraPercent, setExtraPercent] = useState('');
  const [extraMode, setExtraMode] = useState<'fijo'|'porcentaje'>('fijo');
  const [extraPercentBase, setExtraPercentBase] = useState<'kmTramo'|'totalBase'>('kmTramo');

  // Registros
  const [records, setRecords] = useState<DietaRecordRow[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [filterUser, setFilterUser] = useState<User | null>(null);
  const [filterWorkerType, setFilterWorkerType] = useState('');
  const [filterOrder, setFilterOrder] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [recordDetail, setRecordDetail] = useState<DietaRecordRow | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);

  // Export
  const exportingRef = useRef(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [snackbar, setSnackbar] = useState<{open: boolean; message: string; severity: 'success' | 'error'}>({open: false, message: '', severity: 'success'});

  // Grid registros columnas y orden
  const [recordColumns, setRecordColumns] = useState<any[]>([
    { key:'index', label:'#', width:55, align:'right' },
    { key:'month', label:'Fecha', width:110 },
    { key:'user_name', label:'Conductor', width:200 },
    { key:'worker_type', label:'Tipo', width:110, align:'center' },
    { key:'order_number', label:'OC / Albarán', width:140 },
    { key:'total_amount', label:'Total (€)', width:110, align:'right' },
    { key:'concepts', label:'Conceptos' },
    { key:'created_at', label:'Creado', width:170 }
  ]);
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc'|'desc'|''>('');
  const recordsBodyRef = useRef<HTMLDivElement | null>(null);
  const RECORD_GRID_HEIGHT = 500; // altura fija de la zona scroll registros (aumentada desde 420)

  // Distancieros grid columns
  const [distColumns, setDistColumns] = useState<any[]>([
    { key:'destination', label:'Destino', width:360 },
    { key:'km', label:'Km', width:90, align:'right' },
    { key:'active', label:'Estado', width:110 },
    { key:'notes', label:'Notas' } // columna flexible
  ]);

  // Actualizar columnas dinámicamente según cliente seleccionado
  useEffect(() => {
    const baseColumns: any[] = [
      { key:'destination', label:'Destino', width:360 },
      { key:'km', label:'Km', width:90, align:'right' },
      { key:'active', label:'Estado', width:110 },
    ];
    if (selectedClient === 'GOOGLE MAPS') {
      baseColumns.splice(2, 0, { key:'uses_tolls', label:'Peaje', width:100, align:'center' }); // insertar antes de Estado
    }
    baseColumns.push({ key:'notes', label:'Notas' }); // siempre al final (columna flexible, sin width)
    setDistColumns(baseColumns);
  }, [selectedClient]);
  const [distSortKey, setDistSortKey] = useState<string>('');
  const [distSortDir, setDistSortDir] = useState<'asc'|'desc'|''>('');
  const DIST_GRID_HEIGHT = 500; // misma altura que registros
  const [distFilterText, setDistFilterText] = useState('');

  // Resize columnas distancieros
  const beginResizeDist = (e: React.MouseEvent, key:string, width:number) => {
    e.preventDefault();
    const startX = e.clientX; const startWidth = width;
    const move = (ev:MouseEvent) => {
      const delta = ev.clientX - startX;
      setDistColumns(prev => prev.map(c => c.key===key ? { ...c, width: Math.max(55, startWidth + delta) } : c));
    };
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  };
  const autoSizeColumnPreciseDist = (key:string) => {
    requestAnimationFrame(() => {
      const headerSpan = document.querySelector(`[data-dist-col-header-inner="${key}"]`) as HTMLElement | null;
      const cellSpans = Array.from(document.querySelectorAll(`[data-dist-col-cell-inner="${key}"]`)) as HTMLElement[];
      if(!headerSpan && cellSpans.length===0) return;
      let max = headerSpan ? headerSpan.scrollWidth : 0;
      cellSpans.forEach(el => { const w = el.scrollWidth; if(w>max) max = w; });
      const padding = 16 + 16 + 8;
      const finalWidth = Math.min(900, Math.max(55, max + padding));
      setDistColumns(prev => prev.map(c => c.key===key ? { ...c, width: finalWidth } : c));
    });
  };

  // Rutas
  const [routeOrigin, setRouteOrigin] = useState('');
  const [routeDestination, setRouteDestination] = useState('');
  const [nextStop, setNextStop] = useState('');
  const [waypoints, setWaypoints] = useState<string[]>([]);
  const [routeStats, setRouteStats] = useState<any | null>(null); // ruta seleccionada
  const [routeOptions, setRouteOptions] = useState<any[]>([]); // opciones disponibles (sin peaje base + peaje rápidas)
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [disabledLegs, setDisabledLegs] = useState<Set<number>>(new Set()); // tramos descontados
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [useRouteCache, setUseRouteCache] = useState(true); // Usar caché Google por defecto
  const [mapReady, setMapReady] = useState(false);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const gMapRef = useRef<any>(null);
  const directionsServiceRef = useRef<any>(null);
  // Polilíneas múltiples clicables para seleccionar ruta
  const routePolylinesRef = useRef<any[]>([]);
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);
  // Funciones auxiliares que usan estado deben estar después de las definiciones anteriores

  const beginResize = (e: React.MouseEvent, key:string, width:number) => {
    e.preventDefault();
    const startX = e.clientX; const startWidth = width;
    const move = (ev:MouseEvent) => {
      const delta = ev.clientX - startX;
      setRecordColumns(prev => prev.map(c => c.key===key ? { ...c, width: Math.max(55, startWidth + delta) } : c));
    };
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  };

  const autoSizeColumnPrecise = (key:string) => {
    requestAnimationFrame(() => {
      const headerSpan = document.querySelector(`[data-col-header-inner="${key}"]`) as HTMLElement | null;
      const cellSpans = Array.from(document.querySelectorAll(`[data-col-cell-inner="${key}"]`)) as HTMLElement[];
      if(!headerSpan && cellSpans.length===0) return;
      let max = headerSpan ? headerSpan.scrollWidth : 0;
      cellSpans.forEach(el => { const w = el.scrollWidth; if(w>max) max = w; });
      const padding = 16 + 16 + 8;
      const finalWidth = Math.min(900, Math.max(55, max + padding));
      setRecordColumns(prev => prev.map(c => c.key===key ? { ...c, width: finalWidth } : c));
    });
  };

  // Cadena visual de puntos (origen, waypoints, destino)
  const renderRouteChain = () => {
    const nodes: { type:'origin'|'wp'|'dest'; label:string; index?:number }[] = [];
    if(routeOrigin) nodes.push({ type:'origin', label: routeOrigin });
    waypoints.forEach((w,i)=> nodes.push({ type:'wp', label:w, index:i+1 }));
    if(routeDestination) nodes.push({ type:'dest', label: routeDestination });
    if(nodes.length===0) return null;
    return (
      <Box sx={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:1, mb:1 }}>
        {nodes.map((n,i)=> (
          <React.Fragment key={n.type+String(i)+n.label}>
            <Box
              sx={{
                display:'flex', alignItems:'center', gap:0.6,
                px:1.4, py:0.6,
                borderRadius:999,
                fontSize:12,
                fontWeight:600,
                letterSpacing:.4,
                maxWidth:220,
                background: n.type==='origin'? '#eef5ff' : (n.type==='dest'? '#ffeef2' : '#f4f6f8'),
                border:'1px solid',
                borderColor: n.type==='origin'? '#90caf9' : (n.type==='dest'? '#f48fb1' : '#d0d4d8'),
                color:'#2d3135',
                textTransform:'uppercase',
                position:'relative'
              }}
              title={n.label}
            >
              {n.type==='origin' && <TripOrigin sx={{ fontSize:14, color:'#1976d2' }} />}
              {n.type==='dest' && <Flag sx={{ fontSize:14, color:'#d32f2f' }} />}
              {n.type==='wp' && <Typography component="span" sx={{ fontSize:10, fontWeight:700, color:'text.secondary' }}>T{n.index}</Typography>}
              <Typography component="span" sx={{ fontSize:11, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{n.label}</Typography>
              {n.type==='wp' && n.index===waypoints.length && (
                <IconButton size="small" onClick={()=>{ // eliminar sólo el último waypoint
                  setRouteStats(null);
                  setWaypoints(prev=> prev.slice(0,-1));
                }} sx={{ position:'absolute', top:-6, right:-6, p:0.3, bgcolor:'#fff', boxShadow:'0 0 0 1px #cfd3d7', '&:hover':{ bgcolor:'#f5f5f5' } }}>
                  <CloseIcon sx={{ fontSize:12 }} />
                </IconButton>
              )}
            </Box>
            {i < nodes.length-1 && <ArrowRightAlt sx={{ fontSize:18, color:'text.disabled' }} />}
          </React.Fragment>
        ))}
      </Box>
    );
  };
  // --- AQUI CONTINUA EL CODIGO ORIGINAL DEL COMPONENTE ---
  // El resto del archivo (a partir de buildExportRows etc.) ya contiene lógica y JSX.
  // Simplemente retornamos al final. (El contenido existente debajo permanecerá dentro del componente)

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

  // Estilo reutilizable para inputs tipo "pill" en filtros de registros
  const pillFieldSx = {
    '& .MuiInputBase-root': {
      borderRadius: 999,
      background: '#fafbfc',
      boxShadow: 'inset 0 0 0 1px #cfd3d7',
      transition: 'box-shadow .25s, background .25s',
      px: 1.4,
      minHeight: 42,
  borderBottom: 'none !important',
  '&::before, &::after': { display:'none !important' },
      '&:before, &:after': { display:'none !important' },
      '&:hover': {
        background: '#f5f6f7',
        boxShadow: 'inset 0 0 0 1px #b9bdc1'
      },
      '&.Mui-focused': {
        background: '#fff',
        boxShadow: 'inset 0 0 0 2px #5c2340'
      },
      '&.Mui-disabled': { opacity: .6 },
      '& input::-webkit-input-placeholder': { opacity: .75 },
      '&:hover input::-webkit-input-placeholder': { opacity: .55 }
    },
    '& .MuiOutlinedInput-notchedOutline': { display: 'none' },
    '& .MuiAutocomplete-root, & .MuiAutocomplete-root *': {
      '&:before, &:after': { display:'none !important' }
    },
    '& .MuiOutlinedInput-root:before, & .MuiOutlinedInput-root:after': { display:'none !important' },
    '& .MuiInputBase-root.MuiOutlinedInput-root:before, & .MuiInputBase-root.MuiOutlinedInput-root:after': { display:'none !important' },
    '& .MuiInputLabel-root': {
      mt: 0,
      px: 0.6,
      transform: 'translate(14px, 12px) scale(1)',
      transition: 'all .2s',
      '&.MuiInputLabel-shrink': { transform: 'translate(12px, -8px) scale(.82)', background:'#fafbfc', borderRadius:8, padding:'0 4px' },
      '&.Mui-focused': { color: '#5c2340', background:'#fff' }
    },
    '& .MuiInputBase-input': { pt: '10px', pb: '10px' }
  } as const;

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

  // Tarjeta cliente Distanciero (nuevo diseño)
  interface DistClientInfo { client_name:string; total_routes:number; active_routes:number; min_km:number; max_km:number; }
  const DistClientCard: React.FC<{ data:DistClientInfo; selected:boolean; onSelect:()=>void; }> = ({ data, selected, onSelect }) => {
    const percent = data.total_routes ? Math.round((data.active_routes / data.total_routes) * 100) : 0;
    return (
      <Box
        onClick={onSelect}
        sx={{
          mb:1.1,
          p:1.4,
          borderRadius: 2.4,
          cursor:'pointer',
          position:'relative',
          overflow:'hidden',
          background: selected? '#ffffff' : '#f9fafb',
          border:'1px solid',
          borderColor: selected? '#5c2340' : '#d9dde1',
          boxShadow: selected? '0 2px 8px rgba(92,35,64,0.30)' : '0 1px 2px rgba(0,0,0,0.06)',
          transition:'border-color .3s, box-shadow .3s, background .3s, transform .25s',
          '&:hover':{
            background:'#fff',
            boxShadow: selected? '0 4px 16px rgba(92,35,64,0.35)' : '0 3px 10px rgba(0,0,0,0.10)',
            transform:'scale(1.005)'
          },
          '&:active':{ transform:'scale(0.997)' }
        }}
      >
        {/* Barra lateral color */}
        <Box sx={{ position:'absolute', top:0, left:0, bottom:0, width:6, bgcolor: selected? 'linear-gradient(180deg,#5c2340,#7d3456)' : 'linear-gradient(180deg,#c2c6ca,#b6bcc1)' }} />
        <Box sx={{ pl:1.2 }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight:700, fontSize:14, flex:1, letterSpacing:.3, color:'#2d3135' }}>
              {data.client_name}
            </Typography>
            <Box sx={{
              fontSize:11,
              px:1,
              py:0.4,
              borderRadius:1.4,
              fontWeight:600,
              bgcolor: selected? 'rgba(92,35,64,0.10)' : '#eef1f4',
              color: selected? '#5c2340' : '#4a4f53',
              border:'1px solid',
              borderColor: selected? 'rgba(92,35,64,0.35)' : '#d2d6da'
            }}>{data.active_routes}/{data.total_routes}</Box>
          </Box>
          <Box sx={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:1, mt:0.6 }}>
            <Typography variant="caption" sx={{ fontWeight:500, color:'#555', letterSpacing:.2 }}>
              {data.min_km!=null && data.max_km!=null ? `${Number(data.min_km).toFixed(data.min_km>100?0:1)} - ${Number(data.max_km).toFixed(data.max_km>100?0:1)} km` : '—'}
            </Typography>
            <Box sx={{
              fontSize:10,
              px:0.9,
              py:0.35,
              borderRadius:1,
              fontWeight:600,
              letterSpacing:.5,
              bgcolor: percent===100? 'rgba(46,125,50,0.10)' : 'rgba(255,152,0,0.15)',
              color: percent===100? '#2e7d32' : '#8a5200',
              border:'1px solid',
              borderColor: percent===100? 'rgba(46,125,50,0.35)' : 'rgba(255,152,0,0.4)'
            }}>{percent}% ACTIVAS</Box>
          </Box>
          {/* Progress */}
          <Box sx={{ mt:1.2, height:8, borderRadius:5, background:'#eceff2', position:'relative', overflow:'hidden' }}>
            <Box sx={{ position:'absolute', inset:0, width:`${percent}%`, background: selected? 'linear-gradient(90deg,#5c2340,#9a4f71)' : 'linear-gradient(90deg,#7a7f84,#5c2340)', transition:'width .5s ease' }} />
          </Box>
        </Box>
      </Box>
    );
  };

  // Cargar grupos distancieros si se entra a pestaña Distancieros o si en cálculo hay conductor antiguo y aún no cargado
  useEffect(()=>{
    const needForCalc = selectedDriver && driverType==='antiguo';
    if(!(tab===3 || needForCalc)) return;
    if(distGrouped.length>0) return;
    setLoadingDist(true);
    distancierosAPI.listGrouped()
      .then(data => {
        // Asegurar que GOOGLE MAPS aparece y ordenar: CMA, COSCO, GOOGLE MAPS, resto alfabético
        const ordered = [...data].sort((a:any,b:any)=>{
          const priority = (name:string) => {
            if(name==='CMA') return 0;
            if(name==='COSCO') return 1;
            if(name==='GOOGLE MAPS') return 2;
            return 3;
          };
          const pa = priority(a.client_name); const pb = priority(b.client_name);
          if(pa!==pb) return pa-pb;
          return a.client_name.localeCompare(b.client_name);
        });
        setDistGrouped(ordered);
        // Selección inicial: priorizar CMA, luego COSCO, luego GOOGLE MAPS, luego primero
        if(!selectedClient){
          const prefer = ordered.find((c:any)=> c.client_name==='CMA') || ordered.find((c:any)=> c.client_name==='COSCO') || ordered.find((c:any)=> c.client_name==='GOOGLE MAPS') || ordered[0];
          if(prefer) setSelectedClient(prefer.client_name);
        }
        if(!calcClient){
          const first = ordered[0];
          if(first) setCalcClient(first.client_name);
        }
      })
      .catch(()=>{})
      .finally(()=> setLoadingDist(false));
  },[tab, selectedDriver, driverType, distGrouped.length]);

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
  setSelectedCalcRoute(null);
    }
  }, [driverType]);

  const kmTramoAmount = useMemo(() => {
    if (driverType !== 'antiguo') return 0;
    const kms = Number(kmsAntiguo);
    if (isNaN(kms) || kms < 0) return 0;
    const tramo = findKilometerRangeAntiguo(kms);
    return tramo?.amount || 0;
  }, [driverType, kmsAntiguo]);

  // Carga perezosa del script sólo cuando se entra a la pestaña Rutas
  const initializeMap = () => {
    try {
      // Verificar que Google Maps esté completamente disponible
      if(!(window as any).google?.maps?.Map || typeof (window as any).google.maps.Map !== 'function') {
        setTimeout(initializeMap, 200);
        return;
      }
      
      // Esperar hasta que mapDivRef esté disponible
      if(!mapDivRef.current) {
        setTimeout(initializeMap, 100);
        return;
      }
      
      gMapRef.current = new (window as any).google.maps.Map(mapDivRef.current, {
        center:{lat:40.4168,lng:-3.7038},
        zoom:6,
        mapTypeControl:false,
        fullscreenControl:true,
        streetViewControl:false,
        styles: [
          {
            featureType: "transit",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "transit.line",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "transit.station",
            stylers: [{ visibility: "off" }]
          }
        ]
      });
      
      directionsServiceRef.current = new (window as any).google.maps.DirectionsService();
      
      // Eliminamos AutocompleteService para ahorrar en API
      // try { 
      //   autocompleteServiceRef.current = new (window as any).google.maps.places.AutocompleteService(); 
      // } catch(e) {
      //   // AutocompleteService no disponible, continuar sin él
      // }
      
      // Eliminamos SearchBox para ahorrar en API
      // if(searchInputRef.current){
      //   searchBoxRef.current = new (window as any).google.maps.places.SearchBox(searchInputRef.current);
      //   searchBoxRef.current.addListener('places_changed', () => {
      //     const places = searchBoxRef.current.getPlaces();
      //     if(!places || !places.length) return;
      //     const bounds = new (window as any).google.maps.LatLngBounds();
      //       places.forEach((p:any)=>{ if(p.geometry?.viewport) bounds.union(p.geometry.viewport); else if(p.geometry?.location) bounds.extend(p.geometry.location); });
      //     gMapRef.current.fitBounds(bounds);
      //   });
      // }
      
      setMapReady(true);
      // Si ya tenemos una ruta previa, volver a dibujarla
      if(routeStats && routeOrigin && routeDestination){
        setTimeout(()=> { handleCalculateRoute(); }, 50);
      }
    } catch(e:any){ 
      setMapsError(`Error inicializando mapa: ${e?.message || 'Error desconocido'}`); 
    }
  };

  useEffect(()=>{
    if(tab!==2) return;
    
    // Si ya listo y referencia válida, sólo forzar resize
    if(mapReady && gMapRef.current){
      setTimeout(()=>{ try { (window as any).google?.maps?.event?.trigger(gMapRef.current,'resize'); } catch {}; }, 120);
      return;
    }
    
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    if(!apiKey){ 
      setMapsError('Falta clave de Google Maps'); 
      return; 
    }
    
    const existing = document.querySelector('script[data-gmaps]') as HTMLScriptElement | null;
    if(existing){
      // Verificar si Google Maps ya está disponible
      if((window as any).google?.maps?.Map && typeof (window as any).google.maps.Map === 'function') {
        initializeMap();
      } else {
        // Esperar a que se cargue completamente
        const checkLoaded = () => {
          if((window as any).google?.maps?.Map && typeof (window as any).google.maps.Map === 'function') {
            initializeMap();
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
      }
      return;
    }
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry&loading=async`;
    script.async = true; script.defer = true; script.dataset.gmaps='1';
    script.onload = () => {
      // Esperar un poco más para asegurar que todo esté listo
      setTimeout(() => {
        if((window as any).google?.maps?.Map && typeof (window as any).google.maps.Map === 'function') {
          initializeMap();
        } else {
          // Si aún no está listo, intentar con polling
          const checkReady = () => {
            if((window as any).google?.maps?.Map && typeof (window as any).google.maps.Map === 'function') {
              initializeMap();
            } else {
              setTimeout(checkReady, 100);
            }
          };
          checkReady();
        }
      }, 300);
    };
    script.onerror = () => {
      setMapsError('No se pudo cargar Google Maps. Verifica tu conexión.');
    };
    document.head.appendChild(script);
  },[tab]);

  // Al salir de la pestaña, liberar referencias para asegurar reinicio limpio y evitar mapa gris
  useEffect(()=>{
    if(tab!==2){
  try {
        routePolylinesRef.current.forEach(p=>{ try { p.setMap(null); } catch {} });
        routePolylinesRef.current=[];
        if(startMarkerRef.current) { try { startMarkerRef.current.setMap(null); } catch {}; startMarkerRef.current=null; }
        if(endMarkerRef.current) { try { endMarkerRef.current.setMap(null); } catch {}; endMarkerRef.current=null; }
      } catch {}
      gMapRef.current = null;
      directionsServiceRef.current = null;
      setMapReady(false);
    }
  },[tab]);

  const handleCalculateRoute = async () => {
    if(!routeOrigin.trim() || !routeDestination.trim()){
      setMapsError('Origen y destino requeridos'); return;
    }
  if(!directionsServiceRef.current || !gMapRef.current){
      setMapsError('Mapa no listo'); return;
    }
    const cleanWaypoints = waypoints.map(w=>w.trim()).filter(Boolean);
    setMapsError(null);
  const buildOption = (route:any, parentResult:any) => {
      let totalMeters=0; let totalSeconds=0;
      const legs = route?.legs || [];
      const legStats = legs.map((lg:any)=>{
        totalMeters += lg.distance?.value || 0;
        totalSeconds += lg.duration?.value || 0;
        const kmNumber = (lg.distance?.value || 0)/1000;
        return {
          from: (lg.start_address||'').split(',')[0],
          to: (lg.end_address||'').split(',')[0],
          distance: lg.distance?.text || '',
          duration: lg.duration?.text || '',
          kmNumber,
          secNumber: lg.duration?.value || 0,
        };
      });
      
      // Detección de peajes basada SOLO en warnings oficiales de Google (evita falsos positivos por carteles AP-)
      let usesTolls = false;
      let tollInfo:any[] = [];
      try {
        const warnings: string[] = Array.isArray(route?.warnings) ? route.warnings : [];
        usesTolls = warnings.some(w => /peaje|toll|peatge/i.test(w));
        if(usesTolls) tollInfo = warnings.filter(w => /peaje|toll|peatge/i.test(w));
        // Debug
        console.log('🛣️ Ruta analizada', {
          summary: route?.summary,
          warnings,
          detectedToll: usesTolls,
          tollWarnings: tollInfo
        });
      } catch(e){
        usesTolls = false; // conservador
      }
      
      let crossesPortugal=false, crossesFrance=false;
      try {
        const spainBox = { minLat:27.5, maxLat:43.95, minLng:-18.5, maxLng:4.7 };
        const portugalBox = { minLat:36.5, maxLat:42.3, minLng:-9.7, maxLng:-6.0 };
        const franceBox = { minLat:42.3, maxLat:51.5, minLng:-5.5, maxLng:8.7 };
        const path = route?.overview_path || [];
        for(const pt of path){
          const lat = typeof pt.lat === 'function'? pt.lat(): pt.lat;
          const lng = typeof pt.lng === 'function'? pt.lng(): pt.lng;
          const inPortugal = lat>=portugalBox.minLat && lat<=portugalBox.maxLat && lng>=portugalBox.minLng && lng<=portugalBox.maxLng;
          const inFranceCandidate = lat>=franceBox.minLat && lat<=franceBox.maxLat && lng>=franceBox.minLng && lng<=franceBox.maxLng;
          const inSpain = lat>=spainBox.minLat && lat<=spainBox.maxLat && lng>=spainBox.minLng && lng<=spainBox.maxLng;
          if(inPortugal) crossesPortugal = true;
          if(inFranceCandidate && !inSpain) crossesFrance = true;
          if(crossesPortugal && crossesFrance) break;
        }
      } catch {}
      const km = totalMeters/1000;
      const totalDistance = (km > 100 ? km.toFixed(0) : km.toFixed(2)) + ' km';
      const hours = Math.floor(totalSeconds/3600);
      const mins = Math.round((totalSeconds%3600)/60);
      const totalDuration = hours ? `${hours} h ${mins} min` : `${mins} min`;
  return { totalDistance, totalDuration, totalKmNumber: km, legs: legStats, crossesPortugal, crossesFrance, usesTolls, meters: totalMeters, seconds: totalSeconds, route, parentResult };
    };
    const reqBase = {
      origin: routeOrigin,
      destination: routeDestination,
      waypoints: cleanWaypoints.map(w=>({ location:w, stopover:true })),
      optimizeWaypoints: false,
      travelMode: (window as any).google.maps.TravelMode.DRIVING,
      provideRouteAlternatives: true
    };
    // Helper para renderizar todas las rutas con estilos diferenciados
    const drawAllPolylines = (candidates:any[], selected=0) => {
      // Limpiar anteriores
      routePolylinesRef.current.forEach(p=>{ try { p.setMap(null); } catch {} });
      routePolylinesRef.current = [];
      candidates.forEach((opt, idx)=>{
        const isSel = idx===selected;
        const colorBase = opt.usesTolls ? '#ff9800' : '#1e5fb8'; // naranja peaje / azul sin peaje
        const colorSel = opt.usesTolls ? '#ef6c00' : '#0d47a1'; // tono más intenso al seleccionar
        const polyline = new (window as any).google.maps.Polyline({
          map: gMapRef.current,
          path: opt.route?.overview_path || [],
          clickable: true,
            strokeColor: isSel? colorSel : colorBase,
            strokeOpacity: isSel? 0.95 : 0.40,
            strokeWeight: isSel? 6 : 4,
            zIndex: isSel? 70 : 40
        });
        polyline.addListener('click', ()=>{
          setSelectedRouteIdx(idx);
          setRouteStats(opt);
          setDisabledLegs(new Set());
        });
        routePolylinesRef.current.push(polyline);
      });
      // Ajustar viewport a la seleccionada
      try { const sel = candidates[selected]; if(sel?.route?.bounds) gMapRef.current.fitBounds(sel.route.bounds); } catch {}
      // Colocar marcadores de inicio/fin de la seleccionada
      placeMarkers(candidates[selected]);
    };

    const placeMarkers = (opt:any) => {
      try {
        const legs = opt?.route?.legs||[];
        if(!legs.length) return;
        const startLoc = legs[0].start_location;
        const endLoc = legs[legs.length-1].end_location;
        if(startLoc){
          if(!startMarkerRef.current){
            startMarkerRef.current = new (window as any).google.maps.Marker({ map:gMapRef.current, position:startLoc, label:'O' });
          } else startMarkerRef.current.setPosition(startLoc);
        }
        if(endLoc){
          if(!endMarkerRef.current){
            endMarkerRef.current = new (window as any).google.maps.Marker({ map:gMapRef.current, position:endLoc, label:'D' });
          } else endMarkerRef.current.setPosition(endLoc);
        }
      } catch {}
    };

    // Intentar caché sólo cuando no hay waypoints Y usuario permite caché
  if(cleanWaypoints.length === 0 && useRouteCache){
      try {
        const { googleRoutesService } = await import('../services/googleRoutesService');
    // Intentar primero ruta sin peaje
    console.log('🔍 Buscando rutas en caché:', routeOrigin, 'a', routeDestination);
    const cachedNo = await googleRoutesService.getCached(routeOrigin, routeDestination, 'DRIVING','NOTOLLS');
    const cachedToll = await googleRoutesService.getCached(routeOrigin, routeDestination, 'DRIVING','TOLLS');
    console.log('📋 Resultado caché - SinPeaje:', cachedNo ? `✅ ${cachedNo.km}km` : '❌', 'ConPeaje:', cachedToll ? `✅ ${cachedToll.km}km` : '❌');
    
    // Prioridad: si tenemos al menos la sin peaje la usamos; luego añadimos (on-demand) la de peaje tras dibujar
    const cached = cachedNo || cachedToll;
    if(cached && cached.polyline){
          // Decodificar polyline y dibujar manualmente
          const libReady = (window as any).google?.maps?.geometry?.encoding;
          if(!libReady){
            console.warn('⚠️ google.maps.geometry.encoding no disponible, recargando con librería geometry...');
            // Si geometry no está cargada, hacer fallback a API normal
          } else {
            console.log('✅ Usando ruta desde caché:', cached.variant, cached.km + 'km');
            
            // Stats sintéticos para la ruta base
            const km = cached.km;
            const meters = km*1000;
            const seconds = cached.duration_sec || 0;
            const totalDistance = (km > 100 ? km.toFixed(0) : km.toFixed(2)) + ' km';
            const hours = Math.floor(seconds/3600);
            const mins = Math.round((seconds%3600)/60);
            const totalDuration = seconds? (hours ? `${hours} h ${mins} min` : `${mins} min`) : '—';
            
            const path = (window as any).google.maps.geometry.encoding.decodePath(cached.polyline);
            const pseudoRoute = { overview_path: path, bounds: null, legs: [] };
            const baseOption = { 
              totalDistance, 
              totalDuration, 
              totalKmNumber: km, 
              legs: [], 
              crossesPortugal:false, 
              crossesFrance:false, 
              usesTolls: cached.variant==='TOLLS', 
              meters, 
              seconds, 
              route:pseudoRoute, 
              parentResult:null, 
              fromCache:true 
            };
            
            let opts:any[] = [baseOption];
            
            // Si tenemos la otra variante en caché, agregarla
            if(cachedNo && cachedToll && cachedNo.polyline && cachedToll.polyline){
              try {
                const lib = (window as any).google?.maps?.geometry?.encoding;
                const otherVariant = cached === cachedNo ? cachedToll : cachedNo;
                
                const pathOther = lib.decodePath(otherVariant.polyline);
                const pseudoRouteOther = { overview_path: pathOther, bounds: null, legs: [] };
                
                const kmOther = otherVariant.km;
                const metersOther = kmOther * 1000;
                const secondsOther = otherVariant.duration_sec || 0;
                const totalDistanceOther = (kmOther > 100 ? kmOther.toFixed(0) : kmOther.toFixed(2)) + ' km';
                const hoursOther = Math.floor(secondsOther/3600);
                const minsOther = Math.round((secondsOther%3600)/60);
                const totalDurationOther = secondsOther ? (hoursOther ? `${hoursOther} h ${minsOther} min` : `${minsOther} min`) : '—';
                
                const otherOption = {
                  totalDistance: totalDistanceOther,
                  totalDuration: totalDurationOther,
                  totalKmNumber: kmOther,
                  legs: [],
                  crossesPortugal: false,
                  crossesFrance: false,
                  usesTolls: otherVariant.variant === 'TOLLS',
                  meters: metersOther,
                  seconds: secondsOther,
                  route: pseudoRouteOther,
                  parentResult: null,
                  fromCache: true
                };
                
                opts.push(otherOption);
                console.log('✅ Agregada variante adicional desde caché:', otherVariant.variant, otherVariant.km + 'km');
              } catch(e) {
                console.warn('Error agregando variante adicional:', e);
              }
            }
            
            // Configurar estado y dibujar todas las polylines
            setRouteOptions(opts);
            setSelectedRouteIdx(0);
            setRouteStats(baseOption);
            setDisabledLegs(new Set());
            
            // Dibujar todas las rutas con estilos diferenciados
            drawAllPolylines(opts, 0);
            
            return; // Evitar llamadas a API Directions
          }
        }
      } catch(e){ /* silencioso */ }
    }
    console.log('🌐 Llamando a Google Maps API (no hay caché disponible)');
    Promise.all([
      directionsServiceRef.current.route({ ...reqBase, avoidTolls: true }), // siempre 1+ rutas sin peaje
      directionsServiceRef.current.route({ ...reqBase, avoidTolls: false }).catch(()=>null) // rutas potenciales con peaje
    ]).then(async ([noTollsRes, tollRes])=>{
      // 1. Construir opciones sin peaje y elegir la MÁS RÁPIDA (priorizamos duración real sobre distancia)
      const noTollsRoutes = (noTollsRes?.routes||[]).map((r:any)=> {
        const opt = buildOption(r,noTollsRes);
        opt.usesTolls = false; // forzar
        return opt;
      });
      if(!noTollsRoutes.length){ setMapsError('Sin ruta sin peajes'); return; }
      const base = [...noTollsRoutes].sort((a,b)=> (a.seconds - b.seconds) || (a.meters - b.meters))[0];

      let tollCandidate: any | null = null;
      if(tollRes){
        const tollRoutesRaw = (tollRes.routes||[]).map((r:any)=> buildOption(r,tollRes));
        // 2. Intentar localizar rutas que realmente tengan peaje según warnings
        const withExplicitToll = tollRoutesRaw.filter((r:any)=> r.usesTolls);
        if(withExplicitToll.length){
          // Elegimos la más rápida dentro de las que tienen peaje
            tollCandidate = [...withExplicitToll].sort((a,b)=> (a.seconds - b.seconds) || (a.meters - b.meters))[0];
        } else {
          // 3. No hay warnings. Heurística: elegir la ruta más rápida distinta de la base.
          const different = tollRoutesRaw.filter((r:any)=> (r.seconds !== base.seconds || r.meters !== base.meters));
          if(different.length){
            // Ordenar por menor duración; si es marginal (<= +3% tiempo) pero distancia mucho menor (>= -5%) también sirve.
            different.sort((a:any,b:any)=> (a.seconds - b.seconds) || (a.meters - b.meters));
            let picked = different[0];
            // Si la más rápida no mejora tiempo, buscamos una que mejore al menos 2% el tiempo o 2% la distancia
            if(picked.seconds >= base.seconds){
              const improving = different.find((r:any)=> (r.seconds < base.seconds * 0.98) || (r.meters < base.meters * 0.98));
              if(improving) picked = improving;
            }
            tollCandidate = picked;
          }
        }
        if(tollCandidate){
          // Marcar explícitamente como peaje (para color naranja) aunque heurística
          tollCandidate.usesTolls = true;
          if(!tollCandidate.tollReason){
            if(tollCandidate.route?.warnings?.length){
              tollCandidate.tollReason = 'Warnings Google';
            } else {
              tollCandidate.tollReason = 'Heurística más rápida (posible peaje)';
            }
          }
        }
      }

  const candidates:any[] = tollCandidate ? [base, tollCandidate] : [base];
      // Evitar duplicado exacto (puede ocurrir si tollCandidate realmente es misma ruta)
      const unique: any[] = [];
      const seen = new Set<string>();
      for(const c of candidates){
        const key = `${c.route?.summary}|${c.seconds}|${c.meters}|${c.usesTolls}`;
        if(!seen.has(key)){ seen.add(key); unique.push(c); }
      }
      // 4. Actualizar estado y pintar colores (azul sin peaje, naranja con peaje)
      setRouteOptions(unique);
      setSelectedRouteIdx(0);
      drawAllPolylines(unique,0);
      setRouteStats(base);
      console.log('🚗 Rutas seleccionadas', unique.map((c:any,i:number)=>({i, summary:c.route?.summary, seconds:c.seconds, meters:c.meters, usesTolls:c.usesTolls, tollReason:c.tollReason||null })));
      // Guardar en caché si no hay waypoints Y usuario opta por caché
      if(cleanWaypoints.length===0 && useRouteCache){
        try {
          const { googleRoutesService } = await import('../services/googleRoutesService');
          // Guardar ambas variantes si existen
          const polylineBase = base?.route?.overview_polyline?.encodedPath || base?.route?.overview_polyline?.points || base?.route?.overview_polyline || null;
          if(polylineBase){
            console.log('💾 Guardando ruta SIN peaje en caché:', base.totalKmNumber + 'km');
            googleRoutesService.save({ origin: routeOrigin, destination: routeDestination, mode: 'DRIVING', km: base.totalKmNumber, duration_sec: base?.seconds || undefined, polyline: polylineBase, variant: 'NOTOLLS', uses_tolls:false });
          }
          if(tollCandidate){
            const polylineToll = tollCandidate?.route?.overview_polyline?.encodedPath || tollCandidate?.route?.overview_polyline?.points || tollCandidate?.route?.overview_polyline || null;
            if(polylineToll){
              console.log('💾 Guardando ruta CON peaje en caché:', tollCandidate.totalKmNumber + 'km');
              googleRoutesService.save({ origin: routeOrigin, destination: routeDestination, mode: 'DRIVING', km: tollCandidate.totalKmNumber, duration_sec: tollCandidate?.seconds || undefined, polyline: polylineToll, variant: 'TOLLS', uses_tolls:true });
            }
          }
        } catch {}
      }
      setDisabledLegs(new Set());
    }).catch(()=> setMapsError('Error calculando rutas'));
  };

  // Limpiar todos los datos de la sección Rutas
  const handleClearRoute = () => {
    setRouteOrigin('');
    setRouteDestination('');
    setNextStop('');
    setWaypoints([]);
    setRouteStats(null);
    setRouteOptions([]);
    setSelectedRouteIdx(0);
    setDisabledLegs(new Set());
    setMapsError(null);
    try {
      routePolylinesRef.current.forEach(p=>{ try { p.setMap(null); } catch {} });
      routePolylinesRef.current = [];
      if(startMarkerRef.current){ try { startMarkerRef.current.setMap(null); } catch {}; startMarkerRef.current=null; }
      if(endMarkerRef.current){ try { endMarkerRef.current.setMap(null); } catch {}; endMarkerRef.current=null; }
    } catch {}
  };

  // Actualizar estilos polilíneas y marcadores al cambiar selección
  useEffect(()=>{
    if(!routeOptions.length) return;
    routePolylinesRef.current.forEach((p, idx)=>{
      try {
        const opt = routeOptions[idx];
        const isSel = idx===selectedRouteIdx;
        const colorBase = opt.usesTolls ? '#ff9800' : '#1e5fb8';
        const colorSel = opt.usesTolls ? '#ef6c00' : '#0d47a1';
        p.setOptions({ strokeColor: isSel?colorSel:colorBase, strokeOpacity: isSel?0.95:0.40, strokeWeight: isSel?6:4, zIndex:isSel?70:40 });
      } catch {}
    });
    try { const sel = routeOptions[selectedRouteIdx]; if(sel?.route?.bounds) gMapRef.current.fitBounds(sel.route.bounds); } catch {}
    // actualizar marcadores
    try {
      const opt = routeOptions[selectedRouteIdx];
      const legs = opt?.route?.legs||[];
      if(legs.length){
        const startLoc = legs[0].start_location;
        const endLoc = legs[legs.length-1].end_location;
        if(startLoc){ if(!startMarkerRef.current) startMarkerRef.current = new (window as any).google.maps.Marker({ map:gMapRef.current, position:startLoc, label:'O'}); else startMarkerRef.current.setPosition(startLoc); }
        if(endLoc){ if(!endMarkerRef.current) endMarkerRef.current = new (window as any).google.maps.Marker({ map:gMapRef.current, position:endLoc, label:'D'}); else endMarkerRef.current.setPosition(endLoc); }
      }
    } catch {}
  }, [selectedRouteIdx, routeOptions]);

  // Eliminar tramo (leg). Ajusta origen/destino/waypoints y limpia ruta para recalcular
  // Eliminado removeLeg: ya no se permite borrar tramo desde panel, solo descontar.

  // Toggle de descontar (activar/desactivar) un tramo sin eliminarlo
  const toggleDiscountLeg = (index:number) => {
    setDisabledLegs(prev => {
      const next = new Set(prev);
      if(next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  // Totales activos (excluyendo tramos descontados)
  const activeTotals = useMemo(()=>{
    if(!routeStats) return { distanceLabel:'—', durationLabel:'Calcule una ruta', kmNumber:0 };
    const active = routeStats.legs.filter((_:any,i:number)=> !disabledLegs.has(i));
    if(active.length === routeStats.legs.length){
      return { distanceLabel: routeStats.totalDistance, durationLabel: routeStats.totalDuration, kmNumber: routeStats.totalKmNumber };
    }
    const totalKm = active.reduce((a:number,l:any)=> a + (l.kmNumber||0),0);
    const totalSec = active.reduce((a:number,l:any)=> a + (l.secNumber||0),0);
    const distanceLabel = (totalKm > 100 ? totalKm.toFixed(0) : totalKm.toFixed(2)) + ' km';
    const hours = Math.floor(totalSec/3600);
    const mins = Math.round((totalSec%3600)/60);
    const durationLabel = hours ? `${hours} h ${mins} min` : `${mins} min`;
    return { distanceLabel, durationLabel, kmNumber: totalKm };
  }, [routeStats, disabledLegs]);

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
          '.MuiAutocomplete-clearIndicator': { display:'none !important' }
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

        {/* Selector estilo Vacations (Mías / Todas) adaptado */}
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
              onChange={(_,v)=> { if(v!==null) setTab(v); }}
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
              <ToggleButton value={0}>
                <Calculate sx={{ mr:0.6, fontSize:18 }} /> Cálculo
              </ToggleButton>
              <ToggleButton value={1}>
                <History sx={{ mr:0.6, fontSize:18 }} /> Registros
              </ToggleButton>
              <ToggleButton value={2}>
                <Map sx={{ mr:0.6, fontSize:18 }} /> Rutas
              </ToggleButton>
              <ToggleButton value={3}>
                Distancieros
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {tab === 0 && (
        <Fade in timeout={800}>
          <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3, border: '1px solid #e0e0e0', position: 'relative' }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Datos Generales</Typography>
            <Box display="flex" flexWrap="wrap" gap={2}>
          <Box flex={1} minWidth={{ xs: '100%', md: '420px' }}>
            <Autocomplete
              loading={loadingDrivers}
              options={drivers}
              popupIcon={<ArrowDropDown sx={{ color:'text.secondary', fontSize:22 }} />}
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
                  sx={pillFieldSx}
                  InputProps={{
                    ...params.InputProps,
                    sx:{
                      ...pillFieldSx['& .MuiInputBase-root'],
                      '& .MuiAutocomplete-endAdornment':{ right:6 },
                      '& .MuiAutocomplete-popupIndicator':{
                        borderRadius:1,
                        p:0,
                        m:0,
                        width:28,
                        height:28,
                        color:'text.secondary',
                        background:'transparent',
                        boxShadow:'none',
                        '&:hover':{ background:'transparent', color:'text.primary' },
                        '&:active':{ background:'transparent' }
                      }
                    }
                  }}
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
                {selectedCalcRoute && driverType==='antiguo' && (
                  <Chip size="small" label={`${selectedCalcRoute.km} km`} sx={{ fontWeight:600 }} />
                )}
                {selectedDriver.hire_date && <Typography variant="caption" color="text.secondary">Alta: {selectedDriver.hire_date}</Typography>}
              </Box>
            )}
          </Box>
          <Box minWidth={{ xs: '100%', sm: '200px' }} flexGrow={0} flexBasis={{ xs: '100%', sm: '200px' }}>
            <TextField required label="OC / Albarán" value={orderNumber} onChange={e=>setOrderNumber(e.target.value)} fullWidth size="small" error={!orderNumber.trim()} helperText={!orderNumber.trim()?'Obligatorio':''} sx={pillFieldSx} />
          </Box>
          <Box minWidth={{ xs: '100%', sm: '200px' }} flexGrow={0} flexBasis={{ xs: '100%', sm: '200px' }}>
            <TextField label="Fecha" type="date" value={month} onChange={e=>setMonth(e.target.value)} fullWidth size="small" sx={pillFieldSx} />
          </Box>
          {selectedDriver && driverType==='antiguo' && (
            <Box minWidth={{ xs: '100%', sm: '160px' }} flexGrow={0} flexBasis={{ xs: '100%', sm: '160px' }}>
              <TextField label="Kms" type="number" size="small" value={kmsAntiguo} onChange={e=>{setKmsAntiguo(e.target.value); setResult(null);}} inputProps={{min:0}} fullWidth sx={pillFieldSx} />
              {kmsAntiguo && kmTramoAmount > 0 && (
                <Typography variant="caption" sx={{ mt:0.5, display:'block', fontWeight:600, color:'success.main', textAlign:'center' }}>+{kmTramoAmount.toFixed(2)}€</Typography>
              )}
            </Box>
          )}
        </Box>
        {/* Bloque Cliente/Ruta distanciero debajo */}
        {selectedDriver && driverType==='antiguo' && (
          <Box mt={2} display="flex" flexWrap="wrap" gap={2}>
            <Box minWidth={{ xs:'100%', md:'220px' }}>
              <Autocomplete
                options={distGrouped.map(g=>g.client_name)}
                value={calcClient || undefined}
                onChange={(_,v)=> setCalcClient(v||'')}
                size="small"
                disableClearable
                popupIcon={<ArrowDropDown sx={{ color:'text.secondary', fontSize:22 }} />}
                loading={loadingDist}
                noOptionsText={loadingDist? 'Cargando...' : 'Sin clientes'}
                renderInput={(p)=>(
                  <TextField
                    {...p}
                    label="Cliente"
                    placeholder="Selecciona"
                    sx={pillFieldSx}
                    InputProps={{
                      ...p.InputProps,
                      sx:{
                        ...pillFieldSx['& .MuiInputBase-root'],
                        '& .MuiAutocomplete-endAdornment':{ right:6 },
                        '& .MuiAutocomplete-popupIndicator':{
                          borderRadius:1,p:0,m:0,width:28,height:28,color:'text.secondary',background:'transparent',boxShadow:'none',
                          '&:hover':{ background:'transparent', color:'text.primary' }
                        }
                      }
                    }}
                  />
                )}
              />
            </Box>
            <Box flex={1} minWidth={{ xs:'100%', md:'340px' }}>
              <Autocomplete
                options={calcRoutes.filter(r=> !calcRouteFilter.trim() || r.destination.toLowerCase().includes(calcRouteFilter.toLowerCase()))}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  const tollInfo = calcClient === 'GOOGLE MAPS' && typeof option.uses_tolls === 'boolean' 
                    ? (option.uses_tolls ? ' (Peaje)' : ' (Sin peaje)') 
                    : '';
                  return option.destination + tollInfo;
                }}
                value={selectedCalcRoute || undefined}
                onInputChange={(_,val)=> setCalcRouteFilter(val)}
                onChange={(_,val)=> {
                  setSelectedCalcRoute(val || null);
                  if(val) setKmsAntiguo(String(val.km));
                }}
                renderOption={(props, option) => {
                  console.log('🎨 Renderizando opción:', option.destination, 'uses_tolls:', option.uses_tolls, 'calcClient:', calcClient);
                  return (
                    <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{option.destination}</span>
                      {calcClient === 'GOOGLE MAPS' && typeof option.uses_tolls === 'boolean' && (
                        <Chip 
                          size="small" 
                          label={option.uses_tolls ? "Peaje" : "Sin peaje"} 
                          sx={{ 
                            fontSize: 9, 
                            height: 18, 
                            bgcolor: option.uses_tolls ? 'rgba(255,152,0,0.15)' : 'rgba(46,125,50,0.15)', 
                            color: option.uses_tolls ? '#8a5200' : '#2e7d32', 
                            border: option.uses_tolls ? '1px solid rgba(255,152,0,0.4)' : '1px solid rgba(46,125,50,0.4)', 
                            fontWeight: 600 
                          }} 
                        />
                      )}
                    </Box>
                  );
                }}
                disableClearable
                disabled={!calcClient}
                popupIcon={<ArrowDropDown sx={{ color:'text.secondary', fontSize:22 }} />}
                loading={loadingCalcRoutes}
                size="small"
                noOptionsText={!calcClient? 'Selecciona cliente' : (loadingCalcRoutes? 'Cargando...' : 'Sin rutas')}
                renderInput={(p)=>(
                  <TextField
                    {...p}
                    label="Ruta (Distanciero)"
                    placeholder={calcClient? 'Buscar destino...' : 'Cliente primero'}
                    sx={pillFieldSx}
                    InputProps={{
                      ...p.InputProps,
                      sx:{
                        ...pillFieldSx['& .MuiInputBase-root'],
                        '& .MuiAutocomplete-endAdornment':{ right:6 },
                        '& .MuiAutocomplete-popupIndicator':{
                          borderRadius:1,p:0,m:0,width:28,height:28,color:'text.secondary',background:'transparent',boxShadow:'none',
                          '&:hover':{ background:'transparent', color:'text.primary' }
                        }
                      }
                    }}
                  />
                )}
              />
            </Box>
          </Box>
        )}
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

        {tab === 2 && (
          <Fade in timeout={600}>
            <Box>
              <Box sx={{
                display:'grid',
                gridTemplateColumns:{ xs:'1fr', lg: '1fr 360px' },
                gap:{ xs:2, md:3 }
              }}>
                {/* Columna principal */}
                <Paper sx={{ p:{ xs:2, sm:3 }, borderRadius:4, border:'1px solid #e2e5e9', background:'linear-gradient(180deg,#ffffff,#fafafa)' }}>
                  <Typography variant="h6" sx={{ fontWeight:700, mb:2 }}>Rutas</Typography>
                  {/* Fila 1: origen/destino */}
                  <Box sx={{ display:'flex', flexWrap:'wrap', gap:2, mb:2 }}>
          <Autocomplete
                      freeSolo
                      options={[]}
                      value={routeOrigin}
                      onInputChange={(_,val)=> setRouteOrigin(val?.toUpperCase() || '')}
                      onChange={(_,val)=>{ if(typeof val==='string') setRouteOrigin(val.toUpperCase()); }}
                      disableClearable
                      ListboxProps={{ style:{ maxHeight:260 } }}
                      noOptionsText={'Sin sugerencias automáticas'}
                      renderInput={(params)=>(
            <TextField {...params} variant="outlined" label="Origen" size="small" placeholder="Ciudad / Dirección" sx={pillFieldSx} />
                      )}
                      sx={{ flex:1, minWidth:250 }}
                    />
                    <Autocomplete
                      freeSolo
                      options={[]}
                      value={routeDestination}
                      onInputChange={(_,val)=> setRouteDestination(val?.toUpperCase() || '')}
                      onChange={(_,val)=>{ if(typeof val==='string') setRouteDestination(val.toUpperCase()); }}
                      disableClearable
                      ListboxProps={{ style:{ maxHeight:260 } }}
                      noOptionsText={'Sin sugerencias automáticas'}
                      renderInput={(params)=>(
            <TextField {...params} variant="outlined" label="Destino" size="small" placeholder="Ciudad / Dirección" sx={pillFieldSx} />
                      )}
                      sx={{ flex:1, minWidth:250 }}
                    />
                    <FormControlLabel 
                      control={
                        <Checkbox 
                          checked={useRouteCache}
                          onChange={(e) => setUseRouteCache(e.target.checked)}
                          size="small"
                        />
                      } 
                      label="Usar caché" 
                      sx={{ 
                        fontSize: '0.8rem', 
                        minWidth: 'auto',
                        '& .MuiFormControlLabel-label': { fontSize: '0.85rem' }
                      }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleCalculateRoute}
                      disabled={!routeOrigin.trim() || !routeDestination.trim()}
                      sx={{
                        alignSelf:'stretch',
                        minHeight:42,
                        px:3.2,
                        borderRadius:999,
                        fontWeight:700,
                        background:'linear-gradient(135deg,#501b36 0%,#7d3456 55%,#a15375 100%)',
                        '&:hover':{ background:'linear-gradient(135deg,#45152d 0%,#6a2949 55%,#8a4766 100%)' }
                      }}
                    >Calcular ruta</Button>
                    <Button
                      variant="outlined"
                      onClick={handleClearRoute}
                      disabled={!routeOrigin && !routeDestination && waypoints.length===0 && !routeStats}
                      sx={{
                        alignSelf:'stretch',
                        minHeight:42,
                        px:2.6,
                        borderRadius:999,
                        fontWeight:600,
                        textTransform:'none'
                      }}
                    >Limpiar</Button>
                  </Box>
                  {/* Fila 2: cadena + add tramo */}
                  <Box sx={{ display:'flex', flexWrap:'wrap', gap:1.5, alignItems:'center', mb: routeStats? 3 : 2 }}>
                    <Box sx={{ flex:1, minWidth:260, display:'flex', flexWrap:'wrap', gap:1, alignItems:'center' }}>
                      {(routeOrigin || routeDestination || waypoints.length>0) && renderRouteChain()}
                    </Box>
          <Autocomplete
                      freeSolo
                      options={[]}
                      value={nextStop}
                      onInputChange={(_,val)=> setNextStop(val?.toUpperCase() || '')}
                      onChange={(_,val)=> { if(typeof val==='string') setNextStop(val.toUpperCase()); }}
                      disableClearable
                      ListboxProps={{ style:{ maxHeight:260 } }}
                      noOptionsText={'Sin sugerencias automáticas'}
                      renderInput={(params)=>(
            <TextField {...params} variant="outlined" label="Nuevo tramo" size="small" placeholder="Añadir ciudad" sx={{ ...pillFieldSx, minWidth:200 }} />
                      )}
                      sx={{ minWidth:200 }}
                    />
                    <Tooltip title="Añadir tramo (usa el destino actual como origen)">
                      <span>
                        <IconButton
                          size="small"
                          disabled={!nextStop.trim() || !routeOrigin.trim() || !routeDestination.trim()}
                          onClick={()=>{ const val = nextStop.trim().toUpperCase(); if(!val) return; setWaypoints(prev=>[...prev, routeDestination]); setRouteDestination(val); setNextStop(''); setRouteStats(null); }}
                          sx={{
                            bgcolor: (!nextStop.trim() || !routeOrigin.trim() || !routeDestination.trim())? '#e0e0e0' : '#5c2340',
                            color:'#fff',
                            '&:hover':{ bgcolor:'#471a31' },
                            border:'1px solid #4f1e35'
                          }}
                        >
                          <Add fontSize="inherit" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    {waypoints.length>0 && (
                      <Tooltip title="Eliminar último tramo">
                        <IconButton
                          size="small"
                          onClick={()=>{ setRouteStats(null); setWaypoints(prev=>{ if(!prev.length) return prev; const cp=[...prev]; const last=cp.pop() as string; setRouteDestination(last); return cp; }); }}
                          sx={{ bgcolor:'#ffefdd', color:'#c77000', '&:hover':{ bgcolor:'#ffdcba' }, border:'1px solid #f2c38a' }}
                        >
                          <Undo fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                  {mapsError && <Alert severity="error" sx={{ mb:2 }}>
                    {mapsError}
                    <Button 
                      size="small" 
                      onClick={() => { 
                        setMapsError(null); 
                        setMapReady(false); 
                        setTimeout(initializeMap, 500); 
                      }} 
                      sx={{ ml:2 }}
                    >
                      Reintentar
                    </Button>
                  </Alert>}
                  <Box sx={{ height:680, borderRadius:3, overflow:'hidden', border:'1px solid #d0d4d8', position:'relative', background:'#eef1f4' }}>
                    {!mapReady && !mapsError && (
                      <Box sx={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Typography variant="body2" fontWeight={500}>Cargando mapa...</Typography>
                      </Box>
                    )}
                    <Box ref={mapDivRef} sx={{ position:'absolute', inset:0, minHeight:'400px' }} />
                  </Box>
                </Paper>
                {/* Panel lateral resumen siempre visible */}
                <Paper sx={{
                  pt:4,
                  pl:5,
                  pr:3,
                  pb:3,
                  borderRadius:5,
                  border:'1px solid #e2e5e9',
                  background:'#ffffff',
                  display:'flex',
                  flexDirection:'column',
                  gap:2,
                  position:'relative'
                }}>
                  <Box sx={{ display:'flex', alignItems:'center', gap:2, minHeight:68 }}>
                    <Box sx={{ display:'flex', flexDirection:'column', justifyContent:'center' }}>
                      <Typography sx={{ fontWeight:700, fontSize:34, lineHeight:1, letterSpacing:.5 }}>
                        {activeTotals.distanceLabel}
                      </Typography>
                      <Typography variant="body2" component="div" color="text.secondary" sx={{ fontWeight:500, mt:0.5, display:'flex', alignItems:'center', gap:1 }}>
                        {activeTotals.durationLabel}
                        {routeStats?.fromCache ? (
                          <Chip 
                            size="small" 
                            icon={<Storage sx={{ fontSize:14 }} />}
                            label="Caché" 
                            sx={{ 
                              fontSize:10, 
                              height:22, 
                              bgcolor:'rgba(46,125,50,0.15)', 
                              color:'#2e7d32', 
                              border:'1px solid rgba(46,125,50,0.35)', 
                              fontWeight:600,
                              '& .MuiChip-icon': { color:'#2e7d32', fontSize:'14px !important' }
                            }} 
                          />
                        ) : routeStats && (
                          <Chip 
                            size="small" 
                            icon={<Cloud sx={{ fontSize:14 }} />}
                            label="API Google" 
                            sx={{ 
                              fontSize:10, 
                              height:22, 
                              bgcolor:'rgba(33,150,243,0.15)', 
                              color:'#1976d2', 
                              border:'1px solid rgba(33,150,243,0.35)', 
                              fontWeight:600,
                              '& .MuiChip-icon': { color:'#1976d2', fontSize:'14px !important' }
                            }} 
                          />
                        )}
                      </Typography>
                      {routeStats?.route?.summary && (
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem', fontStyle: 'italic', mt: 0.5 }}>
                          Vía: {routeStats.route.summary}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ ml:'auto', display:'flex', flexDirection:'column', gap:1 }}>
                      <Tooltip title={routeOrigin.trim() && routeDestination.trim() ? 'Abrir en Google Maps' : 'Introduce origen y destino'}>
                        <span>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={!routeOrigin.trim() || !routeDestination.trim()}
                            onClick={()=>{ const url=`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(routeOrigin)}&destination=${encodeURIComponent(routeDestination)}&travelmode=driving`; window.open(url,'_blank','noopener'); }}
                            startIcon={<Map sx={{ fontSize:18 }} />}
                            sx={{
                              borderRadius:999,
                              fontWeight:600,
                              textTransform:'none',
                              minWidth:120,
                              px:2.2,
                              justifyContent:'center',
                              height:36
                            }}
                          >Maps</Button>
                        </span>
                      </Tooltip>
                      <Tooltip title={selectedDriver ? (driverType==='antiguo'? (routeStats? 'Copiar km a cálculo':'Calcule una ruta primero') :'Sólo conductores antiguos') : 'Selecciona un conductor'}>
                        <span>
                          <Button
                            size="small"
                            variant="contained"
                            disabled={!routeStats || !selectedDriver || driverType!=='antiguo'}
                            onClick={()=>{ if(!(routeStats && selectedDriver && driverType==='antiguo')) return; setKmsAntiguo(()=>{ const km=activeTotals.kmNumber; return km>100?km.toFixed(0):km.toFixed(1); }); setTab(0); }}
                            sx={{
                              borderRadius:999,
                              fontWeight:600,
                              textTransform:'none',
                              minWidth:120,
                              px:2.2,
                              justifyContent:'center',
                              height:36
                            }}
                          >Usar km</Button>
                        </span>
                      </Tooltip>
                      {/* Botón para guardar ruta manualmente - solo si caché está desactivado */}
                      {!useRouteCache && (
                        <Tooltip title={routeStats ? (routeStats.fromCache ? 'Esta ruta ya está guardada' : 'Guardar ruta en distanciero') : 'Calcule una ruta primero'}>
                          <span>
                            <Button
                              size="small"
                              variant="outlined"
                              disabled={!routeStats || routeStats.fromCache}
                              onClick={async ()=> {
                              if(!routeStats || routeStats.fromCache) return;
                              
                              try {
                                // Determinar si la ruta usa peajes
                                const usesTolls = routeStats.route?.legs?.some((leg: any) => 
                                  leg.steps?.some((step: any) => 
                                    step.html_instructions?.toLowerCase().includes('peaje') ||
                                    step.html_instructions?.toLowerCase().includes('toll') ||
                                    step.maneuver === 'toll-road'
                                  )
                                ) || false;
                                
                                // Calcular distancia total en km
                                const totalDistanceMeters = routeStats.route.legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0);
                                const totalDistanceKm = totalDistanceMeters / 1000;
                                
                                // Calcular duración total en segundos
                                const totalDurationSeconds = routeStats.route.legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0);
                                
                                // Crear el objeto de ruta para guardar según el modelo GoogleRouteCreate
                                const routeData = {
                                  origin: routeOrigin.trim(),
                                  destination: routeDestination.trim(),
                                  mode: 'DRIVING',
                                  km: parseFloat(totalDistanceKm.toFixed(2)),
                                  duration_sec: totalDurationSeconds,
                                  polyline: routeStats.route.overview_polyline?.points || null,
                                  variant: usesTolls ? 'TOLLS' : 'NOTOLLS',
                                  uses_tolls: usesTolls
                                };
                                
                                console.log('Guardando ruta manualmente:', routeData);
                                
                                const response = await fetch('/api/distancieros/google/route', {
                                  method: 'POST',
                                  headers: { 
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                  },
                                  body: JSON.stringify(routeData)
                                });
                                
                                if (response.ok) {
                                  setSnackbar({ open: true, message: `Ruta guardada correctamente (${usesTolls ? 'con peaje' : 'sin peaje'})`, severity: 'success' });
                                  
                                  // Marcar como guardado desde caché para deshabilitar el botón
                                  setRouteStats((prev: any) => prev ? { ...prev, fromCache: true } : null);
                                } else {
                                  const errorData = await response.json();
                                  throw new Error(errorData.detail || 'Error al guardar la ruta');
                                }
                              } catch (error) {
                                console.error('Error saving route:', error);
                                setSnackbar({ open: true, message: `Error al guardar la ruta: ${error instanceof Error ? error.message : 'Error desconocido'}`, severity: 'error' });
                              }
                            }}
                            startIcon={<Save sx={{ fontSize:16 }} />}
                            sx={{
                              borderRadius:999,
                              fontWeight:600,
                              textTransform:'none',
                              minWidth:120,
                              px:2.2,
                              justifyContent:'center',
                              height:36,
                              borderColor: routeStats?.fromCache ? '#e0e0e0' : '#4caf50',
                              color: routeStats?.fromCache ? '#9e9e9e' : '#4caf50',
                              '&:hover': {
                                borderColor: routeStats?.fromCache ? '#e0e0e0' : '#45a049',
                                backgroundColor: routeStats?.fromCache ? 'transparent' : 'rgba(76, 175, 80, 0.04)'
                              }
                            }}
                          >Guardar</Button>
                        </span>
                      </Tooltip>
                      )}
                    </Box>
                  </Box>
                  <Divider />
                  {/* Indicador de fuente de información */}
                  {routeStats && (
                    <Box sx={{ px:1, py:0.5, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {routeStats.fromCache ? (
                        <Box sx={{ display:'flex', alignItems:'center', gap:0.5, fontSize:11, color:'#2e7d32', fontWeight:600 }}>
                          <Storage sx={{ fontSize:14 }} />
                          <span>Datos desde distanciero local</span>
                        </Box>
                      ) : (
                        <Box sx={{ display:'flex', alignItems:'center', gap:0.5, fontSize:11, color:'#1976d2', fontWeight:600 }}>
                          <Cloud sx={{ fontSize:14 }} />
                          <span>Datos desde Google Maps API</span>
                        </Box>
                      )}
                    </Box>
                  )}
                  {routeStats && <Divider />}
                  {/* Lista de opciones de rutas ocultada: selección sólo haciendo clic en la polilínea del mapa */}
                  {routeStats ? (
                    <Box sx={{ display:'flex', flexDirection:'column', gap:1, overflowY:'auto' }}>
          {routeStats.legs.map((lg:any,i:number)=>(
                        <Paper
                          key={i}
                          elevation={0}
                          sx={{
                            p:1.1,
                            border:'1px solid #eceff2',
                            borderRadius:3,
                            display:'flex',
                            flexDirection:'column',
                            gap:0.55,
            background:'#fbfcfd',
            opacity: disabledLegs.has(i)? 0.45 : 1
                          }}
                        >
                          <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                            <Chip
                              size="small"
                              label={`T${i+1}`}
                              sx={{
                                fontSize:10,
                                height:22,
                                px:0.9,
                                borderRadius:10,
                                fontWeight:600,
                                letterSpacing:'.5px',
                                bgcolor:'rgba(80,27,54,0.15)',
                                color:'#40142a',
                                border:'1px solid rgba(80,27,54,0.25)',
                                backdropFilter:'blur(4px)',
                                '& .MuiChip-label':{ px:0.5, pt:'1px' }
                              }}
                            />
                            <Typography sx={{ fontSize:13, fontWeight:600, flex:1, minWidth:120, textDecoration: disabledLegs.has(i)?'line-through':'none' }}>{lg.from} → {lg.to}</Typography>
                            <Tooltip title={disabledLegs.has(i)?'Incluir tramo':'Descontar tramo'}>
                              <IconButton
                                size="small"
                                disableRipple
                                onClick={()=>toggleDiscountLeg(i)}
                                sx={{
                                  color: disabledLegs.has(i)? '#2e7d32':'#5c2340',
                                  p:0.4,
                                  ml:1,
                                  background:'transparent',
                                  boxShadow:'none',
                                  '&:hover':{ background:'transparent', color: disabledLegs.has(i)? '#1b5e20':'#7d3456' },
                                  '&:active':{ transform:'scale(.9)' },
                                  '&:focus':{ outline:'none' }
                                }}
                              >
                                {disabledLegs.has(i)? <CheckCircle sx={{ fontSize:20 }} /> : <RemoveCircleOutline sx={{ fontSize:20 }} />}
                              </IconButton>
                            </Tooltip>
                          </Box>
                          <Box sx={{ display:'flex', gap:0.7, flexWrap:'wrap' }}>
                            <Chip
                              size="small"
                              label={lg.distance}
                              sx={{
                                fontSize:10,
                                height:22,
                                px:1,
                                borderRadius:12,
                                fontWeight:600,
                                bgcolor:'linear-gradient(135deg, rgba(80,27,54,0.07), rgba(80,27,54,0.04))',
                                color:'#3a1828',
                                border:'1px solid rgba(80,27,54,0.18)',
                                '& .MuiChip-label':{ px:0.75, pt:'1px' }
                              }}
                            />
                            <Chip
                              size="small"
                              label={lg.duration}
                              sx={{
                                fontSize:10,
                                height:22,
                                px:1,
                                borderRadius:12,
                                fontWeight:600,
                                bgcolor:'linear-gradient(135deg, rgba(80,27,54,0.07), rgba(80,27,54,0.04))',
                                color:'#3a1828',
                                border:'1px solid rgba(80,27,54,0.18)',
                                '& .MuiChip-label':{ px:0.75, pt:'1px' }
                              }}
                            />
                            {routeStats.usesTolls ? (
                              <Chip
                                size="small"
                                icon={<Toll sx={{ fontSize:14 }} />}
                                label="Peaje"
                                sx={{
                                  fontSize:10,
                                  height:22,
                                  pl:0.4,
                                  pr:0.9,
                                  borderRadius:12,
                                  fontWeight:600,
                                  bgcolor:'rgba(183,59,26,0.12)',
                                  color:'#862e13',
                                  border:'1px solid rgba(183,59,26,0.35)',
                                  '& .MuiChip-icon':{ ml:'-2px', color:'inherit' },
                                  '& .MuiChip-label':{ pt:'1px' }
                                }}
                              />
                            ) : (
                              <Chip
                                size="small"
                                label="Sin peaje"
                                sx={{
                                  fontSize:10,
                                  height:22,
                                  px:1,
                                  borderRadius:12,
                                  fontWeight:600,
                                  bgcolor:'rgba(46,125,50,0.14)',
                                  color:'#2e7d32',
                                  border:'1px solid rgba(46,125,50,0.35)',
                                  '& .MuiChip-label':{ pt:'1px' }
                                }}
                              />
                            )}
                          </Box>
                        </Paper>
                      ))}
                      {/* Chips país */}
                      {/* Chips de países ocultados según petición */}
                    </Box>
                  ) : (
                    <Box sx={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', py:4 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth:200, fontWeight:500 }}>
                        Introduce origen y destino y pulsa "Calcular ruta" para ver el resumen aquí.
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Box>
            </Box>
          </Fade>
        )}

        {tab === 3 && (
          <Fade in timeout={600}>
            <Box>
              <Paper sx={{ p:{ xs:2, sm:3}, borderRadius:3, border:'1px solid #e0e0e0', background:'linear-gradient(180deg,#ffffff,#fafafa)', display:'flex', flexDirection:{ xs:'column', md:'row'}, gap:3 }}>
                <Box sx={{ width:{ xs:'100%', md:300}, flexShrink:0, display:'flex', flexDirection:'column', gap:1 }}>
                  <Typography variant="h6" sx={{ fontWeight:700, mb:1 }}>Clientes</Typography>
                  <Box sx={{ maxHeight:500, overflowY:'auto', pr:1, mt:1 }}>
                    {loadingDist && <Typography variant="body2">Cargando...</Typography>}
                    {!loadingDist && distGrouped.length===0 && <Typography variant="body2" color="text.secondary">Sin datos</Typography>}
                    {distGrouped.map(c => (
                      <DistClientCard key={c.client_name} data={c} selected={c.client_name===selectedClient} onSelect={()=> setSelectedClient(c.client_name)} />
                    ))}
                  </Box>
                </Box>
                <Box sx={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
                  <Box sx={{ mb:2 }}>
                    <Box sx={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:1.2 }}>
                      <Typography variant="h6" sx={{ fontWeight:700, mr:1 }}>{selectedClient || 'Selecciona un cliente'}</Typography>
                      {selectedClient && (
                        <>
                          <Chip size="small" label={showOnlyActiveRoutes? 'Activas':'Todas'} onClick={()=>setShowOnlyActiveRoutes(p=>!p)} sx={{ cursor:'pointer', fontWeight:600 }} />
              <Box sx={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:1, p:0.5, pl:0, pr:0 }}>
                            <TextField
                              size="small"
                              placeholder="Buscar destino"
                              value={distFilterText}
                              onChange={e=> setDistFilterText(e.target.value)}
                              sx={{ width:230, ...pillFieldSx }}
                            />
                            <Button
                              size="small"
                              variant="contained"
                onClick={()=>{ setDistFilterText(''); }}
                disabled={!distFilterText}
                              sx={{ textTransform:'none', borderRadius:999, fontWeight:600, background:'linear-gradient(135deg,#5c2340,#7d3456)', '&:hover':{ background:'linear-gradient(135deg,#4a1d33,#6b2d4d)'} }}
                            >Limpiar</Button>
                          </Box>
                        </>
                      )}
                    </Box>
          {selectedClient && distFilterText && (
                      <Box sx={{ mt:1, display:'flex', flexWrap:'wrap', gap:0.8 }}>
            <Chip size="small" label={`Texto: "${distFilterText}"`} onDelete={()=>setDistFilterText('')} sx={{ bgcolor:'#eef2f6' }} />
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ flex:1, position:'relative', borderRadius:'20px', border:'1px solid #d2d6da', overflow:'hidden', background:'#fff', boxShadow:'0 3px 10px rgba(0,0,0,0.06)' }}>
                    {/* Header columnas */}
                    <Box sx={{ display:'flex', alignItems:'stretch', background:'linear-gradient(90deg,#eceff3,#e3e6ea)', borderBottom:'1px solid #c8ccd0', borderRadius:'20px 20px 0 0' }}>
                      {distColumns.map((col, idx)=>{
                        const sorted = distSortKey===col.key && distSortDir!=='';
                        const isFlexible = !col.width;
                        return (
                          <Box key={col.key}
                            onClick={(e)=>{ if((e.target as HTMLElement).dataset?.resize) return; setDistSortKey(col.key===distSortKey && distSortDir===''? '' : col.key); setDistSortDir(prev=>{ if(col.key!==distSortKey) return 'asc'; if(prev==='asc') return 'desc'; if(prev==='desc') return ''; return 'asc'; }); }}
                            onDoubleClick={()=> autoSizeColumnPreciseDist(col.key)}
                            sx={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', gap:0.5, px:1.1, py:0.6, fontSize:12.5, fontWeight:600, cursor:'pointer', userSelect:'none', color: sorted? '#fff':'#2d3135', background: sorted? 'linear-gradient(90deg,#5c2340,#7d3456)':'transparent', borderRight: idx<distColumns.length-1? '1px solid #d0d4d8':'none', flex: isFlexible? '1 1 auto':`0 0 ${col.width}px`, minWidth: isFlexible? 140: col.width, '&:hover':{ background: sorted? 'linear-gradient(90deg,#5c2340,#7d3456)': 'rgba(255,255,255,0.35)' }, transition:'background .25s,color .25s' }}
                            data-dist-col-header={col.key}
                          >
                            <Box data-dist-col-header-inner={col.key} sx={{ display:'flex', alignItems:'center', gap:0.4, width:'100%', justifyContent:'center', pr: sorted ? 0 : 0 }}>
                              <span style={{ whiteSpace:'nowrap', lineHeight:1 }}>{col.label}</span>
                              {distSortKey===col.key && distSortDir==='asc' && <ArrowUpward sx={{ fontSize:14 }} />}
                              {distSortKey===col.key && distSortDir==='desc' && <ArrowDownward sx={{ fontSize:14 }} />}
                            </Box>
                            {col.width && (
                              <Box data-resize onMouseDown={(e)=> beginResizeDist(e,col.key,col.width)} onDoubleClick={(e)=>{ e.stopPropagation(); autoSizeColumnPreciseDist(col.key); }} sx={{ position:'absolute', top:0, right:0, width:6, height:'100%', cursor:'col-resize', '&:hover':{ background:'rgba(0,0,0,0.08)' } }} />
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                    {/* Body */}
                    <Box ref={routesBodyRef} sx={{ height:DIST_GRID_HEIGHT, overflowY:'auto', fontSize:13, background:'#fbfcfd', position:'relative' }}>
                      {(!selectedClient) && (
                        <Box sx={{ p:4, textAlign:'center', color:'text.secondary' }}>Selecciona un cliente para ver sus rutas.</Box>
                      )}
                      {selectedClient && loadingRoutes && (
                        <Box sx={{ p:4, textAlign:'center' }}>Cargando...</Box>
                      )}
                      {selectedClient && !loadingRoutes && clientRoutes.length===0 && (
                        <Box sx={{ p:4, textAlign:'center', color:'text.secondary' }}>Sin rutas para este cliente.</Box>
                      )}
                      {selectedClient && !loadingRoutes && clientRoutes.length>0 && (()=>{
                        // Filtrado
                        let list = clientRoutes.filter(r => {
                          const txt = distFilterText.trim().toLowerCase();
                          if(txt && !(r.destination || '').toLowerCase().includes(txt)) return false;
                          return true;
                        });
                        // Orden
                        if(distSortKey && distSortDir){
                          list = [...list].sort((a:any,b:any)=>{
                            const av = (a as any)[distSortKey];
                            const bv = (b as any)[distSortKey];
                            if(av==null && bv==null) return 0; if(av==null) return 1; if(bv==null) return -1;
                            if(typeof av==='number' && typeof bv==='number') return distSortDir==='asc'? av-bv : bv-av;
                            return distSortDir==='asc'? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
                          });
                        }
                        return list.map((r,idx)=>(
                          <Box key={r.id} sx={{ display:'flex', alignItems:'stretch', background: idx%2===0? '#ffffff':'#f7f9fb', borderBottom:'1px solid #e3e7ea', opacity: r.active?1:0.5 }}>
                            {distColumns.map(col => {
                              let content: React.ReactNode;
                              switch(col.key){
                                case 'destination': 
                                  content = (
                                    <Box sx={{ display:'flex', alignItems:'center', gap:1, minWidth:0 }}>
                                      <span style={{ flex:'1 1 auto', minWidth:0, overflow:'hidden', textOverflow:'ellipsis' }}>{r.destination}</span>
                                      {selectedClient === 'GOOGLE MAPS' && (r as any).uses_tolls === true && (
                                        <Chip size="small" label="Peaje" sx={{ fontSize:10, height:20, bgcolor:'rgba(255,152,0,0.15)', color:'#8a5200', border:'1px solid rgba(255,152,0,0.4)', fontWeight:600 }} />
                                      )}
                                      {selectedClient === 'GOOGLE MAPS' && (r as any).uses_tolls === false && (
                                        <Chip size="small" label="Sin peaje" sx={{ fontSize:10, height:20, bgcolor:'rgba(46,125,50,0.15)', color:'#2e7d32', border:'1px solid rgba(46,125,50,0.4)', fontWeight:600 }} />
                                      )}
                                    </Box>
                                  ); 
                                  break;
                                case 'km': content = r.km; break;
                                case 'uses_tolls': 
                                  content = (r as any).uses_tolls === true 
                                    ? <Chip size="small" label="Peaje" sx={{ fontSize:10, height:22, bgcolor:'rgba(255,152,0,0.15)', color:'#8a5200', border:'1px solid rgba(255,152,0,0.4)', fontWeight:600 }} />
                                    : (r as any).uses_tolls === false
                                      ? <Chip size="small" label="Sin peaje" sx={{ fontSize:10, height:22, bgcolor:'rgba(46,125,50,0.15)', color:'#2e7d32', border:'1px solid rgba(46,125,50,0.4)', fontWeight:600 }} />
                                      : '—';
                                  break;
                                case 'active': content = r.active? <Chip size="small" color="success" label="Activa"/> : <Chip size="small" label="Inactiva"/>; break;
                                case 'notes': content = r.notes || ''; break;
                                default: content = (r as any)[col.key];
                              }
                              return (
                                <Box key={col.key} sx={{ flex: col.width? `0 0 ${col.width}px` : '1 1 auto', minWidth: col.width? col.width : 140, padding:'7px 10px', display:'flex', alignItems:'center', justifyContent: col.align==='right'?'flex-end':(col.align==='center'?'center':'flex-start'), fontSize:13, gap:0.4, overflow:'hidden' }}>
                                  <span data-dist-col-cell-inner={col.key} style={{ display:'inline-block', whiteSpace: col.key==='notes'? 'normal':'nowrap', maxWidth:'100%' }}>{content}</span>
                                </Box>
                              );
                            })}
                          </Box>
                        ));
                      })()}
                      {loadingRoutes && clientRoutes.length>0 && (
                        <Box sx={{ p:1.5, textAlign:'center', fontSize:12, color:'text.secondary' }}>Cargando...</Box>
                      )}
                    </Box>
                    {/* Footer resumen */}
                    {selectedClient && !loadingRoutes && (
                      <Box px={1.75} py={1.1} display="flex" flexWrap="wrap" alignItems="center" gap={2} sx={{ fontSize:12, background:'linear-gradient(90deg,#f9fafb,#f2f4f6)', borderTop:'1px solid #e3e6e8' }}>
                        {(() => {
                          // Reaplicar filtros para contar visibles
                          const filtered = clientRoutes.filter(r => {
                            const txt = distFilterText.trim().toLowerCase();
                            if(txt && !(r.destination || '').toLowerCase().includes(txt)) return false;
                            return true;
                          });
                          return (
                            <>
                              <Typography variant="caption" sx={{ fontWeight:600 }}>{filtered.length} / {routesTotal} ruta(s)</Typography>
                              <Typography variant="caption">Activas: <strong>{filtered.filter(r=>r.active).length}</strong></Typography>
                            </>
                          );
                        })()}
                        <Typography variant="caption" sx={{ ml:'auto' }}>Actualizado {new Date().toLocaleTimeString()}</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Paper>
            </Box>
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
                    value={filterUser || undefined}
                    onChange={(_,v)=>setFilterUser(v)}
                    disableClearable
                    popupIcon={<ArrowDropDown sx={{ color:'text.secondary', fontSize:22 }} />}
                    getOptionLabel={(o)=> (o?.full_name || `${o?.first_name||''} ${o?.last_name||''}`).trim()}
                    renderInput={(p)=>(
                      <TextField
                        {...p}
                        label="Conductor"
                        placeholder="Todos"
                        sx={pillFieldSx}
                        InputProps={{
                          ...p.InputProps,
                          sx:{
                            ...pillFieldSx['& .MuiInputBase-root'],
                            '& .MuiAutocomplete-endAdornment':{ right:6 },
                            '& .MuiAutocomplete-popupIndicator':{
                              borderRadius:1,
                              p:0,m:0,width:26,height:26,
                              color:'text.secondary',
                              background:'transparent',
                              boxShadow:'none',
                              '&:hover':{ background:'transparent', color:'text.primary' },
                              '&:active':{ background:'transparent' }
                            }
                          }
                        }}
                      />
                    )}
                  />
                </Box>
                <TextField select size="small" label="Tipo" value={filterWorkerType} onChange={e=>setFilterWorkerType(e.target.value)} sx={{ width:140, ...pillFieldSx }}>
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="antiguo">Antiguo</MenuItem>
                  <MenuItem value="nuevo">Nuevo</MenuItem>
                </TextField>
                <TextField size="small" label="OC / Albarán" value={filterOrder} onChange={e=>setFilterOrder(e.target.value)} sx={{ width:160, ...pillFieldSx }} />
                <TextField size="small" type="date" label="Desde" InputLabelProps={{ shrink:true }} value={filterStart} onChange={e=>setFilterStart(e.target.value)} sx={pillFieldSx} />
                <TextField size="small" type="date" label="Hasta" InputLabelProps={{ shrink:true }} value={filterEnd} onChange={e=>setFilterEnd(e.target.value)} sx={pillFieldSx} />
        <Button
                  variant="contained"
                  size="small"
                  onClick={()=>{setFilterUser(null);setFilterWorkerType('');setFilterOrder('');setFilterStart('');setFilterEnd(''); loadRecords();}}
                  sx={{
                    borderRadius:999,
                    textTransform:'none',
                    fontWeight:600,
                    letterSpacing:0.4,
                    px:2.6,
                    minHeight:42,
                    lineHeight:1.2,
                    border:'none',
                    color:'#fff',
                    background:'linear-gradient(135deg,#5c2340 0%, #7d3456 55%, #a15375 100%)',
                    boxShadow:'0 2px 6px rgba(0,0,0,0.18)',
                    '&:hover':{
                      background:'linear-gradient(135deg,#662945 0%, #8a3b5f 55%, #b36588 100%)',
                      boxShadow:'0 3px 8px rgba(0,0,0,0.22)'
                    },
                    '&:active':{
                      background:'linear-gradient(135deg,#4d1f34 0%, #6d2548 55%, #8f4767 100%)',
                      boxShadow:'0 2px 4px rgba(0,0,0,0.25) inset'
                    },
                    '&.Mui-disabled':{ opacity:.5 },
                    '&.Mui-focusVisible':{ outline:'none', boxShadow:'0 0 0 3px rgba(92,35,64,0.35), 0 2px 6px rgba(0,0,0,0.18)' }
                  }}
                >Limpiar</Button>
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
                      <Tooltip title="Exportar Excel">
                        <span>
                          <IconButton
                            size="medium"
                            onClick={exportExcel}
                            disabled={records.length===0}
                            disableRipple
                            disableFocusRipple
                            sx={{
                              color:'#1D6F42',
                              background:'rgba(29,111,66,0.08)',
                              boxShadow:'0 0 0 1px #cfd3d7',
                              border:'none',
                              width:46,
                              height:42,
                              borderRadius:12,
                              display:'flex',
                              alignItems:'center',
                              justifyContent:'center',
                              '& svg':{ width:24, height:24 },
                              '&:hover':{ background:'rgba(29,111,66,0.12)', color:'#17894e' },
                              '&:active':{ background:'rgba(29,111,66,0.18)', transform:'scale(0.94)' },
                              '&:focus,&:focus-visible':{ outline:'none', background:'rgba(29,111,66,0.15)' },
                              '& .MuiTouchRipple-root':{ display:'none' },
                              '&.Mui-disabled':{ color:'#1D6F4255', background:'rgba(29,111,66,0.05)' }
                            }}
                          >
                            <ExcelIcon size={22} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Exportar PDF">
                        <span>
                          <IconButton
                            size="medium"
                            onClick={exportPDF}
                            disabled={records.length===0}
                            disableRipple
                            disableFocusRipple
                            sx={{
                              color:'#d32f2f',
                              background:'rgba(211,47,47,0.08)',
                              boxShadow:'0 0 0 1px #cfd3d7',
                              border:'none',
                              width:46,
                              height:42,
                              borderRadius:12,
                              display:'flex',
                              alignItems:'center',
                              justifyContent:'center',
                              '& svg':{ fontSize:24 },
                              '&:hover':{ background:'rgba(211,47,47,0.12)', color:'#b71c1c' },
                              '&:active':{ background:'rgba(211,47,47,0.18)', transform:'scale(0.94)' },
                              '&:focus,&:focus-visible':{ outline:'none', background:'rgba(211,47,47,0.15)' },
                              '& .MuiTouchRipple-root':{ display:'none' },
                              '&.Mui-disabled':{ color:'#d32f2f55', background:'rgba(211,47,47,0.05)' }
                            }}
                          >
                            <PictureAsPdf fontSize="inherit" />
                          </IconButton>
                        </span>
                      </Tooltip>

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
              <Box mt={3} display="flex" alignItems="center" gap={2}>
                <Fade in={Boolean(saveMessage)} mountOnEnter unmountOnExit>
                  <Typography variant="body2" color={saveMessage && saveMessage.startsWith('Error')? 'error':'success.main'} sx={{ fontWeight:500 }}>
                    {saveMessage}
                  </Typography>
                </Fade>
                <Box sx={{ ml:'auto' }}>
                  <Button variant="outlined" disabled={saving || !orderNumber.trim()} onClick={handleSave} sx={{ minWidth:128 }}>
                    {saving? 'Guardando...' : 'Guardar'}
                  </Button>
                </Box>
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
      {/* Snackbar para mensajes de rutas */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={3500} 
        onClose={() => setSnackbar(prev => ({...prev, open: false}))}
        anchorOrigin={{ vertical:'top', horizontal:'center' }}
      >
        <MuiAlert 
          elevation={6} 
          variant="filled" 
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({...prev, open: false}))}
          sx={{ fontWeight:600 }}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>

      {/* Snackbar original para registros */}
      <Snackbar open={showSuccess} autoHideDuration={2500} onClose={()=>setShowSuccess(false)} anchorOrigin={{ vertical:'top', horizontal:'center' }}>
        <MuiAlert elevation={6} variant="filled" severity="success" onClose={()=>setShowSuccess(false)} sx={{ fontWeight:600 }}>
          Registro guardado correctamente
        </MuiAlert>
      </Snackbar>
    </>
  );
};

export default Dietas;
