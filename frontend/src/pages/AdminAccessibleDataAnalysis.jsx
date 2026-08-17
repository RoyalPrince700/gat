import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api/client';
import { getTooltipStyle } from '../components/analytics/chartTheme';
import {
  ACCESSIBLE_GIFT_COST_PER_POINT,
  ACCESSIBLE_GIFT_COST_RANGE,
  ACCESSIBLE_GIFT_LADDER,
  ACCESSIBLE_NAIRA_PER_POINT,
  ACCESSIBLE_SEASONS,
  ACCESSIBLE_SLUG,
  spendToPoints,
} from '../constants/accessible';
import {
  adminCompanyPath,
  getThemeForSlug,
} from '../constants/themes';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { formatMoney, formatNumber } from '../utils/format';

const pct = (value) => `${((Number(value) || 0) * 100).toFixed(1)}%`;

const compactNaira = (value) => {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1e9) return `₦${(n / 1e9).toFixed(1)}bn`;
  if (Math.abs(n) >= 1e6) return `₦${(n / 1e6).toFixed(0)}m`;
  if (Math.abs(n) >= 1e3) return `₦${(n / 1e3).toFixed(0)}k`;
  return formatMoney(n);
};

const shortName = (name, max = 22) => {
  const s = String(name || '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

const SECTIONS = [
  { id: 'snapshot', label: 'Snapshot' },
  { id: 'seasons', label: 'Seasons' },
  { id: 'segments', label: 'Segments' },
  { id: 'concentration', label: 'Concentration' },
  { id: 'loyalty', label: 'Loyalty' },
  { id: 'schools', label: 'Clients' },
];

const SEGMENT_COLORS = [
  '#94a3b8',
  '#7dd3c0',
  '#0d7377',
  '#c17f59',
  '#b45309',
  '#7c2d12',
];

const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const AdminAccessibleDataAnalysis = () => {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const [data, setData] = useState(null);
  const [season, setSeason] = useState('all');
  const [viewMode, setViewMode] = useState('charts');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('amount');
  const [selectedSegment, setSelectedSegment] = useState('');
  const [nairaPerPoint, setNairaPerPoint] = useState(ACCESSIBLE_NAIRA_PER_POINT);
  const [giftCostPerPoint, setGiftCostPerPoint] = useState(
    ACCESSIBLE_GIFT_COST_PER_POINT
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const slug = activeCompany?.slug;
  const isAdmin = user?.role === 'admin';
  const theme = getThemeForSlug(slug);
  const tooltipStyle = getTooltipStyle();
  const chartFill = theme.chartPrimary || '#0d7377';
  const chartSecondary = theme.chartSecondary || '#c17f59';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (season && season !== 'all') params.season = season;
      const { data: payload } = await api.get('/accessible/purchases/analytics', {
        params,
      });
      setData(payload);
      setNairaPerPoint(
        payload.loyaltyPreview?.nairaPerPoint || ACCESSIBLE_NAIRA_PER_POINT
      );
      setGiftCostPerPoint(
        payload.loyaltyPreview?.giftCostPerPoint || ACCESSIBLE_GIFT_COST_PER_POINT
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug === ACCESSIBLE_SLUG) {
      setSelectedSegment('');
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, season]);

  const deleteSeason = async () => {
    if (!isAdmin) return;
    if (!season || season === 'all') {
      setError('Select 2023-2024, 2024-2025, or 2025-2026 before deleting');
      setSuccess('');
      return;
    }
    if (
      !window.confirm(
        `Delete all school purchase rows for ${season}? This cannot be undone. Other seasons are not affected.`
      )
    ) {
      return;
    }
    setClearing(true);
    setError('');
    setSuccess('');
    try {
      const { data: result } = await api.delete('/accessible/purchases', {
        params: { season },
      });
      setSuccess(
        `Deleted ${result.deleted || 0} rows for ${season}. Other seasons were left as they are.`
      );
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete season data');
    } finally {
      setClearing(false);
    }
  };

  const schools = useMemo(() => {
    const rate = Number(nairaPerPoint) > 0 ? Number(nairaPerPoint) : ACCESSIBLE_NAIRA_PER_POINT;
    return (data?.schools || []).map((row) => ({
      ...row,
      points: spendToPoints(row.amount, rate),
    }));
  }, [data, nairaPerPoint]);

  const loyalty = useMemo(() => {
    const rate = Number(nairaPerPoint) > 0 ? Number(nairaPerPoint) : ACCESSIBLE_NAIRA_PER_POINT;
    const gift =
      Number(giftCostPerPoint) > 0
        ? Number(giftCostPerPoint)
        : ACCESSIBLE_GIFT_COST_PER_POINT;
    const totalPoints = schools.reduce((sum, row) => sum + row.points, 0);
    const estimatedGiftBudget = totalPoints * gift;
    const totalSales = data?.kpis?.totalSales || 0;
    const bySegment = (data?.segments || []).map((seg) => ({
      ...seg,
      points: schools
        .filter((row) => row.segment === seg.id)
        .reduce((sum, row) => sum + row.points, 0),
    }));
    const source =
      data?.loyaltyPreview?.ladder?.length
        ? data.loyaltyPreview.ladder
        : ACCESSIBLE_GIFT_LADDER;
    const ladder = source.map((rung, i) => {
      const next = source[i + 1];
      const giftValue = rung.points * gift;
      const schoolsAtOrAbove = schools.filter(
        (row) => row.points >= rung.points
      ).length;
      const clientsInRung = schools.filter(
        (row) =>
          row.points >= rung.points &&
          (next ? row.points < next.points : true)
      ).length;
      return {
        ...rung,
        examples: rung.examples || ACCESSIBLE_GIFT_LADDER[i]?.examples || [],
        spendEquivalent: rung.points * rate,
        giftValue,
        schoolsAtOrAbove,
        clientsInRung,
        categoryTotal: giftValue * clientsInRung,
      };
    });
    const ladderCategoryTotal = ladder.reduce(
      (sum, row) => sum + (row.categoryTotal || 0),
      0
    );
    return {
      nairaPerPoint: rate,
      giftCostPerPoint: gift,
      totalPoints,
      estimatedGiftBudget,
      budgetShareOfSales: totalSales > 0 ? estimatedGiftBudget / totalSales : 0,
      bySegment,
      ladder,
      ladderCategoryTotal,
      note: data?.loyaltyPreview?.note,
    };
  }, [schools, nairaPerPoint, giftCostPerPoint, data]);

  const filteredSchools = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = schools;
    if (selectedSegment) {
      rows = rows.filter((row) => row.segment === selectedSegment);
    }
    if (q) {
      rows = rows.filter((row) =>
        String(row.schoolName || '').toLowerCase().includes(q)
      );
    }
    const copy = [...rows];
    copy.sort((a, b) => {
      if (sortKey === 'name') return a.schoolName.localeCompare(b.schoolName);
      if (sortKey === 'points') return b.points - a.points;
      if (sortKey === 'seasons') return b.seasons.length - a.seasons.length;
      return b.amount - a.amount;
    });
    return copy;
  }, [schools, search, selectedSegment, sortKey]);

  if (!activeCompany || slug !== ACCESSIBLE_SLUG) {
    return (
      <div className="page">
        <p className="empty">
          Data analysis is available for Accessible Publishers.
        </p>
      </div>
    );
  }

  const kpis = data?.kpis;
  const emptySeason = season !== 'all' && (kpis?.schoolCount || 0) === 0;
  const showCharts = viewMode === 'charts';
  const showTable = viewMode === 'table';

  const openSegment = (id) => {
    setSelectedSegment(id);
    setViewMode('table');
    setTimeout(() => scrollTo('schools'), 80);
  };

  return (
    <div className="page page-full">
      <Link to={adminCompanyPath(slug, 'overview')} className="back-to-hub">
        ← Overview
      </Link>
      <div className="page-header">
        <div>
          <h1>Data analysis</h1>
          <p>
            Executive briefing on school book-purchase history — concentration,
            customer segments, and a data-driven loyalty preview. Not daily
            totals.
          </p>
        </div>
        <div className="page-header-actions">
          <div className="view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={`view-toggle-btn${showCharts ? ' active' : ''}`}
              onClick={() => setViewMode('charts')}
            >
              Charts
            </button>
            <button
              type="button"
              className={`view-toggle-btn${showTable ? ' active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      <section className="panel" style={{ marginBottom: '1rem' }}>
        <div className="form-grid">
          <label>
            Season
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              disabled={clearing}
            >
              <option value="all">All</option>
              {ACCESSIBLE_SEASONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          {isAdmin && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-danger"
                onClick={deleteSeason}
                disabled={clearing || loading || season === 'all'}
              >
                <Trash2 size={16} strokeWidth={1.75} />
                {clearing
                  ? 'Deleting…'
                  : season === 'all'
                    ? 'Delete season'
                    : `Delete ${season}`}
              </button>
            </div>
          )}
        </div>
        <p className="hint" style={{ marginTop: '0.75rem', paddingTop: 0, borderTop: 'none' }}>
          2023-2024 is a thin/partial file. Some clients are bookshops or
          distributors, not only schools.{' '}
          <Link to={adminCompanyPath(slug, 'school-purchases')}>
            Upload or manage files on School purchases
          </Link>
          . To delete one year, select it above (not All) then Delete.
        </p>
      </section>

      <nav className="analytics-section-nav" aria-label="Analysis sections">
        {SECTIONS.filter((s) =>
          showTable ? s.id === 'snapshot' || s.id === 'schools' || s.id === 'loyalty' : true
        ).map((s) => (
          <button
            key={s.id}
            type="button"
            className="analytics-nav-chip"
            onClick={() => {
              if (s.id === 'schools') {
                setViewMode('table');
                setTimeout(() => scrollTo('schools'), 80);
                return;
              }
              scrollTo(s.id);
            }}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      {loading ? (
        <p className="empty">Loading analysis…</p>
      ) : !data ? (
        <p className="empty">No analysis available.</p>
      ) : (
        <>
          <section id="snapshot" className="analytics-section">
            <div className="stats">
              <div className="stat">
                <div className="stat-label">Clean total sales</div>
                <div className="stat-value">
                  {formatMoney(kpis.totalSales)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Unique clients</div>
                <div className="stat-value">
                  {formatNumber(kpis.schoolCount)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Median spend</div>
                <div className="stat-value">
                  {formatMoney(kpis.medianSpend)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Average spend</div>
                <div className="stat-value">
                  {formatMoney(kpis.averageSpend)}
                </div>
              </div>
            </div>
            <div className="stats">
              <div className="stat">
                <div className="stat-label">Top 10% of clients</div>
                <div className="stat-value">
                  {pct(kpis.top10PercentRevenueShare)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Repeat (2+ seasons)</div>
                <div className="stat-value">
                  {formatNumber(kpis.repeatClients)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">One-season only</div>
                <div className="stat-value">
                  {formatNumber(kpis.oneSeasonClients)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Proposed point liability</div>
                <div className="stat-value">
                  {formatNumber(loyalty.totalPoints)}
                </div>
              </div>
            </div>
            <div className="stats">
              {(data.bySeason || []).map((row) => (
                <div className="stat" key={row.season}>
                  <div className="stat-label">
                    {row.season}
                    {row.coverage === 'thin' ? ' · thin' : ''}
                    {row.coverage === 'empty' ? ' · pending' : ''}
                  </div>
                  <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                    {formatMoney(row.totalAmount)}
                  </div>
                </div>
              ))}
            </div>
            {data.excludedJunk?.rowCount > 0 && (
              <p className="hint" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
                Spreadsheet total row{data.excludedJunk.rowCount === 1 ? '' : 's'}{' '}
                labelled {data.excludedJunk.labels.join(', ')} (
                {formatMoney(data.excludedJunk.totalAmount)}) excluded so KPIs
                are not double-counted. Raw import was{' '}
                {formatMoney(data.raw?.totalAmount)}.
              </p>
            )}

            {emptySeason ? (
              <p className="empty">
                {season} has no school purchases yet. Upload that Excel on{' '}
                <Link to={adminCompanyPath(slug, 'school-purchases')}>
                  School purchases
                </Link>
                .
              </p>
            ) : (
              <section className="panel">
                <h2>What the data says</h2>
                <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.2rem', lineHeight: 1.55 }}>
                  {(data.insights || []).map((item) => (
                    <li key={item.title} style={{ marginBottom: '0.45rem' }}>
                      <strong>{item.title}.</strong> {item.body}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </section>

          {showCharts && (
            <>
              <section id="seasons" className="analytics-section">
                <div className="grid-2">
                  <section className="panel">
                    <h2>Sales by season</h2>
                    <div className="chart-box">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.bySeason || []}>
                          <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                          <XAxis dataKey="season" stroke="#6e6e73" fontSize={11} />
                          <YAxis
                            stroke="#6e6e73"
                            fontSize={11}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={compactNaira}
                          />
                          <Tooltip
                            formatter={(v) => formatMoney(v)}
                            contentStyle={tooltipStyle}
                          />
                          <Bar
                            dataKey="totalAmount"
                            name="Sales"
                            fill={chartFill}
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="hint" style={{ marginTop: '0.75rem' }}>
                      {(data.bySeason || []).map((row) => (
                        <span key={row.season} style={{ display: 'block' }}>
                          {row.season}: {formatNumber(row.schoolCount)} clients ·{' '}
                          {formatMoney(row.totalAmount)}
                          {row.coverage === 'thin' ? ' · thin file' : ''}
                          {row.coverage === 'empty' ? ' · not uploaded' : ''}
                        </span>
                      ))}
                    </p>
                  </section>
                  <section className="panel">
                    <h2>Clients by season</h2>
                    <div className="chart-box">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.bySeason || []}>
                          <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                          <XAxis dataKey="season" stroke="#6e6e73" fontSize={11} />
                          <YAxis
                            stroke="#6e6e73"
                            fontSize={11}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            formatter={(v) => formatNumber(v)}
                            contentStyle={tooltipStyle}
                          />
                          <Bar
                            dataKey="schoolCount"
                            name="Clients"
                            fill={chartSecondary}
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="hint" style={{ marginTop: '0.75rem' }}>
                      Repeat clients in both 2023-2024 and 2024-2025:{' '}
                      {formatNumber(data.retention?.both || 0)} (
                      {formatNumber(data.retention?.grew || 0)} grew spend,{' '}
                      {formatNumber(data.retention?.shrunk || 0)} shrank).{' '}
                      {data.retention?.note}
                    </p>
                  </section>
                </div>
              </section>

              <section id="segments" className="analytics-section">
                <section className="panel">
                  <h2>Customer segments</h2>
                  <p className="hint" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
                    Bands from {season === 'all' ? 'all-seasons' : season} spend.
                    Click a row to list those clients.
                  </p>
                  {(kpis.schoolCount || 0) === 0 ? (
                    <p className="empty">No clients in this season.</p>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Segment</th>
                            <th>Spend band</th>
                            <th>Clients</th>
                            <th>% clients</th>
                            <th>Revenue</th>
                            <th>% revenue</th>
                            <th>Tier</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.segments || []).map((row) => (
                            <tr
                              key={row.id}
                              onClick={() => openSegment(row.id)}
                              style={{
                                cursor: 'pointer',
                                background:
                                  selectedSegment === row.id
                                    ? 'var(--accent-soft)'
                                    : undefined,
                              }}
                            >
                              <td>{row.label}</td>
                              <td>
                                {row.max == null
                                  ? `${formatMoney(row.min)}+`
                                  : `${formatMoney(row.min)}–${formatMoney(row.max)}`}
                              </td>
                              <td>{formatNumber(row.schoolCount)}</td>
                              <td>{pct(row.clientShare)}</td>
                              <td>{formatMoney(row.revenue)}</td>
                              <td>{pct(row.revenueShare)}</td>
                              <td className="capitalize">{row.tier}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
                <div className="grid-2">
                  <section className="panel">
                    <h2>Clients per band</h2>
                    <div className="chart-box">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.segments || []}>
                          <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                          <XAxis dataKey="label" stroke="#6e6e73" fontSize={11} />
                          <YAxis
                            stroke="#6e6e73"
                            fontSize={11}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            formatter={(v) => formatNumber(v)}
                            contentStyle={tooltipStyle}
                          />
                          <Bar dataKey="schoolCount" name="Clients" radius={[6, 6, 0, 0]}>
                            {(data.segments || []).map((row, i) => (
                              <Cell
                                key={row.id}
                                fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                  <section className="panel">
                    <h2>Revenue per band</h2>
                    <div className="chart-box">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={(data.segments || []).filter((s) => s.revenue > 0)}
                            dataKey="revenue"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            label={({ label, percent }) =>
                              percent > 0.06
                                ? `${label} ${(percent * 100).toFixed(0)}%`
                                : ''
                            }
                          >
                            {(data.segments || [])
                              .filter((s) => s.revenue > 0)
                              .map((row) => {
                                const i = (data.segments || []).findIndex(
                                  (s) => s.id === row.id
                                );
                                return (
                                  <Cell
                                    key={row.id}
                                    fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                                  />
                                );
                              })}
                          </Pie>
                          <Tooltip
                            formatter={(v) => formatMoney(v)}
                            contentStyle={tooltipStyle}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                </div>
              </section>

              <section id="concentration" className="analytics-section">
                <div className="stats">
                  <div className="stat">
                    <div className="stat-label">Top 10 clients</div>
                    <div className="stat-value">
                      {formatMoney(data.concentration?.top10?.amount || 0)}
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Top 50</div>
                    <div className="stat-value">
                      {formatMoney(data.concentration?.top50?.amount || 0)}
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Top 100</div>
                    <div className="stat-value">
                      {formatMoney(data.concentration?.top100?.amount || 0)}
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Clients for 80% of sales</div>
                    <div className="stat-value">
                      {formatNumber(
                        data.concentration?.clientsFor80PercentRevenue || 0
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid-2">
                  <section className="panel">
                    <h2>Top 20 clients</h2>
                    <div className="chart-box" style={{ height: 420 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={(data.topSchools || []).map((row) => ({
                            ...row,
                            label: shortName(row.schoolName, 20),
                          }))}
                          layout="vertical"
                          margin={{ left: 8, right: 16 }}
                        >
                          <CartesianGrid stroke="rgba(0,0,0,0.06)" horizontal={false} />
                          <XAxis
                            type="number"
                            stroke="#6e6e73"
                            fontSize={11}
                            tickFormatter={compactNaira}
                          />
                          <YAxis
                            type="category"
                            dataKey="label"
                            width={128}
                            stroke="#6e6e73"
                            fontSize={10}
                            interval={0}
                          />
                          <Tooltip
                            formatter={(v) => formatMoney(v)}
                            labelFormatter={(_, payload) =>
                              payload?.[0]?.payload?.schoolName || ''
                            }
                            contentStyle={tooltipStyle}
                          />
                          <Bar
                            dataKey="amount"
                            name="Spend"
                            fill={chartFill}
                            radius={[0, 6, 6, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                  <section className="panel">
                    <h2>Share of revenue</h2>
                    <div className="chart-box" style={{ height: 420 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.concentration?.pareto || []}>
                          <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                          <XAxis
                            dataKey="rank"
                            stroke="#6e6e73"
                            fontSize={11}
                            label={{
                              value: 'Top N clients',
                              position: 'insideBottom',
                              offset: -2,
                              fontSize: 11,
                              fill: '#6e6e73',
                            }}
                          />
                          <YAxis
                            stroke="#6e6e73"
                            fontSize={11}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `${Math.round(v * 100)}%`}
                            domain={[0, 1]}
                          />
                          <Tooltip
                            formatter={(v) => pct(v)}
                            labelFormatter={(rank) => `Top ${rank} clients`}
                            contentStyle={tooltipStyle}
                          />
                          <Line
                            type="monotone"
                            dataKey="share"
                            name="% of sales"
                            stroke={chartFill}
                            strokeWidth={2.4}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="hint" style={{ marginTop: '0.75rem' }}>
                      Top {formatNumber(data.concentration?.top15?.count || 15)} ≈{' '}
                      {pct(data.concentration?.top15?.share)} of revenue. Top 10%
                      of clients ({formatNumber(data.concentration?.top10PercentClients?.count || 0)})
                      ≈ {pct(data.concentration?.top10PercentClients?.share)}. ~
                      {formatNumber(data.concentration?.clientsFor50PercentRevenue || 0)}{' '}
                      clients ≈ 50%; ~
                      {formatNumber(data.concentration?.clientsFor80PercentRevenue || 0)}{' '}
                      ≈ 80%.
                    </p>
                  </section>
                </div>
              </section>
            </>
          )}

          <section id="loyalty" className="analytics-section">
            <section className="panel">
              <div className="panel-head">
                <h2>Loyalty preview</h2>
              </div>
              <p className="hint" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
                Planning only — points are simulated from uploaded spend, not a
                live wallet. Default earn is 1 point per ₦
                {formatNumber(ACCESSIBLE_NAIRA_PER_POINT)} (floor). Gift cost per
                point is a conservative planning number (₦
                {ACCESSIBLE_GIFT_COST_RANGE[0]}–{ACCESSIBLE_GIFT_COST_RANGE[1]}
                ), not warehouse cost.
              </p>
              <div className="form-grid" style={{ marginBottom: '1rem' }}>
                <label>
                  Naira per point
                  <input
                    type="number"
                    min={1}
                    step={100}
                    value={nairaPerPoint}
                    onChange={(e) => setNairaPerPoint(e.target.value)}
                  />
                </label>
                <label>
                  Gift cost per point (₦)
                  <input
                    type="number"
                    min={1}
                    step={5}
                    value={giftCostPerPoint}
                    onChange={(e) => setGiftCostPerPoint(e.target.value)}
                  />
                </label>
              </div>
              <div className="stats">
                <div className="stat">
                  <div className="stat-label">Would-be points</div>
                  <div className="stat-value">
                    {formatNumber(loyalty.totalPoints)}
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-label">Est. gift budget</div>
                  <div className="stat-value">
                    {formatMoney(loyalty.estimatedGiftBudget)}
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-label">Budget vs sales</div>
                  <div className="stat-value">
                    {pct(loyalty.budgetShareOfSales)}
                  </div>
                </div>
              </div>
              <p className="hint">
                At ₦{ACCESSIBLE_GIFT_COST_RANGE[0]} / ₦
                {ACCESSIBLE_GIFT_COST_PER_POINT} / ₦
                {ACCESSIBLE_GIFT_COST_RANGE[1]} per point, estimated gift spend
                would be {formatMoney(loyalty.totalPoints * ACCESSIBLE_GIFT_COST_RANGE[0])}{' '}
                / {formatMoney(loyalty.totalPoints * ACCESSIBLE_GIFT_COST_PER_POINT)}{' '}
                / {formatMoney(loyalty.totalPoints * ACCESSIBLE_GIFT_COST_RANGE[1])}.{' '}
                {loyalty.note}
              </p>
              <h3 style={{ marginTop: '1.25rem' }}>Suggested gift ladder</h3>
              <p className="hint" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
                <strong>Gift value</strong> is this rung’s points × ₦
                {formatNumber(loyalty.giftCostPerPoint)} (so 50 points × ₦
                {formatNumber(loyalty.giftCostPerPoint)} ={' '}
                {formatMoney(50 * loyalty.giftCostPerPoint)}). That is the
                planning cost of one gift at that level — jotter, blender, phone,
                etc. <strong>Clients in this rung</strong> are exclusive (50–249
                points, 250–499, and so on), not cumulative. <strong>Rung total</strong>{' '}
                = gift value × those clients, if everyone in the band redeemed
                that gift.
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Points</th>
                      <th>~Spend to earn</th>
                      <th>Gift value</th>
                      <th>Suggested gifts (Nigeria)</th>
                      <th>Clients in rung</th>
                      <th>Rung total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loyalty.ladder.map((row, i) => {
                      const next = loyalty.ladder[i + 1];
                      const range = next
                        ? `${formatNumber(row.points)}–${formatNumber(next.points - 1)}`
                        : `${formatNumber(row.points)}+`;
                      return (
                        <tr key={row.points}>
                          <td>{range}</td>
                          <td>{formatMoney(row.spendEquivalent)}</td>
                          <td>{formatMoney(row.giftValue)}</td>
                          <td>
                            <strong>{row.label}</strong>
                            <div
                              style={{
                                color: 'var(--muted)',
                                fontSize: '0.82rem',
                              }}
                            >
                              {(row.examples || []).join(' · ')}
                            </div>
                          </td>
                          <td>{formatNumber(row.clientsInRung)}</td>
                          <td>{formatMoney(row.categoryTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4}>
                        <strong>All rungs</strong>
                        <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                          If each client redeemed the gift for their own band
                          (not every gift on the ladder)
                        </div>
                      </td>
                      <td>
                        <strong>
                          {formatNumber(
                            loyalty.ladder.reduce(
                              (sum, row) => sum + (row.clientsInRung || 0),
                              0
                            )
                          )}
                        </strong>
                      </td>
                      <td>
                        <strong>
                          {formatMoney(loyalty.ladderCategoryTotal)}
                        </strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <h3 style={{ marginTop: '1.5rem' }}>Points by segment</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Segment</th>
                      <th>Tier</th>
                      <th>Clients</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loyalty.bySegment.map((row) => (
                      <tr key={row.id}>
                        <td>{row.label}</td>
                        <td className="capitalize">{row.tier}</td>
                        <td>{formatNumber(row.schoolCount)}</td>
                        <td>{formatNumber(row.points)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>

          {showTable && (
            <section id="schools" className="analytics-section">
              <section className="panel">
                <div className="panel-head">
                  <h2>
                    {selectedSegment
                      ? `${(data.segments || []).find((s) => s.id === selectedSegment)?.label || 'Segment'} clients`
                      : 'Clients'}
                  </h2>
                  {selectedSegment && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setSelectedSegment('')}
                    >
                      Show all
                    </button>
                  )}
                </div>
                <div className="form-grid" style={{ marginBottom: '1rem' }}>
                  <label>
                    Search
                    <input
                      type="search"
                      placeholder="School or bookshop name…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                  <label>
                    Sort
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value)}
                    >
                      <option value="amount">Spend (high to low)</option>
                      <option value="points">Points</option>
                      <option value="name">Name</option>
                      <option value="seasons">Seasons present</option>
                    </select>
                  </label>
                </div>
                {emptySeason ? (
                  <p className="empty">
                    Upload {season} on School purchases to see clients.
                  </p>
                ) : filteredSchools.length === 0 ? (
                  <p className="empty">No clients match this filter.</p>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Client</th>
                          <th>Spend</th>
                          <th>Seasons</th>
                          <th>Segment</th>
                          <th>Points</th>
                          <th>Tier</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSchools.map((row) => (
                          <tr key={row.schoolName}>
                            <td>
                              {row.schoolName}
                              {row.likelyBookshop ? (
                                <span className="badge" style={{ marginLeft: '0.4rem' }}>
                                  trade
                                </span>
                              ) : null}
                            </td>
                            <td>{formatMoney(row.amount)}</td>
                            <td>{(row.seasons || []).join(', ') || '—'}</td>
                            <td>{row.segmentLabel}</td>
                            <td>{formatNumber(row.points)}</td>
                            <td>{row.tierLabel}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default AdminAccessibleDataAnalysis;
