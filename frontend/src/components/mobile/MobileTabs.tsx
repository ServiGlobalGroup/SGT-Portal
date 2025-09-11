import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
  ButtonBase,
  Badge,
  IconButton,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Search, FilterList } from '@mui/icons-material';
import { maroonGradient, maroonGradientHover } from '../../theme/mobileStyles';

interface TabOption {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  color?: string;
}

interface MobileTabsProps {
  options: TabOption[];
  activeTab: string;
  onChange: (tabId: string) => void;
  corporateColor?: string;
  variant?: 'default' | 'pills' | 'chips';
  // Props para funcionalidad de búsqueda (opcional)
  searchProps?: {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    placeholder?: string;
    showFilter?: boolean;
    onFilterClick?: () => void;
  };
}

export const MobileTabs: React.FC<MobileTabsProps> = ({
  options,
  activeTab,
  onChange,
  corporateColor = '#501b36',
  variant = 'default',
  searchProps
}) => {
  if (variant === 'chips') {
    return (
      <Box 
        sx={{ 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          p: 2, 
          bgcolor: 'background.paper' 
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{
            overflowX: 'auto',
            pb: 1,
            width: '100%',
            maxWidth: '600px',
            justifyContent: { xs: 'flex-start', sm: 'center' },
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            scrollbarWidth: 'none',
          }}
        >
          {options.map((option) => (
            <Chip
              key={option.id}
              label={
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  {option.icon}
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {option.label}
                  </Typography>
                  {option.count !== undefined && (
                    <Badge
                      badgeContent={option.count}
                      color="error"
                      sx={{
                        '& .MuiBadge-badge': {
                          fontSize: '0.6rem',
                          height: 16,
                          minWidth: 16,
                        },
                      }}
                    />
                  )}
                </Stack>
              }
              onClick={() => onChange(option.id)}
              variant={activeTab === option.id ? 'filled' : 'outlined'}
              sx={{
                minWidth: 'auto',
                height: 40,
                px: 2,
                flexShrink: 0,
                ...(activeTab === option.id
                  ? {
                      background: maroonGradient,
                      color: 'white',
                      borderColor: 'transparent',
                      boxShadow: `0 2px 8px ${alpha(corporateColor, 0.3)}`,
                      '&:hover': {
                        background: maroonGradientHover,
                        boxShadow: `0 4px 12px ${alpha(corporateColor, 0.4)}`,
                      },
                    }
                  : {
                      borderColor: alpha(corporateColor, 0.35),
                      color: corporateColor,
                      '&:hover': {
                        bgcolor: alpha(corporateColor, 0.06),
                        borderColor: corporateColor,
                      },
                    }),
              }}
            />
          ))}
        </Stack>
      </Box>
    );
  }

  if (variant === 'pills') {
  const columns = Math.min(options.length || 1, 4);
    return (
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          px: { xs: 1, sm: 2 },
          py: 1,
          gap: 2,
        }}
      >
        {/* Barra de búsqueda (opcional) */}
        {searchProps && (
          <Box
            sx={{
              width: '100%',
              maxWidth: '400px',
              display: 'flex',
              alignItems: 'center',
              bgcolor: alpha(corporateColor, 0.05),
              borderRadius: 3,
              px: 2,
              py: 1.5,
              border: `1px solid ${alpha(corporateColor, 0.15)}`,
              boxShadow: `0 2px 8px ${alpha(corporateColor, 0.08)}`,
            }}
          >
            <Search sx={{ color: alpha(corporateColor, 0.6), mr: 1.5, fontSize: 20 }} />
            <input
              type="text"
              placeholder={searchProps.placeholder || "Buscar..."}
              value={searchProps.searchTerm}
              onChange={(e) => searchProps.onSearchChange(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                flex: 1,
                fontSize: '14px',
                color: corporateColor,
                fontFamily: 'inherit',
              }}
            />
            {searchProps.showFilter && searchProps.onFilterClick && (
              <IconButton
                onClick={searchProps.onFilterClick}
                size="small"
                sx={{
                  ml: 1,
                  color: alpha(corporateColor, 0.6),
                  '&:hover': {
                    bgcolor: alpha(corporateColor, 0.1),
                    color: corporateColor,
                  },
                }}
              >
                <FilterList fontSize="small" />
              </IconButton>
            )}
          </Box>
        )}

        {/* Tabs */}
        <Box
          sx={{
            p: 0.25,
            borderRadius: 3,
            bgcolor: alpha(corporateColor, 0.08),
            border: `1px solid ${alpha(corporateColor, 0.15)}`,
            width: '100%',
            maxWidth: '100%',
            boxShadow: `0 2px 8px ${alpha(corporateColor, 0.1)}`,
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: 0.25,
              width: '100%',
            }}
          >
            {options.map((option) => (
              <ButtonBase
                key={option.id}
                onClick={() => onChange(option.id)}
                sx={{
                  height: 48,
                  borderRadius: 2.5,
                  px: { xs: 0.75, sm: 1.5 },
                  py: 1,
                  position: 'relative',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'hidden',
                  ...(activeTab === option.id
                    ? {
                        bgcolor: 'transparent',
                        background: maroonGradient,
                        backgroundImage: maroonGradient,
                        color: 'white',
                        transform: 'translateY(-1px)',
                        boxShadow: `0 6px 16px ${alpha(corporateColor, 0.4)}`,
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: `linear-gradient(135deg, transparent 0%, ${alpha('#fff', 0.12)} 50%, transparent 100%)`,
                          pointerEvents: 'none',
                        },
                        '&:hover': {
                          background: maroonGradientHover,
                          backgroundImage: maroonGradientHover,
                        }
                      }
                    : {
                        bgcolor: 'transparent',
                        color: corporateColor,
                        '&:hover': {
                          bgcolor: alpha(corporateColor, 0.12),
                          transform: 'translateY(-0.5px)',
                          boxShadow: `0 2px 8px ${alpha(corporateColor, 0.2)}`,
                        },
                      }),
                }}
              >
                <Stack 
                  direction="column" 
                  alignItems="center" 
                  spacing={0.5}
                  sx={{ position: 'relative', zIndex: 1 }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    {option.icon}
                    {option.count !== undefined && option.count > 0 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -6,
                          right: -8,
                          bgcolor: activeTab === option.id 
                            ? 'rgba(255,255,255,0.95)' 
                            : '#f44336',
                          color: activeTab === option.id ? corporateColor : 'white',
                          borderRadius: '50%',
                          minWidth: 18,
                          height: 18,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          border: activeTab === option.id 
                            ? `1.5px solid ${alpha(corporateColor, 0.3)}`
                            : '1.5px solid white',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        }}
                      >
                        {option.count}
                      </Box>
                    )}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: activeTab === option.id ? 700 : 600,
                      fontSize: '0.72rem',
                      lineHeight: 1,
                      textAlign: 'center',
                      letterSpacing: 0.2,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {option.label}
                  </Typography>
                </Stack>
              </ButtonBase>
            ))}
          </Box>
        </Box>
      </Box>
    );
  }

  // Variant por defecto
  return (
    <Box 
      sx={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          borderBottom: `1px solid ${alpha(corporateColor, 0.1)}`,
          bgcolor: 'background.paper',
          width: '100%',
          maxWidth: '600px',
        }}
      >
        <Stack
          direction="row"
          sx={{
            overflowX: 'auto',
            justifyContent: { xs: 'flex-start', sm: 'center' },
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            scrollbarWidth: 'none',
          }}
        >
          {options.map((option) => (
            <ButtonBase
              key={option.id}
              onClick={() => onChange(option.id)}
              sx={{
                flex: { xs: 'none', sm: 1 },
                minWidth: { xs: 100, sm: 'auto' },
                height: 48,
                position: 'relative',
                px: { xs: 1, sm: 2 },
                color: activeTab === option.id ? corporateColor : 'text.secondary',
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: alpha(corporateColor, 0.05),
                },
                ...(activeTab === option.id && {
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '60%',
                    height: 3,
                    bgcolor: corporateColor,
                    borderRadius: '3px 3px 0 0',
                  },
                }),
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                {option.icon}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: activeTab === option.id ? 700 : 500,
                    fontSize: { xs: '0.8rem', sm: '0.85rem' },
                  }}
                >
                  {option.label}
                </Typography>
                {option.count !== undefined && (
                  <Box
                    sx={{
                      bgcolor: activeTab === option.id 
                        ? corporateColor 
                        : alpha(corporateColor, 0.1),
                      color: activeTab === option.id ? 'white' : corporateColor,
                      borderRadius: '50%',
                      minWidth: 18,
                      height: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                    }}
                  >
                    {option.count}
                  </Box>
                )}
              </Stack>
            </ButtonBase>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
};
