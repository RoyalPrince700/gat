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
  'best-technology-it': {
    id: 'best-technology-it',
    label: 'Best Technology IT',
    brandHtml: { primary: 'Best', accent: 'Tech' },
    accent: '#689F38',
    accentHover: '#558B2F',
    accentSoft: '#e8f5d9',
    brandSecondary: '#1a1a1a',
    chartPrimary: '#689F38',
    chartSecondary: '#4A5F66',
    bg: '#f4f7ef',
    bgSoft: '#f8fbf3',
    line: 'rgba(104, 159, 56, 0.16)',
  },
  'accessible-publishers': {
    id: 'accessible-publishers',
    label: 'Accessible Publishers',
    brandHtml: { primary: 'Accessible', accent: 'Pub' },
    accent: '#0d7377',
    accentHover: '#095c5f',
    accentSoft: '#e6f4f4',
    brandSecondary: '#1a3a4a',
    chartPrimary: '#0d7377',
    chartSecondary: '#c17f59',
    bg: '#f4f8f8',
    bgSoft: '#f9fcfc',
    line: 'rgba(13, 115, 119, 0.12)',
  },
  'oxygen-fm': {
    id: 'oxygen-fm',
    label: 'Oxygen FM',
    brandHtml: { primary: 'Oxygen', accent: 'FM' },
    accent: '#1565C0',
    accentHover: '#0D47A1',
    accentSoft: '#e3f0fc',
    brandSecondary: '#0a2540',
    chartPrimary: '#1565C0',
    chartSecondary: '#5c6b7a',
    bg: '#f3f7fc',
    bgSoft: '#f7fafd',
    line: 'rgba(21, 101, 192, 0.14)',
  },
  trifone: {
    id: 'trifone',
    label: 'Trifone',
    brandHtml: { primary: 'Tri', accent: 'fone' },
    accent: '#14562C',
    accentHover: '#0f4423',
    accentSoft: '#e6f0ea',
    brandSecondary: '#0a2e18',
    chartPrimary: '#14562C',
    chartSecondary: '#5c7a68',
    bg: '#f3f7f4',
    bgSoft: '#f7faf8',
    line: 'rgba(20, 86, 44, 0.14)',
  },
  'best-in-print': {
    id: 'best-in-print',
    label: 'Best In Print',
    brandHtml: { primary: 'Best In', accent: 'Print' },
    accent: '#9B1B30',
    accentHover: '#7A1526',
    accentSoft: '#f8e8eb',
    brandSecondary: '#3d1a28',
    chartPrimary: '#9B1B30',
    chartSecondary: '#6b4f57',
    bg: '#faf6f7',
    bgSoft: '#fdf9fa',
    line: 'rgba(155, 27, 48, 0.14)',
  },
};

/** Nice URL segments → company slug in DB */
const PATH_TO_SLUG = {
  smipay: 'smipay',
  smarteduhub: 'smart-edu-hub',
  'smart-edu-hub': 'smart-edu-hub',
  besttech: 'best-technology-it',
  'best-technology-it': 'best-technology-it',
  bestinprint: 'best-in-print',
  'best-in-print': 'best-in-print',
  accessible: 'accessible-publishers',
  accessiblepublishers: 'accessible-publishers',
  'accessible-publishers': 'accessible-publishers',
  oxygen: 'oxygen-fm',
  'oxygen-fm': 'oxygen-fm',
  trifone: 'trifone',
};

/** Company slug → preferred URL segment */
const SLUG_TO_PATH = {
  smipay: 'smipay',
  'smart-edu-hub': 'smarteduhub',
  'best-technology-it': 'besttech',
  'best-in-print': 'bestinprint',
  'accessible-publishers': 'accessible',
  'oxygen-fm': 'oxygen',
  trifone: 'trifone',
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

/** Portfolio workspace root: `/admin` or `/md`. */
export const hubRootFromPathname = (pathname = '') =>
  String(pathname).startsWith('/md') ? '/md' : '/admin';

export const normalizeHubRoot = (hubRoot = '/admin') => {
  if (hubRoot === 'md' || hubRoot === '/md') return '/md';
  return '/admin';
};

/** Company workspace path under admin or MD hub. */
export const adminCompanyPath = (
  companySlug,
  page = 'overview',
  hubRoot
) => {
  const root = normalizeHubRoot(
    hubRoot ??
      (typeof window !== 'undefined'
        ? hubRootFromPathname(window.location.pathname)
        : '/admin')
  );
  const path = companySlugToPath(companySlug);
  if (!path) return root;
  return `${root}/${path}/${page}`;
};

/** Preserve current sub-page when switching companies (admin or MD). */
export const remapAdminPath = (pathname, nextCompanySlug) => {
  const root = hubRootFromPathname(pathname);
  const nextPath = companySlugToPath(nextCompanySlug);
  if (!nextPath) return root;

  const match = String(pathname).match(/^\/(admin|md)\/([^/]+)(?:\/([^/]+))?/);
  if (!match) return `${root}/${nextPath}/overview`;

  const currentPathSlug = match[2];
  const page = match[3] || 'overview';

  // Global admin / MD portfolio pages
  if (
    currentPathSlug === 'companies' ||
    currentPathSlug === 'users' ||
    currentPathSlug === 'staff' ||
    currentPathSlug === 'assessments' ||
    currentPathSlug === 'scorecards' ||
    currentPathSlug === 'performance'
  ) {
    return `${root}/${nextPath}/overview`;
  }

  // Smipay-only pages — fall back to overview for other companies
  // (customers shared with Trifone — handled separately)
  const smipayOnly = [
    'transactions',
    'social-media',
    'kpi',
    'costs',
    'total-analytics',
  ];
  const smehOnly = ['subscriptions', 'schools'];
  const besttechOnly = ['projects'];
  const bestInPrintOnly = ['jobs'];
  const oxygenOnly = ['advertisers', 'bookings'];
  const accessibleOnly = ['daily-totals', 'school-purchases', 'data-analysis'];
  const trifoneOnly = ['sales'];
  const nextSlug = pathToCompanySlug(nextPath);
  if (page === 'customers' && nextSlug !== 'smipay' && nextSlug !== 'trifone') {
    return `${root}/${nextPath}/overview`;
  }
  // Clients shared by Best Technology IT and Best In Print
  if (
    page === 'clients' &&
    nextSlug !== 'best-technology-it' &&
    nextSlug !== 'best-in-print'
  ) {
    return `${root}/${nextPath}/overview`;
  }
  if (smipayOnly.includes(page) && nextSlug !== 'smipay') {
    return `${root}/${nextPath}/overview`;
  }
  if (smehOnly.includes(page) && nextSlug !== 'smart-edu-hub') {
    return `${root}/${nextPath}/overview`;
  }
  if (besttechOnly.includes(page) && nextSlug !== 'best-technology-it') {
    return `${root}/${nextPath}/overview`;
  }
  if (bestInPrintOnly.includes(page) && nextSlug !== 'best-in-print') {
    return `${root}/${nextPath}/overview`;
  }
  if (oxygenOnly.includes(page) && nextSlug !== 'oxygen-fm') {
    return `${root}/${nextPath}/overview`;
  }
  if (accessibleOnly.includes(page) && nextSlug !== 'accessible-publishers') {
    return `${root}/${nextPath}/overview`;
  }
  if (trifoneOnly.includes(page) && nextSlug !== 'trifone') {
    return `${root}/${nextPath}/overview`;
  }

  // surveys is shared by Smipay and Smart Edu Hub
  if (page === 'surveys' && nextSlug !== 'smipay' && nextSlug !== 'smart-edu-hub') {
    return `${root}/${nextPath}/overview`;
  }

  // Companies without generic analytics yet
  if (
    page === 'analytics' &&
    (nextSlug === 'accessible-publishers' ||
      nextSlug === 'oxygen-fm' ||
      nextSlug === 'trifone' ||
      nextSlug === 'best-in-print' ||
      nextSlug === 'best-technology-it')
  ) {
    return `${root}/${nextPath}/overview`;
  }

  return `${root}/${nextPath}/${page}`;
};
