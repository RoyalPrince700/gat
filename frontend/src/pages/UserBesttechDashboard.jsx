import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import api from '../api/client';
import {
  PROJECT_STATUSES,
  SERVICE_LINES,
  SERVICE_TYPES,
  projectStatusLabel,
  serviceLineLabel,
  serviceTypeLabel,
} from '../constants/besttech';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney } from '../utils/format';

const emptyForm = () => ({
  clientMode: 'existing',
  clientId: '',
  clientName: '',
  firstContactAt: new Date().toISOString().slice(0, 10),
  title: '',
  serviceLine: 'software',
  serviceType: 'custom_software',
  status: 'active',
  contractValue: '',
  amountReceived: '',
  startDate: '',
  endDate: '',
  date: new Date().toISOString().slice(0, 10),
  deliverablesNote: '',
  isRetainer: false,
  notes: '',
});

const UserBesttechDashboard = () => {
  const { activeCompany } = useCompany();
  const [records, setRecords] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(() => emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [projectsRes, clientsRes] = await Promise.all([
        api.get('/besttech'),
        api.get('/besttech/clients'),
      ]);
      setRecords(projectsRes.data);
      const list = clientsRes.data?.clients || clientsRes.data || [];
      setClients(list);
      setForm((prev) => ({
        ...prev,
        clientId: prev.clientId || list[0]?._id || '',
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany?.slug]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm({ ...emptyForm(), clientId: clients[0]?._id || '' });
    setEditingId(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm(), clientId: clients[0]?._id || '' });
    setError('');
    setShowForm(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      title: form.title,
      serviceLine: form.serviceLine,
      serviceType: form.serviceType,
      status: form.status,
      contractValue: Number(form.contractValue) || 0,
      amountReceived: Number(form.amountReceived) || 0,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      date: form.date,
      deliverablesNote: form.deliverablesNote || '',
      isRetainer: form.isRetainer,
      notes: form.notes || '',
    };

    if (editingId) {
      payload.clientId = form.clientId;
    } else if (form.clientMode === 'existing') {
      payload.clientId = form.clientId;
    } else {
      payload.clientName = form.clientName;
      payload.firstContactAt = form.firstContactAt;
    }

    try {
      if (editingId) {
        await api.put(`/besttech/${editingId}`, payload);
      } else {
        await api.post('/besttech', payload);
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (record) => {
    setEditingId(record._id);
    setShowForm(true);
    setForm({
      ...emptyForm(),
      clientMode: 'existing',
      clientId: record.client?._id || record.client || '',
      title: record.title || '',
      serviceLine: record.serviceLine || 'software',
      serviceType: record.serviceType || 'other',
      status: record.status || 'active',
      contractValue: record.contractValue ?? '',
      amountReceived: record.amountReceived ?? '',
      startDate: formatDate(record.startDate),
      endDate: formatDate(record.endDate),
      date: formatDate(record.date),
      deliverablesNote: record.deliverablesNote || '',
      isRetainer: Boolean(record.isRetainer),
      notes: record.notes || '',
    });
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this project record?')) return;
    await api.delete(`/besttech/${id}`);
    load();
  };

  if (!activeCompany) {
    return <div className="page">No company assigned to this user.</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{activeCompany.name} projects</h1>
          <p>
            Log software and digital marketing engagements: client, service
            line, status, and contract value.
          </p>
        </div>
        {!showForm && (
          <button type="button" className="btn btn-primary" onClick={openAddForm}>
            <Plus size={18} strokeWidth={2} />
            Add project
          </button>
        )}
      </div>

      <div className="stack">
        {showForm && (
          <section className="panel">
            <div className="panel-head">
              <h2>{editingId ? 'Edit project' : 'Add project'}</h2>
              <button
                type="button"
                className="icon-btn"
                onClick={resetForm}
                aria-label="Close form"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={onSubmit} className="form-grid">
              {!editingId && (
                <label className="full">
                  Client source
                  <select
                    name="clientMode"
                    value={form.clientMode}
                    onChange={onChange}
                  >
                    <option value="existing">Existing client</option>
                    <option value="new">New client</option>
                  </select>
                </label>
              )}

              {form.clientMode === 'existing' || editingId ? (
                <label className="full">
                  Client
                  <select
                    name="clientId"
                    value={form.clientId}
                    onChange={onChange}
                    required
                  >
                    <option value="">Select client</option>
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <>
                  <label className="full">
                    Client name
                    <input
                      name="clientName"
                      value={form.clientName}
                      onChange={onChange}
                      required
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
                </>
              )}

              <label className="full">
                Project / campaign title
                <input
                  name="title"
                  value={form.title}
                  onChange={onChange}
                  required
                />
              </label>

              <label>
                Service line
                <select
                  name="serviceLine"
                  value={form.serviceLine}
                  onChange={onChange}
                  required
                >
                  {SERVICE_LINES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Service type
                <select
                  name="serviceType"
                  value={form.serviceType}
                  onChange={onChange}
                  required
                >
                  {SERVICE_TYPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Status
                <select
                  name="status"
                  value={form.status}
                  onChange={onChange}
                  required
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Contract value (₦)
                <input
                  type="number"
                  min="0"
                  name="contractValue"
                  value={form.contractValue}
                  onChange={onChange}
                />
              </label>

              <label>
                Amount received (₦)
                <input
                  type="number"
                  min="0"
                  name="amountReceived"
                  value={form.amountReceived}
                  onChange={onChange}
                />
              </label>

              <label>
                Start date
                <input
                  type="date"
                  name="startDate"
                  value={form.startDate}
                  onChange={onChange}
                />
              </label>

              <label>
                End date
                <input
                  type="date"
                  name="endDate"
                  value={form.endDate}
                  onChange={onChange}
                />
              </label>

              <label>
                Log date
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={onChange}
                  required
                />
              </label>

              <label className="full">
                <span className="checkbox-row">
                  <input
                    type="checkbox"
                    name="isRetainer"
                    checked={form.isRetainer}
                    onChange={onChange}
                  />
                  Retainer / ongoing engagement
                </span>
              </label>

              <label className="full">
                Deliverables note
                <input
                  name="deliverablesNote"
                  value={form.deliverablesNote}
                  onChange={onChange}
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
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : editingId ? 'Update' : 'Save project'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={resetForm}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="panel">
          <h2>Projects</h2>
          {loading ? (
            <p className="empty">Loading…</p>
          ) : records.length === 0 ? (
            <p className="empty">No projects yet. Add one above.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Client</th>
                    <th>Service line</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Contract</th>
                    <th>Logged</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r._id}>
                      <td>{r.title}</td>
                      <td>{r.clientName}</td>
                      <td>{serviceLineLabel(r.serviceLine)}</td>
                      <td>{serviceTypeLabel(r.serviceType)}</td>
                      <td>
                        <span className={`badge badge-status badge-${r.status}`}>
                          {projectStatusLabel(r.status)}
                        </span>
                      </td>
                      <td>{formatMoney(r.contractValue)}</td>
                      <td>{formatDate(r.date)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => onEdit(r)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => onDelete(r._id)}
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
        </section>
      </div>
    </div>
  );
};

export default UserBesttechDashboard;
