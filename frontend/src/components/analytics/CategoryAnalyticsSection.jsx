import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { networkLabel, SMIPAY_COLORS } from '../../constants/smipay';
import { formatMoney, formatNumber } from '../../utils/format';
import ChartTabs from './ChartTabs';
import { NETWORK_COLORS, SERIES_COLORS, tooltipStyle } from './chartTheme';
import TrendChart from './TrendChart';

const TREND_TABS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const NETWORK_TABS = [
  { value: 'h24', label: '24 hours' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
];

const Delta = ({ value }) => {
  if (value == null) return null;
  const up = value > 0;
  const flat = value === 0;
  return (
    <span
      className={`analytics-delta${flat ? '' : up ? ' up' : ' down'}`}
    >
      {flat ? '—' : `${up ? '+' : ''}${value}%`} WoW
    </span>
  );
};

const CategoryAnalyticsSection = ({ id, title, description, data, showNetwork }) => {
  const [trendTab, setTrendTab] = useState('daily');
  const [networkTab, setNetworkTab] = useState('h24');

  if (!data) return null;

  const { summary } = data;
  const trendData =
    trendTab === 'weekly'
      ? data.weekly
      : trendTab === 'monthly'
        ? data.monthly
        : data.daily;

  const networkData = data.byNetwork?.[networkTab] || [];

  return (
    <section className="analytics-section" id={id}>
      <div className="page-header" style={{ marginBottom: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>{title}</h2>
          {description && <p style={{ margin: '0.35rem 0 0' }}>{description}</p>}
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Volume</div>
          <div className="stat-value">{formatMoney(summary.volume)}</div>
          <Delta value={summary.wowVolumePct} />
        </div>
        <div className="stat">
          <div className="stat-label">Transactions</div>
          <div className="stat-value">{formatNumber(summary.transactions)}</div>
          <Delta value={summary.wowTransactionsPct} />
        </div>
        <div className="stat">
          <div className="stat-label">Avg ticket</div>
          <div className="stat-value">{formatMoney(summary.averageTicket)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Records</div>
          <div className="stat-value">{formatNumber(summary.records)}</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>Last 4 weeks</h3>
          <p className="analytics-hint">Spot weekly drops or sustained growth.</p>
          <TrendChart data={data.last4Weeks} weekLabels />
        </div>
        <div className="panel">
          <div className="analytics-panel-head">
            <h3>Trend</h3>
            <ChartTabs tabs={TREND_TABS} active={trendTab} onChange={setTrendTab} />
          </div>
          <TrendChart data={trendData} weekLabels={trendTab === 'weekly'} />
        </div>
      </div>

      {showNetwork && (
        <div className="panel">
          <div className="analytics-panel-head">
            <h3>Network performance</h3>
            <ChartTabs
              tabs={NETWORK_TABS}
              active={networkTab}
              onChange={setNetworkTab}
            />
          </div>
          {networkData.length === 0 ? (
            <p className="empty">No network data for this window.</p>
          ) : (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={networkData}>
                  <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                  <XAxis
                    dataKey="network"
                    tickFormatter={networkLabel}
                    stroke="#6e6e73"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis stroke="#6e6e73" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v, name) =>
                      name === 'Volume' ? formatMoney(v) : formatNumber(v)
                    }
                    labelFormatter={networkLabel}
                  />
                  <Legend />
                  <Bar dataKey="volume" name="Volume" radius={[6, 6, 0, 0]}>
                    {networkData.map((row) => (
                      <Cell
                        key={row.network}
                        fill={NETWORK_COLORS[row.network] || SMIPAY_COLORS.orange}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="transactions"
                    name="Transactions"
                    fill={SMIPAY_COLORS.chartSecondary}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <div className="grid-2">
        <div className="panel">
          <h3>Amount range</h3>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byAmountRange || []}>
                <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#6e6e73"
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={56}
                />
                <YAxis stroke="#6e6e73" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, name) =>
                    name === 'Volume' ? formatMoney(v) : formatNumber(v)
                  }
                />
                <Bar
                  dataKey="volume"
                  name="Volume"
                  fill={SMIPAY_COLORS.orange}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <h3>When people buy</h3>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.byTimeOfDay || []}
                  dataKey="transactions"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ label, percent }) =>
                    percent > 0.04 ? `${label.split(' ')[0]} ${(percent * 100).toFixed(0)}%` : ''
                  }
                >
                  {(data.byTimeOfDay || []).map((entry, i) => (
                    <Cell
                      key={entry.timeOfDay}
                      fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, name, props) => [
                    formatNumber(v),
                    props.payload?.label || name,
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>By channel</h3>
          {(data.byChannel || []).length === 0 ? (
            <p className="empty">No channel data.</p>
          ) : (
            <div className="stats">
              {data.byChannel.map((row) => (
                <div className="stat" key={row.channel}>
                  <div className="stat-label">{row.channel}</div>
                  <div className="stat-value">{formatMoney(row.volume)}</div>
                  <div className="window-card-meta">
                    {formatNumber(row.transactions)} txn
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {data.byDataPlan && (
          <div className="panel">
            <h3>Top data plans</h3>
            {data.byDataPlan.length === 0 ? (
              <p className="empty">No data plan mix yet.</p>
            ) : (
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byDataPlan} layout="vertical">
                    <CartesianGrid stroke="rgba(0,0,0,0.06)" horizontal={false} />
                    <XAxis type="number" stroke="#6e6e73" fontSize={11} />
                    <YAxis
                      type="category"
                      dataKey="plan"
                      width={100}
                      stroke="#6e6e73"
                      fontSize={10}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v) => formatMoney(v)}
                    />
                    <Bar
                      dataKey="volume"
                      fill={SMIPAY_COLORS.green}
                      radius={[0, 6, 6, 0]}
                      name="Volume"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default CategoryAnalyticsSection;
