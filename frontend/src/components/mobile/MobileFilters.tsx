import React from 'react';
import {
  Box,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  alpha,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Divider,
} from '@mui/material';
import {
  Search,
  Refresh,
  FilterList,
  ExpandMore,
} from '@mui/icons-material';

interface MobileFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterOptions?: {
    status?: {
      value: string;
      onChange: (value: string) => void;
      options: Array<{ value: string; label: string }>;
    };
    department?: {
      value: string;
      onChange: (value: string) => void;
      options: Array<{ value: string; label: string }>;
    };
    documentType?: {
      value: string;
      onChange: (value: string) => void;
      options: Array<{ value: string; label: string }>;
    };
  };
  onRefresh?: () => void;
  onClearFilters?: () => void;
  loading?: boolean;
  corporateColor?: string;
  searchPlaceholder?: string;
}

export const MobileFilters: React.FC<MobileFiltersProps> = ({
  searchTerm,
  onSearchChange,
  filterOptions,
  onRefresh,
  onClearFilters,
  loading = false,
  corporateColor = '#501b36',
  searchPlaceholder = 'Buscar...'
}) => {
  const hasActiveFilters = searchTerm !== '' || 
    (filterOptions?.status?.value !== 'all') ||
    (filterOptions?.department?.value !== 'all') ||
    (filterOptions?.documentType?.value !== 'all');

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        border: '1px solid #e0e0e0',
        overflow: 'hidden',
      }}
    >
      {/* Búsqueda principal */}
      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '&:hover': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: corporateColor,
                },
              },
              '&.Mui-focused': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: corporateColor,
                },
              },
            },
          }}
          size="small"
        />
      </Box>

      {/* Filtros avanzados (colapsables) */}
      {(filterOptions || onRefresh) && (
        <>
          <Divider />
          <Accordion 
            elevation={0}
            sx={{
              '&:before': { display: 'none' },
              '& .MuiAccordionSummary-root': {
                minHeight: 48,
                '&.Mui-expanded': {
                  minHeight: 48,
                },
              },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              sx={{
                bgcolor: alpha(corporateColor, 0.02),
                '&:hover': {
                  bgcolor: alpha(corporateColor, 0.04),
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterList sx={{ fontSize: 20, color: corporateColor }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: corporateColor }}>
                  Filtros avanzados
                </Typography>
                {hasActiveFilters && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#ff5722',
                    }}
                  />
                )}
              </Box>
            </AccordionSummary>

            <AccordionDetails sx={{ p: 2, pt: 1 }}>
              <Stack spacing={2}>
                {/* Filtros dinámicos */}
                {filterOptions?.status && (
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ '&.Mui-focused': { color: corporateColor } }}>
                      Estado
                    </InputLabel>
                    <Select
                      value={filterOptions.status.value}
                      label="Estado"
                      onChange={(e) => filterOptions.status!.onChange(e.target.value)}
                      sx={{
                        borderRadius: 1.5,
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: corporateColor,
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: corporateColor,
                        },
                      }}
                    >
                      {filterOptions.status.options.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {filterOptions?.department && (
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ '&.Mui-focused': { color: corporateColor } }}>
                      Departamento
                    </InputLabel>
                    <Select
                      value={filterOptions.department.value}
                      label="Departamento"
                      onChange={(e) => filterOptions.department!.onChange(e.target.value)}
                      sx={{
                        borderRadius: 1.5,
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: corporateColor,
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: corporateColor,
                        },
                      }}
                    >
                      {filterOptions.department.options.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {filterOptions?.documentType && (
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ '&.Mui-focused': { color: corporateColor } }}>
                      Documentos
                    </InputLabel>
                    <Select
                      value={filterOptions.documentType.value}
                      label="Documentos"
                      onChange={(e) => filterOptions.documentType!.onChange(e.target.value)}
                      sx={{
                        borderRadius: 1.5,
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: corporateColor,
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: corporateColor,
                        },
                      }}
                    >
                      {filterOptions.documentType.options.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {/* Botones de acción */}
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  {onClearFilters && (
                    <Button
                      variant="outlined"
                      onClick={onClearFilters}
                      disabled={!hasActiveFilters}
                      size="small"
                      sx={{
                        flex: 1,
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontWeight: 600,
                        borderColor: alpha(corporateColor, 0.5),
                        color: corporateColor,
                        '&:hover': {
                          borderColor: corporateColor,
                          bgcolor: alpha(corporateColor, 0.04),
                        },
                      }}
                    >
                      Limpiar
                    </Button>
                  )}
                  
                  {onRefresh && (
                    <Button
                      variant="contained"
                      startIcon={<Refresh />}
                      onClick={onRefresh}
                      disabled={loading}
                      size="small"
                      sx={{
                        flex: 1,
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontWeight: 600,
                        bgcolor: corporateColor,
                        '&:hover': {
                          bgcolor: alpha(corporateColor, 0.8),
                        },
                      }}
                    >
                      {loading ? 'Actualizando...' : 'Actualizar'}
                    </Button>
                  )}
                </Stack>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </>
      )}
    </Paper>
  );
};
