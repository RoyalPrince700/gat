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
import { SMIPAY_COLORS } from '../constants/smipay';
import {
  PLATFORM_COLORS,
  SOCIAL_MEDIA_PLATFORMS,
  platformLabel,
} from '../constants/socialMedia';
import { useCompany } from '../context/CompanyContext';
import { formatNumber } from '../utils/format';

const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid rgba(242,101,34,0.12)',
  borderRadius: 12,
  boxShadow: '0 8px 24px rgba(242,101,34,0.08)',
  color: SMIPAY_COLORS.ink,
};

const AdminSocialMedia = () => {
  const { activeCompany } = useCompany();
  const [analytics, setAnalytics] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const showSmipay = activeCompany?.slug === 'smipay';

  const load = async () => {
    if (!showSmipay) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const { data } = await api.get('/social-media/analytics', { params });
      setAnalytics(data);
    } catch (err) {
      setAnalytics(null);
      setError(err.response?.data?.message || 'Failed to load social media analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSmipay]);

  if (!showSmipay) {
    return (
      <div className="page">
        <p className="empty">
          Social media analysis is available when All or Smipay is selected.
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Social media analysis</h1>
          <p>
            Follower growth across Facebook, LinkedIn, Instagram, and Twitter
            based on daily team entries.
          </p>
        </div>
      </div>

      <div className="filters panel">
        <label>
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="button" className="btn btn-ghost" onClick={load}>
          Apply filters
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="empty">Loading analytics…</p>
      ) : !analytics || analytics.summary.recordCount === 0 ? (
        <p className="empty">
          No social media data yet. Smipay team can log daily followers from
          their Social media tab.
        </p>
      ) : (
        <div className="stack">
          <div className="stats">
            <div className="stat">
              <div className="stat-label">New followers</div>
              <div className="stat-value">
                {formatNumber(analytics.summary.totalNewFollowers)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Days logged</div>
              <div className="stat-value">
                {formatNumber(analytics.summary.dayCount)}
              </div>
            </div>
            {analytics.summary.byPlatform.map((p) => (
              <div className="stat" key={p.platform}>
                <div className="stat-label">{platformLabel(p.platform)}</div>
                <div className="stat-value">
                  +{formatNumber(p.newFollowers)}
                </div>
                {p.latestTotal != null && (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--muted, #555)',
                      marginTop: 4,
                    }}
                  >
                    Total {formatNumber(p.latestTotal)}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="grid-2">
            <section className="panel">
              <h2>New followers over time</h2>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.trend}>
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
                    {SOCIAL_MEDIA_PLATFORMS.map(({ value, label }) => (
                      <Line
                        key={value}
                        type="monotone"
                        dataKey={value}
                        stroke={PLATFORM_COLORS[value]}
                        strokeWidth={2}
                        dot={{ r: 3, fill: PLATFORM_COLORS[value] }}
                        name={label}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="panel">
              <h2>Growth by platform</h2>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.byPlatform.map((p) => ({
                      ...p,
                      label: platformLabel(p.platform),
                    }))}
                  >
                    <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#6e6e73"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#6e6e73"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v) => formatNumber(v)}
                    />
                    <Bar
                      dataKey="newFollowers"
                      fill={SMIPAY_COLORS.orange}
                      radius={[6, 6, 0, 0]}
                      name="New followers"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="panel">
            <h2>Cumulative new followers</h2>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.cumulative}>
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
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => formatNumber(v)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke={SMIPAY_COLORS.orange}
                    strokeWidth={2.25}
                    dot={{ r: 3, fill: SMIPAY_COLORS.orange }}
                    name="Cumulative new"
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke={SMIPAY_COLORS.green}
                    strokeWidth={2}
                    name="Daily total"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminSocialMedia;
