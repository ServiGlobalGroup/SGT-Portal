import { SxProps, Theme } from '@mui/material/styles';

export const corporateColor = '#501b36';

export const maroonGradient = 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 70%, #501b36 100%)';
export const maroonGradientHover = 'linear-gradient(135deg, #3d1429 0%, #5a1d3a 30%, #6b2545 70%, #3d1429 100%)';

export const mobileContainedButtonSx: SxProps<Theme> = {
  borderRadius: '20px',
  px: 2.5,
  py: 1,
  textTransform: 'none',
  fontSize: '0.85rem',
  fontWeight: 700,
  minWidth: 90,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  background: maroonGradient,
  color: 'white',
  boxShadow: '0 4px 12px rgba(80,27,54,0.3), 0 2px 4px rgba(80,27,54,0.2)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(80,27,54,0.1) 0%, rgba(80,27,54,0.05) 100%)',
    opacity: 0,
    transition: 'opacity 0.3s ease',
  },
  '&:hover': {
    background: maroonGradientHover,
    boxShadow: '0 6px 16px rgba(80,27,54,0.4), 0 2px 8px rgba(80,27,54,0.3)',
    transform: 'translateY(-1px)',
  },
  '&:hover::before': { opacity: 1 },
  '&.Mui-disabled': { background: maroonGradient, opacity: 0.6, color: 'white' },
};

export const makeMobileContainedButtonSx = (custom?: Partial<SxProps<Theme>>): SxProps<Theme> => ({
  ...mobileContainedButtonSx,
  ...(custom as any),
});
