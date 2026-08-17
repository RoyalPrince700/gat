import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import api from '../api/client';
import {
  BOOKING_STATUSES,
  BOOKING_TYPES,
  TIME_BELTS,
  bookingStatusLabel,
  bookingTypeLabel,
  timeBeltLabel,
} from '../constants/oxygen';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney } from '../utils/format';

const emptyForm = () => ({
  advertiserMode: 'existing',
  advertiserId: '',
  advertiserName: '',
  firstContactAt: new Date().toISOString().slice(0, 10),
  title: '',
  bookingType: 'spot_ads',
  status: 'booked',
  contractValue: '',
  amountReceived: '',
  startDate: '',
  endDate: '',
  date: new Date().toISOString().slice(0, 10),
  spotCount: '',
  durationSeconds: '',
  programme: '',
  timeBelt: '',
  notes: '',
});

const UserOxygenDashboard = () => {
  const { activeCompany } = useCompany();
  const [records, setRecords] = useState([]);
  const [advertisers, setAdvertisers] = useState([]);
  const [form, setForm] = useState(() => emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [bookingsRes, advertisersRes] = await Promise.all([
        api.get('/oxygen'),
        api.get('/oxygen/advertisers'),
      ]);
      setRecords(bookingsRes.data);
      const list = advertisersRes.data?.advertisers || advertisersRes.data || [];
      setAdvertisers(list);
      setForm((prev) => ({
        ...prev,
        advertiserId: prev.advertiserId || list[0]?._id || '',
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load bookings');
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
    setForm({ ...emptyForm(), advertiserId: advertisers[0]?._id || '' });
    setEditingId(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm(), advertiserId: advertisers[0]?._id || '' });
    setError('');
    setShowForm(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      title: form.title,
      bookingType: form.bookingType,
      status: form.status,
      contractValue: Number(form.contractValue) || 0,
      amountReceived: Number(form.amountReceived) || 0,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      date: form.date,
      spotCount: form.spotCount === '' ? null : Number(form.spotCount),
      durationSeconds:
        form.durationSeconds === '' ? null : Number(form.durationSeconds),
      programme: form.programme || '',
      timeBelt: form.timeBelt || '',
      notes: form.notes || '',
    };

    if (editingId) {
      payload.advertiserId = form.advertiserId;
    } else if (form.advertiserMode === 'existing') {
      payload.advertiserId = form.advertiserId;
    } else {
      payload.advertiserName = form.advertiserName;
      payload.firstContactAt = form.firstContactAt;
    }

    try {
      if (editingId) {
        await api.put(`/oxygen/${editingId}`, payload);
      } else {
        await api.post('/oxygen', payload);
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
      advertiserMode: 'existing',
      advertiserId: record.advertiser?._id || record.advertiser || '',
      title: record.title || '',
      bookingType: record.bookingType || 'spot_ads',
      status: record.status || 'booked',
      contractValue: record.contractValue ?? '',
      amountReceived: record.amountReceived ?? '',
      startDate: formatDate(record.startDate),
      endDate: formatDate(record.endDate),
      date: formatDate(record.date),
      spotCount: record.spotCount ?? '',
      durationSeconds: record.durationSeconds ?? '',
      programme: record.programme || '',
      timeBelt: record.timeBelt || '',
      notes: record.notes || '',
    });
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this booking record?')) return;
    await api.delete(`/oxygen/${id}`);
    load();
  };

  if (!activeCompany) {
    return <div className="page">No company assigned to this user.</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{activeCompany.name} bookings</h1>
          <p>
            Log airtime campaigns and commercial deals: advertiser, booking
            type, flight dates, and contract value.
          </p>
        </div>
        {!showForm && (
          <button type="button" className="btn btn-primary" onClick={openAddForm}>
            <Plus size={18} strokeWidth={2} />
            Add booking
          </button>
        )}
      </div>

      <div className="stack">
        {showForm && (
          <section className="panel">
            <div className="panel-head">
              <h2>{editingId ? 'Edit booking' : 'Add booking'}</h2>
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
                  Advertiser source
                  <select
                    name="advertiserMode"
                    value={form.advertiserMode}
                    onChange={onChange}
                  >
                    <option value="existing">Existing advertiser</option>
                    <option value="new">New advertiser</option>
                  </select>
                </label>
              )}

              {form.advertiserMode === 'existing' || editingId ? (
                <label className="full">
                  Advertiser
                  <select
                    name="advertiserId"
                    value={form.advertiserId}
                    onChange={onChange}
                    required
                  >
                    <option value="">Select advertiser</option>
                    {advertisers.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <>
                  <label className="full">
                    Advertiser name
                    <input
                      name="advertiserName"
                      value={form.advertiserName}
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
                Campaign / deal title
                <input
                  name="title"
                  value={form.title}
                  onChange={onChange}
                  required
                  placeholder="e.g. Q3 promo spots"
                />
              </label>

              <label>
                Booking type
                <select
                  name="bookingType"
                  value={form.bookingType}
                  onChange={onChange}
                  required
                >
                  {BOOKING_TYPES.map((s) => (
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
                  {BOOKING_STATUSES.map((s) => (
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
                Flight start
                <input
                  type="date"
                  name="startDate"
                  value={form.startDate}
                  onChange={onChange}
                />
              </label>

              <label>
                Flight end
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

              <label>
                Spot count
                <input
                  type="number"
                  min="0"
                  name="spotCount"
                  value={form.spotCount}
                  onChange={onChange}
                />
              </label>

              <label>
                Duration (seconds)
                <input
                  type="number"
                  min="0"
                  name="durationSeconds"
                  value={form.durationSeconds}
                  onChange={onChange}
                />
              </label>

              <label>
                Programme
                <input
                  name="programme"
                  value={form.programme}
                  onChange={onChange}
                  placeholder="e.g. Morning Drive"
                />
              </label>

              <label>
                Time belt
                <select
                  name="timeBelt"
                  value={form.timeBelt}
                  onChange={onChange}
                >
                  <option value="">—</option>
                  {TIME_BELTS.map((s) => (
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
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : editingId ? 'Update' : 'Save booking'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={resetForm}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="panel">
          <h2>Bookings</h2>
          {loading ? (
            <p className="empty">Loading…</p>
          ) : records.length === 0 ? (
            <p className="empty">No bookings yet. Add one above.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Advertiser</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Programme</th>
                    <th>Contract</th>
                    <th>Logged</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r._id}>
                      <td>{r.title}</td>
                      <td>{r.advertiserName}</td>
                      <td>{bookingTypeLabel(r.bookingType)}</td>
                      <td>
                        <span className={`badge badge-status badge-${r.status}`}>
                          {bookingStatusLabel(r.status)}
                        </span>
                      </td>
                      <td>
                        {r.programme || '—'}
                        {r.timeBelt ? ` · ${timeBeltLabel(r.timeBelt)}` : ''}
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

export default UserOxygenDashboard;
