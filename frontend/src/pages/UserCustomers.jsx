import { useEffect, useState } from 'react';
import api from '../api/client';
import {
  ACQUISITION_SOURCES,
  GEO_STATES,
  acquisitionLabel,
} from '../constants/smipay';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney, formatNumber } from '../utils/format';

const empty = {
  name: '',
  phone: '',
  email: '',
  joinedAt: new Date().toISOString().slice(0, 10),
  acquisitionSource: 'organic',
  geoState: 'Lagos',
  notes: '',
  status: 'active',
};

const UserCustomers = () => {
  const { activeCompany } = useCompany();
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/smipay/customers');
      setCustomers(data?.customers || data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCompany?.slug === 'smipay') load();
  }, [activeCompany?.slug]);

  if (activeCompany?.slug !== 'smipay') {
    return (
      <div className="page">
        <p className="empty">Customer CRM is available for Smipay only.</p>
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
        await api.put(`/smipay/customers/${editingId}`, form);
      } else {
        await api.post('/smipay/customers', form);
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
      phone: c.phone || '',
      email: c.email || '',
      joinedAt: formatDate(c.joinedAt),
      acquisitionSource: c.acquisitionSource || 'organic',
      geoState: c.geoState || 'Unknown',
      notes: c.notes || '',
      status: c.status || 'active',
    });
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this customer and their transactions?')) return;
    await api.delete(`/smipay/customers/${id}`);
    load();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Smipay customers</h1>
          <p>
            Register customers with join date so growth can track first
            transaction and behavior.
          </p>
        </div>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2>{editingId ? 'Edit customer' : 'Add customer'}</h2>
          <form className="form-grid" onSubmit={onSubmit}>
            <label className="full">
              Customer name
              <input name="name" value={form.name} onChange={onChange} required />
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
              Joined date
              <input
                type="date"
                name="joinedAt"
                value={form.joinedAt}
                onChange={onChange}
                required
              />
            </label>
            <label>
              Acquisition source
              <select
                name="acquisitionSource"
                value={form.acquisitionSource}
                onChange={onChange}
              >
                {ACQUISITION_SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              State / region
              <select name="geoState" value={form.geoState} onChange={onChange}>
                {GEO_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select name="status" value={form.status} onChange={onChange}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="churn_risk">Churn risk</option>
              </select>
            </label>
            <label className="full">
              Notes
              <textarea name="notes" rows="2" value={form.notes} onChange={onChange} />
            </label>
            {error && <p className="error full">{error}</p>}
            <div className="full row-actions">
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Update' : 'Save customer'}
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
          <h2>Customer list</h2>
          {loading ? (
            <p className="empty">Loading…</p>
          ) : customers.length === 0 ? (
            <p className="empty">No customers yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Source</th>
                    <th>State</th>
                    <th>Joined</th>
                    <th>First txn</th>
                    <th>Volume</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c._id}>
                      <td>{c.name}</td>
                      <td>{acquisitionLabel(c.acquisitionSource)}</td>
                      <td>{c.geoState || '—'}</td>
                      <td>{formatDate(c.joinedAt)}</td>
                      <td>{c.firstTransactionAt ? formatDate(c.firstTransactionAt) : '—'}</td>
                      <td>{formatMoney(c.totalVolume)}</td>
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
          {!loading && customers.length > 0 && (
            <p className="hint" style={{ border: 'none', marginTop: '0.75rem' }}>
              {formatNumber(customers.length)} customers registered
            </p>
          )}
        </section>
      </div>
    </div>
  );
};

export default UserCustomers;
