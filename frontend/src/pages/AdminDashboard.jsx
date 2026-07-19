import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api/client';
import ActivationRetentionSection from '../components/analytics/ActivationRetentionSection';
import AnalyticsFilters, {
  rangeFromPreset,
} from '../components/analytics/AnalyticsFilters';
import AnalyticsNumbersView from '../components/analytics/AnalyticsNumbersView';
import AnalyticsOverview from '../components/analytics/AnalyticsOverview';
import CategoryAnalyticsSection from '../components/analytics/CategoryAnalyticsSection';
import { tooltipStyle } from '../components/analytics/chartTheme';
import GrowthAnalyticsSection from '../components/analytics/GrowthAnalyticsSection';
import UsersGrowthSection from '../components/analytics/UsersGrowthSection';
import { getThemeForSlug } from '../constants/themes';
import { useCompany } from '../context/CompanyContext';
import { formatMoney, formatNumber } from '../utils/format';

const SECTION_NAV = [
  { id: 'overview', label: 'Overview' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'growth', label: 'Growth OS' },
  { id: 'deposit', label: 'Deposit' },
  { id: 'airtime', label: 'Airtime' },
  { id: 'data', label: 'Data' },
  { id: 'users', label: 'Users' },
  { id: 'activation', label: 'Activation' },
  { id: 'retention', label: 'Retention' },
  { id: 'attribution', label: 'Attribution' },
  { id: 'geo-margin', label: 'Geo & margin' },
];

const scrollToSection = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const EduCharts = ({ title, analytics, theme }) => {
  const summary = analytics.summary || {};
  return (
    <div className="stack">
      <div className="page-header" style={{ marginBottom: '0.75rem' }}>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.03em',
          }}
        >
          {title}
        </h2>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Schools aware</div>
          <div className="stat-value">
            {formatNumber(summary.schoolCount)}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Subscribed schools</div>
          <div className="stat-value">
            {formatNumber(summary.subscribedSchoolCount)}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Subscription revenue</div>
          <div className="stat-value">
            {formatMoney(summary.subscriptionRevenue ?? summary.totalFees)}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Platform in use</div>
          <div className="stat-value">
            {formatNumber(summary.platformInUseCount)}
            {summary.platformInUsePct != null
              ? ` (${summary.platformInUsePct}%)`
              : ''}
          </div>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Active / inactive subs</div>
          <div className="stat-value" style={{ fontSize: '1.15rem' }}>
            {formatNumber(summary.activeSubs)} /{' '}
            {formatNumber(summary.inactiveSubs)}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Student onboarded</div>
          <div className="stat-value" style={{ fontSize: '1.15rem' }}>
            {summary.studentOnboardedPct ?? 0}%
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Teacher onboarded</div>
          <div className="stat-value" style={{ fontSize: '1.15rem' }}>
            {summary.teacherOnboardedPct ?? 0}%
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Parent onboarded</div>
          <div className="stat-value" style={{ fontSize: '1.15rem' }}>
            {summary.parentOnboardedPct ?? 0}%
          </div>
        </div>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2>Subscription amount over time</h2>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.trend || []}>
                <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#6e6e73"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="#6e6e73"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke={theme.chartPrimary}
                  strokeWidth={2.25}
                  name="Amount"
                />
                <Line
                  type="monotone"
                  dataKey="active"
                  stroke={theme.brandSecondary}
                  strokeWidth={2}
                  name="Active"
                />
                <Line
                  type="monotone"
                  dataKey="inactive"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  name="Inactive"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <h2>Top schools by subscription amount</h2>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.topSchools || []}>
                <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis
                  dataKey="schoolName"
                  stroke="#6e6e73"
                  fontSize={11}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                  tickLine={false}
                />
                <YAxis
                  stroke="#6e6e73"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="amount"
                  fill={theme.chartPrimary}
                  radius={[6, 6, 0, 0]}
                  name="Amount"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {analytics.expiringSoon?.length > 0 && (
        <section className="panel">
          <h2>Expiring within 30 days</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>School</th>
                  <th>Amount</th>
                  <th>Ends</th>
                </tr>
              </thead>
              <tbody>
                {analytics.expiringSoon.map((r) => (
                  <tr key={r._id}>
                    <td>{r.schoolName}</td>
                    <td>{formatMoney(r.amount)}</td>
                    <td>{String(r.endsAt).slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

const SmipayDeepAnalytics = ({ data, viewMode }) => {
  if (viewMode === 'numbers') {
    return <AnalyticsNumbersView data={data} />;
  }

  const { overview, sections } = data;

  return (
    <div className="stack analytics-deep">
      <nav className="analytics-section-nav" aria-label="Analytics sections">
        {SECTION_NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className="analytics-nav-chip"
            onClick={() => scrollToSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div id="overview">
        <AnalyticsOverview overview={overview} />
      </div>

      <GrowthAnalyticsSection growth={sections.growth} />

      <CategoryAnalyticsSection
        id="deposit"
        title="Deposit"
        description="Wallet deposits — trends, ticket sizes, and peak buying times."
        data={sections.deposit}
      />
      <CategoryAnalyticsSection
        id="airtime"
        title="Airtime"
        description="Airtime purchases by period, network, amount range, and time of day."
        data={sections.airtime}
        showNetwork
      />
      <CategoryAnalyticsSection
        id="data"
        title="Data"
        description="Data purchases with network mix, plan mix, and purchase patterns."
        data={sections.data}
        showNetwork
      />
      <UsersGrowthSection
        usersAdded={sections.usersAdded}
        usersActivated={sections.usersActivated}
      />
      <ActivationRetentionSection
        activationRate={sections.activationRate}
        retentionRate={sections.retentionRate}
      />
    </div>
  );
};

const AdminDashboard = () => {
  const { activeCompany } = useCompany();
  const [analytics, setAnalytics] = useState(null);
  const [deep, setDeep] = useState(null);
  const [preset, setPreset] = useState('90d');
  const [from, setFrom] = useState(() => rangeFromPreset('90d')?.from || '');
  const [to, setTo] = useState(() => rangeFromPreset('90d')?.to || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('charts');

  const slug = activeCompany?.slug;
  const theme = getThemeForSlug(slug);
  const isSmipay = slug === 'smipay';

  const applyPreset = (value) => {
    setPreset(value);
    if (value === 'custom') return;
    const range = rangeFromPreset(value);
    if (range) {
      setFrom(range.from);
      setTo(range.to);
    }
  };

  const load = async () => {
    if (!slug) return;
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;

      if (isSmipay) {
        const { data } = await api.get('/analytics/smipay/deep', { params });
        setDeep(data);
        setAnalytics(null);
      } else {
        const { data } = await api.get(`/analytics/${slug}`, { params });
        setAnalytics(data);
        setDeep(null);
      }
    } catch (err) {
      setDeep(null);
      setAnalytics(null);
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (preset === 'custom' || !isSmipay) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  const downloadReport = async () => {
    if (!slug) return;
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    const token = localStorage.getItem('gat_token');
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const res = await fetch(`${base}/reports/${slug}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.message || 'Download failed');
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-growth-report.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!activeCompany || activeCompany.slug === 'all') {
    return <div className="page">Select a company to view analysis.</div>;
  }

  const supported = slug === 'smipay' || slug === 'smart-edu-hub';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{activeCompany.name} analytics</h1>
          <p>
            {isSmipay
              ? 'Section-by-section growth charts: deposits, airtime, data, users, activation, and retention.'
              : slug === 'smart-edu-hub'
                ? 'LMS subscription revenue, active vs inactive, onboarding rates, and top schools.'
                : `Charts and KPIs for ${activeCompany.name}.`}
          </p>
        </div>
        <div className="page-header-actions">
          {isSmipay && (
            <div className="view-toggle" role="group" aria-label="View mode">
              <button
                type="button"
                className={`view-toggle-btn${viewMode === 'charts' ? ' active' : ''}`}
                onClick={() => setViewMode('charts')}
              >
                Charts
              </button>
              <button
                type="button"
                className={`view-toggle-btn${viewMode === 'numbers' ? ' active' : ''}`}
                onClick={() => setViewMode('numbers')}
              >
                Numbers
              </button>
            </div>
          )}
          {supported && (
            <button type="button" className="btn btn-primary" onClick={downloadReport}>
              Download CSV
            </button>
          )}
        </div>
      </div>

      <AnalyticsFilters
        preset={preset}
        from={from}
        to={to}
        onPreset={applyPreset}
        onFrom={(v) => {
          setPreset('custom');
          setFrom(v);
        }}
        onTo={(v) => {
          setPreset('custom');
          setTo(v);
        }}
        onApply={load}
      />

      {error && <p className="error">{error}</p>}

      {!supported ? (
        <p className="empty">
          Analytics modules are available for Smipay and Smart Edu Hub.
        </p>
      ) : loading ? (
        <p className="empty">Loading analytics…</p>
      ) : isSmipay ? (
        deep ? (
          <SmipayDeepAnalytics data={deep} viewMode={viewMode} />
        ) : (
          <p className="empty">No analytics available.</p>
        )
      ) : !analytics ? (
        <p className="empty">No analytics available.</p>
      ) : (
        <EduCharts
          title={activeCompany.name}
          analytics={analytics}
          theme={theme}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
