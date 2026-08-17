import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import {
  BESTTECH_SLUG,
  PROJECT_STATUSES,
  SERVICE_LINES,
  projectStatusLabel,
  serviceLineLabel,
  serviceTypeLabel,
} from '../constants/besttech';
import { adminCompanyPath } from '../constants/themes';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney, formatNumber } from '../utils/format';

const AdminBesttechProjects = () => {
  const { activeCompany } = useCompany();
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState('all');
  const [serviceLine, setServiceLine] = useState('all');
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
      if (serviceLine !== 'all') params.serviceLine = serviceLine;
      const { data } = await api.get('/besttech', { params });
      setRecords(data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug === BESTTECH_SLUG) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, status, serviceLine]);

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
        if (r.status === 'active' || r.status === 'proposal') acc.active += 1;
        if (r.status === 'completed') acc.completed += 1;
        return acc;
      },
      { count: 0, contractValue: 0, amountReceived: 0, active: 0, completed: 0 }
    );
  }, [filtered]);

  if (!activeCompany || slug !== BESTTECH_SLUG) {
    return (
      <div className="page">
        <p className="empty">Projects are available for Best Technology IT.</p>
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
          <h1>Projects</h1>
          <p>
            Software and digital marketing engagements across Best Technology
            IT clients.
          </p>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Shown</div>
          <div className="stat-value">{formatNumber(totals.count)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Active / proposal</div>
          <div className="stat-value">{formatNumber(totals.active)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Completed</div>
          <div className="stat-value">{formatNumber(totals.completed)}</div>
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
              {PROJECT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Service line
            <select
              value={serviceLine}
              onChange={(e) => setServiceLine(e.target.value)}
            >
              <option value="all">All</option>
              {SERVICE_LINES.map((s) => (
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
              placeholder="Client or project title"
            />
          </label>
        </div>

        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="empty">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="empty">No projects match.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Client</th>
                  <th>Service line</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Contract</th>
                  <th>Received</th>
                  <th>Retainer</th>
                  <th>Logged</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r._id}>
                    <td>{r.title}</td>
                    <td>{r.clientName}</td>
                    <td>{serviceLineLabel(r.serviceLine)}</td>
                    <td>{serviceTypeLabel(r.serviceType)}</td>
                    <td>
                      <span
                        className={`badge badge-status badge-${r.status}`}
                      >
                        {projectStatusLabel(r.status)}
                      </span>
                    </td>
                    <td>{formatMoney(r.contractValue)}</td>
                    <td>{formatMoney(r.amountReceived)}</td>
                    <td>{r.isRetainer ? 'Yes' : 'No'}</td>
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

export default AdminBesttechProjects;
