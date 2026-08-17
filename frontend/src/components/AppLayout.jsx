import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  ContactRound,
  FolderKanban,
  GraduationCap,
  IdCard,
  LayoutDashboard,
  LogOut,
  Mic2,
  PanelLeft,
  Printer,
  Radio,
  Receipt,
  Share2,
  ShoppingBag,
  Target,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import {
  applyThemeToDocument,
  companySlugToPath,
  getThemeForSlug,
  hubRootFromPathname,
  pathToCompanySlug,
  remapAdminPath,
} from '../constants/themes';
import { ACCESSIBLE_SLUG } from '../constants/accessible';
import { BESTTECH_SLUG } from '../constants/besttech';
import { BEST_IN_PRINT_SLUG } from '../constants/bestinprint';
import { OXYGEN_SLUG } from '../constants/oxygen';
import { TRIFONE_SLUG } from '../constants/trifone';
import { isPortfolioRole, useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';

const GLOBAL_HUB_SEGMENTS = new Set([
  'companies',
  'users',
  'staff',
  'assessments',
  'scorecards',
  'performance',
]);

const companySlugFromPath = (pathname) => {
  const match = pathname.match(/^\/(admin|md)\/([^/]+)/);
  if (!match) return null;
  const segment = match[2];
  if (GLOBAL_HUB_SEGMENTS.has(segment)) return null;
  return pathToCompanySlug(segment);
};

const AppLayout = () => {
  const { user, logout } = useAuth();
  const {
    companies,
    activeCompany,
    switchCompany,
    ALL_COMPANIES,
  } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';
  const isMd = user?.role === 'md';
  const isPortfolio = isPortfolioRole(user);
  const hubRoot = isMd
    ? '/md'
    : isAdmin
      ? hubRootFromPathname(location.pathname)
      : '/admin';
  const routeCompanySlug = companySlugFromPath(location.pathname);
  const inCompanyWorkspace = Boolean(routeCompanySlug);
  const onPortfolioHub =
    isPortfolio &&
    (location.pathname === hubRoot ||
      location.pathname === `${hubRoot}/companies` ||
      location.pathname === `${hubRoot}/users` ||
      location.pathname === `${hubRoot}/staff` ||
      location.pathname === `${hubRoot}/assessments` ||
      location.pathname === `${hubRoot}/scorecards` ||
      location.pathname.startsWith(`${hubRoot}/scorecards/`));

  const companySlug = routeCompanySlug || activeCompany?.slug;
  const isSmipayUser = !isPortfolio && activeCompany?.slug === 'smipay';
  const isSmehUser = !isPortfolio && activeCompany?.slug === 'smart-edu-hub';
  const isBestTechUser = !isPortfolio && activeCompany?.slug === BESTTECH_SLUG;
  const isBestInPrintUser =
    !isPortfolio && activeCompany?.slug === BEST_IN_PRINT_SLUG;
  const isAccessibleUser =
    !isPortfolio && activeCompany?.slug === ACCESSIBLE_SLUG;
  const isOxygenUser = !isPortfolio && activeCompany?.slug === OXYGEN_SLUG;
  const isTrifoneUser = !isPortfolio && activeCompany?.slug === TRIFONE_SLUG;
  const showAdminSmipay = isPortfolio && companySlug === 'smipay';
  const showAdminSmeh = isPortfolio && companySlug === 'smart-edu-hub';
  const showAdminBestTech = isPortfolio && companySlug === BESTTECH_SLUG;
  const showAdminBestInPrint = isPortfolio && companySlug === BEST_IN_PRINT_SLUG;
  const showAdminAccessible = isPortfolio && companySlug === ACCESSIBLE_SLUG;
  const showAdminOxygen = isPortfolio && companySlug === OXYGEN_SLUG;
  const showAdminTrifone = isPortfolio && companySlug === TRIFONE_SLUG;
  const theme = getThemeForSlug(
    onPortfolioHub || companySlug === 'all' ? 'all' : companySlug
  );

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('gat_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('gat_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (onPortfolioHub) {
      applyThemeToDocument('all');
    }
  }, [onPortfolioHub]);

  const companyBase = companySlugToPath(companySlug);

  const adminHubLinks = [
    { to: hubRoot, end: true, label: 'Companies', icon: LayoutDashboard },
    ...(isAdmin
      ? [
          { to: `${hubRoot}/companies`, label: 'Manage', icon: Building2 },
          { to: `${hubRoot}/users`, label: 'Users', icon: Users },
          { to: `${hubRoot}/staff`, label: 'Staff', icon: IdCard },
        ]
      : []),
    ...(isPortfolio
      ? [
          {
            to: `${hubRoot}/assessments`,
            label: 'Assessment',
            icon: ClipboardCheck,
          },
          {
            to: `${hubRoot}/scorecards`,
            label: 'Scorecards',
            icon: Trophy,
          },
        ]
      : []),
  ];

  const adminCompanyLinks = companyBase
    ? [
        {
          to: `${hubRoot}/${companyBase}/overview`,
          end: true,
          label: 'Overview',
          icon: LayoutDashboard,
        },
        ...(!showAdminBestTech &&
        !showAdminBestInPrint &&
        !showAdminAccessible &&
        !showAdminOxygen &&
        !showAdminTrifone
          ? [
              {
                to: `${hubRoot}/${companyBase}/analytics`,
                label: 'Analytics',
                icon: BarChart3,
              },
            ]
          : []),
        ...(showAdminSmipay
          ? [
              {
                to: `${hubRoot}/${companyBase}/total-analytics`,
                label: 'Total analytics',
                icon: CalendarRange,
              },
              {
                to: `${hubRoot}/${companyBase}/transactions`,
                label: 'Transactions',
                icon: Receipt,
              },
              {
                to: `${hubRoot}/${companyBase}/customers`,
                label: 'Customers',
                icon: ContactRound,
              },
              {
                to: `${hubRoot}/${companyBase}/social-media`,
                label: 'Social media',
                icon: Share2,
              },
              {
                to: `${hubRoot}/${companyBase}/kpi`,
                label: 'KPIs',
                icon: Target,
              },
              {
                to: `${hubRoot}/${companyBase}/costs`,
                label: 'Costs',
                icon: Wallet,
              },
            ]
          : []),
        ...(showAdminSmeh
          ? [
              {
                to: `${hubRoot}/${companyBase}/subscriptions`,
                label: 'Subscriptions',
                icon: Receipt,
              },
              {
                to: `${hubRoot}/${companyBase}/schools`,
                label: 'Schools',
                icon: GraduationCap,
              },
            ]
          : []),
        ...(showAdminBestTech
          ? [
              {
                to: `${hubRoot}/${companyBase}/clients`,
                label: 'Clients',
                icon: Briefcase,
              },
              {
                to: `${hubRoot}/${companyBase}/projects`,
                label: 'Projects',
                icon: FolderKanban,
              },
            ]
          : []),
        ...(showAdminBestInPrint
          ? [
              {
                to: `${hubRoot}/${companyBase}/clients`,
                label: 'Clients',
                icon: Briefcase,
              },
              {
                to: `${hubRoot}/${companyBase}/jobs`,
                label: 'Jobs',
                icon: Printer,
              },
            ]
          : []),
        ...(showAdminOxygen
          ? [
              {
                to: `${hubRoot}/${companyBase}/advertisers`,
                label: 'Advertisers',
                icon: Mic2,
              },
              {
                to: `${hubRoot}/${companyBase}/bookings`,
                label: 'Bookings',
                icon: Radio,
              },
            ]
          : []),
        ...(showAdminTrifone
          ? [
              {
                to: `${hubRoot}/${companyBase}/customers`,
                label: 'Customers',
                icon: ContactRound,
              },
              {
                to: `${hubRoot}/${companyBase}/sales`,
                label: 'Sales',
                icon: ShoppingBag,
              },
            ]
          : []),
        ...(showAdminAccessible
          ? [
              {
                to: `${hubRoot}/${companyBase}/daily-totals`,
                label: 'Daily totals',
                icon: CalendarRange,
              },
              {
                to: `${hubRoot}/${companyBase}/school-purchases`,
                label: 'School purchases',
                icon: BookOpen,
              },
              {
                to: `${hubRoot}/${companyBase}/data-analysis`,
                label: 'Data analysis',
                icon: BarChart3,
              },
            ]
          : []),
        ...(isAdmin && (showAdminSmipay || showAdminSmeh)
          ? [
              {
                to: `${hubRoot}/${companyBase}/surveys`,
                label: 'Surveys',
                icon: ClipboardList,
              },
            ]
          : []),
      ]
    : adminHubLinks;

  const portfolioLinks =
    onPortfolioHub || !inCompanyWorkspace ? adminHubLinks : adminCompanyLinks;

  const userLinks = isAccessibleUser
    ? [
        {
          to: '/dashboard/accessible-daily-totals',
          end: true,
          label: 'Daily totals',
          icon: CalendarRange,
        },
        {
          to: '/dashboard/records',
          label: 'My records',
          icon: ClipboardList,
        },
      ]
    : [
        {
          to: '/dashboard',
          end: true,
          label: isSmehUser
            ? 'Subscriptions'
            : isBestTechUser
              ? 'Projects'
              : isBestInPrintUser
                ? 'Jobs'
                : isOxygenUser
                  ? 'Bookings'
                  : isTrifoneUser
                    ? 'Sales'
                    : 'Transactions',
          icon: isTrifoneUser
            ? ShoppingBag
            : isOxygenUser
              ? Radio
              : isBestInPrintUser
                ? Printer
                : isBestTechUser
                  ? FolderKanban
                  : Receipt,
        },
        ...(isSmipayUser
          ? [
              {
                to: '/dashboard/customers',
                label: 'Customers',
                icon: ContactRound,
              },
              {
                to: '/dashboard/social-media',
                label: 'Social media',
                icon: Share2,
              },
              {
                to: '/dashboard/daily-totals',
                label: 'Daily totals',
                icon: CalendarRange,
              },
              {
                to: '/dashboard/analytics',
                label: 'Analytics',
                icon: BarChart3,
              },
            ]
          : []),
        ...(isSmehUser
          ? [
              {
                to: '/dashboard/schools',
                label: 'Schools',
                icon: GraduationCap,
              },
            ]
          : []),
        ...(isBestTechUser || isBestInPrintUser
          ? [{ to: '/dashboard/clients', label: 'Clients', icon: Briefcase }]
          : []),
        ...(isOxygenUser
          ? [
              {
                to: '/dashboard/advertisers',
                label: 'Advertisers',
                icon: Mic2,
              },
            ]
          : []),
        ...(isTrifoneUser
          ? [
              {
                to: '/dashboard/customers',
                label: 'Customers',
                icon: ContactRound,
              },
            ]
          : []),
        { to: '/dashboard/records', label: 'My records', icon: ClipboardList },
      ];

  const links = isPortfolio ? portfolioLinks : userLinks;

  const brand = theme.brandHtml;
  const topbarTitle = onPortfolioHub
    ? isMd
      ? 'Portfolio overview'
      : 'All companies'
    : activeCompany?.name || 'Select a company';

  const onCompanyChange = (value) => {
    if (value === 'all' || value === '') {
      switchCompany(ALL_COMPANIES);
      navigate(hubRoot);
      return;
    }
    const next = companies.find((c) => c.slug === value);
    if (!next) return;
    switchCompany(next);
    navigate(remapAdminPath(location.pathname, next.slug));
  };

  const roleLabel =
    user?.role === 'md'
      ? 'MD'
      : user?.role === 'admin'
        ? 'admin'
        : user?.role || '';

  return (
    <div className={`app-shell${collapsed ? ' sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">
            {brand.primary}
            {brand.accent ? (
              <span className="brand-pay">{brand.accent}</span>
            ) : null}
          </div>
          {!collapsed && (
            <div className="brand-sub">
              {isMd ? 'Executive view' : 'Growth Analysis'}
            </div>
          )}
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {isPortfolio && inCompanyWorkspace && (
            <Link
              to={hubRoot}
              className="sidebar-link sidebar-link-back"
              title="All companies"
              onClick={() => switchCompany(ALL_COMPANIES)}
            >
              <ArrowLeft size={18} strokeWidth={1.75} />
              {!collapsed && <span>All companies</span>}
            </Link>
          )}
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                title={link.label}
                className={({ isActive }) =>
                  `sidebar-link${isActive ? ' active' : ''}`
                }
              >
                <Icon size={18} strokeWidth={1.75} />
                {!collapsed && <span>{link.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {!collapsed && (
            <div className="sidebar-user">
              <strong>{user?.name}</strong>
              <span>{roleLabel}</span>
            </div>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-block sidebar-logout"
            onClick={logout}
            title="Log out"
          >
            <LogOut size={18} strokeWidth={1.75} />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setCollapsed((v) => !v)}
              aria-label="Toggle sidebar"
              title="Toggle sidebar"
            >
              <PanelLeft size={18} strokeWidth={1.75} />
            </button>
            <h2 className="topbar-title">{topbarTitle}</h2>
            {!onPortfolioHub && activeCompany?.type && (
              <span className="badge">
                {activeCompany.slug === 'all' ? 'all' : activeCompany.type}
              </span>
            )}
            {isMd && (
              <span className="badge" title="Managing Director — read portfolio">
                Executive
              </span>
            )}
          </div>

          <div className="topbar-actions">
            {isPortfolio && (
              <div className="company-switch">
                <Building2 size={15} strokeWidth={1.75} />
                <span className="switch-label">Company</span>
                <select
                  value={
                    onPortfolioHub
                      ? 'all'
                      : routeCompanySlug || activeCompany?.slug || 'all'
                  }
                  onChange={(e) => onCompanyChange(e.target.value)}
                >
                  <option value="all">All companies</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
