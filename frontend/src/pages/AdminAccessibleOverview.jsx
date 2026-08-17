import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api/client';
import {
  ACCESSIBLE_CATEGORIES,
  ACCESSIBLE_LEVELS,
  ACCESSIBLE_SLUG,
  accessibleCategoryLabel,
  accessibleLevelLabel,
} from '../constants/accessible';
import {
  adminCompanyPath,
  getThemeForSlug,
  hubRootFromPathname,
} from '../constants/themes';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney, formatNumber } from '../utils/format';

const today = () => new Date().toISOString().slice(0, 10);

const defaultRange = () => {
  const to = today();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  return { from: formatDate(fromDate), to };
};

const AdminAccessibleOverview = () => {
  const { activeCompany } = useCompany();
  const hubRoot = hubRootFromPathname(useLocation().pathname);
  const [records, setRecords] = useState([]);
  const [range, setRange] = useState(defaultRange);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const slug = activeCompany?.slug;
  const theme = getThemeForSlug(slug);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/accessible/daily-totals', {
        params: range,
      });
      setRecords(data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug === ACCESSIBLE_SLUG) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, range.from, range.to]);

  const kpis = useMemo(() => {
    let totalCredit = 0;
    let totalDebit = 0;
    const byCategory = {};
    const byLevel = {};
    ACCESSIBLE_CATEGORIES.forEach(({ value }) => {
      byCategory[value] = 0;
    });
    ACCESSIBLE_LEVELS.forEach(({ value }) => {
      byLevel[value] = 0;
    });

    records.forEach((row) => {
      totalCredit += row.totalCredit || 0;
      totalDebit += row.totalDebit || 0;
      ACCESSIBLE_CATEGORIES.forEach(({ value }) => {
        byCategory[value] += row.categories?.[value]?.volume || 0;
      });
      ACCESSIBLE_LEVELS.forEach(({ value }) => {
        byLevel[value] += row.levels?.[value]?.volume || 0;
      });
    });

    return {
      totalCredit,
      totalDebit,
      netTotal: totalCredit - totalDebit,
      daysLogged: records.length,
      byCategory: ACCESSIBLE_CATEGORIES.map(({ value }) => ({
        category: value,
        volume: byCategory[value],
      })).filter((r) => r.volume > 0),
      byLevel: ACCESSIBLE_LEVELS.map(({ value }) => ({
        level: value,
        volume: byLevel[value],
      })).filter((r) => r.volume > 0),
      recent: records.slice(0, 8),
    };
  }, [records]);

  if (!activeCompany || slug !== ACCESSIBLE_SLUG) {
    return (
      <div className="page">
        <p className="empty">
          Overview is available for Accessible Publishers.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <p className="empty">Loading overview…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to={hubRoot} className="back-to-hub">
        ← All companies
      </Link>
      <div className="page-header">
        <div>
          <h1>
            {activeCompany.name} overview
            {hubRoot === '/md' ? (
              <span className="badge" style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }}>
                Executive view
              </span>
            ) : null}
          </h1>
          <p>
            Daily credit totals by format and education level. Deep analytics
            can build on this foundation later.
          </p>
        </div>
        <div className="row-actions">
          <Link
            to={adminCompanyPath(slug, 'daily-totals', hubRoot)}
            className="btn btn-primary"
          >
            Daily totals
          </Link>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <section className="panel" style={{ marginBottom: '1rem' }}>
        <div className="form-grid">
          <label>
            From
            <input
              type="date"
              value={range.from}
              onChange={(e) =>
                setRange((prev) => ({ ...prev, from: e.target.value }))
              }
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={range.to}
              onChange={(e) =>
                setRange((prev) => ({ ...prev, to: e.target.value }))
              }
            />
          </label>
        </div>
      </section>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Total credit</div>
          <div className="stat-value">{formatMoney(kpis.totalCredit)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total debit</div>
          <div className="stat-value">{formatMoney(kpis.totalDebit)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Net</div>
          <div className="stat-value">{formatMoney(kpis.netTotal)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Days logged</div>
          <div className="stat-value">{formatNumber(kpis.daysLogged)}</div>
        </div>
      </div>

      <div className="stats">
        {ACCESSIBLE_CATEGORIES.slice(0, 4).map(({ value, label }) => {
          const vol =
            kpis.byCategory.find((c) => c.category === value)?.volume || 0;
          return (
            <div className="stat" key={value}>
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatMoney(vol)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="stats">
        {ACCESSIBLE_CATEGORIES.slice(4).map(({ value, label }) => {
          const vol =
            kpis.byCategory.find((c) => c.category === value)?.volume || 0;
          return (
            <div className="stat" key={value}>
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatMoney(vol)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2>Credit by format</h2>
          {kpis.byCategory.length ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpis.byCategory}>
                  <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                  <XAxis
                    dataKey="category"
                    tickFormatter={accessibleCategoryLabel}
                    stroke="#6e6e73"
                    fontSize={11}
                  />
                  <YAxis
                    stroke="#6e6e73"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v) => formatMoney(v)}
                    labelFormatter={accessibleCategoryLabel}
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 12,
                    }}
                  />
                  <Bar
                    dataKey="volume"
                    fill={theme.chartPrimary}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="empty">No category volumes in this range.</p>
          )}
        </section>

        <section className="panel">
          <h2>Credit by education level</h2>
          {kpis.byLevel.length ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpis.byLevel}>
                  <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                  <XAxis
                    dataKey="level"
                    tickFormatter={accessibleLevelLabel}
                    stroke="#6e6e73"
                    fontSize={11}
                  />
                  <YAxis
                    stroke="#6e6e73"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v) => formatMoney(v)}
                    labelFormatter={accessibleLevelLabel}
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 12,
                    }}
                  />
                  <Bar
                    dataKey="volume"
                    fill={theme.chartSecondary}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="empty">No education-level volumes in this range.</p>
          )}

          <div className="activity-block" style={{ marginTop: '1.25rem' }}>
            <h3>Recent daily totals</h3>
            {kpis.recent.length === 0 ? (
              <p className="empty">No daily totals yet.</p>
            ) : (
              <ul className="activity-list">
                {kpis.recent.map((r) => (
                  <li key={r._id}>
                    <span>{formatDate(r.date)}</span>
                    <span>
                      {formatMoney(r.totalCredit)} credit
                      {r.totalDebit
                        ? ` · ${formatMoney(r.totalDebit)} debit`
                        : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminAccessibleOverview;
