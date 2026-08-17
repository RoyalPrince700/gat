import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import {
  ACCESSIBLE_CATEGORIES,
  ACCESSIBLE_SLUG,
} from '../constants/accessible';
import { adminCompanyPath } from '../constants/themes';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney, formatNumber } from '../utils/format';

const today = () => new Date().toISOString().slice(0, 10);

const defaultRange = () => {
  const to = today();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 90);
  return { from: formatDate(fromDate), to };
};

const AdminAccessibleDailyTotals = () => {
  const { activeCompany } = useCompany();
  const [records, setRecords] = useState([]);
  const [range, setRange] = useState(defaultRange);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const slug = activeCompany?.slug;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/accessible/daily-totals', {
        params: range,
      });
      setRecords(data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load daily totals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug === ACCESSIBLE_SLUG) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, range.from, range.to]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        formatDate(r.date).includes(q) ||
        String(r.notes || '')
          .toLowerCase()
          .includes(q) ||
        String(r.createdBy?.name || '')
          .toLowerCase()
          .includes(q)
    );
  }, [records, search]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        acc.count += 1;
        acc.credit += r.totalCredit || 0;
        acc.debit += r.totalDebit || 0;
        return acc;
      },
      { count: 0, credit: 0, debit: 0 }
    );
  }, [filtered]);

  if (!activeCompany || slug !== ACCESSIBLE_SLUG) {
    return (
      <div className="page">
        <p className="empty">
          Daily totals are available for Accessible Publishers.
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to={adminCompanyPath(slug, 'overview')} className="back-to-hub">
        ← Overview
      </Link>
      <div className="page-header">
        <div>
          <h1>Daily totals</h1>
          <p>
            All company-wide daily summaries. One row per calendar day — credit,
            debit, and format breakdowns.
          </p>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Days shown</div>
          <div className="stat-value">{formatNumber(totals.count)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total credit</div>
          <div className="stat-value">{formatMoney(totals.credit)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total debit</div>
          <div className="stat-value">{formatMoney(totals.debit)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Net</div>
          <div className="stat-value">
            {formatMoney(totals.credit - totals.debit)}
          </div>
        </div>
      </div>

      <section className="panel">
        <div className="form-grid" style={{ marginBottom: '1rem' }}>
          <label>
            From
            <input
              type="date"
              value={range.from}
              onChange={(e) =>
                setRange((prev) => ({ ...prev, from: e.target.value }))
              }
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={range.to}
              onChange={(e) =>
                setRange((prev) => ({ ...prev, to: e.target.value }))
              }
            />
          </label>
          <label>
            Search
            <input
              type="search"
              placeholder="Date, notes, logged by…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="empty">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="empty">No daily totals in this range.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Credit</th>
                  <th>Debit</th>
                  <th>Net</th>
                  {ACCESSIBLE_CATEGORIES.map(({ value, label }) => (
                    <th key={value}>{label}</th>
                  ))}
                  <th>Logged by</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row._id}>
                    <td>{formatDate(row.date)}</td>
                    <td>{formatMoney(row.totalCredit)}</td>
                    <td>{formatMoney(row.totalDebit || 0)}</td>
                    <td>
                      {formatMoney(
                        row.netTotal ??
                          (row.totalCredit || 0) - (row.totalDebit || 0)
                      )}
                    </td>
                    {ACCESSIBLE_CATEGORIES.map(({ value }) => (
                      <td key={value}>
                        {formatMoney(row.categories?.[value]?.volume || 0)}
                      </td>
                    ))}
                    <td>{row.createdBy?.name || '—'}</td>
                    <td>{row.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminAccessibleDailyTotals;
