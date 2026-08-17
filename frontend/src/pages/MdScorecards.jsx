import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api/client';
import { tooltipStyle } from '../components/analytics/chartTheme';
import {
  MAX_RATING,
  PERFORMANCE_BANDS,
  bandBadgeClass,
  bandForPercent,
} from '../constants/performance';
import { hubRootFromPathname } from '../constants/themes';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { formatDate } from '../utils/format';

const BAND_CHART_COLORS = {
  needs_attention: '#d97706',
  solid: '#2563eb',
  strong: '#059669',
};

const CHART_ACCENT = '#2563eb';
const CHART_ACCENT_2 = '#0d9488';
const CHART_MUTED = '#94a3b8';

const triggerBlobDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const downloadExport = async (path, params, filename) => {
  try {
    const { data } = await api.get(path, {
      params,
      responseType: 'blob',
    });
    if (data?.type && data.type.includes('application/json')) {
      const text = await data.text();
      let message = 'Download failed';
      try {
        message = JSON.parse(text)?.message || message;
      } catch {
        /* keep default */
      }
      throw new Error(message);
    }
    triggerBlobDownload(
      new Blob([data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      filename
    );
  } catch (err) {
    if (err.response?.data instanceof Blob) {
      const text = await err.response.data.text();
      try {
        const parsed = JSON.parse(text);
        throw new Error(parsed?.message || 'Download failed');
      } catch (parseErr) {
        if (parseErr instanceof SyntaxError) {
          throw new Error(
            err.response?.statusText || err.message || 'Download failed'
          );
        }
        throw parseErr;
      }
    }
    throw new Error(err.message || 'Download failed');
  }
};

const todayStamp = () => new Date().toISOString().slice(0, 10);

const truncateLabel = (value, max = 18) => {
  const s = String(value || '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

const MdScorecards = () => {
  const { staffId } = useParams();
  const location = useLocation();
  const hubRoot = hubRootFromPathname(location.pathname);
  const { user } = useAuth();
  const { companies, ALL_COMPANIES, switchCompany } = useCompany();
  const isAdmin = user?.role === 'admin';

  if (staffId) {
    return <IndividualScorecard staffId={staffId} hubRoot={hubRoot} />;
  }

  return (
    <ScorecardsOverview
      companies={companies}
      switchCompany={switchCompany}
      ALL_COMPANIES={ALL_COMPANIES}
      hubRoot={hubRoot}
      isAdmin={isAdmin}
    />
  );
};

const ScorecardsCharts = ({ scorecards, assessedCount }) => {
  const rankingData = useMemo(
    () =>
      scorecards
        .filter((c) => c.averagePercent != null)
        .map((c) => ({
          name: c.staff?.name || '—',
          shortName: truncateLabel(c.staff?.name, 16),
          averagePercent: c.averagePercent,
          assessmentCount: c.assessmentCount,
        })),
    [scorecards]
  );

  const bandData = useMemo(() => {
    const counts = Object.fromEntries(
      PERFORMANCE_BANDS.map((b) => [b.id, 0])
    );
    for (const c of scorecards) {
      if (c.averagePercent == null) continue;
      const band = c.band || bandForPercent(c.averagePercent);
      if (band?.id && counts[band.id] != null) counts[band.id] += 1;
    }
    return PERFORMANCE_BANDS.map((b) => ({
      id: b.id,
      name: b.label,
      value: counts[b.id] || 0,
    })).filter((d) => d.value > 0);
  }, [scorecards]);

  const deptData = useMemo(() => {
    const map = new Map();
    for (const c of scorecards) {
      if (c.averagePercent == null) continue;
      const dept = c.staff?.department || 'Unassigned';
      if (!map.has(dept)) map.set(dept, { sum: 0, n: 0 });
      const row = map.get(dept);
      row.sum += c.averagePercent;
      row.n += 1;
    }
    return Array.from(map.entries())
      .map(([name, { sum, n }]) => ({
        name,
        shortName: truncateLabel(name, 14),
        averagePercent: Math.round((sum / n) * 10) / 10,
        count: n,
      }))
      .sort((a, b) => b.averagePercent - a.averagePercent);
  }, [scorecards]);

  const companyData = useMemo(() => {
    const map = new Map();
    for (const c of scorecards) {
      if (c.averagePercent == null) continue;
      const name = c.staff?.company?.name;
      if (!name) continue;
      if (!map.has(name)) map.set(name, { sum: 0, n: 0 });
      const row = map.get(name);
      row.sum += c.averagePercent;
      row.n += 1;
    }
    return Array.from(map.entries())
      .map(([name, { sum, n }]) => ({
        name,
        shortName: truncateLabel(name, 14),
        averagePercent: Math.round((sum / n) * 10) / 10,
        count: n,
      }))
      .sort((a, b) => b.averagePercent - a.averagePercent);
  }, [scorecards]);

  const unassessed = scorecards.filter((c) => c.averagePercent == null).length;
  const rankingHeight = Math.max(280, rankingData.length * 36);

  if (assessedCount === 0) {
    return (
      <p className="empty">
        No completed assessments in this filter set — charts appear once staff
        have scores.
      </p>
    );
  }

  return (
    <div className="stack">
      {unassessed > 0 && (
        <p className="hint" style={{ marginTop: 0 }}>
          {unassessed} staff with no assessments are omitted from charts (shown as
          “—” in table view).
        </p>
      )}

      <div className="grid-2">
        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-head">
            <h3 style={{ margin: 0 }}>Staff ranking (avg %)</h3>
          </div>
          <div className="chart-box" style={{ height: rankingHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rankingData}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              >
                <CartesianGrid stroke="rgba(0,0,0,0.06)" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  stroke="#6e6e73"
                  fontSize={11}
                  tickLine={false}
                  unit="%"
                />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  width={110}
                  stroke="#6e6e73"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, _name, item) => [
                    `${value}% (${item.payload.assessmentCount} assessments)`,
                    item.payload.name,
                  ]}
                />
                <Bar
                  dataKey="averagePercent"
                  name="Avg %"
                  fill={CHART_ACCENT}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-head">
            <h3 style={{ margin: 0 }}>Performance band distribution</h3>
          </div>
          {bandData.length === 0 ? (
            <p className="empty">No band data.</p>
          ) : (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bandData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {bandData.map((entry) => (
                      <Cell
                        key={entry.id}
                        fill={BAND_CHART_COLORS[entry.id] || CHART_MUTED}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className={companyData.length > 1 ? 'grid-2' : ''}>
        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-head">
            <h3 style={{ margin: 0 }}>Average by department</h3>
          </div>
          {deptData.length === 0 ? (
            <p className="empty">No department averages.</p>
          ) : (
            <div
              className="chart-box"
              style={{ height: Math.max(260, deptData.length * 40) }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={deptData}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                >
                  <CartesianGrid stroke="rgba(0,0,0,0.06)" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    stroke="#6e6e73"
                    fontSize={11}
                    tickLine={false}
                    unit="%"
                  />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    width={100}
                    stroke="#6e6e73"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, _n, item) => [
                      `${value}% (${item.payload.count} staff)`,
                      item.payload.name,
                    ]}
                  />
                  <Bar
                    dataKey="averagePercent"
                    name="Avg %"
                    fill={CHART_ACCENT_2}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {companyData.length > 1 && (
          <div className="panel" style={{ margin: 0 }}>
            <div className="panel-head">
              <h3 style={{ margin: 0 }}>Average by company</h3>
            </div>
            <div
              className="chart-box"
              style={{ height: Math.max(260, companyData.length * 40) }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={companyData}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                >
                  <CartesianGrid stroke="rgba(0,0,0,0.06)" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    stroke="#6e6e73"
                    fontSize={11}
                    tickLine={false}
                    unit="%"
                  />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    width={100}
                    stroke="#6e6e73"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, _n, item) => [
                      `${value}% (${item.payload.count} staff)`,
                      item.payload.name,
                    ]}
                  />
                  <Bar
                    dataKey="averagePercent"
                    name="Avg %"
                    fill={CHART_ACCENT}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const IndividualScorecardCharts = ({ assessments, averagePercent }) => {
  const completed = useMemo(
    () =>
      (assessments || [])
        .filter((a) => a.status === 'completed')
        .slice()
        .sort(
          (a, b) => new Date(a.meetingDate) - new Date(b.meetingDate)
        ),
    [assessments]
  );

  const trendData = useMemo(
    () =>
      completed.map((a) => ({
        date: formatDate(a.meetingDate),
        scorePercent: a.scorePercent ?? 0,
        totalScore: a.totalScore,
        maxPossibleScore: a.maxPossibleScore,
      })),
    [completed]
  );

  const metricData = useMemo(() => {
    const map = new Map();
    for (const a of completed) {
      for (const q of a.questions || []) {
        const metric = (q.metric || '').trim() || 'Unspecified';
        if (!map.has(metric)) map.set(metric, { sum: 0, n: 0 });
        const row = map.get(metric);
        row.sum += Number(q.rating) || 0;
        row.n += 1;
      }
    }
    return Array.from(map.entries())
      .map(([name, { sum, n }]) => ({
        name,
        shortName: truncateLabel(name, 22),
        avgRating: Math.round((sum / n) * 10) / 10,
        count: n,
      }))
      .sort((a, b) => b.avgRating - a.avgRating);
  }, [completed]);

  if (completed.length === 0) {
    return (
      <p className="empty">
        Charts appear after at least one completed assessment.
      </p>
    );
  }

  const single = completed.length === 1;

  return (
    <div className="stack">
      <div className="grid-2">
        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-head">
            <h3 style={{ margin: 0 }}>
              {single ? 'Assessment score' : 'Score over time'}
            </h3>
          </div>
          {single && (
            <p className="hint" style={{ marginTop: 0 }}>
              Only one completed assessment so far — complete more interviews to
              see a trend.
            </p>
          )}
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              {single ? (
                <BarChart
                  data={trendData}
                  margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#6e6e73"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#6e6e73"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, _n, item) => [
                      `${value}% (${item.payload.totalScore}/${item.payload.maxPossibleScore})`,
                      'Score',
                    ]}
                  />
                  <Bar
                    dataKey="scorePercent"
                    name="Score %"
                    fill={CHART_ACCENT}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              ) : (
                <LineChart
                  data={trendData}
                  margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#6e6e73"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#6e6e73"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, _n, item) => [
                      `${value}% (${item.payload.totalScore}/${item.payload.maxPossibleScore})`,
                      'Score',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="scorePercent"
                    name="Score %"
                    stroke={CHART_ACCENT}
                    strokeWidth={2.25}
                    dot={{ r: 4, fill: CHART_ACCENT }}
                  />
                  {averagePercent != null && (
                    <ReferenceLine
                      y={averagePercent}
                      stroke={CHART_MUTED}
                      strokeDasharray="4 4"
                      label={{
                        value: `Avg ${averagePercent}%`,
                        fill: CHART_MUTED,
                        fontSize: 11,
                      }}
                    />
                  )}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-head">
            <h3 style={{ margin: 0 }}>Avg rating by metric</h3>
          </div>
          {metricData.length === 0 ? (
            <p className="empty">No metric ratings recorded.</p>
          ) : (
            <div
              className="chart-box"
              style={{ height: Math.max(260, metricData.length * 36) }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metricData}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                >
                  <CartesianGrid stroke="rgba(0,0,0,0.06)" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, MAX_RATING]}
                    stroke="#6e6e73"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    width={130}
                    stroke="#6e6e73"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, _n, item) => [
                      `${value} / ${MAX_RATING} (${item.payload.count} ratings)`,
                      item.payload.name,
                    ]}
                  />
                  <Bar
                    dataKey="avgRating"
                    name="Avg rating"
                    fill={CHART_ACCENT_2}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ScorecardsOverview = ({
  companies,
  switchCompany,
  ALL_COMPANIES,
  hubRoot,
  isAdmin,
}) => {
  const [scorecards, setScorecards] = useState([]);
  const [rankedBy, setRankedBy] = useState('averagePercent');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const filterParams = () => {
    const params = {};
    if (filterCompany !== 'all') params.company = filterCompany;
    if (filterDept !== 'all') params.department = filterDept;
    if (search.trim()) params.search = search.trim();
    if (from) params.from = from;
    if (to) params.to = to;
    return params;
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/performance/scorecards', {
        params: filterParams(),
      });
      setScorecards(data.scorecards || []);
      setRankedBy(data.rankedBy || 'averagePercent');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load scorecards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    switchCompany(ALL_COMPANIES);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDept, filterCompany, from, to]);

  const departments = useMemo(() => {
    const set = new Set(
      scorecards.map((c) => c.staff?.department).filter(Boolean)
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [scorecards]);

  const withScores = scorecards.filter((c) => c.averagePercent != null);
  const assessedCount = withScores.length;
  const avgPortfolio =
    assessedCount > 0
      ? Math.round(
          (withScores.reduce((s, c) => s + c.averagePercent, 0) /
            assessedCount) *
            10
        ) / 10
      : null;

  const onSearchSubmit = (e) => {
    e.preventDefault();
    load();
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    setError('');
    try {
      await downloadExport(
        '/performance/scorecards/export',
        filterParams(),
        `staff-scorecards-${todayStamp()}.docx`
      );
    } catch (err) {
      setError(err.message || err.response?.data?.message || 'Download failed');
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleDownloadOne = async (staff) => {
    if (!staff?._id) return;
    setDownloadingId(staff._id);
    setError('');
    try {
      const slug = String(staff.name || 'staff')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'staff';
      await downloadExport(
        `/performance/scorecards/${staff._id}/export`,
        {},
        `scorecard-${slug}-${todayStamp()}.docx`
      );
    } catch (err) {
      setError(err.message || err.response?.data?.message || 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="page page-full">
      <div className="page-header">
        <div>
          <h1>Staff scorecards</h1>
          <p>
            Portfolio performance ranked by average score % across completed
            assessments (scale 1–{MAX_RATING} per question). Bands: Needs
            attention under 50% · Solid 50–74% · Strong 75%+.
            {isAdmin
              ? ' Same tools as MD — enter meeting assessments and review scorecards here.'
              : ''}
          </p>
        </div>
        <div className="page-header-actions">
          <div className="view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={`view-toggle-btn${viewMode === 'table' ? ' active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              Table
            </button>
            <button
              type="button"
              className={`view-toggle-btn${viewMode === 'charts' ? ' active' : ''}`}
              onClick={() => setViewMode('charts')}
            >
              Charts
            </button>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleDownloadAll}
            disabled={downloadingAll || loading || scorecards.length === 0}
          >
            {downloadingAll ? 'Downloading…' : 'Download all'}
          </button>
          <Link to={`${hubRoot}/assessments`} className="btn btn-primary">
            Conduct assessment
          </Link>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Staff in view</div>
          <div className="stat-value">{scorecards.length}</div>
        </div>
        <div className="stat">
          <div className="stat-label">With assessments</div>
          <div className="stat-value">{assessedCount}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Portfolio avg %</div>
          <div className="stat-value">
            {avgPortfolio != null ? `${avgPortfolio}%` : '—'}
          </div>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Overview</h2>
          <form
            className="filters"
            style={{ marginBottom: 0, flexWrap: 'wrap' }}
            onSubmit={onSearchSubmit}
          >
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name…"
              aria-label="Search staff"
            />
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              aria-label="Department"
            >
              <option value="all">All departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              aria-label="Company"
            >
              <option value="all">All companies</option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="From date"
              title="Assessments from"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-label="To date"
              title="Assessments to"
            />
            <button type="submit" className="btn btn-ghost">
              Apply
            </button>
          </form>
        </div>

        <p className="hint" style={{ marginTop: 0 }}>
          Ranked by{' '}
          {rankedBy === 'averagePercent' ? 'average score %' : rankedBy}. Staff
          with no completed assessments appear at the bottom.
          {viewMode === 'charts'
            ? ' Charts use the same filtered dataset.'
            : ''}{' '}
          Scorecard downloads are Word documents (.docx) for MD/admin archives.
        </p>

        {error && <p className="error">{error}</p>}

        {loading ? (
          <p className="empty">Loading scorecards…</p>
        ) : scorecards.length === 0 ? (
          <p className="empty">
            No staff in the directory yet.{' '}
            {isAdmin ? (
              <>
                <Link to={`${hubRoot}/staff`}>Add staff</Link>, then{' '}
              </>
            ) : (
              'Ask an admin to add staff, then '
            )}
            <Link to={`${hubRoot}/assessments`}>start an assessment</Link>.
          </p>
        ) : viewMode === 'charts' ? (
          <>
            {assessedCount === 0 && (
              <p className="empty">
                No completed assessments yet.{' '}
                <Link to={`${hubRoot}/assessments`}>
                  Conduct the first interview
                </Link>
                .
              </p>
            )}
            <ScorecardsCharts
              scorecards={scorecards}
              assessedCount={assessedCount}
            />
          </>
        ) : (
          <>
            {assessedCount === 0 && (
              <p className="empty">
                No completed assessments yet.{' '}
                <Link to={`${hubRoot}/assessments`}>
                  Conduct the first interview
                </Link>
                .
              </p>
            )}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Company</th>
                    <th># Assessments</th>
                    <th>Avg %</th>
                    <th>Last assessed</th>
                    <th>Band</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {scorecards.map((card) => {
                    const band =
                      card.band ||
                      (card.averagePercent != null
                        ? bandForPercent(card.averagePercent)
                        : null);
                    return (
                      <tr key={card.staff._id}>
                        <td>{card.rank ?? '—'}</td>
                        <td>
                          <Link to={`${hubRoot}/scorecards/${card.staff._id}`}>
                            {card.staff.name}
                          </Link>
                          {card.staff.status === 'inactive' ? (
                            <span
                              className="badge badge-inactive"
                              style={{ marginLeft: 6 }}
                            >
                              Inactive
                            </span>
                          ) : null}
                        </td>
                        <td>{card.staff.department || '—'}</td>
                        <td>{card.staff.company?.name || '—'}</td>
                        <td>{card.assessmentCount}</td>
                        <td>
                          {card.averagePercent != null
                            ? `${card.averagePercent}%`
                            : '—'}
                        </td>
                        <td>
                          {card.latestAssessmentDate
                            ? formatDate(card.latestAssessmentDate)
                            : '—'}
                        </td>
                        <td>
                          {band ? (
                            <span
                              className={`badge badge-status ${bandBadgeClass(
                                band.id
                              )}`}
                            >
                              {band.label}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          <div className="stack-actions">
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => handleDownloadOne(card.staff)}
                              disabled={downloadingId === card.staff._id}
                            >
                              {downloadingId === card.staff._id
                                ? '…'
                                : 'Download'}
                            </button>
                            <Link
                              to={`${hubRoot}/assessments?staff=${card.staff._id}`}
                              className="btn btn-ghost"
                            >
                              Assess
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

const IndividualScorecard = ({ staffId, hubRoot }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});
  const [viewMode, setViewMode] = useState('detail');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { data: payload } = await api.get(
          `/performance/scorecards/${staffId}`
        );
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Failed to load scorecard');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [staffId]);

  if (loading) {
    return (
      <div className="page page-full">
        <p className="empty">Loading scorecard…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page page-full">
        <Link to={`${hubRoot}/scorecards`} className="back-to-hub">
          ← Scorecards
        </Link>
        <p className="error">{error || 'Not found'}</p>
      </div>
    );
  }

  const { staff, assessments } = data;
  const band =
    data.band ||
    (data.averagePercent != null
      ? bandForPercent(data.averagePercent)
      : null);

  const toggle = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDownload = async () => {
    setDownloading(true);
    setError('');
    try {
      const slug =
        String(staff.name || 'staff')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 60) || 'staff';
      await downloadExport(
        `/performance/scorecards/${staff._id}/export`,
        {},
        `scorecard-${slug}-${todayStamp()}.docx`
      );
    } catch (err) {
      setError(err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="page page-full">
      <Link to={`${hubRoot}/scorecards`} className="back-to-hub">
        ← All scorecards
      </Link>

      <div className="page-header">
        <div>
          <h1>{staff.name}</h1>
          <p>
            {staff.jobTitle ? `${staff.jobTitle} · ` : ''}
            {staff.department || 'No department'}
            {staff.company?.name ? ` · ${staff.company.name}` : ''}
            {staff.status === 'inactive' ? ' · Inactive' : ''}
          </p>
        </div>
        <div className="page-header-actions">
          <div className="view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={`view-toggle-btn${viewMode === 'detail' ? ' active' : ''}`}
              onClick={() => setViewMode('detail')}
            >
              Detail
            </button>
            <button
              type="button"
              className={`view-toggle-btn${viewMode === 'charts' ? ' active' : ''}`}
              onClick={() => setViewMode('charts')}
            >
              Charts
            </button>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? 'Downloading…' : 'Download'}
          </button>
          <Link
            to={`${hubRoot}/assessments?staff=${staff._id}`}
            className="btn btn-primary"
          >
            New assessment
          </Link>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Completed assessments</div>
          <div className="stat-value">{data.assessmentCount}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Average score %</div>
          <div className="stat-value">
            {data.averagePercent != null ? `${data.averagePercent}%` : '—'}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Avg total points</div>
          <div className="stat-value">
            {data.averageTotalScore != null ? data.averageTotalScore : '—'}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Band</div>
          <div className="stat-value" style={{ fontSize: '1.1rem' }}>
            {band ? (
              <span
                className={`badge badge-status ${bandBadgeClass(band.id)}`}
              >
                {band.label}
              </span>
            ) : (
              '—'
            )}
          </div>
        </div>
      </div>

      {viewMode === 'charts' ? (
        <section className="panel">
          <div className="panel-head">
            <h2>Performance charts</h2>
          </div>
          <IndividualScorecardCharts
            assessments={assessments}
            averagePercent={data.averagePercent}
          />
        </section>
      ) : (
        <section className="panel">
          <div className="panel-head">
            <h2>Assessment history</h2>
          </div>

          {assessments.length === 0 ? (
            <p className="empty">
              No assessments yet.{' '}
              <Link to={`${hubRoot}/assessments?staff=${staff._id}`}>
                Start the first interview
              </Link>
              .
            </p>
          ) : (
            <div className="stack">
              {assessments.map((a) => {
                const open = expanded[a._id];
                const aBand = bandForPercent(a.scorePercent);
                return (
                  <div key={a._id} className="panel" style={{ margin: 0 }}>
                    <div className="panel-head">
                      <div>
                        <strong>{formatDate(a.meetingDate)}</strong>
                        {' · '}
                        <span
                          className={`badge badge-status ${
                            a.status === 'completed'
                              ? 'badge-completed'
                              : 'badge-draft'
                          }`}
                        >
                          {a.status}
                        </span>
                        {' · '}
                        {a.totalScore}/{a.maxPossibleScore} ({a.scorePercent}
                        %)
                        {a.status === 'completed' ? (
                          <>
                            {' · '}
                            <span
                              className={`badge badge-status ${bandBadgeClass(
                                aBand.id
                              )}`}
                            >
                              {aBand.label}
                            </span>
                          </>
                        ) : null}
                        {a.conductedBy?.name
                          ? ` · by ${a.conductedBy.name}`
                          : ''}
                      </div>
                      <div className="stack-actions">
                        {a.status === 'draft' && (
                          <Link
                            to={`${hubRoot}/assessments?edit=${a._id}`}
                            className="btn btn-ghost"
                          >
                            Continue draft
                          </Link>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => toggle(a._id)}
                        >
                          {open ? 'Hide details' : 'Show answers'}
                        </button>
                      </div>
                    </div>
                    {a.overallNotes && (
                      <p className="hint" style={{ marginTop: 0 }}>
                        {a.overallNotes}
                      </p>
                    )}
                    {open && (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Question</th>
                              <th>Answer notes</th>
                              <th>Metric</th>
                              <th>Rating</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(a.questions || []).map((q, i) => (
                              <tr key={i}>
                                <td>{q.prompt || '—'}</td>
                                <td>{q.answer || '—'}</td>
                                <td>{q.metric || '—'}</td>
                                <td>
                                  {q.rating}/{MAX_RATING}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default MdScorecards;
