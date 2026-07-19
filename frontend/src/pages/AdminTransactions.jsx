import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
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
import TransactionsNumbersView from '../components/TransactionsNumbersView';
import {
  categoryLabel,
  formatDataPlan,
  networkLabel,
  SMIPAY_CATEGORIES,
  SMIPAY_COLORS,
  SMIPAY_NETWORKS,
  SMIPAY_STATUSES,
  statusLabel,
} from '../constants/smipay';
import { useCompany } from '../context/CompanyContext';
import { formatDateTime, formatMoney, formatNumber } from '../utils/format';

const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid rgba(242,101,34,0.12)',
  borderRadius: 12,
  boxShadow: '0 8px 24px rgba(242,101,34,0.08)',
  color: SMIPAY_COLORS.ink,
};

const TIME_WINDOWS = [
  { value: '5h', label: 'Past 5 hours' },
  { value: '12h', label: 'Past 12 hours' },
  { value: '24h', label: 'Past 24 hours' },
  { value: '7d', label: 'Past 7 days' },
  { value: '30d', label: 'Past 30 days' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom range' },
  { value: 'all', label: 'All time' },
];

const WINDOW_COMPARE = [
  { key: '5h', label: '5 hours' },
  { key: '12h', label: '12 hours' },
  { key: '24h', label: '24 hours' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'today', label: 'Today' },
];

const CHANNELS = [
  { value: 'all', label: 'All channels' },
  { value: 'app', label: 'App' },
  { value: 'web', label: 'Web' },
  { value: 'agent', label: 'Agent' },
  { value: 'ussd', label: 'USSD' },
  { value: 'other', label: 'Other' },
];

const emptyFilters = {
  window: '30d',
  dateField: 'date',
  from: '',
  to: '',
  categories: [],
  channel: 'all',
  network: 'all',
  status: 'all',
  search: '',
  amountMin: '',
  amountMax: '',
  txnMin: '',
  txnMax: '',
  sortBy: 'date_desc',
};

const AdminTransactions = () => {
  const { activeCompany } = useCompany();
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('charts');

  const showSmipay = activeCompany?.slug === 'smipay';

  const buildParams = useCallback(
    (nextFilters, nextPage) => {
      const params = {
        window: nextFilters.window,
        dateField: nextFilters.dateField,
        sortBy: nextFilters.sortBy,
        page: nextPage,
        limit: 50,
      };
      if (nextFilters.window === 'custom') {
        if (nextFilters.from) params.from = nextFilters.from;
        if (nextFilters.to) params.to = nextFilters.to;
      }
      if (nextFilters.categories.length) {
        params.category = nextFilters.categories.join(',');
      }
      if (nextFilters.channel !== 'all') params.channel = nextFilters.channel;
      if (nextFilters.network !== 'all') params.network = nextFilters.network;
      if (nextFilters.status !== 'all') params.status = nextFilters.status;
      if (nextFilters.search.trim()) params.search = nextFilters.search.trim();
      if (nextFilters.amountMin !== '') params.amountMin = nextFilters.amountMin;
      if (nextFilters.amountMax !== '') params.amountMax = nextFilters.amountMax;
      if (nextFilters.txnMin !== '') params.txnMin = nextFilters.txnMin;
      if (nextFilters.txnMax !== '') params.txnMax = nextFilters.txnMax;
      return params;
    },
    []
  );

  const load = useCallback(
    async (nextFilters = applied, nextPage = page) => {
      if (!showSmipay) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const { data: res } = await api.get('/smipay/transactions', {
          params: buildParams(nextFilters, nextPage),
        });
        setData(res);
      } catch (err) {
        setData(null);
        setError(err.response?.data?.message || 'Failed to load transactions');
      } finally {
        setLoading(false);
      }
    },
    [applied, buildParams, page, showSmipay]
  );

  useEffect(() => {
    load(applied, page);
  }, [load, applied, page, showSmipay]);

  const onFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const toggleCategory = (value) => {
    const has = filters.categories.includes(value);
    const next = {
      ...filters,
      categories: has
        ? filters.categories.filter((c) => c !== value)
        : [...filters.categories, value],
    };
    setFilters(next);
    setApplied(next);
    setPage(1);
  };

  const clearCategories = () => {
    const next = { ...filters, categories: [] };
    setFilters(next);
    setApplied(next);
    setPage(1);
  };

  const applyFilters = () => {
    setPage(1);
    setApplied({ ...filters });
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
    setPage(1);
  };

  const setWindow = (value) => {
    const next = { ...filters, window: value };
    setFilters(next);
    setApplied(next);
    setPage(1);
  };

  const downloadCsv = async () => {
    const params = new URLSearchParams();
    const rangeHint = data?.applied;
    if (rangeHint?.from) {
      params.set('from', String(rangeHint.from).slice(0, 10));
    }
    if (rangeHint?.to) {
      params.set('to', String(rangeHint.to).slice(0, 10));
    } else if (applied.window === 'custom') {
      if (applied.from) params.set('from', applied.from.slice(0, 10));
      if (applied.to) params.set('to', applied.to.slice(0, 10));
    }

    const token = localStorage.getItem('gat_token');
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const res = await fetch(`${base}/reports/smipay?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.message || 'Download failed');
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smipay-transactions-report.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filtersActive = useMemo(
    () =>
      Object.entries(applied).some(([key, value]) => {
        if (key === 'categories') return value.length > 0;
        return value !== emptyFilters[key];
      }),
    [applied]
  );

  const categoryChart = useMemo(
    () => (data?.byCategory || []).filter((row) => row.volume > 0),
    [data]
  );

  if (!showSmipay) {
    return (
      <div className="page">
        <p className="empty">
          Transaction analysis is for Smipay. Select Smipay or All in the top bar.
        </p>
      </div>
    );
  }

  const summary = data?.summary;
  const windows = data?.windows || {};
  const pagination = data?.pagination;

  return (
    <div className="page page-wide">
      <div className="page-header">
        <div>
          <h1>Transactions</h1>
          <p>
            Volume, transaction mix, and activity across time windows — see what
            is moving right now and over longer periods.
          </p>
        </div>
        <div className="page-header-actions">
          <div className="view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={`view-toggle-btn${viewMode === 'charts' ? ' active' : ''}`}
              onClick={() => setViewMode('charts')}
            >
              Charts
            </button>
            <button
              type="button"
              className={`view-toggle-btn${viewMode === 'numbers' ? ' active' : ''}`}
              onClick={() => setViewMode('numbers')}
            >
              Numbers
            </button>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={downloadCsv}
          >
            Download CSV
          </button>
          {filtersActive && (
            <button type="button" className="btn btn-ghost" onClick={resetFilters}>
              Reset filters
            </button>
          )}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <section className="panel panel-time-window">
        <div className="panel-head">
          <h2>Time window</h2>
          <span className="muted-note">
            Windows use the selected date field (transaction time or logged-at)
          </span>
        </div>
        <div className="window-chips">
          {TIME_WINDOWS.map((w) => (
            <button
              key={w.value}
              type="button"
              className={`window-chip${applied.window === w.value ? ' active' : ''}`}
              onClick={() => setWindow(w.value)}
            >
              {w.label}
            </button>
          ))}
        </div>
      </section>

      <div className="window-compare">
        {WINDOW_COMPARE.map((w) => {
          const stats = windows[w.key] || {};
          return (
            <button
              key={w.key}
              type="button"
              className={`window-card${applied.window === w.key ? ' active' : ''}`}
              onClick={() => setWindow(w.key)}
            >
              <div className="stat-label">{w.label}</div>
              <div className="window-card-value">{formatMoney(stats.volume || 0)}</div>
              <div className="window-card-meta">
                {formatNumber(stats.transactions || 0)} txn ·{' '}
                {formatNumber(stats.records || 0)} records
              </div>
            </button>
          );
        })}
      </div>

      <section className="panel panel-filters">
        <div className="panel-head">
          <h2>Filters</h2>
          <button
            type="button"
            className="btn btn-ghost filter-toggle"
            onClick={() => setFiltersExpanded((v) => !v)}
            aria-expanded={filtersExpanded}
          >
            <SlidersHorizontal size={16} strokeWidth={1.75} />
            {filtersExpanded ? 'Hide advanced' : 'More filters'}
            {filtersExpanded ? (
              <ChevronUp size={16} strokeWidth={1.75} />
            ) : (
              <ChevronDown size={16} strokeWidth={1.75} />
            )}
          </button>
        </div>

        <div className="category-filter category-filter-compact">
          <div className="window-chips">
            <button
              type="button"
              className={`window-chip${!applied.categories.length ? ' active' : ''}`}
              onClick={clearCategories}
            >
              All categories
            </button>
            {SMIPAY_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                className={`window-chip${
                  applied.categories.includes(cat.value) ? ' active' : ''
                }`}
                onClick={() => toggleCategory(cat.value)}
              >
                {cat.label}
              </button>
            ))}
            <button
              type="button"
              className={`window-chip${applied.status === 'pending' ? ' active' : ''}`}
              onClick={() => {
                const next = {
                  ...filters,
                  status: applied.status === 'pending' ? 'all' : 'pending',
                };
                setFilters(next);
                setApplied(next);
                setPage(1);
              }}
            >
              Pending only
              {summary?.pendingCount != null
                ? ` (${summary.pendingCount})`
                : ''}
            </button>
          </div>
        </div>

        {filtersExpanded && (
          <div className="filters-advanced">
            <div className="filters filter-grid">
              <label>
                Date field
                <select
                  name="dateField"
                  value={filters.dateField}
                  onChange={onFilterChange}
                >
                  <option value="date">Transaction date & time</option>
                  <option value="createdAt">Logged at (created)</option>
                </select>
              </label>
              <label>
                From
                <input
                  type={
                    filters.dateField === 'createdAt' ? 'datetime-local' : 'date'
                  }
                  name="from"
                  value={filters.from}
                  onChange={onFilterChange}
                  disabled={filters.window !== 'custom'}
                />
              </label>
              <label>
                To
                <input
                  type={
                    filters.dateField === 'createdAt' ? 'datetime-local' : 'date'
                  }
                  name="to"
                  value={filters.to}
                  onChange={onFilterChange}
                  disabled={filters.window !== 'custom'}
                />
              </label>
              <label>
                Channel
                <select
                  name="channel"
                  value={filters.channel}
                  onChange={onFilterChange}
                >
                  {CHANNELS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Network
                <select
                  name="network"
                  value={filters.network}
                  onChange={onFilterChange}
                >
                  <option value="all">All networks</option>
                  {SMIPAY_NETWORKS.map((n) => (
                    <option key={n.value} value={n.value}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
                  name="status"
                  value={filters.status}
                  onChange={onFilterChange}
                >
                  <option value="all">All statuses</option>
                  {SMIPAY_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Search customer
                <input
                  name="search"
                  value={filters.search}
                  onChange={onFilterChange}
                  placeholder="Customer name"
                />
              </label>
              <label>
                Min amount
                <input
                  name="amountMin"
                  type="number"
                  min="0"
                  value={filters.amountMin}
                  onChange={onFilterChange}
                  placeholder="0"
                />
              </label>
              <label>
                Max amount
                <input
                  name="amountMax"
                  type="number"
                  min="0"
                  value={filters.amountMax}
                  onChange={onFilterChange}
                  placeholder="Any"
                />
              </label>
              <label>
                Min txn count
                <input
                  name="txnMin"
                  type="number"
                  min="0"
                  value={filters.txnMin}
                  onChange={onFilterChange}
                  placeholder="0"
                />
              </label>
              <label>
                Max txn count
                <input
                  name="txnMax"
                  type="number"
                  min="0"
                  value={filters.txnMax}
                  onChange={onFilterChange}
                  placeholder="Any"
                />
              </label>
              <label>
                Sort by
                <select
                  name="sortBy"
                  value={filters.sortBy}
                  onChange={onFilterChange}
                >
                  <option value="logged_desc">Logged (newest)</option>
                  <option value="logged_asc">Logged (oldest)</option>
                  <option value="date_desc">Business date (newest)</option>
                  <option value="date_asc">Business date (oldest)</option>
                  <option value="amount_desc">Amount (high → low)</option>
                  <option value="amount_asc">Amount (low → high)</option>
                  <option value="txn_desc">Txn count (high → low)</option>
                  <option value="txn_asc">Txn count (low → high)</option>
                  <option value="customer_asc">Customer (A → Z)</option>
                  <option value="customer_desc">Customer (Z → A)</option>
                </select>
              </label>
            </div>
            <div className="filters-advanced-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={applyFilters}
              >
                Apply filters
              </button>
            </div>
          </div>
        )}
      </section>

      {loading && !data ? (
        <p className="empty">Loading transactions…</p>
      ) : !summary ? (
        <p className="empty">No transaction data available.</p>
      ) : viewMode === 'numbers' ? (
        <TransactionsNumbersView data={data} appliedWindow={applied.window} />
      ) : (
        <div className="stack">
          <div className="stats">
            <div className="stat">
              <div className="stat-label">Total volume</div>
              <div className="stat-value">{formatMoney(summary.totalVolume)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Transactions</div>
              <div className="stat-value">
                {formatNumber(summary.totalTransactions)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Avg ticket</div>
              <div className="stat-value">{formatMoney(summary.averageTicket)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Customers</div>
              <div className="stat-value">
                {formatNumber(summary.uniqueCustomers)}
              </div>
            </div>
          </div>

          <div className="stats">
            <div className="stat">
              <div className="stat-label">Still pending</div>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>
                {formatNumber(summary.pendingCount || 0)}
              </div>
              <div className="window-card-meta">
                {formatMoney(summary.pendingVolume || 0)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Resolved</div>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>
                {formatNumber(summary.resolvedCount || 0)}
              </div>
              <div className="window-card-meta">
                {formatMoney(summary.resolvedVolume || 0)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Successful</div>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>
                {formatNumber(summary.successfulCount || 0)}
              </div>
              <div className="window-card-meta">
                {formatMoney(summary.successfulVolume || 0)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Pending share</div>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>
                {summary.recordCount
                  ? (
                      ((summary.pendingCount || 0) / summary.recordCount) *
                      100
                    ).toFixed(1)
                  : '0.0'}
                %
              </div>
            </div>
          </div>

          <section className="panel">
            <h2>Volume by category</h2>
            <div className="category-volume-grid">
              {SMIPAY_CATEGORIES.map((cat) => {
                const row = data.byCategory.find((c) => c.category === cat.value);
                const volume = row?.volume || 0;
                const share = row?.share || 0;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    className={`category-volume-card${
                      applied.categories.includes(cat.value) ? ' active' : ''
                    }`}
                    onClick={() => {
                      const next = {
                        ...filters,
                        categories: [cat.value],
                      };
                      setFilters(next);
                      setApplied(next);
                      setPage(1);
                    }}
                  >
                    <div className="stat-label">{cat.label}</div>
                    <div className="category-volume-value">{formatMoney(volume)}</div>
                    <div className="window-card-meta">
                      {formatNumber(row?.transactions || 0)} txn · {share.toFixed(1)}%
                      {row?.customers != null
                        ? ` · ${formatNumber(row.customers)} customers`
                        : ''}
                    </div>
                    <div className="category-bar">
                      <span style={{ width: `${Math.min(100, share)}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="grid-2">
            <section className="panel">
              <h2>Volume & transactions over time</h2>
              <div className="chart-box">
                {data.trend?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.trend}>
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
                      <Line
                        type="monotone"
                        dataKey="volume"
                        stroke={SMIPAY_COLORS.orange}
                        strokeWidth={2.25}
                        dot={{ r: 3, fill: SMIPAY_COLORS.orange }}
                        name="Volume"
                      />
                      <Line
                        type="monotone"
                        dataKey="transactions"
                        stroke={SMIPAY_COLORS.green}
                        strokeWidth={2}
                        name="Transactions"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="empty">No trend data for this filter set.</p>
                )}
              </div>
            </section>

            <section className="panel">
              <h2>Category breakdown</h2>
              <div className="chart-box">
                {categoryChart.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChart}>
                      <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                      <XAxis
                        dataKey="category"
                        tickFormatter={categoryLabel}
                        stroke="#6e6e73"
                        fontSize={11}
                      />
                      <YAxis
                        stroke="#6e6e73"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v) => formatMoney(v)}
                        labelFormatter={categoryLabel}
                      />
                      <Bar
                        dataKey="volume"
                        fill={SMIPAY_COLORS.orange}
                        radius={[6, 6, 0, 0]}
                        name="Volume"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="empty">No category volume in this window.</p>
                )}
              </div>
            </section>
          </div>

          {data.byChannel?.length > 0 && (
            <section className="panel">
              <h2>Volume by channel</h2>
              <div className="stats">
                {data.byChannel.map((row) => (
                  <div className="stat" key={row.channel}>
                    <div className="stat-label">{row.channel}</div>
                    <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                      {formatMoney(row.volume)}
                    </div>
                    <div className="window-card-meta">
                      {formatNumber(row.transactions)} txn ·{' '}
                      {formatNumber(row.customers || 0)} customers
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.byNetwork?.length > 0 && (
            <section className="panel">
              <h2>Volume by network</h2>
              <div className="stats">
                {data.byNetwork.map((row) => (
                  <div className="stat" key={row.network}>
                    <div className="stat-label">{networkLabel(row.network)}</div>
                    <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                      {formatMoney(row.volume)}
                    </div>
                    <div className="window-card-meta">
                      {formatNumber(row.transactions)} txn ·{' '}
                      {formatNumber(row.customers || 0)} customers
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.byDataPlan?.length > 0 && (
            <section className="panel">
              <h2>Volume by data plan</h2>
              <div className="stats">
                {data.byDataPlan.map((row) => (
                  <div className="stat" key={row.plan}>
                    <div className="stat-label">{row.plan}</div>
                    <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                      {formatMoney(row.volume)}
                    </div>
                    <div className="window-card-meta">
                      {formatNumber(row.transactions)} txn ·{' '}
                      {formatNumber(row.customers || 0)} customers
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="panel">
            <div className="panel-head">
              <h2>
                Records ({formatNumber(pagination?.total || 0)})
                {loading ? ' · updating…' : ''}
              </h2>
              <p className="muted-note">
                Showing page {pagination?.page || 1} of {pagination?.pages || 1}
              </p>
            </div>

            {!data.records?.length ? (
              <p className="empty">
                No records match these filters.{' '}
                {filtersActive && (
                  <button type="button" className="link-btn" onClick={resetFilters}>
                    Reset filters
                  </button>
                )}
              </p>
            ) : (
              <>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Transaction time</th>
                        <th>Logged at</th>
                        <th>Customer</th>
                        <th>Category</th>
                        <th>Network</th>
                        <th>Plan</th>
                        <th>Status</th>
                        <th>Channel</th>
                        <th>Amount</th>
                        <th>Logged by</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.records.map((r) => (
                        <tr key={r._id}>
                          <td>{formatDateTime(r.date) || '—'}</td>
                          <td>{formatDateTime(r.createdAt) || '—'}</td>
                          <td>{r.customerName || r.customer?.name || '—'}</td>
                          <td>{categoryLabel(r.category)}</td>
                          <td>
                            {r.network ? networkLabel(r.network) : '—'}
                          </td>
                          <td>
                            {r.category === 'data' ? formatDataPlan(r) : '—'}
                          </td>
                          <td>
                            <span
                              className={`badge badge-status badge-${r.status || 'successful'}`}
                            >
                              {statusLabel(r.status || 'successful')}
                            </span>
                          </td>
                          <td>{r.channel || '—'}</td>
                          <td>{formatMoney(r.totalAmount)}</td>
                          <td>{r.createdBy?.name || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="pager">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={!pagination || pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="muted-note">
                    Page {pagination?.page || 1} / {pagination?.pages || 1}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={
                      !pagination || pagination.page >= pagination.pages
                    }
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminTransactions;
