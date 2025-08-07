import React from 'react';
import {
  Box,
  Typography,
  Pagination,
  alpha,
} from '@mui/material';

interface MobilePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  corporateColor?: string;
}

export const MobilePagination: React.FC<MobilePaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  corporateColor = '#501b36'
}) => {
  const startItem = ((currentPage - 1) * itemsPerPage) + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalItems === 0 || totalPages <= 1) {
    return null;
  }

  return (
    <Box 
      sx={{ 
        p: 2,
        borderTop: '1px solid #e0e0e0',
        bgcolor: alpha(corporateColor, 0.02),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      {/* Información de registros */}
      <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
        {startItem} - {endItem} de {totalItems} registros
      </Typography>
      
      {/* Paginación compacta */}
      <Pagination
        count={totalPages}
        page={currentPage}
        onChange={(_event, value) => onPageChange(value)}
        color="primary"
        size="small"
        siblingCount={0}
        boundaryCount={1}
        sx={{
          '& .MuiPaginationItem-root': {
            fontSize: '0.8rem',
            minWidth: '32px',
            height: '32px',
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
    </Box>
  );
};
