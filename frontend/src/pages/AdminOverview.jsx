import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { categoryLabel } from '../constants/smipay';
import { adminCompanyPath, getThemeForSlug } from '../constants/themes';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatDateTime, formatMoney, formatNumber } from '../utils/format';

const AdminOverview = () => {
  const { activeCompany } = useCompany();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const slug = activeCompany?.slug;
  const theme = getThemeForSlug(slug);
  const showSmipay = slug === 'smipay';
  const showEdu = slug === 'smart-edu-hub';

  useEffect(() => {
    if (!slug || slug === 'all') return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data: overview } = await api.get('/overview', {
          params: { company: slug },
        });
        if (!cancelled) setData(overview);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Failed to load overview');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!activeCompany || activeCompany.slug === 'all') {
    return (
      <div className="page">
        <p className="empty">Loading company…</p>
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

  if (error) {
    return (
      <div className="page">
        <p className="error">{error}</p>
      </div>
    );
  }

  const s = data.summary;

  return (
    <div className="page">
      <Link to="/admin" className="back-to-hub">
        ← All companies
      </Link>
      <div className="page-header">
        <div>
          <h1>{activeCompany.name} overview</h1>
          <p>
            {slug === 'smipay'
              ? 'Growth view of Smipay customers, volume, and transaction categories from team-entered data.'
              : slug === 'smart-edu-hub'
                ? 'LMS schools aware vs subscribed, subscription revenue, onboarding, and renewals ending soon.'
                : `Metrics and recent activity for ${activeCompany.name}.`}
          </p>
        </div>
        <div className="row-actions">
          {showSmipay && (
            <Link
              to={adminCompanyPath(slug, 'customers')}
              className="btn btn-ghost"
            >
              Customers
            </Link>
          )}
          {showEdu && (
            <>
              <Link
                to={adminCompanyPath(slug, 'schools')}
                className="btn btn-ghost"
              >
                Schools
              </Link>
              <Link
                to={adminCompanyPath(slug, 'subscriptions')}
                className="btn btn-ghost"
              >
                Subscriptions
              </Link>
            </>
          )}
          <Link
            to={adminCompanyPath(slug, 'analytics')}
            className="btn btn-primary"
          >
            Open analytics
          </Link>
        </div>
      </div>

      {showSmipay && (
        <>
          <div className="stats">
            <div className="stat">
              <div className="stat-label">Customers</div>
              <div className="stat-value">{formatNumber(s.customerCount)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">New customers (30d)</div>
              <div className="stat-value">{formatNumber(s.newCustomers30d)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Total volume</div>
              <div className="stat-value">{formatMoney(s.smipayVolume)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Transactions</div>
              <div className="stat-value">
                {formatNumber(s.smipayTransactions)}
              </div>
            </div>
          </div>

          <div className="stats">
            <div className="stat">
              <div className="stat-label">Deposit</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatMoney(s.depositVolume)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Airtime</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatMoney(s.airtimeVolume)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Data</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatMoney(s.dataVolume)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Electricity</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatMoney(s.electricityVolume)}
              </div>
            </div>
          </div>

          <div className="stats">
            <div className="stat">
              <div className="stat-label">Exam body</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatMoney(s.examBodyVolume)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Cable TV</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatMoney(s.cableTvVolume)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Transfers</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatMoney(s.transferVolume)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Dormant customers</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatNumber(s.dormantCustomers)}
              </div>
            </div>
          </div>
        </>
      )}

      {showEdu && (
        <>
          <div className="stats">
            <div className="stat">
              <div className="stat-label">Schools aware</div>
              <div className="stat-value">{formatNumber(s.smehSchools)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Subscribed schools</div>
              <div className="stat-value">
                {formatNumber(s.smehSubscribedSchools)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Aware only</div>
              <div className="stat-value">{formatNumber(s.smehAwareOnly)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Subscription revenue</div>
              <div className="stat-value">{formatMoney(s.smehRevenue)}</div>
            </div>
          </div>
          <div className="stats">
            <div className="stat">
              <div className="stat-label">Active subs</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatNumber(s.smehActiveSubs)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Inactive subs</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatNumber(s.smehInactiveSubs)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Platform in use</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatNumber(s.smehPlatformInUse)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Team users</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatNumber(s.teamUserCount)}
              </div>
            </div>
          </div>
          <div className="stats">
            <div className="stat">
              <div className="stat-label">Student onboarded</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatNumber(s.smehStudentOnboarded)}
                {data.smeh ? ` (${data.smeh.studentOnboardedPct}%)` : ''}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Teacher onboarded</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatNumber(s.smehTeacherOnboarded)}
                {data.smeh ? ` (${data.smeh.teacherOnboardedPct}%)` : ''}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Parent onboarded</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatNumber(s.smehParentOnboarded)}
                {data.smeh ? ` (${data.smeh.parentOnboardedPct}%)` : ''}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Subscription records</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatNumber(s.smehRecords)}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="grid-2">
        {showSmipay && (
          <section className="panel">
            <h2>Transaction mix (volume)</h2>
            {data.byCategory?.length ? (
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byCategory}>
                    <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                    <XAxis
                      dataKey="category"
                      tickFormatter={categoryLabel}
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
                      labelFormatter={categoryLabel}
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
              <p className="empty">No Smipay category data yet.</p>
            )}
          </section>
        )}

        <section className="panel">
          <h2>Recent activity</h2>
          {showSmipay && (
            <div className="activity-block">
              <h3>Smipay</h3>
              {data.recentActivity.smipay.length === 0 ? (
                <p className="empty">No Smipay records yet.</p>
              ) : (
                <ul className="activity-list">
                  {data.recentActivity.smipay.map((r) => (
                    <li key={r._id}>
                      <span>
                        {r.customerName}
                        {r.category ? ` · ${categoryLabel(r.category)}` : ''}
                      </span>
                      <span>
                        {formatMoney(r.totalAmount)} · {formatDateTime(r.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {showEdu && (
            <>
              <div className="activity-block">
                <h3>Recent subscriptions</h3>
                {(data.recentActivity.smeh || data.recentActivity.edu || [])
                  .length === 0 ? (
                  <p className="empty">No SMEH subscriptions yet.</p>
                ) : (
                  <ul className="activity-list">
                    {(
                      data.recentActivity.smeh || data.recentActivity.edu || []
                    ).map((r) => (
                      <li key={r._id}>
                        <span>
                          {r.schoolName}
                          {r.subscriptionStatus
                            ? ` · ${r.subscriptionStatus}`
                            : ''}
                        </span>
                        <span>
                          {formatMoney(r.amount ?? r.feesCollected)} ·{' '}
                          {formatDate(r.date)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {data.smeh?.expiringSoon?.length > 0 && (
                <div className="activity-block" style={{ marginTop: '1.25rem' }}>
                  <h3>Expiring within 30 days</h3>
                  <ul className="activity-list">
                    {data.smeh.expiringSoon.map((r) => (
                      <li key={r._id}>
                        <span>{r.schoolName}</span>
                        <span>
                          {formatMoney(r.amount)} · ends {formatDate(r.endsAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminOverview;
