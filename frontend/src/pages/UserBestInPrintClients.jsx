import { useEffect, useState } from 'react';
import api from '../api/client';
import {
  ACQUISITION_SOURCES,
  CLIENT_TYPES,
  acquisitionSourceLabel,
  clientTypeLabel,
  BEST_IN_PRINT_SLUG,
} from '../constants/bestinprint';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney, formatNumber } from '../utils/format';

const empty = {
  name: '',
  clientType: '',
  contactName: '',
  phone: '',
  email: '',
  geoState: '',
  city: '',
  firstContactAt: new Date().toISOString().slice(0, 10),
  acquisitionSource: '',
  notes: '',
};

const UserBestInPrintClients = () => {
  const { activeCompany } = useCompany();
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/bestinprint/clients');
      setClients(data?.clients || data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCompany?.slug === BEST_IN_PRINT_SLUG) load();
  }, [activeCompany?.slug]);

  if (activeCompany?.slug !== BEST_IN_PRINT_SLUG) {
    return (
      <div className="page">
        <p className="empty">
          Print clients CRM is available for Best In Print only.
        </p>
      </div>
    );
  }

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const reset = () => {
    setForm(empty);
    setEditingId(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/bestinprint/clients/${editingId}`, form);
      } else {
        await api.post('/bestinprint/clients', form);
      }
      reset();
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    }
  };

  const onEdit = (c) => {
    setEditingId(c._id);
    setForm({
      name: c.name,
      clientType: c.clientType || '',
      contactName: c.contactName || '',
      phone: c.phone || '',
      email: c.email || '',
      geoState: c.geoState || '',
      city: c.city || '',
      firstContactAt: c.firstContactAt
        ? formatDate(c.firstContactAt)
        : empty.firstContactAt,
      acquisitionSource: c.acquisitionSource || '',
      notes: c.notes || '',
    });
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this client and its print jobs?')) return;
    await api.delete(`/bestinprint/clients/${id}`);
    load();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Clients</h1>
          <p>
            Organisations and individuals who order printing. Add a client
            here, then log jobs from Jobs.
          </p>
        </div>
      </div>

      <div className="page-stack">
        <section className="panel">
          <h2>{editingId ? 'Edit client' : 'Add client'}</h2>
          <form className="form-grid" onSubmit={onSubmit}>
            <label className="full">
              Client / organisation
              <input name="name" value={form.name} onChange={onChange} required />
            </label>
            <label>
              Client type
              <select
                name="clientType"
                value={form.clientType}
                onChange={onChange}
              >
                <option value="">—</option>
                {CLIENT_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Contact name
              <input
                name="contactName"
                value={form.contactName}
                onChange={onChange}
              />
            </label>
            <label>
              Phone
              <input name="phone" value={form.phone} onChange={onChange} />
            </label>
            <label>
              Email
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={onChange}
              />
            </label>
            <label>
              State
              <input name="geoState" value={form.geoState} onChange={onChange} />
            </label>
            <label>
              City
              <input name="city" value={form.city} onChange={onChange} />
            </label>
            <label>
              First contact
              <input
                type="date"
                name="firstContactAt"
                value={form.firstContactAt}
                onChange={onChange}
              />
            </label>
            <label>
              Acquisition source
              <select
                name="acquisitionSource"
                value={form.acquisitionSource}
                onChange={onChange}
              >
                <option value="">—</option>
                {ACQUISITION_SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="full">
              Notes
              <textarea
                name="notes"
                rows="2"
                value={form.notes}
                onChange={onChange}
              />
            </label>
            {error && <p className="error full">{error}</p>}
            <div className="full row-actions">
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Update' : 'Save client'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-ghost" onClick={reset}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="panel">
          <h2>Client list</h2>
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
                    <th>Type</th>
                    <th>Source</th>
                    <th>Jobs</th>
                    <th>Pipeline</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c._id}>
                      <td>{c.name}</td>
                      <td>{clientTypeLabel(c.clientType)}</td>
                      <td>{acquisitionSourceLabel(c.acquisitionSource)}</td>
                      <td>{formatNumber(c.jobCount || 0)}</td>
                      <td>{formatMoney(c.contractValue)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => onEdit(c)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => onDelete(c._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && clients.length > 0 && (
            <p className="hint" style={{ border: 'none', marginTop: '0.75rem' }}>
              {formatNumber(clients.length)} clients tracked
            </p>
          )}
        </section>
      </div>
    </div>
  );
};

export default UserBestInPrintClients;
