import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { lifecycleLabel, yesNoLabel } from '../constants/smeh';
import { adminCompanyPath } from '../constants/themes';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney, formatNumber } from '../utils/format';

const AdminSchools = () => {
  const { activeCompany } = useCompany();
  const [schools, setSchools] = useState([]);
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
      const { data } = await api.get('/smeh/schools');
      setSchools(data?.schools || []);
      setOverview(data?.overview || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug === 'smart-edu-hub') load();
  }, [slug]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    api
      .get(`/smeh/schools/${selectedId}`)
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

  if (!activeCompany || slug !== 'smart-edu-hub') {
    return (
      <div className="page">
        <p className="empty">Schools are available for Smart Edu Hub.</p>
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
          <h1>SMEH schools</h1>
          <p>Schools aware of the platform and their subscription lifecycle.</p>
        </div>
      </div>

      {overview && (
        <div className="stats">
          <div className="stat">
            <div className="stat-label">Aware (total)</div>
            <div className="stat-value">
              {formatNumber(overview.totalSchools)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Subscribed</div>
            <div className="stat-value">
              {formatNumber(overview.subscribed)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Aware only</div>
            <div className="stat-value">
              {formatNumber(overview.awareOnly)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Subscription amount</div>
            <div className="stat-value">
              {formatMoney(overview.totalAmount)}
            </div>
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <div className="grid-2">
        <section className="panel">
          <h2>All schools</h2>
          {loading ? (
            <p className="empty">Loading…</p>
          ) : schools.length === 0 ? (
            <p className="empty">No schools yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Lifecycle</th>
                    <th>Aware</th>
                    <th>Active subs</th>
                    <th>Amount</th>
                    <th>Platform</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((s) => (
                    <tr
                      key={s._id}
                      className={selectedId === s._id ? 'row-selected' : ''}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedId(s._id)}
                    >
                      <td>{s.name}</td>
                      <td>{lifecycleLabel(s.lifecycle)}</td>
                      <td>{formatDate(s.awareAt)}</td>
                      <td>{formatNumber(s.activeCount || 0)}</td>
                      <td>{formatMoney(s.totalAmount)}</td>
                      <td>{yesNoLabel(s.platformInUse)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>School detail</h2>
          {!selectedId ? (
            <p className="empty">Select a school to see subscriptions.</p>
          ) : !detail ? (
            <p className="empty">Loading…</p>
          ) : (
            <>
              <p>
                <strong>{detail.school.name}</strong> ·{' '}
                {lifecycleLabel(detail.school.lifecycle)} ·{' '}
                {formatMoney(detail.school.totalAmount)} total
              </p>
              {detail.subscriptions.length === 0 ? (
                <p className="empty">No subscriptions for this school.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Amount</th>
                        <th>Started</th>
                        <th>Ends</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.subscriptions.map((r) => (
                        <tr key={r._id}>
                          <td>{r.subscriptionStatus}</td>
                          <td>{formatMoney(r.amount)}</td>
                          <td>{formatDate(r.startedAt)}</td>
                          <td>{formatDate(r.endsAt)}</td>
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

export default AdminSchools;
