import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import {
  BOOKING_STATUSES,
  BOOKING_TYPES,
  OXYGEN_SLUG,
  bookingStatusLabel,
  bookingTypeLabel,
  timeBeltLabel,
} from '../constants/oxygen';
import { adminCompanyPath } from '../constants/themes';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney, formatNumber } from '../utils/format';

const AdminOxygenBookings = () => {
  const { activeCompany } = useCompany();
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState('all');
  const [bookingType, setBookingType] = useState('all');
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
      if (bookingType !== 'all') params.bookingType = bookingType;
      const { data } = await api.get('/oxygen', { params });
      setRecords(data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug === OXYGEN_SLUG) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, status, bookingType]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        String(r.advertiserName || '')
          .toLowerCase()
          .includes(q) ||
        String(r.title || '')
          .toLowerCase()
          .includes(q) ||
        String(r.programme || '')
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
        if (r.status === 'booked' || r.status === 'running') acc.active += 1;
        if (r.status === 'completed') acc.completed += 1;
        return acc;
      },
      { count: 0, contractValue: 0, amountReceived: 0, active: 0, completed: 0 }
    );
  }, [filtered]);

  if (!activeCompany || slug !== OXYGEN_SLUG) {
    return (
      <div className="page">
        <p className="empty">Bookings are available for Oxygen FM.</p>
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
          <h1>Bookings</h1>
          <p>
            Airtime campaigns and commercial deals across Oxygen FM
            advertisers.
          </p>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Shown</div>
          <div className="stat-value">{formatNumber(totals.count)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Booked / running</div>
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
              {BOOKING_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Booking type
            <select
              value={bookingType}
              onChange={(e) => setBookingType(e.target.value)}
            >
              <option value="all">All</option>
              {BOOKING_TYPES.map((s) => (
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
              placeholder="Advertiser, title, or programme"
            />
          </label>
        </div>

        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="empty">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="empty">No bookings match.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Advertiser</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Programme</th>
                  <th>Belt</th>
                  <th>Contract</th>
                  <th>Received</th>
                  <th>Logged</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r._id}>
                    <td>{r.title}</td>
                    <td>{r.advertiserName}</td>
                    <td>{bookingTypeLabel(r.bookingType)}</td>
                    <td>
                      <span className={`badge badge-status badge-${r.status}`}>
                        {bookingStatusLabel(r.status)}
                      </span>
                    </td>
                    <td>{r.programme || '—'}</td>
                    <td>{timeBeltLabel(r.timeBelt)}</td>
                    <td>{formatMoney(r.contractValue)}</td>
                    <td>{formatMoney(r.amountReceived)}</td>
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

export default AdminOxygenBookings;
