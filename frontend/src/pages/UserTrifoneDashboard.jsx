import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import api from '../api/client';
import {
  DESTINATIONS,
  PRODUCT_CATEGORIES,
  SALE_CHANNELS,
  SALE_STATUSES,
  productCategoryLabel,
  saleChannelLabel,
  saleStatusLabel,
} from '../constants/trifone';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney, formatNumber } from '../utils/format';

const emptyForm = () => ({
  customerMode: 'existing',
  customerId: '',
  customerName: '',
  firstContactAt: new Date().toISOString().slice(0, 10),
  title: '',
  productCategory: 'tablet',
  productName: '',
  quantity: '',
  unitPrice: '',
  totalAmount: '',
  channel: 'retail',
  status: 'confirmed',
  date: new Date().toISOString().slice(0, 10),
  destination: '',
  notes: '',
});

const UserTrifoneDashboard = () => {
  const { activeCompany } = useCompany();
  const [records, setRecords] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(() => emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [salesRes, customersRes] = await Promise.all([
        api.get('/trifone'),
        api.get('/trifone/customers'),
      ]);
      setRecords(salesRes.data);
      const list = customersRes.data?.customers || customersRes.data || [];
      setCustomers(list);
      setForm((prev) => ({
        ...prev,
        customerId: prev.customerId || list[0]?._id || '',
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sales');
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
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (
        (name === 'quantity' || name === 'unitPrice') &&
        next.quantity !== '' &&
        next.unitPrice !== ''
      ) {
        const q = Number(next.quantity);
        const u = Number(next.unitPrice);
        if (!Number.isNaN(q) && !Number.isNaN(u)) {
          next.totalAmount = String(Math.round(q * u * 100) / 100);
        }
      }
      return next;
    });
  };

  const resetForm = () => {
    setForm({ ...emptyForm(), customerId: customers[0]?._id || '' });
    setEditingId(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm(), customerId: customers[0]?._id || '' });
    setError('');
    setShowForm(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      title: form.title,
      productCategory: form.productCategory,
      productName: form.productName || '',
      quantity: Number(form.quantity) || 0,
      unitPrice: form.unitPrice === '' ? null : Number(form.unitPrice) || 0,
      totalAmount: Number(form.totalAmount) || 0,
      channel: form.channel,
      status: form.status,
      date: form.date,
      destination: form.destination || '',
      notes: form.notes || '',
    };

    if (editingId) {
      payload.customerId = form.customerId;
    } else if (form.customerMode === 'existing') {
      payload.customerId = form.customerId;
    } else if (form.customerMode === 'walkin') {
      payload.walkIn = true;
    } else {
      payload.customerName = form.customerName;
      payload.firstContactAt = form.firstContactAt;
    }

    try {
      if (editingId) {
        await api.put(`/trifone/${editingId}`, payload);
      } else {
        await api.post('/trifone', payload);
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
      customerMode: 'existing',
      customerId: record.customer?._id || record.customer || '',
      title: record.title || '',
      productCategory: record.productCategory || 'tablet',
      productName: record.productName || '',
      quantity: record.quantity ?? '',
      unitPrice: record.unitPrice ?? '',
      totalAmount: record.totalAmount ?? '',
      channel: record.channel || 'retail',
      status: record.status || 'confirmed',
      date: formatDate(record.date),
      destination: record.destination || '',
      notes: record.notes || '',
    });
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this sale record?')) return;
    await api.delete(`/trifone/${id}`);
    load();
  };

  if (!activeCompany) {
    return <div className="page">No company assigned to this user.</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{activeCompany.name} sales</h1>
          <p>
            Log product sales for tablets, power banks, and smart electronics —
            home, school, and work.
          </p>
        </div>
        {!showForm && (
          <button type="button" className="btn btn-primary" onClick={openAddForm}>
            <Plus size={18} strokeWidth={2} />
            Add sale
          </button>
        )}
      </div>

      <div className="stack">
        {showForm && (
          <section className="panel">
            <div className="panel-head">
              <h2>{editingId ? 'Edit sale' : 'Add sale'}</h2>
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
                  Customer source
                  <select
                    name="customerMode"
                    value={form.customerMode}
                    onChange={onChange}
                  >
                    <option value="existing">Existing customer</option>
                    <option value="new">New customer</option>
                    <option value="walkin">Walk-in / general</option>
                  </select>
                </label>
              )}

              {form.customerMode === 'existing' || editingId ? (
                <label className="full">
                  Customer
                  <select
                    name="customerId"
                    value={form.customerId}
                    onChange={onChange}
                    required
                  >
                    <option value="">Select customer</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : form.customerMode === 'new' ? (
                <>
                  <label className="full">
                    Customer name
                    <input
                      name="customerName"
                      value={form.customerName}
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
              ) : (
                <p className="hint full" style={{ margin: 0 }}>
                  Sale will be logged under Walk-in / general.
                </p>
              )}

              <label className="full">
                Label (optional)
                <input
                  name="title"
                  value={form.title}
                  onChange={onChange}
                  placeholder="e.g. School order – tablets"
                />
              </label>

              <label>
                Product category
                <select
                  name="productCategory"
                  value={form.productCategory}
                  onChange={onChange}
                  required
                >
                  {PRODUCT_CATEGORIES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Product / model (optional)
                <input
                  name="productName"
                  value={form.productName}
                  onChange={onChange}
                  placeholder="SKU or model"
                />
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
                Unit price (₦)
                <input
                  type="number"
                  min="0"
                  name="unitPrice"
                  value={form.unitPrice}
                  onChange={onChange}
                />
              </label>

              <label>
                Total amount (₦)
                <input
                  type="number"
                  min="0"
                  name="totalAmount"
                  value={form.totalAmount}
                  onChange={onChange}
                  required
                />
              </label>

              <label>
                Channel
                <select
                  name="channel"
                  value={form.channel}
                  onChange={onChange}
                  required
                >
                  {SALE_CHANNELS.map((s) => (
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
                  {SALE_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Sale date
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={onChange}
                  required
                />
              </label>

              <label>
                Destination
                <select
                  name="destination"
                  value={form.destination}
                  onChange={onChange}
                >
                  <option value="">—</option>
                  {DESTINATIONS.map((s) => (
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
                  {saving ? 'Saving…' : editingId ? 'Update' : 'Save sale'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={resetForm}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="panel">
          <h2>Sales</h2>
          {loading ? (
            <p className="empty">Loading…</p>
          ) : records.length === 0 ? (
            <p className="empty">No sales yet. Add one above.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Customer</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Channel</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r._id}>
                      <td>{r.title || r.productName || '—'}</td>
                      <td>{r.customerName}</td>
                      <td>{productCategoryLabel(r.productCategory)}</td>
                      <td>{formatNumber(r.quantity || 0)}</td>
                      <td>{saleChannelLabel(r.channel)}</td>
                      <td>
                        <span className={`badge badge-status badge-${r.status}`}>
                          {saleStatusLabel(r.status)}
                        </span>
                      </td>
                      <td>{formatMoney(r.totalAmount)}</td>
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

export default UserTrifoneDashboard;
