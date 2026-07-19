import { SMIPAY_COLORS } from '../../constants/smipay';

const readCssVar = (name, fallback) => {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
};

/** Theme-aware tooltip; falls back to Smipay orange when vars unavailable */
export const getTooltipStyle = () => {
  const accent = readCssVar('--accent', SMIPAY_COLORS.orange);
  return {
    background: '#ffffff',
    border: `1px solid color-mix(in srgb, ${accent} 18%, transparent)`,
    borderRadius: 12,
    boxShadow: `0 8px 24px color-mix(in srgb, ${accent} 12%, transparent)`,
    color: SMIPAY_COLORS.ink,
  };
};

export const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid rgba(242,101,34,0.12)',
  borderRadius: 12,
  boxShadow: '0 8px 24px rgba(242,101,34,0.08)',
  color: SMIPAY_COLORS.ink,
};

export const NETWORK_COLORS = {
  mtn: '#ffcc00',
  airtel: '#ed1c24',
  glo: '#00a651',
  '9mobile': '#006F2D',
};

export const SERIES_COLORS = [
  SMIPAY_COLORS.orange,
  SMIPAY_COLORS.green,
  '#3b82f6',
  '#a855f7',
  SMIPAY_COLORS.chartSecondary,
];

export const getSeriesColors = () => {
  const accent = readCssVar('--accent', SMIPAY_COLORS.orange);
  const secondary = readCssVar('--brand-green', SMIPAY_COLORS.green);
  return [accent, secondary, '#3b82f6', '#a855f7', SMIPAY_COLORS.chartSecondary];
};
