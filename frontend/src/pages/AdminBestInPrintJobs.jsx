import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import {
  BEST_IN_PRINT_SLUG,
  JOB_STATUSES,
  PRINT_TYPES,
  jobStatusLabel,
  printTypeLabel,
  paperTypeLabel,
  colourModeLabel,
} from '../constants/bestinprint';
import { adminCompanyPath } from '../constants/themes';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney, formatNumber } from '../utils/format';

const AdminBestInPrintJobs = () => {
  const { activeCompany } = useCompany();
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState('all');
  const [printType, setPrintType] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const slug = activeCompany?.slug;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (status !== 'all') params.status = status;
      if (printType !== 'all') params.printType = printType;
      const { data } = await api.get('/bestinprint', { params });
      setRecords(data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load print jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug === BEST_IN_PRINT_SLUG) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, status, printType]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        String(r.clientName || '')
          .toLowerCase()
          .includes(q) ||
        String(r.title || '')
          .toLowerCase()
          .includes(q)
    );
  }, [records, search]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        acc.count += 1;
        acc.contractValue += r.contractValue || 0;
        acc.amountReceived += r.amountReceived || 0;
        if (r.status === 'in_production' || r.status === 'confirmed') {
          acc.inProduction += 1;
        }
        if (r.status === 'delivered') acc.delivered += 1;
        return acc;
      },
      {
        count: 0,
        contractValue: 0,
        amountReceived: 0,
        inProduction: 0,
        delivered: 0,
      }
    );
  }, [filtered]);

  if (!activeCompany || slug !== BEST_IN_PRINT_SLUG) {
    return (
      <div className="page">
        <p className="empty">Print jobs are available for Best In Print.</p>
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
          <h1>Print jobs</h1>
          <p>
            Books, fliers, and other commercial print orders across Best In
            Print clients.
          </p>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Shown</div>
          <div className="stat-value">{formatNumber(totals.count)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">In production / confirmed</div>
          <div className="stat-value">{formatNumber(totals.inProduction)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Delivered</div>
          <div className="stat-value">{formatNumber(totals.delivered)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Contract value</div>
          <div className="stat-value">{formatMoney(totals.contractValue)}</div>
        </div>
      </div>

      <section className="panel">
        <div className="form-grid" style={{ marginBottom: '1rem' }}>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              {JOB_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Print type
            <select
              value={printType}
              onChange={(e) => setPrintType(e.target.value)}
            >
              <option value="all">All</option>
              {PRINT_TYPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="full">
            Search
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Client or job title"
            />
          </label>
        </div>

        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="empty">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="empty">No jobs match.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Client</th>
                  <th>Print type</th>
                  <th>Paper / colour</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Contract</th>
                  <th>Received</th>
                  <th>Due</th>
                  <th>Logged</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r._id}>
                    <td>{r.title}</td>
                    <td>{r.clientName}</td>
                    <td>{printTypeLabel(r.printType)}</td>
                    <td>
                      {[
                        r.paperType ? paperTypeLabel(r.paperType) : null,
                        r.colourMode ? colourModeLabel(r.colourMode) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </td>
                    <td>{formatNumber(r.quantity || 0)}</td>
                    <td>
                      <span className={`badge badge-status badge-${r.status}`}>
                        {jobStatusLabel(r.status)}
                      </span>
                    </td>
                    <td>{formatMoney(r.contractValue)}</td>
                    <td>{formatMoney(r.amountReceived)}</td>
                    <td>{formatDate(r.dueDate)}</td>
                    <td>{formatDate(r.date)}</td>
                    <td>{r.createdBy?.name || '—'}</td>
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

export default AdminBestInPrintJobs;
