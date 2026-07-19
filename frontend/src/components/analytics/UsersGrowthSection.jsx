import { useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SMIPAY_COLORS } from '../../constants/smipay';
import { formatNumber, formatWeekLabel } from '../../utils/format';
import ChartTabs from './ChartTabs';
import { tooltipStyle } from './chartTheme';

const periodTick = (tab) => (value) =>
  tab === 'weekly' ? formatWeekLabel(value, { short: true }) : value;
const periodTooltipLabel = (tab) => (value) =>
  tab === 'weekly' ? formatWeekLabel(value) : value;

const TREND_TABS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const seriesFor = (section, tab) => {
  if (!section) return [];
  if (tab === 'weekly') return section.weekly || [];
  if (tab === 'monthly') return section.monthly || [];
  return section.daily || [];
};

const UsersGrowthSection = ({ usersAdded, usersActivated }) => {
  const [addedTab, setAddedTab] = useState('daily');
  const [activatedTab, setActivatedTab] = useState('daily');

  return (
    <section className="analytics-section" id="users">
      <div className="page-header" style={{ marginBottom: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Users</h2>
          <p style={{ margin: '0.35rem 0 0' }}>
            New customers added vs customers who completed their first transaction.
          </p>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Users added</div>
          <div className="stat-value">
            {formatNumber(usersAdded?.summary?.total || 0)}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Users activated</div>
          <div className="stat-value">
            {formatNumber(usersActivated?.summary?.total || 0)}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Activated / joined (period)</div>
          <div className="stat-value">
            {(usersActivated?.summary?.ratePct ?? 0).toFixed(1)}%
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Joined with first txn</div>
          <div className="stat-value">
            {formatNumber(usersAdded?.summary?.withFirstTxn || 0)}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="analytics-panel-head">
            <h3>Users added</h3>
            <ChartTabs tabs={TREND_TABS} active={addedTab} onChange={setAddedTab} />
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesFor(usersAdded, addedTab)}>
                <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis
                  dataKey="period"
                  stroke="#6e6e73"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={periodTick(addedTab)}
                />
                <YAxis stroke="#6e6e73" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={periodTooltipLabel(addedTab)}
                  formatter={(v) => formatNumber(v)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={SMIPAY_COLORS.orange}
                  strokeWidth={2.25}
                  name="Added"
                  dot={{ r: 3, fill: SMIPAY_COLORS.orange }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="analytics-panel-head">
            <h3>Users activated</h3>
            <ChartTabs
              tabs={TREND_TABS}
              active={activatedTab}
              onChange={setActivatedTab}
            />
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesFor(usersActivated, activatedTab)}>
                <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis
                  dataKey="period"
                  stroke="#6e6e73"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={periodTick(activatedTab)}
                />
                <YAxis stroke="#6e6e73" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={periodTooltipLabel(activatedTab)}
                  formatter={(v) => formatNumber(v)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={SMIPAY_COLORS.green}
                  strokeWidth={2.25}
                  name="Activated"
                  dot={{ r: 3, fill: SMIPAY_COLORS.green }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UsersGrowthSection;
