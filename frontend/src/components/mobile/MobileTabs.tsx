import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
  ButtonBase,
  Badge,
} from '@mui/material';
import { alpha } from '@mui/material/styles';

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
}

export const MobileTabs: React.FC<MobileTabsProps> = ({
  options,
  activeTab,
  onChange,
  corporateColor = '#501b36',
  variant = 'default'
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
                      bgcolor: corporateColor,
                      color: 'white',
                      boxShadow: `0 2px 8px ${alpha(corporateColor, 0.3)}`,
                      '&:hover': {
                        bgcolor: corporateColor,
                        boxShadow: `0 4px 12px ${alpha(corporateColor, 0.4)}`,
                      },
                    }
                  : {
                      borderColor: alpha(corporateColor, 0.3),
                      color: corporateColor,
                      '&:hover': {
                        bgcolor: alpha(corporateColor, 0.05),
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
    return (
      <Box 
        sx={{ 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          px: { xs: 1, sm: 2 },
          mt: 2,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 1,
            borderRadius: 3,
            bgcolor: alpha(corporateColor, 0.05),
            border: `1px solid ${alpha(corporateColor, 0.1)}`,
            width: '100%',
            maxWidth: '500px',
          }}
        >
          <Stack
            direction="row"
            spacing={0.5}
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
                  height: 44,
                  borderRadius: 2.5,
                  px: 1,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  ...(activeTab === option.id
                    ? {
                        bgcolor: corporateColor,
                        color: 'white',
                        transform: 'scale(1.02)',
                        boxShadow: `0 4px 12px ${alpha(corporateColor, 0.3)}`,
                      }
                    : {
                        bgcolor: 'transparent',
                        color: corporateColor,
                        '&:hover': {
                          bgcolor: alpha(corporateColor, 0.1),
                        },
                      }),
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  {option.icon}
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: activeTab === option.id ? 700 : 600,
                      fontSize: { xs: '0.8rem', sm: '0.85rem' },
                    }}
                  >
                    {option.label}
                  </Typography>
                  {option.count !== undefined && (
                    <Box
                      sx={{
                        bgcolor: activeTab === option.id 
                          ? 'rgba(255,255,255,0.2)' 
                          : alpha(corporateColor, 0.1),
                        color: activeTab === option.id ? 'white' : corporateColor,
                        borderRadius: '50%',
                        minWidth: 20,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
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
