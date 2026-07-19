import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  acquisitionLabel,
  categoryLabel,
  failureReasonLabel,
  paymentMethodLabel,
  SMIPAY_COLORS,
} from '../../constants/smipay';
import { formatMoney, formatNumber, formatWeekLabel } from '../../utils/format';
import { SERIES_COLORS, tooltipStyle } from './chartTheme';

const weekTick = (value) => formatWeekLabel(value, { short: true });
const weekTooltipLabel = (value) => formatWeekLabel(value);

const SeverityBadge = ({ severity }) => (
  <span className={`alert-badge alert-${severity || 'ok'}`}>
    {severity === 'critical'
      ? 'Critical'
      : severity === 'warning'
        ? 'Warning'
        : 'OK'}
  </span>
);

const GrowthAnalyticsSection = ({ growth }) => {
  if (!growth) return null;

  const {
    northStars,
    depositSpend,
    secondTxn,
    dormancy,
    channelQuality,
    pendingAging,
    categoryAttach,
    concentration,
    cohortLtv,
    acquisition,
    failureReasons,
    paymentMethods,
    campaigns,
    geo,
    margin,
    alerts,
  } = growth;

  return (
    <section className="analytics-section" id="growth">
      <div className="page-header" style={{ marginBottom: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Growth OS</h2>
          <p style={{ margin: '0.35rem 0 0' }}>
            Funnel, habit, reliability, attribution, geo, and margin — for
            data-driven adoption.
          </p>
        </div>
      </div>

      <div className="panel" id="alerts">
        <h3>Alerts</h3>
        <div className="alerts-list">
          {(alerts || []).map((a) => (
            <div key={a.id} className={`alert-row alert-${a.severity}`}>
              <SeverityBadge severity={a.severity} />
              <div>
                <strong>{a.title}</strong>
                <p>{a.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Deposit→spend (7d)</div>
          <div className="stat-value">
            {(northStars?.depositSpend7dPct ?? 0).toFixed(1)}%
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">2nd txn rate</div>
          <div className="stat-value">
            {(northStars?.secondTxnRatePct ?? 0).toFixed(1)}%
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Dormant 30d+</div>
          <div className="stat-value">
            {(northStars?.dormant30PlusPct ?? 0).toFixed(1)}%
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Pending rate</div>
          <div className="stat-value">
            {(northStars?.pendingRatePct ?? 0).toFixed(1)}%
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Top 10% volume share</div>
          <div className="stat-value">
            {(northStars?.top10SharePct ?? 0).toFixed(1)}%
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Avg categories / user</div>
          <div className="stat-value">
            {northStars?.avgCategories ?? 0}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>Deposit → spend conversion</h3>
          <div className="stats" style={{ marginBottom: '0.75rem' }}>
            <div className="stat">
              <div className="stat-label">Within 24h</div>
              <div className="stat-value">
                {(depositSpend?.summary?.rate24hPct ?? 0).toFixed(1)}%
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Within 7d</div>
              <div className="stat-value">
                {(depositSpend?.summary?.rate7dPct ?? 0).toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={depositSpend?.trend || []}>
                <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis
                  dataKey="period"
                  stroke="#6e6e73"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={weekTick}
                />
                <YAxis stroke="#6e6e73" fontSize={11} tickLine={false} axisLine={false} unit="%" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={weekTooltipLabel}
                  formatter={(v) => `${v}%`}
                />
                <Legend />
                <Line type="monotone" dataKey="rate24hPct" name="24h" stroke={SMIPAY_COLORS.orange} strokeWidth={2} />
                <Line type="monotone" dataKey="rate7dPct" name="7d" stroke={SMIPAY_COLORS.green} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <h3>Second transaction (hook rate)</h3>
          <div className="stats" style={{ marginBottom: '0.75rem' }}>
            <div className="stat">
              <div className="stat-label">Rate</div>
              <div className="stat-value">
                {(secondTxn?.summary?.secondTxnRatePct ?? 0).toFixed(1)}%
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Avg hours to 2nd</div>
              <div className="stat-value">
                {secondTxn?.summary?.medianishHoursToSecond ?? 0}h
              </div>
            </div>
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={secondTxn?.byJoinWeek || []}>
                <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis
                  dataKey="period"
                  stroke="#6e6e73"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={weekTick}
                />
                <YAxis stroke="#6e6e73" fontSize={11} tickLine={false} axisLine={false} unit="%" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={weekTooltipLabel}
                  formatter={(v) => `${v}%`}
                />
                <Bar dataKey="ratePct" name="2nd txn %" fill={SMIPAY_COLORS.orange} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>Dormancy bands</h3>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dormancy?.bands || []}>
                <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="label" stroke="#6e6e73" fontSize={10} tickLine={false} />
                <YAxis stroke="#6e6e73" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, name, props) => [
                    `${formatNumber(v)} (${props.payload.pct}%)`,
                    'Customers',
                  ]}
                />
                <Bar dataKey="count" name="Customers" radius={[6, 6, 0, 0]}>
                  {(dormancy?.bands || []).map((entry, i) => (
                    <Cell key={entry.band} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <h3>Category attach (breadth)</h3>
          <div className="stats" style={{ marginBottom: '0.75rem' }}>
            {(categoryAttach?.buckets || []).map((b) => (
              <div className="stat" key={b.label}>
                <div className="stat-label">{b.label}</div>
                <div className="stat-value">{b.pct}%</div>
                <div className="window-card-meta">{formatNumber(b.count)} users</div>
              </div>
            ))}
          </div>
          <div className="panel" style={{ boxShadow: 'none', border: '1px solid var(--line)' }}>
            <h3>Volume concentration (top 10%)</h3>
            <p className="analytics-hint">
              Top {concentration?.summary?.top10Count || 0} customers drive{' '}
              {(concentration?.summary?.top10SharePct ?? 0).toFixed(1)}% of volume.
            </p>
            <div className="stats">
              {(concentration?.topCustomers || []).slice(0, 4).map((c) => (
                <div className="stat" key={c.customerId}>
                  <div className="stat-label">{c.customerName}</div>
                  <div className="stat-value">{formatMoney(c.volume)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>Channel quality</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Volume</th>
                  <th>Txns</th>
                  <th>Pending %</th>
                  <th>Customers</th>
                </tr>
              </thead>
              <tbody>
                {(channelQuality || []).map((row) => (
                  <tr key={row.channel}>
                    <td>{row.channel}</td>
                    <td>{formatMoney(row.volume)}</td>
                    <td>{formatNumber(row.transactions)}</td>
                    <td>{row.pendingRatePct}%</td>
                    <td>{formatNumber(row.uniqueCustomers)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <h3>Pending aging</h3>
          <div className="stats" style={{ marginBottom: '0.75rem' }}>
            <div className="stat">
              <div className="stat-label">Pending</div>
              <div className="stat-value">
                {formatNumber(pendingAging?.summary?.pending || 0)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Open &gt;24h</div>
              <div className="stat-value">
                {formatNumber(pendingAging?.summary?.openOver24h || 0)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Avg resolve hours</div>
              <div className="stat-value">
                {pendingAging?.summary?.avgResolveHours ?? 0}
              </div>
            </div>
          </div>
          {(failureReasons || []).length > 0 && (
            <>
              <h3 style={{ marginTop: '0.5rem' }}>Failure reasons</h3>
              <div className="stats">
                {failureReasons.map((r) => (
                  <div className="stat" key={r.reason}>
                    <div className="stat-label">{failureReasonLabel(r.reason)}</div>
                    <div className="stat-value">{formatNumber(r.count)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="panel">
        <h3>Cohort LTV proxy (ARPU)</h3>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cohortLtv || []}>
              <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis
                dataKey="period"
                stroke="#6e6e73"
                fontSize={11}
                tickLine={false}
                tickFormatter={weekTick}
              />
              <YAxis stroke="#6e6e73" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={weekTooltipLabel}
                formatter={(v) => formatMoney(v)}
              />
              <Legend />
              <Line type="monotone" dataKey="arpuD7" name="ARPU D7" stroke={SMIPAY_COLORS.orange} strokeWidth={2} />
              <Line type="monotone" dataKey="arpuD30" name="ARPU D30" stroke={SMIPAY_COLORS.green} strokeWidth={2} />
              <Line type="monotone" dataKey="arpuD90" name="ARPU D90" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2" id="attribution">
        <div className="panel">
          <h3>Acquisition sources</h3>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={acquisition || []}>
                <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis
                  dataKey="source"
                  tickFormatter={acquisitionLabel}
                  stroke="#6e6e73"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis stroke="#6e6e73" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={acquisitionLabel}
                  formatter={(v, name) =>
                    name === 'Volume' ? formatMoney(v) : formatNumber(v)
                  }
                />
                <Legend />
                <Bar dataKey="joined" name="Joined" fill={SMIPAY_COLORS.orange} radius={[6, 6, 0, 0]} />
                <Bar dataKey="activated" name="Activated" fill={SMIPAY_COLORS.green} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <h3>Campaign / promo attribution</h3>
          {(campaigns || []).length === 0 ? (
            <p className="empty">
              No promo codes logged yet. Add a campaign code on transactions to
              attribute volume.
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Volume</th>
                    <th>Txns</th>
                    <th>Customers</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.promoCode}>
                      <td>{c.promoCode}</td>
                      <td>{formatMoney(c.volume)}</td>
                      <td>{formatNumber(c.transactions)}</td>
                      <td>{formatNumber(c.uniqueCustomers)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(paymentMethods || []).length > 0 && (
            <>
              <h3 style={{ marginTop: '1rem' }}>Deposit payment methods</h3>
              <div className="stats">
                {paymentMethods.map((m) => (
                  <div className="stat" key={m.method}>
                    <div className="stat-label">
                      {paymentMethodLabel(m.method)}
                    </div>
                    <div className="stat-value">{formatMoney(m.volume)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid-2" id="geo-margin">
        <div className="panel">
          <h3>Geo expansion</h3>
          {(geo || []).length === 0 ? (
            <p className="empty">No geo data yet. Set state on new customers.</p>
          ) : (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={geo} layout="vertical">
                  <CartesianGrid stroke="rgba(0,0,0,0.06)" horizontal={false} />
                  <XAxis type="number" stroke="#6e6e73" fontSize={11} />
                  <YAxis
                    type="category"
                    dataKey="state"
                    width={90}
                    stroke="#6e6e73"
                    fontSize={10}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v, name) =>
                      name === 'Volume' ? formatMoney(v) : formatNumber(v)
                    }
                  />
                  <Bar dataKey="volume" name="Volume" fill={SMIPAY_COLORS.orange} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="panel">
          <h3>Margin by category</h3>
          <p className="analytics-hint">
            Uses logged provider cost when available; otherwise estimated
            category defaults.
          </p>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={margin || []}>
                <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis
                  dataKey="category"
                  tickFormatter={categoryLabel}
                  stroke="#6e6e73"
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis stroke="#6e6e73" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={categoryLabel}
                  formatter={(v, name) =>
                    name === 'Margin %' ? `${v}%` : formatMoney(v)
                  }
                />
                <Legend />
                <Bar dataKey="margin" name="Margin ₦" fill={SMIPAY_COLORS.green} radius={[6, 6, 0, 0]} />
                <Bar dataKey="volume" name="Volume" fill={SMIPAY_COLORS.chartSecondary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GrowthAnalyticsSection;
