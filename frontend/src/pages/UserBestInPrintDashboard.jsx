import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import api from '../api/client';
import {
  JOB_STATUSES,
  PRINT_TYPES,
  PAPER_TYPES,
  COLOUR_MODES,
  jobStatusLabel,
  printTypeLabel,
  paperTypeLabel,
  colourModeLabel,
} from '../constants/bestinprint';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney, formatNumber } from '../utils/format';

const emptyForm = () => ({
  clientMode: 'existing',
  clientId: '',
  clientName: '',
  firstContactAt: new Date().toISOString().slice(0, 10),
  title: '',
  printType: 'books',
  paperType: '',
  quantity: '',
  pages: '',
  colourMode: '',
  status: 'confirmed',
  contractValue: '',
  amountReceived: '',
  dueDate: '',
  date: new Date().toISOString().slice(0, 10),
  notes: '',
});

const UserBestInPrintDashboard = () => {
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
      const [jobsRes, clientsRes] = await Promise.all([
        api.get('/bestinprint'),
        api.get('/bestinprint/clients'),
      ]);
      setRecords(jobsRes.data);
      const list = clientsRes.data?.clients || clientsRes.data || [];
      setClients(list);
      setForm((prev) => ({
        ...prev,
        clientId: prev.clientId || list[0]?._id || '',
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load print jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany?.slug]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
      printType: form.printType,
      paperType: form.paperType || '',
      quantity: Number(form.quantity) || 0,
      pages: form.pages === '' ? null : Number(form.pages),
      colourMode: form.colourMode || '',
      status: form.status,
      contractValue: Number(form.contractValue) || 0,
      amountReceived: Number(form.amountReceived) || 0,
      dueDate: form.dueDate || null,
      date: form.date,
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
        await api.put(`/bestinprint/${editingId}`, payload);
      } else {
        await api.post('/bestinprint', payload);
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
      printType: record.printType || 'books',
      paperType: record.paperType || '',
      quantity: record.quantity ?? '',
      pages: record.pages ?? '',
      colourMode: record.colourMode || '',
      status: record.status || 'confirmed',
      contractValue: record.contractValue ?? '',
      amountReceived: record.amountReceived ?? '',
      dueDate: formatDate(record.dueDate),
      date: formatDate(record.date),
      notes: record.notes || '',
    });
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this print job?')) return;
    await api.delete(`/bestinprint/${id}`);
    load();
  };

  if (!activeCompany) {
    return <div className="page">No company assigned to this user.</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{activeCompany.name} jobs</h1>
          <p>
            Log print jobs — books, fliers, and other commercial print work —
            with client, quantity, status, and value.
          </p>
        </div>
        {!showForm && (
          <button type="button" className="btn btn-primary" onClick={openAddForm}>
            <Plus size={18} strokeWidth={2} />
            Add job
          </button>
        )}
      </div>

      <div className="stack">
        {showForm && (
          <section className="panel">
            <div className="panel-head">
              <h2>{editingId ? 'Edit print job' : 'Add print job'}</h2>
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
                Job title
                <input
                  name="title"
                  value={form.title}
                  onChange={onChange}
                  placeholder="e.g. SS2 exam books, Event flyer A5"
                  required
                />
              </label>

              <label>
                Print type
                <select
                  name="printType"
                  value={form.printType}
                  onChange={onChange}
                  required
                >
                  {PRINT_TYPES.map((s) => (
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
                  {JOB_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Paper type
                <select
                  name="paperType"
                  value={form.paperType}
                  onChange={onChange}
                >
                  <option value="">—</option>
                  {PAPER_TYPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Colour mode
                <select
                  name="colourMode"
                  value={form.colourMode}
                  onChange={onChange}
                >
                  <option value="">—</option>
                  {COLOUR_MODES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Quantity
                <input
                  type="number"
                  min="0"
                  name="quantity"
                  value={form.quantity}
                  onChange={onChange}
                />
              </label>

              <label>
                Pages (e.g. books)
                <input
                  type="number"
                  min="0"
                  name="pages"
                  value={form.pages}
                  onChange={onChange}
                />
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
                Due date
                <input
                  type="date"
                  name="dueDate"
                  value={form.dueDate}
                  onChange={onChange}
                />
              </label>

              <label>
                Order / log date
                <input
                  type="date"
                  name="date"
                  value={form.date}
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
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : editingId ? 'Update' : 'Save job'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={resetForm}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="panel">
          <h2>Print jobs</h2>
          {loading ? (
            <p className="empty">Loading…</p>
          ) : records.length === 0 ? (
            <p className="empty">No print jobs yet. Add one above.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Qty</th>
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
                      <td>
                        {printTypeLabel(r.printType)}
                        {r.paperType ? ` · ${paperTypeLabel(r.paperType)}` : ''}
                        {r.colourMode
                          ? ` · ${colourModeLabel(r.colourMode)}`
                          : ''}
                      </td>
                      <td>{formatNumber(r.quantity || 0)}</td>
                      <td>
                        <span className={`badge badge-status badge-${r.status}`}>
                          {jobStatusLabel(r.status)}
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

export default UserBestInPrintDashboard;
