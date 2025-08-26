import React from 'react';
import { Paper, Box, Typography } from '@mui/material';

export type PageBannerPattern = 'crosses' | 'dots' | 'grid' | 'diagonal' | 'circles' | 'plus' | 'triangles' | 'hexagons' | 'waves';

interface PageBannerProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  pattern?: PageBannerPattern;
  gradient?: string;
  children?: React.ReactNode; // extra custom content (below title row)
  sx?: any;
}

// Helper to URL encode SVG snippets
const svg = (content: string) => `url("data:image/svg+xml,${encodeURIComponent(content)}")`;

const PATTERNS: Record<PageBannerPattern, string> = {
  crosses: svg(`<svg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'><g fill='none' fill-rule='evenodd'><g fill='%23ffffff' fill-opacity='0.08'><path d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/></g></g></svg>`),
  dots: svg(`<svg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'><g fill='%23ffffff' fill-opacity='0.12'><circle cx='5' cy='5' r='2'/><circle cx='35' cy='25' r='2'/><circle cx='15' cy='35' r='2'/><circle cx='45' cy='55' r='2'/><circle cx='55' cy='15' r='2'/></g></svg>`),
  grid: svg(`<svg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'><path d='M0 0h80v80H0z' fill='none'/><path d='M0 .5h80M0 20.5h80M0 40.5h80M0 60.5h80M.5 0v80M20.5 0v80M40.5 0v80M60.5 0v80' stroke='%23ffffff' stroke-opacity='.09' stroke-width='1' shape-rendering='crispEdges'/></svg>`),
  diagonal: svg(`<svg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'><defs><pattern id='d' width='10' height='10' patternUnits='userSpaceOnUse' patternTransform='rotate(45)'><line x1='0' y1='0' x2='0' y2='10' stroke='%23ffffff' stroke-width='2' stroke-opacity='.08'/></pattern></defs><rect width='40' height='40' fill='url(%23d)'/></svg>`),
  circles: svg(`<svg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'><g fill='none' stroke='%23ffffff' stroke-opacity='.1' stroke-width='1'><circle cx='60' cy='60' r='20'/><circle cx='60' cy='60' r='40'/><circle cx='60' cy='60' r='58'/></g></svg>`),
  plus: svg(`<svg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'><g stroke='%23ffffff' stroke-opacity='.1' stroke-width='2'><path d='M30 10v40M10 30h40'/></g></svg>`),
  triangles: svg(`<svg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'><g fill='%23ffffff' fill-opacity='.07'><path d='M0 80L40 0l40 80z'/><path d='M20 80L40 40l20 40z'/></g></svg>`),
  hexagons: svg(`<svg width='100' height='86' viewBox='0 0 100 86' xmlns='http://www.w3.org/2000/svg'><g fill='none' stroke='%23ffffff' stroke-opacity='.08' stroke-width='2'><path d='M25 1l25 0 25 42-25 42-25 0-25-42z'/><path d='M75 1l25 0 25 42-25 42-25 0-25-42z' transform='translate(-25 0)'/></g></svg>`),
  waves: svg(`<svg width='140' height='60' viewBox='0 0 140 60' xmlns='http://www.w3.org/2000/svg'><path d='M0 30c10-10 30-10 40 0s30 10 40 0 30-10 40 0' fill='none' stroke='%23ffffff' stroke-opacity='.12' stroke-width='2'/></svg>`),
};

export const PageBanner: React.FC<PageBannerProps> = ({ icon, title, subtitle, actions, pattern='crosses', gradient = 'linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 55%, #d4a574 100%)', children, sx }) => {
  const backgroundImage = PATTERNS[pattern] || PATTERNS.crosses;
  return (
    <Paper elevation={0} sx={{ p: { xs:3, sm:4 }, background: gradient, color: 'white', borderRadius: 3, position: 'relative', overflow: 'hidden', '&::before': { content:'""', position:'absolute', inset:0, backgroundImage, backgroundSize:'cover' }, ...sx }}>
      <Box sx={{ position:'relative', zIndex:1 }}>
        <Box sx={{ display:'flex', alignItems:'center', gap:2 }}>
          {icon && (
            <Box sx={{ p:2, bgcolor:'rgba(255,255,255,0.18)', borderRadius:2, backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center' }}>{icon}</Box>
          )}
          <Box sx={{ flex:1, minWidth:0 }}>
            <Typography variant='h4' sx={{ fontWeight:700, mb: subtitle ? 0.5 : 0 }}>{title}</Typography>
            {subtitle && <Typography variant='h6' sx={{ opacity:0.9, fontWeight:400, fontSize:{ xs:'1rem', sm:'1.05rem' } }}>{subtitle}</Typography>}
          </Box>
          {actions && <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>{actions}</Box>}
        </Box>
        {children && (
          <Box sx={{ mt:2 }}>{children}</Box>
        )}
      </Box>
    </Paper>
  );
};

export default PageBanner;
