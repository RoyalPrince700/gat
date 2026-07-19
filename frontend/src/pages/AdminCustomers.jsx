import { useEffect, useMemo, useState } from 'react';
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
import { categoryLabel, SMIPAY_COLORS } from '../constants/smipay';
import { useCompany } from '../context/CompanyContext';
import {
  formatDate,
  formatDateTime,
  formatDaysAgo,
  formatDelayAfter,
  formatMoney,
  formatNumber,
} from '../utils/format';

const behaviorLabel = {
  registered_no_txn: 'Joined · no txn yet',
  new: 'New',
  early: 'Early adopter',
  active: 'Active',
  power_user: 'Power user',
  dormant: 'Dormant (30d+)',
};

const emptyFilters = {
  search: '',
  behavior: 'all',
  status: 'all',
  hasTxn: 'all',
  volumeMin: '',
  volumeMax: '',
  txnMin: '',
  txnMax: '',
  joinedFrom: '',
  joinedTo: '',
  firstTxnFrom: '',
  firstTxnTo: '',
  lastTxnFrom: '',
  lastTxnTo: '',
  sortBy: 'volume_desc',
};

const startOfDay = (value) => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (value) => {
  const d = new Date(value);
  d.setHours(23, 59, 59, 999);
  return d;
};

const inDateRange = (value, from, to) => {
  if (!from && !to) return true;
  if (!value) return false;
  const date = new Date(value);
  if (from && date < startOfDay(from)) return false;
  if (to && date > endOfDay(to)) return false;
  return true;
};

const firstTxnLabel = (summary, customer) => {
  const hasFirst = summary.firstTransactionAt || customer.firstTransactionAt;
  if (!hasFirst) return 'Not yet';
  const delay = formatDelayAfter(summary.daysToFirstTxn);
  return delay === 'same day' ? 'same day as signup' : `${delay} signup`;
};

const secondTxnLabel = (summary, customer) => {
  const hasFirst = summary.firstTransactionAt || customer.firstTransactionAt;
  if (!summary.hasSecondTxn) return hasFirst ? 'Not yet' : '—';
  const delay = formatDelayAfter(summary.daysToSecondTxn);
  return delay === 'same day' ? 'same day as first' : `${delay} first`;
};

const AdminCustomers = () => {
  const { activeCompany } = useCompany();
  const [customers, setCustomers] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const showSmipay = activeCompany?.slug === 'smipay';

  useEffect(() => {
    if (!showSmipay) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/smipay/customers');
        if (cancelled) return;
        const list = data?.customers || data || [];
        setCustomers(list);
        if (list[0]) {
          setSelectedId((prev) => prev || list[0]._id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Failed to load customers');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [showSmipay]);

  const filteredCustomers = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const volumeMin = filters.volumeMin === '' ? null : Number(filters.volumeMin);
    const volumeMax = filters.volumeMax === '' ? null : Number(filters.volumeMax);
    const txnMin = filters.txnMin === '' ? null : Number(filters.txnMin);
    const txnMax = filters.txnMax === '' ? null : Number(filters.txnMax);

    let list = customers.filter((c) => {
      if (q && !c.name?.toLowerCase().includes(q)) return false;
      if (filters.behavior !== 'all' && c.behavior !== filters.behavior) return false;
      if (filters.status !== 'all' && c.status !== filters.status) return false;
      if (filters.hasTxn === 'yes' && !(c.totalTransactions > 0)) return false;
      if (filters.hasTxn === 'no' && c.totalTransactions > 0) return false;
      if (volumeMin != null && !Number.isNaN(volumeMin) && c.totalVolume < volumeMin) {
        return false;
      }
      if (volumeMax != null && !Number.isNaN(volumeMax) && c.totalVolume > volumeMax) {
        return false;
      }
      if (txnMin != null && !Number.isNaN(txnMin) && c.totalTransactions < txnMin) {
        return false;
      }
      if (txnMax != null && !Number.isNaN(txnMax) && c.totalTransactions > txnMax) {
        return false;
      }
      if (!inDateRange(c.joinedAt, filters.joinedFrom, filters.joinedTo)) return false;
      if (
        !inDateRange(
          c.firstTransactionAt,
          filters.firstTxnFrom,
          filters.firstTxnTo
        )
      ) {
        return false;
      }
      if (
        !inDateRange(c.lastTransactionAt, filters.lastTxnFrom, filters.lastTxnTo)
      ) {
        return false;
      }
      return true;
    });

    const sorters = {
      name_asc: (a, b) => a.name.localeCompare(b.name),
      name_desc: (a, b) => b.name.localeCompare(a.name),
      volume_desc: (a, b) => b.totalVolume - a.totalVolume,
      volume_asc: (a, b) => a.totalVolume - b.totalVolume,
      txn_desc: (a, b) => b.totalTransactions - a.totalTransactions,
      txn_asc: (a, b) => a.totalTransactions - b.totalTransactions,
      joined_desc: (a, b) => new Date(b.joinedAt) - new Date(a.joinedAt),
      joined_asc: (a, b) => new Date(a.joinedAt) - new Date(b.joinedAt),
      last_txn_desc: (a, b) =>
        new Date(b.lastTransactionAt || 0) - new Date(a.lastTransactionAt || 0),
      last_txn_asc: (a, b) =>
        new Date(a.lastTransactionAt || 0) - new Date(b.lastTransactionAt || 0),
    };

    list = [...list].sort(sorters[filters.sortBy] || sorters.volume_desc);
    return list;
  }, [customers, filters]);

  const overview = useMemo(() => {
    const base = {
      totalCustomers: filteredCustomers.length,
      totalVolume: 0,
      totalTransactions: 0,
      noTxn: 0,
      dormant: 0,
      powerUsers: 0,
      active: 0,
      early: 0,
    };

    filteredCustomers.forEach((c) => {
      base.totalVolume += c.totalVolume || 0;
      base.totalTransactions += c.totalTransactions || 0;
      if (!(c.totalTransactions > 0)) base.noTxn += 1;
      if (c.behavior === 'dormant') base.dormant += 1;
      if (c.behavior === 'power_user') base.powerUsers += 1;
      if (c.behavior === 'active') base.active += 1;
      if (c.behavior === 'early') base.early += 1;
    });

    base.averageVolume = base.totalCustomers
      ? base.totalVolume / base.totalCustomers
      : 0;
    base.averageTicket = base.totalTransactions
      ? base.totalVolume / base.totalTransactions
      : 0;

    return base;
  }, [filteredCustomers]);

  useEffect(() => {
    if (!filteredCustomers.length) {
      setSelectedId('');
      return;
    }
    if (!filteredCustomers.some((c) => c._id === selectedId)) {
      setSelectedId(filteredCustomers[0]._id);
    }
  }, [filteredCustomers, selectedId]);

  useEffect(() => {
    if (!selectedId || !showSmipay) {
      setAnalysis(null);
      return;
    }

    let cancelled = false;
    api
      .get(`/smipay/customers/${selectedId}`)
      .then((res) => {
        if (!cancelled) setAnalysis(res.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Failed to load analysis');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, showSmipay]);

  const onFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => setFilters(emptyFilters);

  const filtersActive = useMemo(
    () =>
      Object.entries(filters).some(([key, value]) => {
        if (key === 'sortBy') return value !== emptyFilters.sortBy;
        return value !== emptyFilters[key];
      }),
    [filters]
  );

  if (!showSmipay) {
    return (
      <div className="page">
        <p className="empty">
          Customer intelligence is for Smipay. Select Smipay or All in the top bar.
        </p>
      </div>
    );
  }

  return (
    <div className="page page-wide">
      <div className="page-header">
        <div>
          <h1>Smipay customers</h1>
          <p>
            Track each customer’s join date, first transaction, category mix, and
            growth behavior.
          </p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="empty">Loading customers…</p>
      ) : (
        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <h2>Filters</h2>
              {filtersActive && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={resetFilters}
                >
                  Reset filters
                </button>
              )}
            </div>
            <div className="filters filter-grid">
              <label>
                Search name
                <input
                  name="search"
                  value={filters.search}
                  onChange={onFilterChange}
                  placeholder="Customer name"
                />
              </label>
              <label>
                Behavior
                <select
                  name="behavior"
                  value={filters.behavior}
                  onChange={onFilterChange}
                >
                  <option value="all">All behaviors</option>
                  {Object.entries(behaviorLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
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
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="churn_risk">Churn risk</option>
                </select>
              </label>
              <label>
                Has transactions
                <select
                  name="hasTxn"
                  value={filters.hasTxn}
                  onChange={onFilterChange}
                >
                  <option value="all">Any</option>
                  <option value="yes">With transactions</option>
                  <option value="no">No transactions yet</option>
                </select>
              </label>
              <label>
                Min volume
                <input
                  name="volumeMin"
                  type="number"
                  min="0"
                  value={filters.volumeMin}
                  onChange={onFilterChange}
                  placeholder="0"
                />
              </label>
              <label>
                Max volume
                <input
                  name="volumeMax"
                  type="number"
                  min="0"
                  value={filters.volumeMax}
                  onChange={onFilterChange}
                  placeholder="Any"
                />
              </label>
              <label>
                Min transactions
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
                Max transactions
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
                Joined from
                <input
                  name="joinedFrom"
                  type="date"
                  value={filters.joinedFrom}
                  onChange={onFilterChange}
                />
              </label>
              <label>
                Joined to
                <input
                  name="joinedTo"
                  type="date"
                  value={filters.joinedTo}
                  onChange={onFilterChange}
                />
              </label>
              <label>
                First txn from
                <input
                  name="firstTxnFrom"
                  type="date"
                  value={filters.firstTxnFrom}
                  onChange={onFilterChange}
                />
              </label>
              <label>
                First txn to
                <input
                  name="firstTxnTo"
                  type="date"
                  value={filters.firstTxnTo}
                  onChange={onFilterChange}
                />
              </label>
              <label>
                Last txn from
                <input
                  name="lastTxnFrom"
                  type="date"
                  value={filters.lastTxnFrom}
                  onChange={onFilterChange}
                />
              </label>
              <label>
                Last txn to
                <input
                  name="lastTxnTo"
                  type="date"
                  value={filters.lastTxnTo}
                  onChange={onFilterChange}
                />
              </label>
              <label>
                Sort by
                <select
                  name="sortBy"
                  value={filters.sortBy}
                  onChange={onFilterChange}
                >
                  <option value="volume_desc">Volume (high → low)</option>
                  <option value="volume_asc">Volume (low → high)</option>
                  <option value="txn_desc">Transactions (high → low)</option>
                  <option value="txn_asc">Transactions (low → high)</option>
                  <option value="joined_desc">Joined (newest)</option>
                  <option value="joined_asc">Joined (oldest)</option>
                  <option value="last_txn_desc">Last txn (newest)</option>
                  <option value="last_txn_asc">Last txn (oldest)</option>
                  <option value="name_asc">Name (A → Z)</option>
                  <option value="name_desc">Name (Z → A)</option>
                </select>
              </label>
            </div>
            <p className="empty" style={{ paddingTop: '0.25rem' }}>
              Showing {formatNumber(filteredCustomers.length)} of{' '}
              {formatNumber(customers.length)} customers
              {filtersActive ? ' (filters applied)' : ''}
            </p>
          </section>

          <div className="stats">
            <div className="stat">
              <div className="stat-label">Customers</div>
              <div className="stat-value">
                {formatNumber(overview.totalCustomers)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Total volume</div>
              <div className="stat-value">
                {formatMoney(overview.totalVolume)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Transactions</div>
              <div className="stat-value">
                {formatNumber(overview.totalTransactions)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Avg volume / customer</div>
              <div className="stat-value">
                {formatMoney(overview.averageVolume)}
              </div>
            </div>
          </div>

          <div className="stats">
            <div className="stat">
              <div className="stat-label">Active</div>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>
                {formatNumber(overview.active)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Power users</div>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>
                {formatNumber(overview.powerUsers)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Dormant (30d+)</div>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>
                {formatNumber(overview.dormant)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">No transactions yet</div>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>
                {formatNumber(overview.noTxn)}
              </div>
            </div>
          </div>

          <div className="customers-layout">
            <section className="panel">
              <h2>Customers ({filteredCustomers.length})</h2>
              {filteredCustomers.length === 0 ? (
                <p className="empty">
                  No customers match these filters.{' '}
                  {filtersActive && (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={resetFilters}
                    >
                      Reset filters
                    </button>
                  )}
                </p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Behavior</th>
                        <th>Joined</th>
                        <th>Last txn</th>
                        <th>Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((c) => (
                        <tr
                          key={c._id}
                          className={selectedId === c._id ? 'row-selected' : ''}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedId(c._id)}
                        >
                          <td>{c.name}</td>
                          <td>
                            <span className="badge">
                              {behaviorLabel[c.behavior] || c.behavior}
                            </span>
                          </td>
                          <td>{formatDate(c.joinedAt)}</td>
                          <td>
                            {c.lastTransactionAt
                              ? formatDate(c.lastTransactionAt)
                              : '—'}
                          </td>
                          <td>{formatMoney(c.totalVolume)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="panel">
              <h2>Customer behavior</h2>
              {!analysis ? (
                <p className="empty">Select a customer to inspect behavior.</p>
              ) : (
                <div className="stack">
                  <div>
                    <strong style={{ fontSize: '1.15rem' }}>
                      {analysis.customer.name}
                    </strong>
                    <div style={{ marginTop: '0.45rem' }}>
                      <span className="badge">
                        {behaviorLabel[analysis.summary.behavior] ||
                          analysis.summary.behavior}
                      </span>
                    </div>
                  </div>

                  <div className="stats" style={{ marginBottom: 0 }}>
                    <div className="stat">
                      <div className="stat-label">Joined</div>
                      <div className="stat-value" style={{ fontSize: '1rem' }}>
                        {formatDate(analysis.customer.joinedAt)}
                      </div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">First transaction</div>
                      <div className="stat-value" style={{ fontSize: '1rem' }}>
                        {firstTxnLabel(analysis.summary, analysis.customer)}
                      </div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">Second transaction</div>
                      <div className="stat-value" style={{ fontSize: '1rem' }}>
                        {secondTxnLabel(analysis.summary, analysis.customer)}
                      </div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">Last active</div>
                      <div className="stat-value" style={{ fontSize: '1rem' }}>
                        {analysis.summary.daysSinceLastTxn != null
                          ? formatDaysAgo(analysis.summary.daysSinceLastTxn)
                          : 'Never'}
                      </div>
                    </div>
                  </div>

                  <div className="stats" style={{ marginBottom: 0 }}>
                    <div className="stat">
                      <div className="stat-label">Total volume</div>
                      <div className="stat-value" style={{ fontSize: '1.1rem' }}>
                        {formatMoney(analysis.summary.totalVolume)}
                      </div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">Transactions</div>
                      <div className="stat-value" style={{ fontSize: '1.1rem' }}>
                        {formatNumber(analysis.summary.totalTransactions)}
                      </div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">Avg ticket</div>
                      <div className="stat-value" style={{ fontSize: '1.1rem' }}>
                        {formatMoney(analysis.summary.averageTicket)}
                      </div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">Records</div>
                      <div className="stat-value" style={{ fontSize: '1.1rem' }}>
                        {formatNumber(analysis.summary.recordCount)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>
                      Transaction mix
                    </h3>
                    <div className="chart-box" style={{ height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analysis.byCategory}>
                          <CartesianGrid
                            stroke="rgba(0,0,0,0.06)"
                            vertical={false}
                          />
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
                            fill={SMIPAY_COLORS.orange}
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>
                      Transaction timeline
                    </h3>
                    {analysis.timeline.length === 0 ? (
                      <p className="empty">No transactions yet.</p>
                    ) : (
                      <ul className="activity-list">
                        {analysis.timeline.map((t) => (
                          <li key={t._id}>
                            <span>
                              {formatDateTime(t.date)} · {categoryLabel(t.category)}
                            </span>
                            <span>{formatMoney(t.totalAmount)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;
