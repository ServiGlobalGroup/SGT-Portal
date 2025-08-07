import React, { useState } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  Chip,
  Stack,
} from '@mui/material';
import {
  Search,
  Clear,
  FilterList,
} from '@mui/icons-material';

interface MobileSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  corporateColor?: string;
  suggestions?: string[];
  onFilterClick?: () => void;
}

export const MobileSearchBar: React.FC<MobileSearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Buscar...',
  corporateColor = '#501b36',
  suggestions = [],
  onFilterClick
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleClear = () => {
    onChange('');
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
  };

  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(value.toLowerCase()) && suggestion !== value
  ).slice(0, 3);

  return (
    <Box 
      sx={{ 
        position: 'relative', 
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        px: { xs: 0, sm: 2 },
      }}
    >
      <Box sx={{ width: '100%', maxWidth: { xs: '100%', sm: '400px' } }}>
        <TextField
          fullWidth
          size="small"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          placeholder={placeholder}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Stack direction="row" spacing={0.5}>
                  {value && (
                    <IconButton
                      size="small"
                      onClick={handleClear}
                      sx={{ p: 0.5 }}
                    >
                      <Clear sx={{ fontSize: 18 }} />
                    </IconButton>
                  )}
                  {onFilterClick && (
                    <IconButton
                      size="small"
                      onClick={onFilterClick}
                      sx={{ 
                        p: 0.5,
                        color: corporateColor
                      }}
                    >
                      <FilterList sx={{ fontSize: 18 }} />
                    </IconButton>
                  )}
                </Stack>
              </InputAdornment>
            ),
            sx: {
              height: 48,
              borderRadius: 4,
              backgroundColor: '#ffffff',
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              '& .MuiOutlinedInput-notchedOutline': {
                border: '1px solid #e0e4e7',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: corporateColor,
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: corporateColor,
                borderWidth: 2,
              },
              '& input': {
                fontSize: '0.95rem',
                fontWeight: 500,
                '&::placeholder': {
                  color: 'text.secondary',
                  opacity: 0.7,
                },
              },
            },
          }}
        />

        {/* Sugerencias */}
        {showSuggestions && value && filteredSuggestions.length > 0 && (
          <Paper
            elevation={4}
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 1000,
              mt: 0.5,
              p: 1,
              borderRadius: 3,
              border: '1px solid #e0e4e7',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            }}
          >
            <Stack spacing={0.5}>
              {filteredSuggestions.map((suggestion, index) => (
                <Chip
                  key={index}
                  label={suggestion}
                  size="small"
                  variant="outlined"
                  onClick={() => handleSuggestionClick(suggestion)}
                  sx={{
                    justifyContent: 'flex-start',
                    borderColor: '#e0e4e7',
                    height: 32,
                    '&:hover': {
                      backgroundColor: `${corporateColor}10`,
                      borderColor: corporateColor,
                    },
                  }}
                />
              ))}
            </Stack>
          </Paper>
        )}
      </Box>
    </Box>
  );
};
