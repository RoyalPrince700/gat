import { useEffect, useState } from 'react';
import api from '../api/client';
import {
  ACQUISITION_SOURCES,
  OXYGEN_SLUG,
  acquisitionSourceLabel,
} from '../constants/oxygen';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney, formatNumber } from '../utils/format';

const empty = {
  name: '',
  industry: '',
  contactName: '',
  phone: '',
  email: '',
  firstContactAt: new Date().toISOString().slice(0, 10),
  acquisitionSource: '',
  notes: '',
};

const UserAdvertisers = () => {
  const { activeCompany } = useCompany();
  const [advertisers, setAdvertisers] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/oxygen/advertisers');
      setAdvertisers(data?.advertisers || data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load advertisers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCompany?.slug === OXYGEN_SLUG) load();
  }, [activeCompany?.slug]);

  if (activeCompany?.slug !== OXYGEN_SLUG) {
    return (
      <div className="page">
        <p className="empty">
          Advertisers CRM is available for Oxygen FM only.
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
        await api.put(`/oxygen/advertisers/${editingId}`, form);
      } else {
        await api.post('/oxygen/advertisers', form);
      }
      reset();
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    }
  };

  const onEdit = (a) => {
    setEditingId(a._id);
    setForm({
      name: a.name,
      industry: a.industry || '',
      contactName: a.contactName || '',
      phone: a.phone || '',
      email: a.email || '',
      firstContactAt: a.firstContactAt
        ? formatDate(a.firstContactAt)
        : empty.firstContactAt,
      acquisitionSource: a.acquisitionSource || '',
      notes: a.notes || '',
    });
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this advertiser and its bookings?')) return;
    await api.delete(`/oxygen/advertisers/${id}`);
    load();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Advertisers</h1>
          <p>
            Brands and agencies that buy airtime on Oxygen FM. Add an advertiser
            here, then log bookings from Bookings.
          </p>
        </div>
      </div>

      <div className="page-stack">
        <section className="panel">
          <h2>{editingId ? 'Edit advertiser' : 'Add advertiser'}</h2>
          <form className="form-grid" onSubmit={onSubmit}>
            <label className="full">
              Brand / company name
              <input name="name" value={form.name} onChange={onChange} required />
            </label>
            <label>
              Industry
              <input
                name="industry"
                value={form.industry}
                onChange={onChange}
                placeholder="e.g. FMCG, finance"
              />
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
                {editingId ? 'Update' : 'Save advertiser'}
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
          <h2>Advertiser list</h2>
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
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {advertisers.map((a) => (
                    <tr key={a._id}>
                      <td>{a.name}</td>
                      <td>{a.industry || '—'}</td>
                      <td>{acquisitionSourceLabel(a.acquisitionSource)}</td>
                      <td>{formatNumber(a.bookingCount || 0)}</td>
                      <td>{formatMoney(a.contractValue)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => onEdit(a)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => onDelete(a._id)}
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
          {!loading && advertisers.length > 0 && (
            <p className="hint" style={{ border: 'none', marginTop: '0.75rem' }}>
              {formatNumber(advertisers.length)} advertisers tracked
            </p>
          )}
        </section>
      </div>
    </div>
  );
};

export default UserAdvertisers;
