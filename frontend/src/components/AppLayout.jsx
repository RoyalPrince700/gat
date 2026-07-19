import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ContactRound,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Receipt,
  Share2,
  Target,
  Users,
  Wallet,
} from 'lucide-react';
import {
  applyThemeToDocument,
  companySlugToPath,
  getThemeForSlug,
  pathToCompanySlug,
  remapAdminPath,
} from '../constants/themes';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';

const GLOBAL_ADMIN_SEGMENTS = new Set(['companies', 'users']);

const companySlugFromPath = (pathname) => {
  const match = pathname.match(/^\/admin\/([^/]+)/);
  if (!match) return null;
  const segment = match[1];
  if (GLOBAL_ADMIN_SEGMENTS.has(segment)) return null;
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
  const routeCompanySlug = companySlugFromPath(location.pathname);
  const inCompanyWorkspace = Boolean(routeCompanySlug);
  const onAdminHub =
    isAdmin &&
    (location.pathname === '/admin' ||
      location.pathname === '/admin/companies' ||
      location.pathname === '/admin/users');

  const companySlug = routeCompanySlug || activeCompany?.slug;
  const isSmipayUser = !isAdmin && activeCompany?.slug === 'smipay';
  const isSmehUser = !isAdmin && activeCompany?.slug === 'smart-edu-hub';
  const showAdminSmipay = isAdmin && companySlug === 'smipay';
  const showAdminSmeh = isAdmin && companySlug === 'smart-edu-hub';
  const theme = getThemeForSlug(
    onAdminHub || companySlug === 'all' ? 'all' : companySlug
  );

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('gat_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('gat_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (onAdminHub) {
      applyThemeToDocument('all');
    }
  }, [onAdminHub]);

  const companyBase = companySlugToPath(companySlug);

  const adminHubLinks = [
    { to: '/admin', end: true, label: 'Companies', icon: LayoutDashboard },
    { to: '/admin/companies', label: 'Manage', icon: Building2 },
    { to: '/admin/users', label: 'Users', icon: Users },
  ];

  const adminCompanyLinks = companyBase
    ? [
        {
          to: `/admin/${companyBase}/overview`,
          end: true,
          label: 'Overview',
          icon: LayoutDashboard,
        },
        {
          to: `/admin/${companyBase}/analytics`,
          label: 'Analytics',
          icon: BarChart3,
        },
        ...(showAdminSmipay
          ? [
              {
                to: `/admin/${companyBase}/transactions`,
                label: 'Transactions',
                icon: Receipt,
              },
              {
                to: `/admin/${companyBase}/customers`,
                label: 'Customers',
                icon: ContactRound,
              },
              {
                to: `/admin/${companyBase}/social-media`,
                label: 'Social media',
                icon: Share2,
              },
              {
                to: `/admin/${companyBase}/kpi`,
                label: 'KPIs',
                icon: Target,
              },
              {
                to: `/admin/${companyBase}/costs`,
                label: 'Costs',
                icon: Wallet,
              },
            ]
          : []),
        ...(showAdminSmeh
          ? [
              {
                to: `/admin/${companyBase}/subscriptions`,
                label: 'Subscriptions',
                icon: Receipt,
              },
              {
                to: `/admin/${companyBase}/schools`,
                label: 'Schools',
                icon: GraduationCap,
              },
            ]
          : []),
        ...(showAdminSmipay || showAdminSmeh
          ? [
              {
                to: `/admin/${companyBase}/surveys`,
                label: 'Surveys',
                icon: ClipboardList,
              },
            ]
          : []),
      ]
    : adminHubLinks;

  const adminLinks =
    onAdminHub || !inCompanyWorkspace ? adminHubLinks : adminCompanyLinks;

  const userLinks = [
    {
      to: '/dashboard',
      end: true,
      label: isSmehUser ? 'Subscriptions' : 'Transactions',
      icon: Receipt,
    },
    ...(isSmipayUser
      ? [
          { to: '/dashboard/customers', label: 'Customers', icon: ContactRound },
          { to: '/dashboard/social-media', label: 'Social media', icon: Share2 },
        ]
      : []),
    ...(isSmehUser
      ? [{ to: '/dashboard/schools', label: 'Schools', icon: GraduationCap }]
      : []),
    { to: '/dashboard/records', label: 'My records', icon: ClipboardList },
  ];

  const links = isAdmin ? adminLinks : userLinks;

  const brand = theme.brandHtml;
  const topbarTitle = onAdminHub
    ? 'All companies'
    : activeCompany?.name || 'Select a company';

  const onCompanyChange = (value) => {
    if (value === 'all' || value === '') {
      switchCompany(ALL_COMPANIES);
      navigate('/admin');
      return;
    }
    const next = companies.find((c) => c.slug === value);
    if (!next) return;
    switchCompany(next);
    navigate(remapAdminPath(location.pathname, next.slug));
  };

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
          {!collapsed && <div className="brand-sub">Growth Analysis</div>}
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
          {isAdmin && inCompanyWorkspace && (
            <Link
              to="/admin"
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
              <span>{user?.role}</span>
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
            {!onAdminHub && activeCompany?.type && (
              <span className="badge">
                {activeCompany.slug === 'all' ? 'all' : activeCompany.type}
              </span>
            )}
          </div>

          <div className="topbar-actions">
            {isAdmin && (
              <div className="company-switch">
                <Building2 size={15} strokeWidth={1.75} />
                <span className="switch-label">Company</span>
                <select
                  value={
                    onAdminHub
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
