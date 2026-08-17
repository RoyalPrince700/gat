import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Building2,
  Cpu,
  GraduationCap,
  Printer,
  Radio,
  Tablet,
  Users,
  Wallet,
} from 'lucide-react';
import api from '../api/client';
import accessibleLogo from '../assets/accessiblelogo.png';
import bestInPrintLogo from '../assets/bestinprint.png';
import bestTechLogo from '../assets/besttechlogo.png';
import oxygenFmLogo from '../assets/oxygenfm.jpg';
import smipayLogo from '../assets/smipaylogo.jpeg';
import smartEduHubLogo from '../assets/smarteduhublogo.png';
import trifoneLogo from '../assets/Trfione-Logo.webp';
import {
  adminCompanyPath,
  COMPANY_THEMES,
  getThemeForSlug,
  hubRootFromPathname,
} from '../constants/themes';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { formatMoney, formatNumber } from '../utils/format';

const COMPANY_ICONS = {
  smipay: Wallet,
  'smart-edu-hub': GraduationCap,
  'best-technology-it': Cpu,
  'best-in-print': Printer,
  'accessible-publishers': BookOpen,
  'oxygen-fm': Radio,
  trifone: Tablet,
};

const COMPANY_LOGOS = {
  smipay: smipayLogo,
  'smart-edu-hub': smartEduHubLogo,
  'best-technology-it': bestTechLogo,
  'best-in-print': bestInPrintLogo,
  'accessible-publishers': accessibleLogo,
  'oxygen-fm': oxygenFmLogo,
  trifone: trifoneLogo,
};

const AdminHub = () => {
  const { user } = useAuth();
  const location = useLocation();
  const hubRoot = hubRootFromPathname(location.pathname);
  const isMd = user?.role === 'md' || hubRoot === '/md';
  const isAdmin = user?.role === 'admin';
  const { companies, ALL_COMPANIES, switchCompany } = useCompany();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    switchCompany(ALL_COMPANIES);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hub always resets to all
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/overview', { params: { company: 'all' } })
      .then(({ data }) => {
        if (!cancelled) setSummary(data.summary);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byCompany = summary?.byCompany || [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{isMd ? 'Portfolio overview' : 'Companies'}</h1>
          <p>
            {isMd
              ? 'Executive view of revenue, expenses, and which company is performing best. Open a workspace for detail.'
              : 'Pick a company to open its workspace. Each company has its own routes, navigation, and theme.'}
          </p>
        </div>
      </div>

      {summary && (
        <div className="stats">
          <div className="stat">
            <div className="stat-label">Companies</div>
            <div className="stat-value">
              {formatNumber(summary.companyCount ?? companies.length)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Team users</div>
            <div className="stat-value">
              {formatNumber(summary.teamUserCount ?? 0)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Total revenue</div>
            <div className="stat-value">
              {formatMoney(summary.totalRevenue ?? 0)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Total expenses</div>
            <div className="stat-value">
              {formatMoney(summary.totalExpenses ?? 0)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Net</div>
            <div className="stat-value">
              {formatMoney(summary.netPosition ?? 0)}
            </div>
          </div>
        </div>
      )}

      {byCompany.length > 0 && (
        <section className="panel" style={{ marginBottom: '1.5rem' }}>
          <div className="panel-head">
            <h2>Company performance</h2>
            <p className="hint" style={{ margin: 0, border: 'none', padding: 0 }}>
              Ranked by net (revenue − expenses)
            </p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Company</th>
                  <th>Revenue</th>
                  <th>Expenses</th>
                  <th>Net</th>
                  <th>Activity</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {byCompany.map((row, index) => {
                  const theme = getThemeForSlug(row.slug);
                  return (
                    <tr key={row.slug}>
                      <td>
                        {index === 0 ? (
                          <span className="badge" style={{ background: theme.accentSoft, color: theme.accent }}>
                            Top
                          </span>
                        ) : (
                          index + 1
                        )}
                      </td>
                      <td>
                        <strong>{row.name}</strong>
                      </td>
                      <td>{formatMoney(row.revenue ?? 0)}</td>
                      <td>{formatMoney(row.expenses ?? 0)}</td>
                      <td>{formatMoney(row.net ?? 0)}</td>
                      <td>{formatNumber(row.activityCount ?? 0)}</td>
                      <td>
                        <Link
                          to={adminCompanyPath(row.slug, 'overview', hubRoot)}
                          onClick={() => {
                            const found = companies.find((c) => c.slug === row.slug);
                            if (found) switchCompany(found);
                          }}
                          className="btn btn-ghost"
                          style={{ padding: '0.25rem 0.5rem' }}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="company-hub-grid">
        {companies.map((company) => {
          const theme = getThemeForSlug(company.slug);
          const Icon = COMPANY_ICONS[company.slug] || Building2;
          const logo = COMPANY_LOGOS[company.slug];
          const perf = byCompany.find((r) => r.slug === company.slug);
          return (
            <Link
              key={company._id}
              to={adminCompanyPath(company.slug, 'overview', hubRoot)}
              className="company-hub-card"
              style={{ '--card-accent': theme.accent }}
              onClick={() => switchCompany(company)}
            >
              <div className="company-hub-card-top">
                <span className={`company-hub-mark${logo ? ' has-logo' : ''}`}>
                  {logo ? (
                    <img src={logo} alt={company.name} />
                  ) : (
                    <Icon size={20} strokeWidth={1.75} />
                  )}
                </span>
                <span className="badge">{company.type}</span>
              </div>
              <div>
                <h2>{company.name}</h2>
                {perf && (
                  <p className="company-hub-perf">
                    Revenue {formatMoney(perf.revenue)} · Net{' '}
                    {formatMoney(perf.net)}
                  </p>
                )}
              </div>
              <span className="company-hub-cta">
                Enter workspace <ArrowRight size={16} strokeWidth={2} />
              </span>
            </Link>
          );
        })}
      </div>

      {isAdmin && (
        <div className="global-admin-links">
          <Link to="/admin/companies" className="btn btn-ghost">
            Manage companies
          </Link>
          <Link to="/admin/users" className="btn btn-ghost">
            <Users size={16} strokeWidth={1.75} />
            Manage users
          </Link>
        </div>
      )}

      {!companies.length && (
        <p className="empty" style={{ marginTop: '1.5rem' }}>
          {isAdmin
            ? 'No companies yet. Add one under Manage companies.'
            : 'No companies available yet.'}
        </p>
      )}

      {companies.some((c) => !COMPANY_THEMES[c.slug]) && (
        <p className="empty" style={{ marginTop: '1rem' }}>
          New companies use the platform theme until a custom palette is added.
        </p>
      )}
    </div>
  );
};

export default AdminHub;
