import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  alpha,
} from '@mui/material';

interface PaginationComponentProps {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
  showItemsPerPageSelector?: boolean;
  corporateColor?: string;
}

export const PaginationComponent: React.FC<PaginationComponentProps> = ({
  currentPage,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [5, 10, 25, 50, 100],
  showItemsPerPageSelector = true,
  corporateColor = '#501b36'
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = ((currentPage - 1) * itemsPerPage) + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalItems === 0) {
    return null;
  }

  return (
    <Box sx={{ 
      p: 3, 
      borderTop: '1px solid #e0e0e0',
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
      justifyContent: 'space-between',
      alignItems: { xs: 'stretch', sm: 'center' },
      gap: 2,
      bgcolor: alpha(corporateColor, 0.02),
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          Mostrando {startItem} - {endItem} de {totalItems} registros
        </Typography>
        
        {showItemsPerPageSelector && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel sx={{ '&.Mui-focused': { color: corporateColor } }}>
              Por página
            </InputLabel>
            <Select
              value={itemsPerPage}
              label="Por página"
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              sx={{
                borderRadius: 2,
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: corporateColor,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: corporateColor,
                },
              }}
            >
              {itemsPerPageOptions.map(option => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>
      
      {/* Paginación */}
      {totalPages > 1 && (
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={(_event, value) => onPageChange(value)}
          color="primary"
          size="large"
          showFirstButton
          showLastButton
          sx={{
            '& .MuiPaginationItem-root': {
              '&.Mui-selected': {
                backgroundColor: corporateColor,
                color: 'white',
                '&:hover': {
                  backgroundColor: alpha(corporateColor, 0.8),
                },
              },
            },
          }}
        />
      )}
    </Box>
  );
};
