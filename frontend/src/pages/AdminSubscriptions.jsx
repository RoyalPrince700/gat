import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import {
  SUBSCRIPTION_STATUSES,
  statusLabel,
  yesNoLabel,
} from '../constants/smeh';
import { adminCompanyPath } from '../constants/themes';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney, formatNumber } from '../utils/format';

const AdminSubscriptions = () => {
  const { activeCompany } = useCompany();
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState('all');
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
      const { data } = await api.get('/smeh', { params });
      setRecords(data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug === 'smart-edu-hub') load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, status]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) =>
      String(r.schoolName || '')
        .toLowerCase()
        .includes(q)
    );
  }, [records, search]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        acc.count += 1;
        acc.amount += r.amount || 0;
        if (r.subscriptionStatus === 'active') acc.active += 1;
        else acc.inactive += 1;
        return acc;
      },
      { count: 0, amount: 0, active: 0, inactive: 0 }
    );
  }, [filtered]);

  const downloadReport = async () => {
    const token = localStorage.getItem('gat_token');
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const res = await fetch(`${base}/reports/smart-edu-hub`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setError('Download failed');
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smart-edu-hub-growth-report.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!activeCompany || slug !== 'smart-edu-hub') {
    return (
      <div className="page">
        <p className="empty">Subscriptions are available for Smart Edu Hub.</p>
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
          <h1>SMEH subscriptions</h1>
          <p>LMS subscription packages, periods, and onboarding flags.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={downloadReport}>
          Download CSV
        </button>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Shown</div>
          <div className="stat-value">{formatNumber(totals.count)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Active</div>
          <div className="stat-value">{formatNumber(totals.active)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Inactive</div>
          <div className="stat-value">{formatNumber(totals.inactive)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Amount</div>
          <div className="stat-value">{formatMoney(totals.amount)}</div>
        </div>
      </div>

      <section className="panel">
        <div className="form-grid" style={{ marginBottom: '1rem' }}>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              {SUBSCRIPTION_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="full">
            Search school
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="School name"
            />
          </label>
        </div>

        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="empty">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="empty">No subscriptions match.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>School</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Started</th>
                  <th>Ends</th>
                  <th>Student</th>
                  <th>Teacher</th>
                  <th>Parent</th>
                  <th>Platform</th>
                  <th>Logged</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r._id}>
                    <td>{r.schoolName}</td>
                    <td>
                      <span
                        className={`badge badge-status badge-${r.subscriptionStatus}`}
                      >
                        {statusLabel(r.subscriptionStatus)}
                      </span>
                    </td>
                    <td>{formatMoney(r.amount)}</td>
                    <td>{formatDate(r.startedAt)}</td>
                    <td>{formatDate(r.endsAt)}</td>
                    <td>{yesNoLabel(r.studentOnboarded)}</td>
                    <td>{yesNoLabel(r.teacherOnboarded)}</td>
                    <td>{yesNoLabel(r.parentOnboarded)}</td>
                    <td>{yesNoLabel(r.platformInUse)}</td>
                    <td>{formatDate(r.date)}</td>
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

export default AdminSubscriptions;
