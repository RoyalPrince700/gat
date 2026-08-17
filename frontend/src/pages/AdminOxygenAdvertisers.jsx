import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import {
  OXYGEN_SLUG,
  acquisitionSourceLabel,
  bookingStatusLabel,
} from '../constants/oxygen';
import { adminCompanyPath } from '../constants/themes';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney, formatNumber } from '../utils/format';

const AdminOxygenAdvertisers = () => {
  const { activeCompany } = useCompany();
  const [advertisers, setAdvertisers] = useState([]);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);

  const slug = activeCompany?.slug;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/oxygen/advertisers');
      setAdvertisers(data?.advertisers || []);
      setOverview(data?.overview || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load advertisers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug === OXYGEN_SLUG) load();
  }, [slug]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    api
      .get(`/oxygen/advertisers/${selectedId}`)
      .then(({ data }) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  if (!activeCompany || slug !== OXYGEN_SLUG) {
    return (
      <div className="page">
        <p className="empty">Advertisers are available for Oxygen FM.</p>
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
          <h1>Advertisers</h1>
          <p>Radio commercial clients and their airtime pipeline.</p>
        </div>
      </div>

      {overview && (
        <div className="stats">
          <div className="stat">
            <div className="stat-label">Advertisers</div>
            <div className="stat-value">
              {formatNumber(overview.totalAdvertisers)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Bookings</div>
            <div className="stat-value">
              {formatNumber(overview.totalBookings)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Pipeline value</div>
            <div className="stat-value">
              {formatMoney(overview.pipelineValue)}
            </div>
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <div className="page-stack">
        <section className="panel">
          <h2>All advertisers</h2>
          {loading ? (
            <p className="empty">Loading…</p>
          ) : advertisers.length === 0 ? (
            <p className="empty">No advertisers yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Industry</th>
                    <th>Source</th>
                    <th>Bookings</th>
                    <th>Pipeline</th>
                    <th>First contact</th>
                  </tr>
                </thead>
                <tbody>
                  {advertisers.map((a) => (
                    <tr
                      key={a._id}
                      className={selectedId === a._id ? 'row-selected' : ''}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedId(a._id)}
                    >
                      <td>{a.name}</td>
                      <td>{a.industry || '—'}</td>
                      <td>{acquisitionSourceLabel(a.acquisitionSource)}</td>
                      <td>{formatNumber(a.bookingCount || 0)}</td>
                      <td>{formatMoney(a.contractValue)}</td>
                      <td>{formatDate(a.firstContactAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Advertiser detail</h2>
          {!selectedId ? (
            <p className="empty">Select an advertiser to see bookings.</p>
          ) : !detail ? (
            <p className="empty">Loading…</p>
          ) : (
            <>
              <p>
                <strong>{detail.advertiser.name}</strong>
                {detail.advertiser.industry
                  ? ` · ${detail.advertiser.industry}`
                  : ''}
                {detail.advertiser.contactName
                  ? ` · ${detail.advertiser.contactName}`
                  : ''}
              </p>
              {detail.bookings.length === 0 ? (
                <p className="empty">No bookings for this advertiser.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Contract</th>
                        <th>Logged</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.bookings.map((r) => (
                        <tr key={r._id}>
                          <td>{r.title}</td>
                          <td>{bookingStatusLabel(r.status)}</td>
                          <td>{formatMoney(r.contractValue)}</td>
                          <td>{formatDate(r.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminOxygenAdvertisers;
