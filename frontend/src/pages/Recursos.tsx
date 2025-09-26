import React from 'react';
import { 
  Box, Paper, Typography, Fade, GlobalStyles, ToggleButtonGroup, ToggleButton, 
  Button, TextField, Stack, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody, Chip,
  Pagination, Card, CardContent, Divider, CircularProgress, Snackbar, Alert, Skeleton
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ModernModal, ModernButton } from '../components/ModernModal';
import { useAuth } from '../hooks/useAuth';
import { useDeviceType } from '../hooks/useDeviceType';
import { LocalGasStation, CreditCard, Info, Add, Edit, Delete, PhoneIphone } from '@mui/icons-material';
import { resourcesAPI, FuelCardRecord, ViaTRecord } from '../services/api';

// Página de Recursos: base inicial con banner y estructura de pestañas (Gasoil, Via T)
// Se ampliará posteriormente con lógica de carga desde backend/APIs
export const Recursos: React.FC = () => {
  const [tab, setTab] = React.useState<'gasolina' | 'viat' | 'telefonos'>(() => {
    // Recuperar la pestaña activa desde localStorage o usar 'gasolina' por defecto
    const savedTab = localStorage.getItem('recursos-active-tab');
    return (savedTab === 'gasolina' || savedTab === 'viat' || savedTab === 'telefonos') ? (savedTab as any) : 'gasolina';
  });
  const { user } = useAuth();
  const { isMobile } = useDeviceType();
  const role = user?.role;
  const canAdd = role === 'MASTER_ADMIN' || role === 'ADMINISTRADOR' || role === 'ADMINISTRACION';
  
  // Tipos locales (futuro: mover a types/recursos.ts y reemplazar por datos de backend)
  // Estados provenientes de backend
  const [gasCardsAll, setGasCardsAll] = React.useState<FuelCardRecord[]>([]); // cache inicial fuel cards
  const [gasCards, setGasCards] = React.useState<FuelCardRecord[]>([]); // resultado visible (búsqueda o all)
  const [viaTsAll, setViaTsAll] = React.useState<ViaTRecord[]>([]);
  const [viaTs, setViaTs] = React.useState<ViaTRecord[]>([]);
  const [loadingGas, setLoadingGas] = React.useState(false);
  const [loadingViaT, setLoadingViaT] = React.useState(false);
  const [errorGas, setErrorGas] = React.useState<string|undefined>();
  const [errorViaT, setErrorViaT] = React.useState<string|undefined>();
  const [savingGas, setSavingGas] = React.useState(false);
  const [savingViaT, setSavingViaT] = React.useState(false);
  const [snack, setSnack] = React.useState<{open:boolean; msg:string; type:'success'|'error'}>({open:false,msg:'',type:'success'});

  // (Modal de mantenimiento eliminado)

  // Búsquedas (draft vs applied)
  const [gasSearchDraft, setGasSearchDraft] = React.useState({ pan:'', matricula:'' });
  const [gasSearch, setGasSearch] = React.useState({ pan:'', matricula:'' });
  const [viaTSearchDraft, setViaTSearchDraft] = React.useState({ numeroTelepeaje:'', pan:'', matricula:'' });
  const [viaTSearch, setViaTSearch] = React.useState({ numeroTelepeaje:'', pan:'', matricula:'' });

  // Control para versión móvil: obligar a realizar una búsqueda antes de mostrar resultados
  const [hasSearchedGas, setHasSearchedGas] = React.useState(false);
  const [hasSearchedViaT, setHasSearchedViaT] = React.useState(false);

  // Estados de animación de búsqueda (delay artificial)
  const [searchingGas, setSearchingGas] = React.useState(false);
  const [searchingViaT, setSearchingViaT] = React.useState(false);
  const gasSearchTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const viaTSearchTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyGasSearch = async () => {
    if(gasSearchTimeout.current) clearTimeout(gasSearchTimeout.current);
    setHasSearchedGas(true);
    const applied = { ...gasSearchDraft };
    setGasSearch(applied);
    // Si no hay filtros, restaurar lista cache sin llamar al backend
    if(!applied.pan.trim() && !applied.matricula.trim()){
      setGasCards(gasCardsAll);
      setSearchingGas(false);
      return;
    }
    const params: { pan?:string; matricula?:string; page:number; page_size:number } = { page:1, page_size:200 };
    if(applied.pan.trim()) params.pan = applied.pan.trim();
    if(applied.matricula.trim()) params.matricula = applied.matricula.trim();
    let startTime = 0;
    try {
      if(isMobile){
        setSearchingGas(true); startTime = Date.now();
      }
      const res = await resourcesAPI.listFuelCards(params);
      setGasCards(res.items);
    } catch(e:any){
      setErrorGas(e?.response?.data?.detail || 'Error buscando tarjetas');
      setGasCards([]);
    } finally {
      if(isMobile){
        const MIN=300; const elapsed = Date.now()-startTime; const finish=()=>setSearchingGas(false);
        if(elapsed<MIN) gasSearchTimeout.current = setTimeout(finish, MIN-elapsed); else finish();
      } else { setSearchingGas(false); }
    }
  };
  const clearGasSearch = () => {
    setGasSearchDraft({ pan:'', matricula:'' });
    setGasSearch({ pan:'', matricula:'' });
    setSearchingGas(false);
    if(gasSearchTimeout.current) clearTimeout(gasSearchTimeout.current);
    if(isMobile){
      // En móvil se oculta la lista hasta que el usuario vuelva a pulsar Buscar
      setHasSearchedGas(false);
      setGasCards(gasCardsAll); // mantenemos cache actualizada internamente
    } else {
      // En escritorio mostramos todo inmediatamente
      setGasCards(gasCardsAll);
      setHasSearchedGas(true); // para que se vea la lista completa
    }
  };
  const applyViaTSearch = async () => {
    if(viaTSearchTimeout.current) clearTimeout(viaTSearchTimeout.current);
    setHasSearchedViaT(true);
    const applied = { ...viaTSearchDraft };
    setViaTSearch(applied);
    const params: { numero_telepeaje?:string; pan?:string; matricula?:string; page:number; page_size:number } = { page:1, page_size:200 };
    if(applied.numeroTelepeaje.trim()) params.numero_telepeaje = applied.numeroTelepeaje.trim();
    if(applied.pan.trim()) params.pan = applied.pan.trim();
    if(applied.matricula.trim()) params.matricula = applied.matricula.trim();
    let startTime = 0;
    try {
      if(isMobile){
        setSearchingViaT(true);
        startTime = Date.now();
      }
      const res = await resourcesAPI.listViaTDevices(params);
      setViaTs(res.items);
    } catch(e:any){
      setErrorViaT(e?.response?.data?.detail || 'Error buscando Via T');
      setViaTs([]);
    } finally {
      if(isMobile){
        const MIN = 300;
        const elapsed = Date.now() - startTime;
        const finish = () => setSearchingViaT(false);
        if(elapsed < MIN) viaTSearchTimeout.current = setTimeout(finish, MIN - elapsed); else finish();
      } else {
        setSearchingViaT(false);
      }
    }
  };
  const clearViaTSearch = () => {
    setViaTSearchDraft({ numeroTelepeaje:'', pan:'', matricula:'' });
    setViaTSearch({ numeroTelepeaje:'', pan:'', matricula:'' });
    setSearchingViaT(false);
    if(viaTSearchTimeout.current) clearTimeout(viaTSearchTimeout.current);
    if(isMobile){
      setHasSearchedViaT(false);
      setViaTs(viaTsAll);
    } else {
      setViaTs(viaTsAll);
      setHasSearchedViaT(true);
    }
  };

  // Funciones auxiliares para manejar eliminación de filtros individuales
  const handleRemoveGasFilter = async (filterType: 'pan' | 'matricula') => {
    const newSearch = {...gasSearch, [filterType]: ''};
    setGasSearch(newSearch);
    setGasSearchDraft(newSearch);
    
    // Si no quedan filtros, restaurar lista completa, sino hacer nueva búsqueda
    if (!newSearch.pan.trim() && !newSearch.matricula.trim()) {
      setGasCards(gasCardsAll);
      setSearchingGas(false);
    } else {
      // Ejecutar búsqueda con los filtros restantes
      const params: { pan?:string; matricula?:string; page:number; page_size:number } = { page:1, page_size:200 };
      if(newSearch.pan.trim()) params.pan = newSearch.pan.trim();
      if(newSearch.matricula.trim()) params.matricula = newSearch.matricula.trim();
      
      try {
        if(isMobile) setSearchingGas(true);
        const res = await resourcesAPI.listFuelCards(params);
        setGasCards(res.items);
      } catch(e:any) {
        setErrorGas(e?.response?.data?.detail || 'Error buscando tarjetas');
        setGasCards([]);
      } finally {
        setSearchingGas(false);
      }
    }
  };

  const handleRemoveViaTFilter = async (filterType: 'numeroTelepeaje' | 'pan' | 'matricula') => {
    const newSearch = {...viaTSearch, [filterType]: ''};
    setViaTSearch(newSearch);
    setViaTSearchDraft(newSearch);
    
    // Si no quedan filtros, restaurar lista completa, sino hacer nueva búsqueda
    if (!newSearch.numeroTelepeaje.trim() && !newSearch.pan.trim() && !newSearch.matricula.trim()) {
      setViaTs(viaTsAll);
      setSearchingViaT(false);
    } else {
      // Ejecutar búsqueda con los filtros restantes
      const params: { numero_telepeaje?:string; pan?:string; matricula?:string; page:number; page_size:number } = { page:1, page_size:200 };
      if(newSearch.numeroTelepeaje.trim()) params.numero_telepeaje = newSearch.numeroTelepeaje.trim();
      if(newSearch.pan.trim()) params.pan = newSearch.pan.trim();
      if(newSearch.matricula.trim()) params.matricula = newSearch.matricula.trim();
      
      try {
        if(isMobile) setSearchingViaT(true);
        const res = await resourcesAPI.listViaTDevices(params);
        setViaTs(res.items);
      } catch(e:any) {
        setErrorViaT(e?.response?.data?.detail || 'Error buscando Via T');
        setViaTs([]);
      } finally {
        setSearchingViaT(false);
      }
    }
  };

  // Paginación
  const PAGE_SIZE = 25;
  const [gasPage, setGasPage] = React.useState(1);
  const [viaTPage, setViaTPage] = React.useState(1);

  // Diálogos
  const [openGasDialog, setOpenGasDialog] = React.useState(false);
  const [openViaTDialog, setOpenViaTDialog] = React.useState(false);
  const [openEditGasDialog, setOpenEditGasDialog] = React.useState(false);
  const [openEditViaTDialog, setOpenEditViaTDialog] = React.useState(false);
  // PIN siempre visible (no toggle)

  // Formularios
  const [gasForm, setGasForm] = React.useState({ pan:'', matricula:'', caducidad:'', pin:'', compania:'' });
  const [viaTForm, setViaTForm] = React.useState({ numeroTelepeaje:'', panViaT:'', matricula:'', caducidad:'', compania:'' });
  const [editingGasCard, setEditingGasCard] = React.useState<FuelCardRecord | null>(null);
  const [editingViaT, setEditingViaT] = React.useState<ViaTRecord | null>(null);
  const [errors, setErrors] = React.useState<Record<string,string>>({});

  const resetForms = () => {
  setGasForm({ pan:'', matricula:'', caducidad:'', pin:'', compania:'' });
  setViaTForm({ numeroTelepeaje:'', panViaT:'', matricula:'', caducidad:'', compania:'' });
    setEditingGasCard(null);
    setEditingViaT(null);
    setErrors({});
  //
  };

  const validateGas = () => {
    const e: Record<string,string> = {};
    if(!gasForm.pan.trim()) e.pan = 'Requerido';
    if(!gasForm.matricula.trim()) e.matricula = 'Requerida';
    if(!gasForm.caducidad) e.caducidad = 'Requerida';
    if(!gasForm.pin.trim()) e.pin = 'Requerido';
    if(!gasForm.compania.trim()) e.compania = 'Requerida';
    return e;
  };
  const validateViaT = () => {
    const e: Record<string,string> = {};
    if(!viaTForm.numeroTelepeaje.trim()) e.numeroTelepeaje = 'Requerido';
    if(!viaTForm.panViaT.trim()) e.panViaT = 'Requerido';
    if(!viaTForm.matricula.trim()) e.matricula = 'Requerida';
    if(!viaTForm.caducidad) e.caducidad = 'Requerida';
    if(!viaTForm.compania.trim()) e.compania = 'Requerida';
    return e;
  };

  const handleAddGasCard = async () => {
    const e = validateGas();
    setErrors(e);
    if(Object.keys(e).length) return;
    try {
      setSavingGas(true);
      const created = await resourcesAPI.createFuelCard({
        pan: gasForm.pan.trim(),
        matricula: gasForm.matricula.trim(),
        caducidad: gasForm.caducidad || undefined,
        pin: gasForm.pin,
        compania: gasForm.compania.trim()
      });
      // Actualizar tanto la lista visible como la cache completa
      setGasCards(prev => [created, ...prev]);
      setGasCardsAll(prev => [created, ...prev]);
      setSnack({open:true, msg:'Tarjeta creada', type:'success'});
      setOpenGasDialog(false);
      resetForms();
    } catch (err:any) {
      setSnack({open:true, msg: err?.response?.data?.detail || 'Error creando tarjeta', type:'error'});
    } finally { setSavingGas(false); }
  };
  const handleAddViaT = async () => {
    const e = validateViaT();
    setErrors(e);
    if(Object.keys(e).length) return;
    try {
      setSavingViaT(true);
      const created = await resourcesAPI.createViaTDevice({
        numero_telepeaje: viaTForm.numeroTelepeaje.trim(),
        pan: viaTForm.panViaT.trim(),
        matricula: viaTForm.matricula.trim(),
        caducidad: viaTForm.caducidad || undefined,
        compania: viaTForm.compania.trim()
      });
      // Actualizar tanto la lista visible como la cache completa
      setViaTs(prev => [created, ...prev]);
      setViaTsAll(prev => [created, ...prev]);
      setSnack({open:true, msg:'Dispositivo creado', type:'success'});
      setOpenViaTDialog(false);
      resetForms();
    } catch (err:any) {
      setSnack({open:true, msg: err?.response?.data?.detail || 'Error creando dispositivo', type:'error'});
    } finally { setSavingViaT(false); }
  };

  const handleUpdateGasCard = async () => {
    if (!editingGasCard) return;
    const e = validateGas();
    setErrors(e);
    if(Object.keys(e).length) return;
    try {
      setSavingGas(true);
      const updated = await resourcesAPI.updateFuelCard(editingGasCard.id, {
        pan: gasForm.pan.trim(),
        matricula: gasForm.matricula.trim(),
        caducidad: gasForm.caducidad || undefined,
        pin: gasForm.pin,
        compania: gasForm.compania.trim()
      });
      // Actualizar tanto la lista visible como la cache completa
      setGasCards(prev => prev.map(card => card.id === updated.id ? updated : card));
      setGasCardsAll(prev => prev.map(card => card.id === updated.id ? updated : card));
      setSnack({open:true, msg:'Tarjeta actualizada', type:'success'});
      setOpenEditGasDialog(false);
      resetForms();
    } catch (err:any) {
      setSnack({open:true, msg: err?.response?.data?.detail || 'Error actualizando tarjeta', type:'error'});
    } finally { setSavingGas(false); }
  };

  const handleUpdateViaT = async () => {
    if (!editingViaT) return;
    const e = validateViaT();
    setErrors(e);
    if(Object.keys(e).length) return;
    try {
      setSavingViaT(true);
      const updated = await resourcesAPI.updateViaTDevice(editingViaT.id, {
        numero_telepeaje: viaTForm.numeroTelepeaje.trim(),
        pan: viaTForm.panViaT.trim(),
        matricula: viaTForm.matricula.trim(),
        caducidad: viaTForm.caducidad || undefined,
        compania: viaTForm.compania.trim()
      });
      // Actualizar tanto la lista visible como la cache completa
      setViaTs(prev => prev.map(device => device.id === updated.id ? updated : device));
      setViaTsAll(prev => prev.map(device => device.id === updated.id ? updated : device));
      setSnack({open:true, msg:'Dispositivo actualizado', type:'success'});
      setOpenEditViaTDialog(false);
      resetForms();
    } catch (err:any) {
      setSnack({open:true, msg: err?.response?.data?.detail || 'Error actualizando dispositivo', type:'error'});
    } finally { setSavingViaT(false); }
  };

  const handleOpenAdd = () => {
    resetForms();
    if(tab === 'gasolina') setOpenGasDialog(true); else setOpenViaTDialog(true);
  };

  const handleEditGasCard = (card: FuelCardRecord) => {
    setEditingGasCard(card);
    setGasForm({
      pan: card.pan,
      matricula: card.matricula,
      caducidad: card.caducidad || '',
  pin: card.pin || '',
  compania: card.compania || ''
    });
    setErrors({});
    setOpenEditGasDialog(true);
  };

  const handleEditViaT = (device: ViaTRecord) => {
    setEditingViaT(device);
    setViaTForm({
      numeroTelepeaje: device.numero_telepeaje,
      panViaT: device.pan,
      matricula: device.matricula,
  caducidad: device.caducidad || '',
  compania: device.compania || ''
    });
    setErrors({});
    setOpenEditViaTDialog(true);
  };

  const handleDeleteGasCard = async (card: FuelCardRecord) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la tarjeta con PAN ${card.pan} (${card.matricula})?`)) {
      return;
    }
    
    try {
      setSavingGas(true);
      await resourcesAPI.deleteFuelCard(card.id);
      
      // Actualizar estado local
      const updatedCards = gasCards.filter(c => c.id !== card.id);
      setGasCards(updatedCards);
      setGasCardsAll(prev => prev.filter(c => c.id !== card.id));
      
      setSnack({ open: true, msg: 'Tarjeta eliminada correctamente', type: 'success' });
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || 'Error eliminando tarjeta';
      setSnack({ open: true, msg, type: 'error' });
    } finally {
      setSavingGas(false);
    }
  };

  const handleDeleteViaT = async (device: ViaTRecord) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el dispositivo ${device.numero_telepeaje} (${device.matricula})?`)) {
      return;
    }
    
    try {
      setSavingViaT(true);
      await resourcesAPI.deleteViaTDevice(device.id);
      
      // Actualizar estado local
      const updatedDevices = viaTs.filter(v => v.id !== device.id);
      setViaTs(updatedDevices);
      setViaTsAll(prev => prev.filter(v => v.id !== device.id));
      
      setSnack({ open: true, msg: 'Dispositivo Via-T eliminado correctamente', type: 'success' });
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || 'Error eliminando dispositivo';
      setSnack({ open: true, msg, type: 'error' });
    } finally {
      setSavingViaT(false);
    }
  };

  const addButtonLabel = (
    tab === 'gasolina' ? 'Añadir Tarjeta' :
    tab === 'viat' ? 'Añadir Via T' :
    'Añadir Teléfono'
  );

  // Filtrado (case-insensitive, trim)
  const filteredGasCards = gasCards; // backend aplica filtros ahora
  const filteredViaTs = viaTs; // backend ya aplica filtros
  // Carga inicial (ambas colecciones) – simple, trae primera página grande (page_size=500) para uso local
  React.useEffect(()=> {
    const load = async () => {
      if(!user) return;
      try {
        setLoadingGas(true); setErrorGas(undefined);
        // Backend limita page_size <= 200, antes se enviaban 500 causando 422.
  const fc = await resourcesAPI.listFuelCards({ page:1, page_size:200 });
  setGasCardsAll(fc.items);
  setGasCards(fc.items);
      } catch(e:any){
        const msg = e?.response?.status === 401 ? 'No autorizado (401)' : (e?.message || 'Error cargando tarjetas');
        setErrorGas(msg);
      } finally { setLoadingGas(false); }
      try {
        setLoadingViaT(true); setErrorViaT(undefined);
  const vt = await resourcesAPI.listViaTDevices({ page:1, page_size:200 });
  setViaTsAll(vt.items);
  setViaTs(vt.items);
      } catch(e:any){
        const msg = e?.response?.status === 401 ? 'No autorizado (401)' : (e?.message || 'Error cargando Via T');
        setErrorViaT(msg);
      } finally { setLoadingViaT(false); }
    };
    load();
  }, [user]);

  // (Efecto del modal de mantenimiento eliminado)

  const anyGasFilters = !!(gasSearch.pan || gasSearch.matricula);
  const anyViaTFilters = viaTSearch.numeroTelepeaje || viaTSearch.pan || viaTSearch.matricula;

  // Ajustar página si se reduce el total
  React.useEffect(()=> {
    const maxGasPage = Math.max(1, Math.ceil(filteredGasCards.length / PAGE_SIZE) || 1);
    if(gasPage > maxGasPage) setGasPage(maxGasPage);
  }, [filteredGasCards.length, gasPage]);
  React.useEffect(()=> {
    const maxViaTPage = Math.max(1, Math.ceil(filteredViaTs.length / PAGE_SIZE) || 1);
    if(viaTPage > maxViaTPage) setViaTPage(maxViaTPage);
  }, [filteredViaTs.length, viaTPage]);

  // Reset página al cambiar filtros o pestaña
  React.useEffect(()=> { setGasPage(1); }, [gasSearch.pan, gasSearch.matricula]);
  React.useEffect(()=> { setViaTPage(1); }, [viaTSearch.numeroTelepeaje, viaTSearch.pan, viaTSearch.matricula]);
  React.useEffect(()=> { 
    /* cambio de tab */ 
    if(tab==='gasolina') setGasPage(1); 
    else setViaTPage(1);
    // Guardar la pestaña activa en localStorage
    localStorage.setItem('recursos-active-tab', tab);
  }, [tab]);

  const gasStart = (gasPage-1)*PAGE_SIZE;
  const paginatedGas = filteredGasCards.slice(gasStart, gasStart + PAGE_SIZE);
  const gasTotalPages = Math.max(1, Math.ceil(filteredGasCards.length / PAGE_SIZE) || 1);
  const viaTStart = (viaTPage-1)*PAGE_SIZE;
  const paginatedViaTs = filteredViaTs.slice(viaTStart, viaTStart + PAGE_SIZE);
  const viaTTotalPages = Math.max(1, Math.ceil(filteredViaTs.length / PAGE_SIZE) || 1);

  // Limpieza de timeouts al desmontar
  React.useEffect(()=> {
    return () => {
      if(gasSearchTimeout.current) clearTimeout(gasSearchTimeout.current);
      if(viaTSearchTimeout.current) clearTimeout(viaTSearchTimeout.current);
    };
  }, []);

  // Si se pasa a escritorio, forzar fin de animaciones
  React.useEffect(()=> {
    if(!isMobile){
      if(gasSearchTimeout.current) clearTimeout(gasSearchTimeout.current);
      if(viaTSearchTimeout.current) clearTimeout(viaTSearchTimeout.current);
      setSearchingGas(false);
      setSearchingViaT(false);
    }
  }, [isMobile]);

  return (
    <>
      <GlobalStyles
        styles={{
          body: {
            paddingRight: '0px !important',
            overflow: 'auto !important',
            overflowX: 'hidden !important'
          },
          '.MuiTab-root': {
            outline: 'none !important'
          }
        }}
      />
      <Box sx={{ p: { xs: 1, sm: 3 }, maxWidth: '100%', bgcolor: '#f5f5f5', minHeight: '100vh', overflowX: 'hidden' }}>
        {/* Banner principal */}
        <Box sx={{ mb: 4 }}>
          <Fade in timeout={800}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 4 },
                background: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 55%, #d4a574 100%)',
                color: 'white',
                borderRadius: 3,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  backgroundImage:
                    'url("data:image/svg+xml,%3Csvg width=\\"60\\" height=\\"60\\" viewBox=\\"0 0 60 60\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cg fill=\\"none\\" fill-rule=\\"evenodd\\"%3E%3Cg fill=\\"%23ffffff\\" fill-opacity=\\"0.08\\"%3E%3Cpath d=\\"m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
                }
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: 'rgba(255,255,255,0.18)',
                      borderRadius: 2,
                      backdropFilter: 'blur(8px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Info sx={{ fontSize: 32 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Recursos
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
                      Consulta información de tarjetas de gasoil y Via T
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Fade>
        </Box>

        {/* Selector estilo pill (inspirado en Mías/Todas) */}
        <Box sx={{
          mb:4,
          display:'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'center' : 'center',
            // En desktop colocamos el botón a la derecha como antes
          justifyContent: isMobile ? 'center' : 'space-between',
          gap: isMobile ? 2 : 2
        }}>
          <Box
            sx={{
              p: { xs: 0.4, sm: 0.6 },
              borderRadius:3,
              background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
              border: '2px solid #e0e0e0',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)',
              display:'inline-block',
              maxWidth:'100%',
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            <ToggleButtonGroup
              value={tab}
              exclusive
              onChange={(_, v) => { if (v) setTab(v); }}
              size="small"
              sx={{
                width: { xs: '100%', sm: 'auto' },
                '& .MuiToggleButtonGroup-grouped': {
                  border: 'none',
                  '&:not(:first-of-type)': { borderRadius: 3, marginLeft: { xs: '2px', sm: '4px' } },
                  '&:first-of-type': { borderRadius: 3 }
                },
                '& .MuiToggleButton-root': {
                  borderRadius: '22px !important',
                  px: { xs: 1.5, sm: 2.6 },
                  py: { xs: 0.8, sm: 1.1 },
                  textTransform: 'none',
                  fontSize: { xs: '0.75rem', sm: '0.85rem' },
                  fontWeight: 700,
                  border: 'none !important',
                  minWidth: { xs: 'auto', sm: 170 },
                  flex: { xs: 1, sm: 'none' },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  letterSpacing: '.3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: 0.4, sm: 0.6 },
                  '& svg': { fontSize: { xs: 16, sm: 20 } },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(135deg, rgba(80,27,54,0.12) 0%, rgba(80,27,54,0.05) 100%)',
                    opacity: 0,
                    transition: 'opacity 0.35s ease'
                  },
                  '&:hover::before': { opacity: 1 },
                  '&.Mui-selected': {
                    background: 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 70%, #501b36 100%)',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(80,27,54,0.30), 0 2px 4px rgba(80,27,54,0.18)',
                    transform: 'translateY(-1px)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #3d1429 0%, #5a1d3a 30%, #6b2545 70%, #3d1429 100%)',
                      boxShadow: '0 6px 16px rgba(80,27,54,0.40), 0 2px 8px rgba(80,27,54,0.30)'
                    },
                    '&::before': { opacity: 0 }
                  },
                  '&:not(.Mui-selected)': {
                    color: '#501b36',
                    backgroundColor: 'rgba(255,255,255,0.85)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.97)',
                      transform: 'translateY(-0.5px)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.10)'
                    }
                  },
                  '&:active': { transform: 'scale(.985)' }
                }
              }}
            >
              <ToggleButton value="gasolina">
                <LocalGasStation /> 
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Tarjetas Gasoil</Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Gasoil</Box>
              </ToggleButton>
              <ToggleButton value="viat">
                <CreditCard /> 
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Via T</Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Via T</Box>
              </ToggleButton>
              <ToggleButton value="telefonos">
                <PhoneIphone /> 
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Teléfonos</Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Tel.</Box>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          {canAdd && (
            <Button
              startIcon={<Add />}
              onClick={handleOpenAdd}
              sx={{
                textTransform:'none',
                fontWeight:700,
                borderRadius:'999px',
                px:3.2,
                py:1.2,
                fontSize:'.85rem',
                background:'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 70%, #501b36 100%)',
                color:'white',
                boxShadow:'0 4px 12px rgba(80,27,54,0.30), 0 2px 4px rgba(80,27,54,0.18)',
                letterSpacing:.4,
                '&:hover': { background:'linear-gradient(135deg, #3d1429 0%, #5a1d3a 30%, #6b2545 70%, #3d1429 100%)' }
              }}
            >{addButtonLabel}</Button>
          )}
        </Box>

        {/* Contenido según pestaña */}
        <Fade in timeout={400}>
          <Box>
            {tab === 'gasolina' && (
              <Paper elevation={0} sx={{ p:{ xs:2, sm:4 }, borderRadius: 3, border: '1px solid #e0e0e0', background:'#ffffff', overflow:'hidden' }}>
                <Box sx={{ 
                  display:'flex', alignItems:'center', gap:2, flexWrap:'wrap', mb:2,
                  pb:1.5, borderBottom:'1px solid #e0e0e0'
                }}>
                  <Box sx={{
                    p:1.5,
                    borderRadius:2,
                    bgcolor: alpha('#501b36',0.08),
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center'
                  }}>
                    <LocalGasStation sx={{ color:'#501b36' }} />
                  </Box>
                  <Box sx={{ flex:1, minWidth:220 }}>
                    <Typography variant="h6" sx={{ fontWeight:700, letterSpacing:.3, color:'#501b36', mb:0.5 }}>
                      Tarjetas de Gasoil
                    </Typography>
                    <Typography variant="body2" sx={{ color:'text.secondary' }}>
                      Gestión de tarjetas de repostaje y PIN
                    </Typography>
                  </Box>
                  {/* Botón mover arriba */}
                </Box>
                {/* Buscador Gasoil simplificado */}
                <Box sx={{ display:'flex', flexWrap:'wrap', gap:1.2, mb:2, alignItems:'center' }}>
                  <TextField
                    size="small"
                    placeholder="Buscar P.A.N"
                    value={gasSearchDraft.pan}
                    onChange={e=> setGasSearchDraft(s=>({...s, pan:e.target.value}))}
                    onKeyDown={e=> { if(e.key==='Enter') applyGasSearch(); }}
                    sx={{ flex:'1 1 180px', '& .MuiOutlinedInput-root':{ borderRadius:3 } }}
                  />
                  <TextField
                    size="small"
                    placeholder="Buscar Matrícula"
                    value={gasSearchDraft.matricula}
                    onChange={e=> setGasSearchDraft(s=>({...s, matricula:e.target.value.toUpperCase()}))}
                    onKeyDown={e=> { if(e.key==='Enter') applyGasSearch(); }}
                    sx={{ flex:'1 1 180px', '& .MuiOutlinedInput-root':{ borderRadius:3 } }}
                  />
                  <Button
                    size="small"
                    variant="contained"
                    onClick={applyGasSearch}
                    disabled={!gasSearchDraft.pan && !gasSearchDraft.matricula}
                    sx={{
                      textTransform:'none',
                      fontWeight:600,
                      borderRadius:3,
                      background:'linear-gradient(135deg, #501b36 0%, #6d2548 60%, #7d2d52 100%)',
                      '&:hover':{ background:'linear-gradient(135deg, #3d1429 0%, #5a1d3a 60%, #6b2545 100%)' }
                    }}
                  >Buscar</Button>
                  {(gasSearch.pan || gasSearch.matricula) && (
                    <Button size="small" onClick={clearGasSearch} sx={{ borderRadius:3 }}>Limpiar</Button>
                  )}
                </Box>
                {anyGasFilters && (
                  <Box sx={{ display:'flex', gap:1, flexWrap:'wrap', mb:2 }}>
                    {gasSearch.pan && (
                      <Chip 
                        size="small" 
                        label={`PAN: ${gasSearch.pan}`} 
                        onDelete={() => handleRemoveGasFilter('pan')} 
                        sx={{ borderRadius:2 }} 
                      />
                    )}
                    {gasSearch.matricula && (
                      <Chip 
                        size="small" 
                        label={`Matrícula: ${gasSearch.matricula}`} 
                        onDelete={() => handleRemoveGasFilter('matricula')} 
                        sx={{ borderRadius:2 }} 
                      />
                    )}
                  </Box>
                )}
                {!isMobile && (
                  <>
                    <Box sx={{ overflowX:'auto' }}>
                      <Table size="small" sx={{ minWidth:900, '& th':{ whiteSpace:'nowrap' } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell>P.A.N.</TableCell>
                            <TableCell>Matrícula</TableCell>
                            <TableCell>Compañía</TableCell>
                            <TableCell>Fecha de caducidad</TableCell>
                            <TableCell>Código PIN</TableCell>
                            {canAdd && <TableCell>Acciones</TableCell>}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {loadingGas && (
                            <TableRow><TableCell colSpan={canAdd ? 6 : 5}><Box sx={{ display:'flex', alignItems:'center', gap:1 }}><CircularProgress size={18} /> <Typography variant="body2">Cargando...</Typography></Box></TableCell></TableRow>
                          )}
                          {!loadingGas && searchingGas && (
                            <TableRow>
                              <TableCell colSpan={canAdd ? 6 : 5}>
                                <Stack spacing={1}>
                                  <Skeleton height={28} />
                                  <Skeleton height={28} />
                                  <Skeleton height={28} />
                                </Stack>
                              </TableCell>
                            </TableRow>
                          )}
                          {!loadingGas && !searchingGas && errorGas && (
                            <TableRow><TableCell colSpan={canAdd ? 6 : 5}><Typography color="error" variant="body2">{errorGas}</Typography></TableCell></TableRow>
                          )}
                          {!loadingGas && !searchingGas && gasCards.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={canAdd ? 6 : 5}>
                                <Typography variant="body2" sx={{ color:'text.secondary' }}>No hay tarjetas registradas todavía.</Typography>
                              </TableCell>
                            </TableRow>
                          )}
                          {!loadingGas && !searchingGas && gasCards.length > 0 && filteredGasCards.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={canAdd ? 6 : 5}>
                                <Typography variant="body2" sx={{ color:'text.secondary' }}>Sin coincidencias con los filtros aplicados.</Typography>
                              </TableCell>
                            </TableRow>
                          )}
                          {!loadingGas && !searchingGas && paginatedGas.map(card => (
                            <TableRow key={card.id} hover>
                              <TableCell>{card.pan}</TableCell>
                              <TableCell>{card.matricula}</TableCell>
                              <TableCell>{card.compania || '—'}</TableCell>
                              <TableCell>{card.caducidad}</TableCell>
                              <TableCell>
                                <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                                  <Typography sx={{ fontFamily:'monospace', letterSpacing:1 }}>
                                    {card.pin ?? card.masked_pin}
                                  </Typography>
                                </Box>
                              </TableCell>
                              {canAdd && (
                                <TableCell>
                                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleEditGasCard(card)}
                                      sx={{ 
                                        color: '#666',
                                        backgroundColor: 'transparent',
                                        boxShadow: 'none',
                                        border: 'none',
                                        '&:hover': { 
                                          color: '#501b36',
                                          backgroundColor: 'transparent',
                                          boxShadow: 'none'
                                        },
                                        '&:focus': {
                                          backgroundColor: 'transparent',
                                          boxShadow: 'none'
                                        }
                                      }}
                                    >
                                      <Edit fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDeleteGasCard(card)}
                                      disabled={savingGas}
                                      sx={{ 
                                        color: '#666',
                                        backgroundColor: 'transparent',
                                        boxShadow: 'none',
                                        border: 'none',
                                        '&:hover': { 
                                          color: '#d32f2f',
                                          backgroundColor: 'transparent',
                                          boxShadow: 'none'
                                        },
                                        '&:focus': {
                                          backgroundColor: 'transparent',
                                          boxShadow: 'none'
                                        },
                                        '&:disabled': {
                                          color: '#ccc'
                                        }
                                      }}
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </Box>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                    {(filteredGasCards.length > 0) && (
                      <Box sx={{ mt:2, display:'flex', flexWrap:'wrap', gap:2, alignItems:'center', justifyContent:'space-between' }}>
                        <Box />
                        {!searchingGas && gasTotalPages > 1 && (
                          <Pagination
                            page={gasPage}
                            count={gasTotalPages}
                            size="small"
                            onChange={(_, p)=> setGasPage(p)}
                            sx={{ '& .MuiPagination-ul': { flexWrap:'wrap' } }}
                          />
                        )}
                        <Typography variant="caption" sx={{ ml:'auto', color:'text.secondary' }}>
                          {filteredGasCards.length === 0 ? '0' : `${gasStart+1}-${Math.min(gasStart+PAGE_SIZE, filteredGasCards.length)}`} de {filteredGasCards.length}
                        </Typography>
                      </Box>
                    )}
                  </>
                )}
                {isMobile && (
                  <Box>
                    {!hasSearchedGas && (
                      <Typography variant="body2" sx={{ color:'text.secondary', mb:2 }}>
                        Introduce algún criterio y pulsa "Buscar" para ver tarjetas.
                      </Typography>
                    )}
                    {hasSearchedGas && (
                      <>
                        {loadingGas && (
                          <Typography variant="body2" sx={{ color:'text.secondary' }}>Cargando...</Typography>
                        )}
                        {!loadingGas && errorGas && (
                          <Typography variant="body2" color="error">{errorGas}</Typography>
                        )}
                        {!loadingGas && gasCards.length === 0 && (
                          <Typography variant="body2" sx={{ color:'text.secondary' }}>No hay tarjetas registradas todavía.</Typography>
                        )}
                        {!loadingGas && gasCards.length > 0 && filteredGasCards.length === 0 && (
                          <Typography variant="body2" sx={{ color:'text.secondary' }}>Sin coincidencias con los filtros aplicados.</Typography>
                        )}
                        <Stack spacing={1.5}>
                          {filteredGasCards.map(card => (
                            <Card key={card.id} variant="outlined" sx={{ borderRadius:2, overflow:'hidden', position:'relative' }}>
                              <CardContent sx={{ p:1.5, '&:last-child':{ pb:1.5 } }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                                  <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight:700, letterSpacing:.3 }}>{card.matricula}</Typography>
                                    <Typography variant="caption" sx={{ color:'text.secondary' }}>Matrícula</Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip size="small" label={card.caducidad || '—'} sx={{ bgcolor:'rgba(80,27,54,0.08)', color:'#501b36' }} />
                                    {canAdd && (
                                      <IconButton
                                        size="small"
                                        onClick={() => handleEditGasCard(card)}
                                        sx={{ 
                                          color: '#666',
                                          backgroundColor: 'transparent',
                                          boxShadow: 'none',
                                          border: 'none',
                                          '&:hover': { 
                                            color: '#501b36',
                                            backgroundColor: 'transparent',
                                            boxShadow: 'none'
                                          },
                                          '&:focus': {
                                            backgroundColor: 'transparent',
                                            boxShadow: 'none'
                                          }
                                        }}
                                      >
                                        <Edit fontSize="small" />
                                      </IconButton>
                                    )}
                                  </Box>
                                </Stack>
                                <Divider sx={{ my:1 }} />
                                <Stack spacing={0.6}>
                                  <Typography variant="body2"><strong>PAN:</strong> {card.pan}</Typography>
                                  <Typography variant="body2"><strong>Compañía:</strong> {card.compania || '—'}</Typography>
                                  <Typography variant="body2"><strong>PIN:</strong> <span style={{ fontFamily:'monospace', letterSpacing:1 }}>{card.pin ?? card.masked_pin}</span></Typography>
                                </Stack>
                              </CardContent>
                            </Card>
                          ))}
                        </Stack>
                      </>
                    )}
                  </Box>
                )}
              </Paper>
            )}
            {tab === 'viat' && (
              <Paper elevation={0} sx={{ p:{ xs:2, sm:4 }, borderRadius: 3, border: '1px solid #e0e0e0', background:'#ffffff', overflow:'hidden' }}>
                <Box sx={{ 
                  display:'flex', alignItems:'center', gap:2, flexWrap:'wrap', mb:2,
                  pb:1.5, borderBottom:'1px solid #e0e0e0'
                }}>
                  <Box sx={{
                    p:1.5,
                    borderRadius:2,
                    bgcolor: alpha('#501b36',0.08),
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center'
                  }}>
                    <CreditCard sx={{ color:'#501b36' }} />
                  </Box>
                  <Box sx={{ flex:1, minWidth:220 }}>
                    <Typography variant="h6" sx={{ fontWeight:700, letterSpacing:.3, color:'#501b36', mb:0.5 }}>
                      Dispositivos Via T
                    </Typography>
                    <Typography variant="body2" sx={{ color:'text.secondary' }}>
                      Control de telepeajes asignados
                    </Typography>
                  </Box>
                </Box>
                {/* Buscador Via T */}
                <Box sx={{ display:'flex', flexWrap:'wrap', gap:1.2, mb:2, alignItems:'center' }}>
                  <TextField
                    size="small"
                    placeholder="Buscar Nº Telepeaje"
                    value={viaTSearchDraft.numeroTelepeaje}
                    onChange={e=> setViaTSearchDraft(s=>({...s, numeroTelepeaje:e.target.value}))}
                    onKeyDown={e=> { if(e.key==='Enter') applyViaTSearch(); }}
                    sx={{ flex:'1 1 180px', '& .MuiOutlinedInput-root':{ borderRadius:3 } }}
                  />
                  <TextField
                    size="small"
                    placeholder="Buscar P.A.N"
                    value={viaTSearchDraft.pan}
                    onChange={e=> setViaTSearchDraft(s=>({...s, pan:e.target.value}))}
                    onKeyDown={e=> { if(e.key==='Enter') applyViaTSearch(); }}
                    sx={{ flex:'1 1 140px', '& .MuiOutlinedInput-root':{ borderRadius:3 } }}
                  />
                  <TextField
                    size="small"
                    placeholder="Buscar Matrícula"
                    value={viaTSearchDraft.matricula}
                    onChange={e=> setViaTSearchDraft(s=>({...s, matricula:e.target.value.toUpperCase()}))}
                    onKeyDown={e=> { if(e.key==='Enter') applyViaTSearch(); }}
                    sx={{ flex:'1 1 140px', '& .MuiOutlinedInput-root':{ borderRadius:3 } }}
                  />
                  <Button
                    size="small"
                    variant="contained"
                    onClick={applyViaTSearch}
                    disabled={!viaTSearchDraft.numeroTelepeaje && !viaTSearchDraft.pan && !viaTSearchDraft.matricula}
                    sx={{
                      textTransform:'none',
                      fontWeight:600,
                      borderRadius:3,
                      background:'linear-gradient(135deg, #501b36 0%, #6d2548 60%, #7d2d52 100%)',
                      '&:hover':{ background:'linear-gradient(135deg, #3d1429 0%, #5a1d3a 60%, #6b2545 100%)' }
                    }}
                  >Buscar</Button>
                  {(viaTSearch.numeroTelepeaje || viaTSearch.pan || viaTSearch.matricula) && (
                    <Button size="small" onClick={clearViaTSearch} sx={{ borderRadius:3 }}>Limpiar</Button>
                  )}
                </Box>
                {anyViaTFilters && (
                  <Box sx={{ display:'flex', gap:1, flexWrap:'wrap', mb:2 }}>
                    {viaTSearch.numeroTelepeaje && (
                      <Chip 
                        size="small" 
                        label={`Telepeaje: ${viaTSearch.numeroTelepeaje}`} 
                        onDelete={() => handleRemoveViaTFilter('numeroTelepeaje')} 
                        sx={{ borderRadius:2 }} 
                      />
                    )}
                    {viaTSearch.pan && (
                      <Chip 
                        size="small" 
                        label={`PAN: ${viaTSearch.pan}`} 
                        onDelete={() => handleRemoveViaTFilter('pan')} 
                        sx={{ borderRadius:2 }} 
                      />
                    )}
                    {viaTSearch.matricula && (
                      <Chip 
                        size="small" 
                        label={`Matrícula: ${viaTSearch.matricula}`} 
                        onDelete={() => handleRemoveViaTFilter('matricula')} 
                        sx={{ borderRadius:2 }} 
                      />
                    )}
                  </Box>
                )}
                {!isMobile && (
                  <>
                    <Box sx={{ overflowX:'auto' }}>
                      <Table size="small" sx={{ minWidth:900, '& th':{ whiteSpace:'nowrap' } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell>Nº Telepeaje</TableCell>
                            <TableCell>P.A.N Via-T</TableCell>
                            <TableCell>Matrícula</TableCell>
                            <TableCell>Fecha de caducidad</TableCell>
                            {canAdd && <TableCell>Acciones</TableCell>}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {loadingViaT && (
                            <TableRow><TableCell colSpan={canAdd ? 5 : 4}><Box sx={{ display:'flex', alignItems:'center', gap:1 }}><CircularProgress size={18} /> <Typography variant="body2">Cargando...</Typography></Box></TableCell></TableRow>
                          )}
                          {!loadingViaT && searchingViaT && (
                            <TableRow>
                              <TableCell colSpan={canAdd ? 5 : 4}>
                                <Stack spacing={1}>
                                  <Skeleton height={28} />
                                  <Skeleton height={28} />
                                  <Skeleton height={28} />
                                </Stack>
                              </TableCell>
                            </TableRow>
                          )}
                          {!loadingViaT && !searchingViaT && errorViaT && (
                            <TableRow><TableCell colSpan={canAdd ? 5 : 4}><Typography color="error" variant="body2">{errorViaT}</Typography></TableCell></TableRow>
                          )}
                          {!loadingViaT && !searchingViaT && viaTs.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={canAdd ? 5 : 4}>
                                <Typography variant="body2" sx={{ color:'text.secondary' }}>No hay dispositivos Via T registrados todavía.</Typography>
                              </TableCell>
                            </TableRow>
                          )}
                          {!loadingViaT && !searchingViaT && viaTs.length > 0 && filteredViaTs.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={canAdd ? 5 : 4}>
                                <Typography variant="body2" sx={{ color:'text.secondary' }}>Sin coincidencias con los filtros aplicados.</Typography>
                              </TableCell>
                            </TableRow>
                          )}
                          {!loadingViaT && !searchingViaT && paginatedViaTs.map(v => (
                            <TableRow key={v.id} hover>
                              <TableCell>{v.numero_telepeaje}</TableCell>
                              <TableCell>{v.pan}</TableCell>
                              <TableCell>{v.matricula}</TableCell>
                              <TableCell>{v.caducidad}</TableCell>
                              {canAdd && (
                                <TableCell>
                                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleEditViaT(v)}
                                      sx={{ 
                                        color: '#666',
                                        backgroundColor: 'transparent',
                                        boxShadow: 'none',
                                        border: 'none',
                                        '&:hover': { 
                                          color: '#501b36',
                                          backgroundColor: 'transparent',
                                          boxShadow: 'none'
                                        },
                                        '&:focus': {
                                          backgroundColor: 'transparent',
                                          boxShadow: 'none'
                                        }
                                      }}
                                    >
                                      <Edit fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDeleteViaT(v)}
                                      disabled={savingViaT}
                                      sx={{ 
                                        color: '#666',
                                        backgroundColor: 'transparent',
                                        boxShadow: 'none',
                                        border: 'none',
                                        '&:hover': { 
                                          color: '#d32f2f',
                                          backgroundColor: 'transparent',
                                          boxShadow: 'none'
                                        },
                                        '&:focus': {
                                          backgroundColor: 'transparent',
                                          boxShadow: 'none'
                                        },
                                        '&:disabled': {
                                          color: '#ccc'
                                        }
                                      }}
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </Box>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                    {(filteredViaTs.length > 0) && (
                      <Box sx={{ mt:2, display:'flex', flexWrap:'wrap', gap:2, alignItems:'center', justifyContent:'flex-end' }}>
                        {!searchingViaT && viaTTotalPages > 1 && (
                          <Pagination
                            page={viaTPage}
                            count={viaTTotalPages}
                            size="small"
                            onChange={(_, p)=> setViaTPage(p)}
                            sx={{ '& .MuiPagination-ul': { flexWrap:'wrap' } }}
                          />
                        )}
                        <Typography variant="caption" sx={{ color:'text.secondary' }}>
                          {filteredViaTs.length === 0 ? '0' : `${viaTStart+1}-${Math.min(viaTStart+PAGE_SIZE, filteredViaTs.length)}`} de {filteredViaTs.length}
                        </Typography>
                      </Box>
                    )}
                  </>
                )}
                {isMobile && (
                  <Box>
                    {!hasSearchedViaT && (
                      <Typography variant="body2" sx={{ color:'text.secondary', mb:2 }}>
                        Introduce algún criterio y pulsa "Buscar" para ver dispositivos.
                      </Typography>
                    )}
                    {hasSearchedViaT && (
                      <>
                        {loadingViaT && (
                          <Typography variant="body2" sx={{ color:'text.secondary' }}>Cargando...</Typography>
                        )}
                        {!loadingViaT && searchingViaT && (
                          <Stack spacing={1.2}>
                            <Skeleton variant="rectangular" height={110} />
                            <Skeleton variant="rectangular" height={110} />
                          </Stack>
                        )}
                        {!loadingViaT && !searchingViaT && errorViaT && (
                          <Typography variant="body2" color="error">{errorViaT}</Typography>
                        )}
                        {!loadingViaT && !searchingViaT && viaTs.length === 0 && (
                          <Typography variant="body2" sx={{ color:'text.secondary' }}>No hay dispositivos Via T registrados todavía.</Typography>
                        )}
                        {!loadingViaT && !searchingViaT && viaTs.length > 0 && filteredViaTs.length === 0 && (
                          <Typography variant="body2" sx={{ color:'text.secondary' }}>Sin coincidencias con los filtros aplicados.</Typography>
                        )}
                        {!loadingViaT && !searchingViaT && (
                          <Stack spacing={1.5}>
                            {filteredViaTs.map(v => (
                              <Card key={v.id} variant="outlined" sx={{ borderRadius:2, overflow:'hidden', position:'relative' }}>
                                <CardContent sx={{ p:1.5, '&:last-child':{ pb:1.5 } }}>
                                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                                    <Box>
                                      <Typography variant="subtitle2" sx={{ fontWeight:700, letterSpacing:.3 }}>{v.matricula}</Typography>
                                      <Typography variant="caption" sx={{ color:'text.secondary' }}>Matrícula</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Chip size="small" label={v.caducidad || '—'} sx={{ bgcolor:'rgba(80,27,54,0.08)', color:'#501b36' }} />
                                      {canAdd && (
                                        <IconButton
                                          size="small"
                                          onClick={() => handleEditViaT(v)}
                                          sx={{ 
                                            color: '#666',
                                            backgroundColor: 'transparent',
                                            boxShadow: 'none',
                                            border: 'none',
                                            '&:hover': { 
                                              color: '#501b36',
                                              backgroundColor: 'transparent',
                                              boxShadow: 'none'
                                            },
                                            '&:focus': {
                                              backgroundColor: 'transparent',
                                              boxShadow: 'none'
                                            }
                                          }}
                                        >
                                          <Edit fontSize="small" />
                                        </IconButton>
                                      )}
                                    </Box>
                                  </Stack>
                                  <Divider sx={{ my:1 }} />
                                  <Stack spacing={0.6}>
                                    <Typography variant="body2"><strong>Telepeaje:</strong> {v.numero_telepeaje}</Typography>
                                    <Typography variant="body2"><strong>PAN:</strong> {v.pan}</Typography>
                                  </Stack>
                                </CardContent>
                              </Card>
                            ))}
                          </Stack>
                        )}
                      </>
                    )}
                  </Box>
                )}
              </Paper>
            )}
            {tab === 'telefonos' && (
              <Paper elevation={0} sx={{ p:{ xs:3, sm:6 }, borderRadius:3, border:'2px dashed #d7d7d7', background:'#ffffff', textAlign:'center' }}>
                <Box sx={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                  <Box sx={{ p:3, borderRadius:'50%', background:'linear-gradient(135deg,#f5f5f5 0%,#ededed 100%)', border:'1px solid #e0e0e0' }}>
                    <PhoneIphone sx={{ fontSize:56, color:'#7d2d52' }} />
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight:700, color:'#501b36' }}>Teléfonos (Recursos)</Typography>
                  <Typography variant="body1" sx={{ maxWidth:560, color:'text.secondary' }}>
                    Esta nueva sección está en desarrollo. Aquí podrás gestionar teléfonos corporativos, asignaciones y estado de cada dispositivo.
                  </Typography>
                  <Chip label="En desarrollo" color="warning" variant="outlined" sx={{ fontWeight:600 }} />
                </Box>
              </Paper>
            )}
          </Box>
        </Fade>
      </Box>

      {/* Modales usando ModernModal para consistencia visual */}
      <ModernModal
        open={openGasDialog}
        onClose={()=> setOpenGasDialog(false)}
  title="Nueva Tarjeta de Gasoil"
        subtitle="Registrar acceso para repostajes"
        icon={<LocalGasStation />}
        maxWidth="sm"
        headerColor="#501b36"
        actions={
          <>
            <ModernButton variant="outlined" onClick={()=> setOpenGasDialog(false)}>
              Cancelar
            </ModernButton>
            <ModernButton onClick={handleAddGasCard} disabled={savingGas} startIcon={<Add />}>{savingGas ? 'Guardando...' : 'Guardar'}</ModernButton>
          </>
        }
      >
        <Stack spacing={2} sx={{ mt:1 }}>
          <TextField
            label="P.A.N."
            value={gasForm.pan}
            onChange={e=> setGasForm(f=>({...f, pan:e.target.value}))}
            error={!!errors.pan}
            helperText={errors.pan}
            fullWidth
            size="small"
          />
          <TextField
            label="Compañía"
            value={gasForm.compania}
            onChange={e=> setGasForm(f=>({...f, compania:e.target.value.toUpperCase()}))}
            error={!!errors.compania}
            helperText={errors.compania}
            fullWidth
            size="small"
            inputProps={{ maxLength: 64 }}
          />
          <TextField
            label="Matrícula"
            value={gasForm.matricula}
            onChange={e=> setGasForm(f=>({...f, matricula:e.target.value.toUpperCase()}))}
            error={!!errors.matricula}
            helperText={errors.matricula}
            fullWidth
            size="small"
            inputProps={{ maxLength: 10 }}
          />
          <TextField
            label="Fecha de caducidad"
            type="date"
            value={gasForm.caducidad}
            onChange={e=> setGasForm(f=>({...f, caducidad:e.target.value}))}
            error={!!errors.caducidad}
            helperText={errors.caducidad}
            fullWidth
            size="small"
            InputLabelProps={{ shrink:true }}
          />
          <TextField
            label="Código PIN"
            value={gasForm.pin}
            onChange={e=> setGasForm(f=>({...f, pin:e.target.value}))}
            error={!!errors.pin}
            helperText={errors.pin || 'Se almacenará en claro (TODO: cifrado)'}
            fullWidth
            size="small"
            type="text"
          />
        </Stack>
      </ModernModal>

      <ModernModal
        open={openViaTDialog}
        onClose={()=> setOpenViaTDialog(false)}
        title="Nuevo Dispositivo Via T"
        subtitle="Asignar dispositivo de telepeaje"
        icon={<CreditCard />}
        maxWidth="sm"
        headerColor="#501b36"
        actions={
          <>
            <ModernButton variant="outlined" onClick={()=> setOpenViaTDialog(false)}>
              Cancelar
            </ModernButton>
            <ModernButton onClick={handleAddViaT} disabled={savingViaT} startIcon={<Add />}>{savingViaT ? 'Guardando...' : 'Guardar'}</ModernButton>
          </>
        }
      >
        <Stack spacing={2} sx={{ mt:1 }}>
          <TextField
            label="Nº Telepeaje"
            value={viaTForm.numeroTelepeaje}
            onChange={e=> setViaTForm(f=>({...f, numeroTelepeaje:e.target.value}))}
            error={!!errors.numeroTelepeaje}
            helperText={errors.numeroTelepeaje}
            fullWidth size="small"
          />
          <TextField
            label="Compañía"
            value={viaTForm.compania}
            onChange={e=> setViaTForm(f=>({...f, compania:e.target.value.toUpperCase()}))}
            error={!!errors.compania}
            helperText={errors.compania}
            fullWidth size="small"
            inputProps={{ maxLength: 64 }}
          />
          <TextField
            label="P.A.N Via-T"
            value={viaTForm.panViaT}
            onChange={e=> setViaTForm(f=>({...f, panViaT:e.target.value}))}
            error={!!errors.panViaT}
            helperText={errors.panViaT}
            fullWidth size="small"
          />
          <TextField
            label="Matrícula"
            value={viaTForm.matricula}
            onChange={e=> setViaTForm(f=>({...f, matricula:e.target.value.toUpperCase()}))}
            error={!!errors.matricula}
            helperText={errors.matricula}
            fullWidth size="small"
            inputProps={{ maxLength: 10 }}
          />
          <TextField
            label="Fecha de caducidad"
            type="date"
            value={viaTForm.caducidad}
            onChange={e=> setViaTForm(f=>({...f, caducidad:e.target.value}))}
            error={!!errors.caducidad}
            helperText={errors.caducidad}
            fullWidth size="small"
            InputLabelProps={{ shrink:true }}
          />
        </Stack>
      </ModernModal>

      {/* Modales de Edición */}
      <ModernModal
        open={openEditGasDialog}
        onClose={()=> setOpenEditGasDialog(false)}
        title="Editar Tarjeta de Gasoil"
        subtitle="Modificar datos de acceso para repostajes"
        icon={<LocalGasStation />}
        maxWidth="sm"
        headerColor="#501b36"
        actions={
          <>
            <ModernButton variant="outlined" onClick={()=> setOpenEditGasDialog(false)}>
              Cancelar
            </ModernButton>
            <ModernButton onClick={handleUpdateGasCard} disabled={savingGas} startIcon={<Edit />}>{savingGas ? 'Actualizando...' : 'Actualizar'}</ModernButton>
          </>
        }
      >
        <Stack spacing={2} sx={{ mt:1 }}>
          <TextField
            label="P.A.N."
            value={gasForm.pan}
            onChange={e=> setGasForm(f=>({...f, pan:e.target.value}))}
            error={!!errors.pan}
            helperText={errors.pan}
            fullWidth
            size="small"
          />
          <TextField
            label="Compañía"
            value={gasForm.compania}
            onChange={e=> setGasForm(f=>({...f, compania:e.target.value.toUpperCase()}))}
            error={!!errors.compania}
            helperText={errors.compania}
            fullWidth
            size="small"
            inputProps={{ maxLength: 64 }}
          />
          <TextField
            label="Matrícula"
            value={gasForm.matricula}
            onChange={e=> setGasForm(f=>({...f, matricula:e.target.value.toUpperCase()}))}
            error={!!errors.matricula}
            helperText={errors.matricula}
            fullWidth
            size="small"
            inputProps={{ maxLength: 10 }}
          />
          <TextField
            label="Fecha de caducidad"
            type="date"
            value={gasForm.caducidad}
            onChange={e=> setGasForm(f=>({...f, caducidad:e.target.value}))}
            error={!!errors.caducidad}
            helperText={errors.caducidad}
            fullWidth
            size="small"
            InputLabelProps={{ shrink:true }}
          />
          <TextField
            label="Código PIN"
            value={gasForm.pin}
            onChange={e=> setGasForm(f=>({...f, pin:e.target.value}))}
            error={!!errors.pin}
            helperText={errors.pin || 'Se almacenará en claro (TODO: cifrado)'}
            fullWidth
            size="small"
            type="text"
          />
        </Stack>
      </ModernModal>

      <ModernModal
        open={openEditViaTDialog}
        onClose={()=> setOpenEditViaTDialog(false)}
        title="Editar Dispositivo Via T"
        subtitle="Modificar dispositivo de telepeaje"
        icon={<CreditCard />}
        maxWidth="sm"
        headerColor="#501b36"
        actions={
          <>
            <ModernButton variant="outlined" onClick={()=> setOpenEditViaTDialog(false)}>
              Cancelar
            </ModernButton>
            <ModernButton onClick={handleUpdateViaT} disabled={savingViaT} startIcon={<Edit />}>{savingViaT ? 'Actualizando...' : 'Actualizar'}</ModernButton>
          </>
        }
      >
        <Stack spacing={2} sx={{ mt:1 }}>
          <TextField
            label="Nº Telepeaje"
            value={viaTForm.numeroTelepeaje}
            onChange={e=> setViaTForm(f=>({...f, numeroTelepeaje:e.target.value}))}
            error={!!errors.numeroTelepeaje}
            helperText={errors.numeroTelepeaje}
            fullWidth size="small"
          />
          <TextField
            label="Compañía"
            value={viaTForm.compania}
            onChange={e=> setViaTForm(f=>({...f, compania:e.target.value.toUpperCase()}))}
            error={!!errors.compania}
            helperText={errors.compania}
            fullWidth size="small"
            inputProps={{ maxLength: 64 }}
          />
          <TextField
            label="P.A.N Via-T"
            value={viaTForm.panViaT}
            onChange={e=> setViaTForm(f=>({...f, panViaT:e.target.value}))}
            error={!!errors.panViaT}
            helperText={errors.panViaT}
            fullWidth size="small"
          />
          <TextField
            label="Matrícula"
            value={viaTForm.matricula}
            onChange={e=> setViaTForm(f=>({...f, matricula:e.target.value.toUpperCase()}))}
            error={!!errors.matricula}
            helperText={errors.matricula}
            fullWidth size="small"
            inputProps={{ maxLength: 10 }}
          />
          <TextField
            label="Fecha de caducidad"
            type="date"
            value={viaTForm.caducidad}
            onChange={e=> setViaTForm(f=>({...f, caducidad:e.target.value}))}
            error={!!errors.caducidad}
            helperText={errors.caducidad}
            fullWidth size="small"
            InputLabelProps={{ shrink:true }}
          />
        </Stack>
      </ModernModal>

      {/* (Modal de mantenimiento eliminado) */}

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={()=> setSnack(s=>({...s, open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'center' }}>
        <Alert severity={snack.type} variant="filled" onClose={()=> setSnack(s=>({...s, open:false}))}>{snack.msg}</Alert>
      </Snackbar>
    </>
  );
};

export default Recursos;
