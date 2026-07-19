import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import api from '../api/client';
import {
  SUBSCRIPTION_STATUSES,
  YES_NO_OPTIONS,
  boolFromYesNo,
  statusLabel,
  yesNoFromBool,
  yesNoLabel,
} from '../constants/smeh';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney } from '../utils/format';

const emptyForm = () => ({
  schoolMode: 'existing',
  schoolId: '',
  schoolName: '',
  awareAt: new Date().toISOString().slice(0, 10),
  subscriptionStatus: 'active',
  amount: '',
  startedAt: new Date().toISOString().slice(0, 10),
  endsAt: '',
  studentOnboarded: 'no',
  teacherOnboarded: 'no',
  parentOnboarded: 'no',
  platformInUse: 'no',
  date: new Date().toISOString().slice(0, 10),
  notes: '',
});

const UserSmehDashboard = () => {
  const { activeCompany } = useCompany();
  const [records, setRecords] = useState([]);
  const [schools, setSchools] = useState([]);
  const [form, setForm] = useState(() => emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [subsRes, schoolsRes] = await Promise.all([
        api.get('/smeh'),
        api.get('/smeh/schools'),
      ]);
      setRecords(subsRes.data);
      const list = schoolsRes.data?.schools || schoolsRes.data || [];
      setSchools(list);
      setForm((prev) => ({
        ...prev,
        schoolId: prev.schoolId || list[0]?._id || '',
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load subscriptions');
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
    setForm({ ...emptyForm(), schoolId: schools[0]?._id || '' });
    setEditingId(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm(), schoolId: schools[0]?._id || '' });
    setError('');
    setShowForm(true);
  };

  const isActive = form.subscriptionStatus === 'active';

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      subscriptionStatus: form.subscriptionStatus,
      date: form.date,
      notes: form.notes || '',
    };

    if (isActive) {
      payload.amount = Number(form.amount);
      payload.startedAt = form.startedAt;
      payload.endsAt = form.endsAt;
      payload.studentOnboarded = boolFromYesNo(form.studentOnboarded);
      payload.teacherOnboarded = boolFromYesNo(form.teacherOnboarded);
      payload.parentOnboarded = boolFromYesNo(form.parentOnboarded);
      payload.platformInUse = boolFromYesNo(form.platformInUse);
    }

    if (editingId) {
      payload.schoolId = form.schoolId;
    } else if (form.schoolMode === 'existing') {
      payload.schoolId = form.schoolId;
    } else {
      payload.schoolName = form.schoolName;
      payload.awareAt = form.awareAt;
    }

    try {
      if (editingId) {
        await api.put(`/smeh/${editingId}`, payload);
      } else {
        await api.post('/smeh', payload);
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
      schoolMode: 'existing',
      schoolId: record.school?._id || record.school || '',
      subscriptionStatus: record.subscriptionStatus || 'active',
      amount: record.amount,
      startedAt: formatDate(record.startedAt),
      endsAt: formatDate(record.endsAt),
      studentOnboarded: yesNoFromBool(record.studentOnboarded),
      teacherOnboarded: yesNoFromBool(record.teacherOnboarded),
      parentOnboarded: yesNoFromBool(record.parentOnboarded),
      platformInUse: yesNoFromBool(record.platformInUse),
      date: formatDate(record.date),
      notes: record.notes || '',
    });
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this subscription record?')) return;
    await api.delete(`/smeh/${id}`);
    load();
  };

  if (!activeCompany) {
    return <div className="page">No company assigned to this user.</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{activeCompany.name} subscriptions</h1>
          <p>
            Log LMS school subscriptions: amount, active/inactive period, and
            onboarding status.
          </p>
        </div>
        {!showForm && (
          <button type="button" className="btn btn-primary" onClick={openAddForm}>
            <Plus size={18} strokeWidth={2} />
            Add subscription
          </button>
        )}
      </div>

      <div className="stack">
        {showForm && (
          <section className="panel">
            <div className="panel-head">
              <h2>{editingId ? 'Edit subscription' : 'Add subscription'}</h2>
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
                  School source
                  <select
                    name="schoolMode"
                    value={form.schoolMode}
                    onChange={onChange}
                  >
                    <option value="existing">Existing school</option>
                    <option value="new">New school</option>
                  </select>
                </label>
              )}

              {form.schoolMode === 'existing' || editingId ? (
                <label className="full">
                  School
                  <select
                    name="schoolId"
                    value={form.schoolId}
                    onChange={onChange}
                    required
                  >
                    <option value="">Select school</option>
                    {schools.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <>
                  <label className="full">
                    School name
                    <input
                      name="schoolName"
                      value={form.schoolName}
                      onChange={onChange}
                      required
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
                </>
              )}

              <label>
                Subscription
                <select
                  name="subscriptionStatus"
                  value={form.subscriptionStatus}
                  onChange={onChange}
                  required
                >
                  {SUBSCRIPTION_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              {isActive && (
                <>
                  <label>
                    Amount subscribed
                    <input
                      type="number"
                      min="0"
                      name="amount"
                      value={form.amount}
                      onChange={onChange}
                      required
                    />
                  </label>
                  <label>
                    Sub started
                    <input
                      type="date"
                      name="startedAt"
                      value={form.startedAt}
                      onChange={onChange}
                      required
                    />
                  </label>
                  <label>
                    Sub ends
                    <input
                      type="date"
                      name="endsAt"
                      value={form.endsAt}
                      onChange={onChange}
                      required
                    />
                  </label>
                  <label>
                    Student onboarded
                    <select
                      name="studentOnboarded"
                      value={form.studentOnboarded}
                      onChange={onChange}
                    >
                      {YES_NO_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Teacher onboarded
                    <select
                      name="teacherOnboarded"
                      value={form.teacherOnboarded}
                      onChange={onChange}
                    >
                      {YES_NO_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Parent onboarded
                    <select
                      name="parentOnboarded"
                      value={form.parentOnboarded}
                      onChange={onChange}
                    >
                      {YES_NO_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Started using platform
                    <select
                      name="platformInUse"
                      value={form.platformInUse}
                      onChange={onChange}
                    >
                      {YES_NO_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              <label>
                Logged date
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
                  {saving
                    ? editingId
                      ? 'Updating…'
                      : 'Saving…'
                    : editingId
                      ? 'Update subscription'
                      : 'Save subscription'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="panel">
          <div className="panel-head">
            <h2>Recent subscriptions</h2>
          </div>
          {loading ? (
            <p className="empty">Loading…</p>
          ) : records.length === 0 ? (
            <p className="empty">
              No subscriptions yet.{' '}
              <button type="button" className="link-btn" onClick={openAddForm}>
                Add subscription
              </button>
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>School</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Started</th>
                    <th>Ends</th>
                    <th>Platform</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r._id}>
                      <td>{r.schoolName}</td>
                      <td>
                        <span
                          className={`badge badge-status badge-${r.subscriptionStatus}`}
                        >
                          {statusLabel(r.subscriptionStatus)}
                        </span>
                      </td>
                      <td>{formatMoney(r.amount)}</td>
                      <td>{formatDate(r.startedAt)}</td>
                      <td>{formatDate(r.endsAt)}</td>
                      <td>{yesNoLabel(r.platformInUse)}</td>
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

export default UserSmehDashboard;
