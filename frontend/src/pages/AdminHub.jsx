import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, GraduationCap, Users, Wallet } from 'lucide-react';
import api from '../api/client';
import {
  adminCompanyPath,
  COMPANY_THEMES,
  companySlugToPath,
  getThemeForSlug,
} from '../constants/themes';
import { useCompany } from '../context/CompanyContext';
import { formatMoney, formatNumber } from '../utils/format';

const COMPANY_ICONS = {
  smipay: Wallet,
  'smart-edu-hub': GraduationCap,
};

const AdminHub = () => {
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

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Companies</h1>
          <p>
            Pick a company to open its workspace. Each company has its own
            routes, navigation, and theme.
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
              {formatNumber(summary.teamUserCount)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Smipay volume</div>
            <div className="stat-value">
              {formatMoney(summary.smipayVolume)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">SMEH subscription revenue</div>
            <div className="stat-value">
              {formatMoney(summary.smehRevenue ?? summary.eduFees)}
            </div>
          </div>
        </div>
      )}

      <div className="company-hub-grid">
        {companies.map((company) => {
          const theme = getThemeForSlug(company.slug);
          const Icon = COMPANY_ICONS[company.slug] || Building2;
          return (
            <Link
              key={company._id}
              to={adminCompanyPath(company.slug, 'overview')}
              className="company-hub-card"
              style={{ '--card-accent': theme.accent }}
              onClick={() => switchCompany(company)}
            >
              <div className="company-hub-card-top">
                <span className="company-hub-mark">
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <span className="badge">{company.type}</span>
              </div>
              <div>
                <h2>{company.name}</h2>
                <p>
                  {company.description ||
                    `Open ${company.name} overview, analytics, and tools.`}
                </p>
              </div>
              <div className="company-hub-meta">
                <span className="badge">
                  /admin/{companySlugToPath(company.slug)}
                </span>
              </div>
              <span className="company-hub-cta">
                Enter workspace <ArrowRight size={16} strokeWidth={2} />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="global-admin-links">
        <Link to="/admin/companies" className="btn btn-ghost">
          Manage companies
        </Link>
        <Link to="/admin/users" className="btn btn-ghost">
          <Users size={16} strokeWidth={1.75} />
          Manage users
        </Link>
      </div>

      {!companies.length && (
        <p className="empty" style={{ marginTop: '1.5rem' }}>
          No companies yet. Add one under Manage companies.
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
