import { useEffect, useState } from 'react';
import api from '../api/client';
import {
  ACQUISITION_SOURCES,
  CUSTOMER_TYPES,
  TRIFONE_SLUG,
  acquisitionSourceLabel,
  customerTypeLabel,
} from '../constants/trifone';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney, formatNumber } from '../utils/format';

const empty = {
  name: '',
  customerType: 'retailer',
  contactName: '',
  phone: '',
  email: '',
  city: '',
  geoState: '',
  firstContactAt: new Date().toISOString().slice(0, 10),
  acquisitionSource: '',
  notes: '',
};

const UserTrifoneCustomers = () => {
  const { activeCompany } = useCompany();
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/trifone/customers');
      setCustomers(data?.customers || data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCompany?.slug === TRIFONE_SLUG) load();
  }, [activeCompany?.slug]);

  if (activeCompany?.slug !== TRIFONE_SLUG) {
    return (
      <div className="page">
        <p className="empty">Customers CRM is available for Trifone only.</p>
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
        await api.put(`/trifone/customers/${editingId}`, form);
      } else {
        await api.post('/trifone/customers', form);
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
      customerType: c.customerType || 'other',
      contactName: c.contactName || '',
      phone: c.phone || '',
      email: c.email || '',
      city: c.city || '',
      geoState: c.geoState || '',
      firstContactAt: c.firstContactAt
        ? formatDate(c.firstContactAt)
        : empty.firstContactAt,
      acquisitionSource: c.acquisitionSource || '',
      notes: c.notes || '',
    });
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this customer and their sales?')) return;
    await api.delete(`/trifone/customers/${id}`);
    load();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p>
            Distributors, retailers, schools, and corporate accounts for Trifone
            product sales.
          </p>
        </div>
      </div>

      <div className="page-stack">
        <section className="panel">
          <h2>{editingId ? 'Edit customer' : 'Add customer'}</h2>
          <form className="form-grid" onSubmit={onSubmit}>
            <label className="full">
              Name
              <input name="name" value={form.name} onChange={onChange} required />
            </label>
            <label>
              Type
              <select
                name="customerType"
                value={form.customerType}
                onChange={onChange}
              >
                {CUSTOMER_TYPES.map((s) => (
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
                    <th>Type</th>
                    <th>Source</th>
                    <th>Sales</th>
                    <th>Revenue</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c._id}>
                      <td>{c.name}</td>
                      <td>{customerTypeLabel(c.customerType)}</td>
                      <td>{acquisitionSourceLabel(c.acquisitionSource)}</td>
                      <td>{formatNumber(c.saleCount || 0)}</td>
                      <td>{formatMoney(c.revenue)}</td>
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
              {formatNumber(customers.length)} customers tracked
            </p>
          )}
        </section>
      </div>
    </div>
  );
};

export default UserTrifoneCustomers;
