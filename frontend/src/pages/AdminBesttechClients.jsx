import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import {
  BESTTECH_SLUG,
  acquisitionSourceLabel,
} from '../constants/besttech';
import { adminCompanyPath } from '../constants/themes';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney, formatNumber } from '../utils/format';

const AdminBesttechClients = () => {
  const { activeCompany } = useCompany();
  const [clients, setClients] = useState([]);
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
      const { data } = await api.get('/besttech/clients');
      setClients(data?.clients || []);
      setOverview(data?.overview || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug === BESTTECH_SLUG) load();
  }, [slug]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    api
      .get(`/besttech/clients/${selectedId}`)
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

  if (!activeCompany || slug !== BESTTECH_SLUG) {
    return (
      <div className="page">
        <p className="empty">Clients are available for Best Technology IT.</p>
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
          <h1>Clients</h1>
          <p>Enterprise clients and their engagement pipeline.</p>
        </div>
      </div>

      {overview && (
        <div className="stats">
          <div className="stat">
            <div className="stat-label">Clients</div>
            <div className="stat-value">
              {formatNumber(overview.totalClients)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Projects</div>
            <div className="stat-value">
              {formatNumber(overview.totalProjects)}
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
          <h2>All clients</h2>
          {loading ? (
            <p className="empty">Loading…</p>
          ) : clients.length === 0 ? (
            <p className="empty">No clients yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Industry</th>
                    <th>Source</th>
                    <th>Projects</th>
                    <th>Pipeline</th>
                    <th>First contact</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr
                      key={c._id}
                      className={selectedId === c._id ? 'row-selected' : ''}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedId(c._id)}
                    >
                      <td>{c.name}</td>
                      <td>{c.industry || '—'}</td>
                      <td>{acquisitionSourceLabel(c.acquisitionSource)}</td>
                      <td>{formatNumber(c.projectCount || 0)}</td>
                      <td>{formatMoney(c.contractValue)}</td>
                      <td>{formatDate(c.firstContactAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Client detail</h2>
          {!selectedId ? (
            <p className="empty">Select a client to see projects.</p>
          ) : !detail ? (
            <p className="empty">Loading…</p>
          ) : (
            <>
              <p>
                <strong>{detail.client.name}</strong>
                {detail.client.industry ? ` · ${detail.client.industry}` : ''}
                {detail.client.contactName
                  ? ` · ${detail.client.contactName}`
                  : ''}
              </p>
              {detail.projects.length === 0 ? (
                <p className="empty">No projects for this client.</p>
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
                      {detail.projects.map((r) => (
                        <tr key={r._id}>
                          <td>{r.title}</td>
                          <td>{r.status}</td>
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

export default AdminBesttechClients;
