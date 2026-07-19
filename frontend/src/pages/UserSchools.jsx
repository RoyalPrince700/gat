import { useEffect, useState } from 'react';
import api from '../api/client';
import { lifecycleLabel } from '../constants/smeh';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney, formatNumber } from '../utils/format';

const empty = {
  name: '',
  phone: '',
  email: '',
  awareAt: new Date().toISOString().slice(0, 10),
  notes: '',
};

const UserSchools = () => {
  const { activeCompany } = useCompany();
  const [schools, setSchools] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/smeh/schools');
      setSchools(data?.schools || data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCompany?.slug === 'smart-edu-hub') load();
  }, [activeCompany?.slug]);

  if (activeCompany?.slug !== 'smart-edu-hub') {
    return (
      <div className="page">
        <p className="empty">Schools CRM is available for Smart Edu Hub only.</p>
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
        await api.put(`/smeh/schools/${editingId}`, form);
      } else {
        await api.post('/smeh/schools', form);
      }
      reset();
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    }
  };

  const onEdit = (s) => {
    setEditingId(s._id);
    setForm({
      name: s.name,
      phone: s.phone || '',
      email: s.email || '',
      awareAt: formatDate(s.awareAt),
      notes: s.notes || '',
    });
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this school and its subscriptions?')) return;
    await api.delete(`/smeh/schools/${id}`);
    load();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>SMEH schools</h1>
          <p>
            Schools aware of the LMS. Add a school here, then log subscriptions
            from Subscriptions.
          </p>
        </div>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2>{editingId ? 'Edit school' : 'Add school'}</h2>
          <form className="form-grid" onSubmit={onSubmit}>
            <label className="full">
              School name
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
              Aware since
              <input
                type="date"
                name="awareAt"
                value={form.awareAt}
                onChange={onChange}
                required
              />
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
                {editingId ? 'Update' : 'Save school'}
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
          <h2>School list</h2>
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
                    <th>Subs</th>
                    <th>Amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((s) => (
                    <tr key={s._id}>
                      <td>{s.name}</td>
                      <td>{lifecycleLabel(s.lifecycle)}</td>
                      <td>{formatDate(s.awareAt)}</td>
                      <td>{formatNumber(s.activeCount || 0)} active</td>
                      <td>{formatMoney(s.totalAmount)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => onEdit(s)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => onDelete(s._id)}
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
          {!loading && schools.length > 0 && (
            <p className="hint" style={{ border: 'none', marginTop: '0.75rem' }}>
              {formatNumber(schools.length)} schools tracked
            </p>
          )}
        </section>
      </div>
    </div>
  );
};

export default UserSchools;
