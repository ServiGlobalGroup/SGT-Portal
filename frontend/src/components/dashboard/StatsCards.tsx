import React from 'react';
import {
  Paper,
  Box,
  Typography,
  CircularProgress,
  Fade,
  Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';

interface StatsCardProps {
  title: string;
  value: number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
  details?: React.ReactNode;
  onClick?: () => void;
  tooltip?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  icon,
  color,
  loading = false,
  details,
  onClick,
  tooltip,
}) => (
  <Tooltip title={tooltip || ''} disableHoverListener={!tooltip} arrow placement="top">
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: '1px solid transparent',
        background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
        position: 'relative',
        height: '100%',
        transition: 'all 0.3s ease',
        cursor: onClick ? 'pointer' : 'default',
        '&:before': {
          content: '""',
            position: 'absolute',
            inset: 0,
            borderRadius: 3,
            padding: '1px',
            background: `linear-gradient(135deg, ${alpha(color,0.35)}, rgba(255,255,255,0))`,
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            pointerEvents: 'none',
            opacity: 0.25,
        },
        '&:hover': {
          boxShadow: `0 6px 24px ${alpha(color, 0.18)}`,
          transform: 'translateY(-3px)',
        },
        '&:hover .stats-icon': {
          animation: 'pulse 1.4s ease-in-out infinite',
        },
        '@keyframes pulse': {
          '0%,100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.07)' },
        },
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
    {loading ? (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    ) : (
      <Fade in timeout={600}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: alpha(color, 0.15),
                color: color,
                mr: 2,
                boxShadow: `0 2px 6px ${alpha(color,0.25)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color .3s ease, transform .3s ease',
                flexShrink: 0,
                position: 'relative',
                '& svg': { fontSize: 28 },
              }}
              className="stats-icon"
            >
              {icon}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1, display: 'flex', alignItems: 'center' }}>
                {value.toLocaleString()}
              </Typography>
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: details ? 0.5 : 1, fontWeight: 500, letterSpacing: .2 }}>
            {title}
          </Typography>
          {details && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mb: 1, lineHeight: 1.4 }}
            >
              {details}
            </Typography>
          )}

          {change !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {change > 0 ? (
                <ArrowUpward sx={{ fontSize: 16, color: '#4caf50', mr: 0.5 }} />
              ) : change < 0 ? (
                <ArrowDownward sx={{ fontSize: 16, color: '#f44336', mr: 0.5 }} />
              ) : null}
              <Typography
                variant="caption"
                sx={{
                  color: change > 0 ? '#4caf50' : change < 0 ? '#f44336' : 'text.secondary',
                  fontWeight: 500,
                }}
              >
                {change > 0 ? '+' : ''}{change} esta semana
              </Typography>
            </Box>
          )}
        </Box>
      </Fade>
    )}
    </Paper>
  </Tooltip>
);

export default StatsCard;
