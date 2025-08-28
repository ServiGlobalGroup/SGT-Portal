import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert } from '@mui/material';
import { useAuth } from '../hooks/useAuth';

export const ForcePasswordChange: React.FC = () => {
  const { token, logout, updatePasswordChanged } = useAuth() as any;
  const [current, setCurrent] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState(false);

  const disabled = !p1 || p1.length<8 || p1!==p2 || !current;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(disabled) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/auth/change-password-first', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization: `Bearer ${token}`},
        body: JSON.stringify({ current_password: current, new_password: p1 })
      });
      if(!res.ok){
        const data = await res.json().catch(()=>({detail:'Error'}));
        throw new Error(data.detail || 'Error al cambiar contraseña');
      }
      setSuccess(true);
      updatePasswordChanged(); // Actualizar estado en contexto
      setTimeout(()=>{ window.location.replace('/'); }, 1500);
    } catch(err:any){
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <Box sx={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', p:2, bgcolor:'#f4f6f8' }}>
      <Paper sx={{ p:4, width:'100%', maxWidth:460, borderRadius:4, boxShadow:'0 8px 32px rgba(0,0,0,0.08)' }}>
        <Typography variant="h5" sx={{ fontWeight:700, mb:1 }}>Cambio de contraseña requerido</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb:3 }}>
          Por seguridad debes establecer una nueva contraseña antes de continuar.
        </Typography>
        {error && <Alert severity="error" sx={{ mb:2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb:2 }}>Contraseña actualizada. Redirigiendo...</Alert>}
        <Box component="form" onSubmit={handleSubmit} sx={{ display:'flex', flexDirection:'column', gap:2 }}>
          <TextField label="Contraseña actual" type="password" value={current} onChange={e=>setCurrent(e.target.value)} required fullWidth size="small" />
          <TextField label="Nueva contraseña" type="password" value={p1} onChange={e=>setP1(e.target.value)} required fullWidth size="small" 
            helperText="Mínimo 8 caracteres, con mayúscula, minúscula y número" />
          <TextField label="Repetir nueva contraseña" type="password" value={p2} onChange={e=>setP2(e.target.value)} required fullWidth size="small" error={p2.length>0 && p1!==p2} helperText={p2 && p1!==p2 ? 'No coincide' : ' '} />
          <Button type="submit" variant="contained" disabled={disabled||loading} sx={{ mt:1, py:1.1, fontWeight:700, borderRadius:3 }}>
            {loading? 'Guardando...' : 'Cambiar contraseña'}
          </Button>
          <Button variant="text" color="secondary" onClick={()=>logout()} sx={{ mt:1 }}>Salir</Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ForcePasswordChange;
