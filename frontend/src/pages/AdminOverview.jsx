import { useEffect, useState } from 'react';
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
import { categoryLabel } from '../constants/smipay';
import { BESTTECH_SLUG, serviceLineLabel } from '../constants/besttech';
import { BEST_IN_PRINT_SLUG, printTypeLabel } from '../constants/bestinprint';
import { OXYGEN_SLUG, bookingTypeLabel } from '../constants/oxygen';
import {
  TRIFONE_SLUG,
  productCategoryLabel,
  saleChannelLabel,
} from '../constants/trifone';
import {
  adminCompanyPath,
  getThemeForSlug,
  hubRootFromPathname,
} from '../constants/themes';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatDateTime, formatMoney, formatNumber } from '../utils/format';

const AdminOverview = () => {
  const { activeCompany } = useCompany();
  const hubRoot = hubRootFromPathname(useLocation().pathname);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const slug = activeCompany?.slug;
  const theme = getThemeForSlug(slug);
  const showSmipay = slug === 'smipay';
  const showEdu = slug === 'smart-edu-hub';
  const showBestTech = slug === BESTTECH_SLUG;
  const showBestInPrint = slug === BEST_IN_PRINT_SLUG;
  const showOxygen = slug === OXYGEN_SLUG;
  const showTrifone = slug === TRIFONE_SLUG;

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
  const path = (page) => adminCompanyPath(slug, page, hubRoot);

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
            {slug === 'smipay'
              ? 'Growth view of Smipay customers, volume, and transaction categories from team-entered data.'
              : slug === 'smart-edu-hub'
                ? 'LMS schools aware vs subscribed, subscription revenue, onboarding, and renewals ending soon.'
                : slug === BESTTECH_SLUG
                  ? 'Enterprise clients, project engagements, and pipeline value by service line.'
                  : slug === BEST_IN_PRINT_SLUG
                    ? 'Print clients, book and flier jobs, and pipeline value by print type.'
                    : slug === OXYGEN_SLUG
                      ? 'Advertisers, airtime bookings, and commercial pipeline by booking type.'
                      : slug === TRIFONE_SLUG
                        ? 'Customers, product sales revenue, and mix by category and channel.'
                        : `Metrics and recent activity for ${activeCompany.name}.`}
          </p>
        </div>
        <div className="row-actions">
          {showSmipay && (
            <Link
              to={path('customers')}
              className="btn btn-ghost"
            >
              Customers
            </Link>
          )}
          {showEdu && (
            <>
              <Link
                to={path('schools')}
                className="btn btn-ghost"
              >
                Schools
              </Link>
              <Link
                to={path('subscriptions')}
                className="btn btn-ghost"
              >
                Subscriptions
              </Link>
            </>
          )}
          {showBestTech && (
            <>
              <Link
                to={path('clients')}
                className="btn btn-ghost"
              >
                Clients
              </Link>
              <Link
                to={path('projects')}
                className="btn btn-primary"
              >
                Projects
              </Link>
            </>
          )}
          {showBestInPrint && (
            <>
              <Link
                to={path('clients')}
                className="btn btn-ghost"
              >
                Clients
              </Link>
              <Link
                to={path('jobs')}
                className="btn btn-primary"
              >
                Jobs
              </Link>
            </>
          )}
          {showOxygen && (
            <>
              <Link
                to={path('advertisers')}
                className="btn btn-ghost"
              >
                Advertisers
              </Link>
              <Link
                to={path('bookings')}
                className="btn btn-primary"
              >
                Bookings
              </Link>
            </>
          )}
          {showTrifone && (
            <>
              <Link
                to={path('customers')}
                className="btn btn-ghost"
              >
                Customers
              </Link>
              <Link
                to={path('sales')}
                className="btn btn-primary"
              >
                Sales
              </Link>
            </>
          )}
          {!showBestTech && !showBestInPrint && !showOxygen && !showTrifone && (
            <Link
              to={path('analytics')}
              className="btn btn-primary"
            >
              Open analytics
            </Link>
          )}
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

      {showBestTech && (
        <>
          <div className="stats">
            <div className="stat">
              <div className="stat-label">Clients</div>
              <div className="stat-value">
                {formatNumber(s.besttechClients)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">New clients (30d)</div>
              <div className="stat-value">
                {formatNumber(s.besttechNewClients30d)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Projects</div>
              <div className="stat-value">
                {formatNumber(s.besttechProjects)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Pipeline value</div>
              <div className="stat-value">
                {formatMoney(s.besttechPipelineValue)}
              </div>
            </div>
          </div>
          <div className="stats">
            <div className="stat">
              <div className="stat-label">Active / proposal</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatNumber(s.besttechActiveProjects)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Completed</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatNumber(s.besttechCompletedProjects)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Amount received</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatMoney(s.besttechAmountReceived)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Team users</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatNumber(s.teamUserCount)}
              </div>
            </div>
          </div>
        </>
      )}

      {showBestInPrint && (
        <>
          <div className="stats">
            <div className="stat">
              <div className="stat-label">Clients</div>
              <div className="stat-value">
                {formatNumber(s.bestInPrintClients)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">New clients (30d)</div>
              <div className="stat-value">
                {formatNumber(s.bestInPrintNewClients30d)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Print jobs</div>
              <div className="stat-value">
                {formatNumber(s.bestInPrintJobs)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Pipeline value</div>
              <div className="stat-value">
                {formatMoney(s.bestInPrintPipelineValue)}
              </div>
            </div>
          </div>
          <div className="stats">
            <div className="stat">
              <div className="stat-label">In production / confirmed</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatNumber(s.bestInPrintInProduction)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Delivered</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatNumber(s.bestInPrintDelivered)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Amount received</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatMoney(s.bestInPrintAmountReceived)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Team users</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatNumber(s.teamUserCount)}
              </div>
            </div>
          </div>
        </>
      )}

      {showOxygen && (
        <>
          <div className="stats">
            <div className="stat">
              <div className="stat-label">Advertisers</div>
              <div className="stat-value">
                {formatNumber(s.oxygenAdvertisers)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">New advertisers (30d)</div>
              <div className="stat-value">
                {formatNumber(s.oxygenNewAdvertisers30d)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Bookings</div>
              <div className="stat-value">
                {formatNumber(s.oxygenBookings)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Pipeline value</div>
              <div className="stat-value">
                {formatMoney(s.oxygenPipelineValue)}
              </div>
            </div>
          </div>
          <div className="stats">
            <div className="stat">
              <div className="stat-label">Booked / running</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatNumber(s.oxygenRunningOrBooked)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Completed</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatNumber(s.oxygenCompletedBookings)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Amount received</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatMoney(s.oxygenAmountReceived)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Team users</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatNumber(s.teamUserCount)}
              </div>
            </div>
          </div>
        </>
      )}

      {showTrifone && (
        <>
          <div className="stats">
            <div className="stat">
              <div className="stat-label">Customers</div>
              <div className="stat-value">
                {formatNumber(s.trifoneCustomers)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">New customers (30d)</div>
              <div className="stat-value">
                {formatNumber(s.trifoneNewCustomers30d)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Sales</div>
              <div className="stat-value">
                {formatNumber(s.trifoneSales)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Revenue</div>
              <div className="stat-value">
                {formatMoney(s.trifoneRevenue)}
              </div>
            </div>
          </div>
          <div className="stats">
            <div className="stat">
              <div className="stat-label">Confirmed</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatNumber(s.trifoneConfirmedSales)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Delivered</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatNumber(s.trifoneDeliveredSales)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Team users</div>
              <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatNumber(s.teamUserCount)}
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

        {showBestTech && (
          <section className="panel">
            <h2>Contract value by service line</h2>
            {data.byServiceLine?.length ? (
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byServiceLine}>
                    <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                    <XAxis
                      dataKey="serviceLine"
                      tickFormatter={serviceLineLabel}
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
                      labelFormatter={serviceLineLabel}
                      contentStyle={{
                        background: '#fff',
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: 12,
                      }}
                    />
                    <Bar
                      dataKey="contractValue"
                      fill={theme.chartPrimary}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="empty">No project data yet.</p>
            )}
          </section>
        )}

        {showBestInPrint && (
          <section className="panel">
            <h2>Contract value by print type</h2>
            {data.byPrintType?.length ? (
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byPrintType}>
                    <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                    <XAxis
                      dataKey="printType"
                      tickFormatter={printTypeLabel}
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
                      labelFormatter={printTypeLabel}
                      contentStyle={{
                        background: '#fff',
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: 12,
                      }}
                    />
                    <Bar
                      dataKey="contractValue"
                      fill={theme.chartPrimary}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="empty">No print job data yet.</p>
            )}
          </section>
        )}

        {showOxygen && (
          <section className="panel">
            <h2>Contract value by booking type</h2>
            {data.byBookingType?.length ? (
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byBookingType}>
                    <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                    <XAxis
                      dataKey="bookingType"
                      tickFormatter={bookingTypeLabel}
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
                      labelFormatter={bookingTypeLabel}
                      contentStyle={{
                        background: '#fff',
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: 12,
                      }}
                    />
                    <Bar
                      dataKey="contractValue"
                      fill={theme.chartPrimary}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="empty">No booking data yet.</p>
            )}
          </section>
        )}

        {showTrifone && (
          <>
            <section className="panel">
              <h2>Revenue by product category</h2>
              {data.byProductCategory?.length ? (
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byProductCategory}>
                      <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                      <XAxis
                        dataKey="productCategory"
                        tickFormatter={productCategoryLabel}
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
                        labelFormatter={productCategoryLabel}
                        contentStyle={{
                          background: '#fff',
                          border: '1px solid rgba(0,0,0,0.08)',
                          borderRadius: 12,
                        }}
                      />
                      <Bar
                        dataKey="revenue"
                        fill={theme.chartPrimary}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="empty">No sales data yet.</p>
              )}
            </section>
            <section className="panel">
              <h2>Revenue by channel</h2>
              {data.byChannel?.length ? (
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byChannel}>
                      <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                      <XAxis
                        dataKey="channel"
                        tickFormatter={saleChannelLabel}
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
                        labelFormatter={saleChannelLabel}
                        contentStyle={{
                          background: '#fff',
                          border: '1px solid rgba(0,0,0,0.08)',
                          borderRadius: 12,
                        }}
                      />
                      <Bar
                        dataKey="revenue"
                        fill={theme.chartSecondary || theme.chartPrimary}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="empty">No channel data yet.</p>
              )}
            </section>
          </>
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
          {showBestTech && (
            <div className="activity-block">
              <h3>Recent projects</h3>
              {(data.recentActivity.besttech || []).length === 0 ? (
                <p className="empty">No projects yet.</p>
              ) : (
                <ul className="activity-list">
                  {data.recentActivity.besttech.map((r) => (
                    <li key={r._id}>
                      <span>
                        {r.title}
                        {r.clientName ? ` · ${r.clientName}` : ''}
                        {r.serviceLine
                          ? ` · ${serviceLineLabel(r.serviceLine)}`
                          : ''}
                      </span>
                      <span>
                        {formatMoney(r.contractValue)} · {formatDate(r.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {showBestInPrint && (
            <div className="activity-block">
              <h3>Recent print jobs</h3>
              {(data.recentActivity.bestInPrint || []).length === 0 ? (
                <p className="empty">No jobs yet.</p>
              ) : (
                <ul className="activity-list">
                  {data.recentActivity.bestInPrint.map((r) => (
                    <li key={r._id}>
                      <span>
                        {r.title}
                        {r.clientName ? ` · ${r.clientName}` : ''}
                        {r.printType
                          ? ` · ${printTypeLabel(r.printType)}`
                          : ''}
                      </span>
                      <span>
                        {formatMoney(r.contractValue)} · {formatDate(r.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {showOxygen && (
            <div className="activity-block">
              <h3>Recent bookings</h3>
              {(data.recentActivity.oxygen || []).length === 0 ? (
                <p className="empty">No bookings yet.</p>
              ) : (
                <ul className="activity-list">
                  {data.recentActivity.oxygen.map((r) => (
                    <li key={r._id}>
                      <span>
                        {r.title}
                        {r.advertiserName ? ` · ${r.advertiserName}` : ''}
                        {r.bookingType
                          ? ` · ${bookingTypeLabel(r.bookingType)}`
                          : ''}
                      </span>
                      <span>
                        {formatMoney(r.contractValue)} · {formatDate(r.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {showTrifone && (
            <div className="activity-block">
              <h3>Recent sales</h3>
              {(data.recentActivity.trifone || []).length === 0 ? (
                <p className="empty">No sales yet.</p>
              ) : (
                <ul className="activity-list">
                  {data.recentActivity.trifone.map((r) => (
                    <li key={r._id}>
                      <span>
                        {r.title || r.productName || productCategoryLabel(r.productCategory)}
                        {r.customerName ? ` · ${r.customerName}` : ''}
                        {r.productCategory
                          ? ` · ${productCategoryLabel(r.productCategory)}`
                          : ''}
                      </span>
                      <span>
                        {formatMoney(r.totalAmount)} · {formatDate(r.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminOverview;
