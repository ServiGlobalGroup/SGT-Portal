import React, { ReactNode } from 'react';
import {
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  FormHelperText,
  InputAdornment,
  useTheme,
} from '@mui/material';

export interface ModernFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'datetime-local' | 'multiline' | 'select';
  placeholder?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  rows?: number;
  options?: { value: string | number; label: string }[];
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  multiline?: boolean;
  maxLength?: number;
  min?: string | number;
  max?: string | number;
}

export const ModernField: React.FC<ModernFieldProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  error,
  helperText,
  disabled = false,
  startIcon,
  endIcon,
  rows = 4,
  options = [],
  fullWidth = true,
  size = 'medium',
  multiline = false,
  maxLength,
  min,
  max,
}) => {
  const theme = useTheme();

  const baseFieldStyles = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2.5,
      backgroundColor: 'white',
      transition: 'all 0.2s ease',
      '& fieldset': {
        borderColor: 'rgba(0, 0, 0, 0.15)',
        borderWidth: '2px',
      },
      '&:hover fieldset': {
        borderColor: '#501b36',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#501b36',
        borderWidth: '2px',
      },
      '&.Mui-error fieldset': {
        borderColor: theme.palette.error.main,
      },
    },
    '& .MuiInputLabel-root': {
      fontWeight: 600,
      color: 'rgba(0, 0, 0, 0.7)',
      '&.Mui-focused': {
        color: '#501b36',
      },
      '&.Mui-error': {
        color: theme.palette.error.main,
      },
    },
    '& .MuiFormHelperText-root': {
      fontSize: '0.875rem',
      marginTop: 1,
      marginLeft: 0.5,
    },
  };

  if (type === 'select') {
    return (
      <Box sx={{ mb: 3 }}>
        <FormControl 
          fullWidth={fullWidth} 
          error={!!error}
          size={size}
          sx={baseFieldStyles}
        >
          <InputLabel 
            required={required}
            sx={{ 
              fontWeight: 600,
              '&.Mui-focused': { 
                color: '#501b36' 
              } 
            }}
          >
            {label}
          </InputLabel>
          <Select
            value={value}
            label={label}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            startAdornment={startIcon ? (
              <InputAdornment position="start">
                {startIcon}
              </InputAdornment>
            ) : undefined}
            endAdornment={endIcon ? (
              <InputAdornment position="end">
                {endIcon}
              </InputAdornment>
            ) : undefined}
            MenuProps={{
              PaperProps: {
                sx: {
                  borderRadius: 2,
                  mt: 0.5,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                  '& .MuiMenuItem-root': {
                    py: 1.5,
                    px: 2,
                    borderRadius: 1,
                    mx: 0.5,
                    my: 0.25,
                    '&:hover': {
                      backgroundColor: 'rgba(80, 27, 54, 0.08)',
                      color: '#501b36',
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(80, 27, 54, 0.12)',
                      color: '#501b36',
                      '&:hover': {
                        backgroundColor: 'rgba(80, 27, 54, 0.16)',
                      },
                    },
                  },
                },
              },
            }}
          >
            {options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {option.label}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
          {(error || helperText) && (
            <FormHelperText>
              {error || helperText}
            </FormHelperText>
          )}
        </FormControl>
      </Box>
    );
  }

  const isMultiline = type === 'multiline' || multiline;

  return (
    <Box sx={{ mb: 3 }}>
      <TextField
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type === 'multiline' ? 'text' : type}
        placeholder={placeholder}
        required={required}
        error={!!error}
        helperText={error || helperText}
        disabled={disabled}
        fullWidth={fullWidth}
        size={size}
        multiline={isMultiline}
        rows={isMultiline ? rows : undefined}
        inputProps={{
          maxLength,
          min,
          max,
        }}
        InputProps={{
          startAdornment: startIcon ? (
            <InputAdornment position="start">
              <Box sx={{ color: 'rgba(0, 0, 0, 0.54)' }}>
                {startIcon}
              </Box>
            </InputAdornment>
          ) : undefined,
          endAdornment: endIcon ? (
            <InputAdornment position="end">
              <Box sx={{ color: 'rgba(0, 0, 0, 0.54)' }}>
                {endIcon}
              </Box>
            </InputAdornment>
          ) : undefined,
        }}
        InputLabelProps={{
          shrink: type === 'date' || type === 'datetime-local' ? true : undefined,
        }}
        sx={baseFieldStyles}
      />
      {maxLength && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {String(value).length} / {maxLength}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// Componente para mostrar información resumida
export const InfoCard: React.FC<{
  title: string;
  items: { icon?: ReactNode; label: string; value: string | ReactNode }[];
  color?: string;
}> = ({ title, items, color = '#501b36' }) => {
  return (
    <Box sx={{ 
      p: 3, 
      backgroundColor: 'white', 
      borderRadius: 2.5,
      border: `2px solid ${color}15`,
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        background: `linear-gradient(90deg, ${color} 0%, ${color}80 100%)`,
      },
    }}>
      <Typography 
        variant="subtitle1" 
        color="text.secondary" 
        gutterBottom 
        sx={{ 
          fontWeight: 700,
          textTransform: 'uppercase',
          fontSize: '0.875rem',
          letterSpacing: 0.5,
          mb: 2,
        }}
      >
        {title}
      </Typography>
      {items.map((item, index) => (
        <Box key={index} sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5, 
          mb: index === items.length - 1 ? 0 : 1.5,
        }}>
          {item.icon && (
            <Box sx={{ 
              color: color,
              display: 'flex',
              alignItems: 'center',
              minWidth: 20,
            }}>
              {item.icon}
            </Box>
          )}
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
              {item.label}:{' '}
            </Typography>
            <Typography variant="body2" component="span" color="text.secondary">
              {item.value}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

// Componente para chips de estado modernos
export const StatusChip: React.FC<{
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive' | string;
  customColor?: string;
  size?: 'small' | 'medium';
}> = ({ status, customColor, size = 'medium' }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'approved':
      case 'active':
        return { color: '#4caf50', bg: '#4caf5015', text: 'Aprobado' };
      case 'rejected':
      case 'inactive':
        return { color: '#f44336', bg: '#f4433615', text: 'Rechazado' };
      case 'pending':
        return { color: '#ff9800', bg: '#ff980015', text: 'Pendiente' };
      default:
        return { 
          color: customColor || '#757575', 
          bg: `${customColor || '#757575'}15`, 
          text: status 
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Chip
      label={config.text}
      size={size}
      sx={{
        backgroundColor: config.bg,
        color: config.color,
        fontWeight: 700,
        fontSize: size === 'small' ? '0.75rem' : '0.8125rem',
        height: size === 'small' ? 24 : 32,
        borderRadius: 2,
        border: `2px solid ${config.color}30`,
        '& .MuiChip-label': {
          px: size === 'small' ? 1 : 1.5,
        },
      }}
    />
  );
};
