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
import { SMIPAY_COLORS } from '../../constants/smipay';
import { formatNumber, formatWeekLabel } from '../../utils/format';
import { tooltipStyle } from './chartTheme';

const weekTick = (value) => formatWeekLabel(value, { short: true });
const weekTooltipLabel = (value) => formatWeekLabel(value);

const ActivationRetentionSection = ({ activationRate, retentionRate }) => {
  const activation = activationRate || {};
  const retention = retentionRate || {};

  return (
    <>
      <section className="analytics-section" id="activation">
        <div className="page-header" style={{ marginBottom: '0.75rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>Activation rate</h2>
            <p style={{ margin: '0.35rem 0 0' }}>
              Share of new users who complete a first transaction within 7 days of
              joining.
            </p>
          </div>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="stat-label">Joined in range</div>
            <div className="stat-value">
              {formatNumber(activation.summary?.joined || 0)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Activated in 7 days</div>
            <div className="stat-value">
              {formatNumber(activation.summary?.activatedWithin7d || 0)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">7-day activation</div>
            <div className="stat-value">
              {(activation.summary?.rateWithin7dPct ?? 0).toFixed(1)}%
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Activated ever</div>
            <div className="stat-value">
              {(activation.summary?.rateEverPct ?? 0).toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="panel">
          <h3>Activation by join week</h3>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activation.byJoinWeek || []}>
                <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis
                  dataKey="period"
                  stroke="#6e6e73"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={weekTick}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#6e6e73"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  unit="%"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#6e6e73"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={weekTooltipLabel}
                  formatter={(v, name) =>
                    name === '7-day rate' ? `${v}%` : formatNumber(v)
                  }
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="ratePct"
                  stroke={SMIPAY_COLORS.orange}
                  strokeWidth={2.25}
                  name="7-day rate"
                  dot={{ r: 3, fill: SMIPAY_COLORS.orange }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="joined"
                  stroke={SMIPAY_COLORS.chartSecondary}
                  strokeWidth={2}
                  name="Joined"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="analytics-section" id="retention">
        <div className="page-header" style={{ marginBottom: '0.75rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>Retention rate</h2>
            <p style={{ margin: '0.35rem 0 0' }}>
              Join-week cohorts returning with a transaction in weeks 1–4 after
              signup, plus D7 / D30.
            </p>
          </div>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="stat-label">Cohorts</div>
            <div className="stat-value">
              {formatNumber(retention.summary?.cohorts || 0)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Customers in cohorts</div>
            <div className="stat-value">
              {formatNumber(retention.summary?.customers || 0)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">D7 retention</div>
            <div className="stat-value">
              {(retention.summary?.d7RetentionPct ?? 0).toFixed(1)}%
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">D30 retention</div>
            <div className="stat-value">
              {(retention.summary?.d30RetentionPct ?? 0).toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="panel">
          <h3>Cohort retention (weeks after join)</h3>
          {(retention.cohorts || []).length === 0 ? (
            <p className="empty">Not enough join data for cohorts yet.</p>
          ) : (
            <>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={retention.cohorts}>
                    <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                    <XAxis
                      dataKey="period"
                      stroke="#6e6e73"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={weekTick}
                    />
                    <YAxis
                      stroke="#6e6e73"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      unit="%"
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelFormatter={weekTooltipLabel}
                      formatter={(v) => `${v}%`}
                    />
                    <Legend />
                    <Bar dataKey="w1Pct" name="Week 1" fill={SMIPAY_COLORS.orange} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="w2Pct" name="Week 2" fill={SMIPAY_COLORS.green} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="w3Pct" name="Week 3" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="w4Pct" name="Week 4" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="table-wrap" style={{ marginTop: '1rem' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Cohort</th>
                      <th>Size</th>
                      <th>W1</th>
                      <th>W2</th>
                      <th>W3</th>
                      <th>W4</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retention.cohorts.map((row) => (
                      <tr key={row.period}>
                        <td>{formatWeekLabel(row.period || row.label)}</td>
                        <td>{formatNumber(row.size)}</td>
                        <td>{row.w1Pct}%</td>
                        <td>{row.w2Pct}%</td>
                        <td>{row.w3Pct}%</td>
                        <td>{row.w4Pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
};

export default ActivationRetentionSection;
