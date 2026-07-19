/** Per-company visual themes and URL path helpers */

export const COMPANY_THEMES = {
  platform: {
    id: 'platform',
    label: 'GAT',
    brandHtml: { primary: 'GAT', accent: '' },
    accent: '#1d1d1f',
    accentHover: '#000000',
    accentSoft: '#f5f5f7',
    brandSecondary: '#6e6e73',
    chartPrimary: '#1d1d1f',
    chartSecondary: '#86868b',
    bg: '#f5f5f7',
    bgSoft: '#ffffff',
    line: 'rgba(29, 29, 31, 0.1)',
  },
  smipay: {
    id: 'smipay',
    label: 'Smipay',
    brandHtml: { primary: 'Smi', accent: 'Pay' },
    accent: '#f26522',
    accentHover: '#d9551a',
    accentSoft: '#fff0e8',
    brandSecondary: '#2db84b',
    chartPrimary: '#f26522',
    chartSecondary: '#8a9a8e',
    bg: '#faf7f5',
    bgSoft: '#fff8f5',
    line: 'rgba(242, 101, 34, 0.1)',
  },
  'smart-edu-hub': {
    id: 'smart-edu-hub',
    label: 'Smart Edu Hub',
    brandHtml: { primary: 'Smart', accent: 'Edu' },
    accent: '#7c3aed',
    accentHover: '#6d28d9',
    accentSoft: '#f3e8ff',
    brandSecondary: '#a78bfa',
    chartPrimary: '#7c3aed',
    chartSecondary: '#94a3b8',
    bg: '#f8f5ff',
    bgSoft: '#faf5ff',
    line: 'rgba(124, 58, 237, 0.12)',
  },
};

/** Nice URL segments → company slug in DB */
const PATH_TO_SLUG = {
  smipay: 'smipay',
  smarteduhub: 'smart-edu-hub',
  'smart-edu-hub': 'smart-edu-hub',
};

/** Company slug → preferred URL segment */
const SLUG_TO_PATH = {
  smipay: 'smipay',
  'smart-edu-hub': 'smarteduhub',
};

export const pathToCompanySlug = (pathSlug) => {
  if (!pathSlug || pathSlug === 'all') return null;
  return PATH_TO_SLUG[pathSlug] || pathSlug;
};

export const companySlugToPath = (slug) => {
  if (!slug || slug === 'all') return null;
  return SLUG_TO_PATH[slug] || slug;
};

export const getThemeForSlug = (slug) => {
  if (!slug || slug === 'all') return COMPANY_THEMES.platform;
  return COMPANY_THEMES[slug] || COMPANY_THEMES.platform;
};

export const applyThemeToDocument = (slug) => {
  const theme = getThemeForSlug(slug);
  const root = document.documentElement;
  root.dataset.theme = theme.id;
};

export const adminCompanyPath = (companySlug, page = 'overview') => {
  const path = companySlugToPath(companySlug);
  if (!path) return '/admin';
  return `/admin/${path}/${page}`;
};

/** Preserve current sub-page when switching companies */
export const remapAdminPath = (pathname, nextCompanySlug) => {
  const nextPath = companySlugToPath(nextCompanySlug);
  if (!nextPath) return '/admin';

  const match = pathname.match(/^\/admin\/([^/]+)(?:\/([^/]+))?/);
  if (!match) return `/admin/${nextPath}/overview`;

  const currentPathSlug = match[1];
  const page = match[2] || 'overview';

  // Global admin pages
  if (currentPathSlug === 'companies' || currentPathSlug === 'users') {
    return `/admin/${nextPath}/overview`;
  }

  // Smipay-only pages — fall back to overview for other companies
  const smipayOnly = [
    'transactions',
    'customers',
    'social-media',
    'kpi',
    'costs',
  ];
  const smehOnly = ['subscriptions', 'schools'];
  const nextSlug = pathToCompanySlug(nextPath);
  if (smipayOnly.includes(page) && nextSlug !== 'smipay') {
    return `/admin/${nextPath}/overview`;
  }
  if (smehOnly.includes(page) && nextSlug !== 'smart-edu-hub') {
    return `/admin/${nextPath}/overview`;
  }

  // surveys is shared by Smipay and Smart Edu Hub
  if (page === 'surveys' && nextSlug !== 'smipay' && nextSlug !== 'smart-edu-hub') {
    return `/admin/${nextPath}/overview`;
  }

  return `/admin/${nextPath}/${page}`;
};
