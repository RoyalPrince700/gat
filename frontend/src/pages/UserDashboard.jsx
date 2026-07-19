import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import api from '../api/client';
import {
  ACQUISITION_SOURCES,
  FAILURE_REASONS,
  GEO_STATES,
  PAYMENT_METHODS,
  SMIPAY_CATEGORIES,
  SMIPAY_CREATE_STATUSES,
  SMIPAY_DATA_DURATIONS,
  SMIPAY_DATA_PLANS,
  SMIPAY_NETWORKS,
  SMIPAY_STATUSES,
  categoryLabel,
  formatDataPlan,
  needsNetwork,
  networkLabel,
  statusLabel,
} from '../constants/smipay';
import { useCompany } from '../context/CompanyContext';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  toApiDateTime,
  toDateTimeLocal,
} from '../utils/format';
import UserSmehDashboard from './UserSmehDashboard';

const emptySmipay = () => ({
  customerMode: 'existing',
  customerId: '',
  customerName: '',
  joinedAt: new Date().toISOString().slice(0, 10),
  acquisitionSource: 'organic',
  geoState: 'Lagos',
  category: 'airtime',
  network: 'mtn',
  dataPlanSelect: '1',
  dataPlanDuration: 'weekly',
  customDataGb: '',
  totalAmount: '',
  date: toDateTimeLocal(),
  channel: 'app',
  status: 'successful',
  paymentMethod: 'bank_transfer',
  promoCode: '',
  failureReason: '',
  providerCost: '',
});

const resolveDataSize = (form) => {
  if (form.category !== 'data') {
    return {
      dataSizeGb: null,
      dataPlanDuration: null,
      dataPlanLabel: '',
    };
  }
  const duration = form.dataPlanDuration;
  if (form.dataPlanSelect === 'custom') {
    const gb = Number(form.customDataGb);
    return {
      dataSizeGb: gb,
      dataPlanDuration: duration,
      dataPlanLabel: formatDataPlan(gb, duration),
    };
  }
  const plan = SMIPAY_DATA_PLANS.find((p) => p.value === form.dataPlanSelect);
  const gb = plan?.gb ?? null;
  return {
    dataSizeGb: gb,
    dataPlanDuration: duration,
    dataPlanLabel: formatDataPlan(gb, duration),
  };
};

const planSelectFromRecord = (record) => {
  if (record?.dataSizeGb == null) return { dataPlanSelect: '1', customDataGb: '' };
  const match = SMIPAY_DATA_PLANS.find(
    (p) => p.gb != null && Number(p.gb) === Number(record.dataSizeGb)
  );
  if (match) return { dataPlanSelect: match.value, customDataGb: '' };
  return {
    dataPlanSelect: 'custom',
    customDataGb: String(record.dataSizeGb),
  };
};

const emptyEdu = () => ({
  schoolName: '',
  newEnrollments: '',
  activeStudents: '',
  feesCollected: '',
  attendanceRate: '',
  date: new Date().toISOString().slice(0, 10),
});

const SmipayUserDashboard = () => {
  const { activeCompany } = useCompany();
  const isSmipay = activeCompany?.slug === 'smipay';
  const [records, setRecords] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(() => emptySmipay());
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolvingId, setResolvingId] = useState('');

  const endpoint = '/smipay';
  const pendingCount = records.filter((r) => r.status === 'pending').length;

  const load = async () => {
    if (!activeCompany) return;
    setLoading(true);
    try {
      const reqs = [api.get(endpoint)];
      if (isSmipay) reqs.push(api.get('/smipay/customers'));
      const [recordsRes, customersRes] = await Promise.all(reqs);
      setRecords(recordsRes.data);
      if (customersRes) {
        const list = customersRes.data?.customers || customersRes.data || [];
        setCustomers(list);
        setForm((prev) => ({
          ...prev,
          customerId: prev.customerId || list[0]?._id || '',
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setForm(isSmipay ? emptySmipay() : emptyEdu());
    setEditingId(null);
    setShowForm(false);
    setError('');
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany?.slug]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'category' && !needsNetwork(value)) {
        next.network = '';
        next.dataPlanSelect = '1';
        next.dataPlanDuration = 'weekly';
        next.customDataGb = '';
      }
      if (name === 'category' && needsNetwork(value) && !prev.network) {
        next.network = 'mtn';
      }
      if (name === 'category' && value === 'data' && !prev.dataPlanDuration) {
        next.dataPlanDuration = 'weekly';
      }
      return next;
    });
  };

  const resetForm = () => {
    setForm(
      isSmipay
        ? { ...emptySmipay(), customerId: customers[0]?._id || '' }
        : emptyEdu()
    );
    setEditingId(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm(
      isSmipay
        ? { ...emptySmipay(), customerId: customers[0]?._id || '' }
        : emptyEdu()
    );
    setError('');
    setShowForm(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    let payload;
    if (isSmipay) {
      const dataFields = resolveDataSize(form);
      payload = {
        category: form.category,
        transactionCount: 1,
        totalAmount: Number(form.totalAmount),
        date: toApiDateTime(form.date),
        channel: form.channel,
        network: needsNetwork(form.category) ? form.network : null,
        dataSizeGb: dataFields.dataSizeGb,
        dataPlanDuration: dataFields.dataPlanDuration,
        dataPlanLabel: dataFields.dataPlanLabel,
        status: form.status || 'successful',
        promoCode: form.promoCode || '',
        providerCost:
          form.providerCost === '' || form.providerCost == null
            ? null
            : Number(form.providerCost),
        failureReason:
          form.status === 'pending' && form.failureReason
            ? form.failureReason
            : undefined,
        paymentMethod:
          form.category === 'deposit' ? form.paymentMethod || undefined : undefined,
      };

      if (editingId) {
        payload.customerId = form.customerId;
      } else if (form.customerMode === 'existing') {
        payload.customerId = form.customerId;
      } else {
        payload.customerName = form.customerName;
        payload.joinedAt = form.joinedAt;
        payload.acquisitionSource = form.acquisitionSource || 'organic';
        payload.geoState = form.geoState || 'Unknown';
      }
    } else {
      payload = {
        ...form,
        newEnrollments: Number(form.newEnrollments),
        activeStudents: Number(form.activeStudents),
        feesCollected: Number(form.feesCollected),
        attendanceRate: Number(form.attendanceRate || 0),
      };
    }

    try {
      if (editingId) {
        await api.put(`${endpoint}/${editingId}`, payload);
      } else {
        await api.post(endpoint, payload);
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
    if (isSmipay) {
      const category =
        record.category === 'betting' ? 'other' : record.category || 'other';
      setForm({
        ...emptySmipay(),
        customerMode: 'existing',
        customerId: record.customer?._id || record.customer || '',
        category,
        network: record.network || (needsNetwork(category) ? 'mtn' : ''),
        dataPlanDuration: record.dataPlanDuration || 'weekly',
        ...planSelectFromRecord(record),
        totalAmount: record.totalAmount,
        date: toDateTimeLocal(record.date),
        channel: record.channel,
        status: record.status || 'successful',
        paymentMethod: record.paymentMethod || 'bank_transfer',
        promoCode: record.promoCode || '',
        failureReason: record.failureReason || '',
        providerCost:
          record.providerCost != null ? String(record.providerCost) : '',
      });
    } else {
      setForm({
        schoolName: record.schoolName,
        newEnrollments: record.newEnrollments,
        activeStudents: record.activeStudents,
        feesCollected: record.feesCollected,
        attendanceRate: record.attendanceRate,
        date: formatDate(record.date),
      });
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    await api.delete(`${endpoint}/${id}`);
    load();
  };

  const onResolve = async (id) => {
    setResolvingId(id);
    setError('');
    try {
      await api.patch(`/smipay/${id}/resolve`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resolve transaction');
    } finally {
      setResolvingId('');
    }
  };

  if (!activeCompany) {
    return <div className="page">No company assigned to this user.</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{activeCompany.name} transactions</h1>
          <p>
            {isSmipay
              ? 'Log transactions by customer and transaction category (airtime, data, bills, exam body, etc.).'
              : `Add growth records for ${activeCompany.name}.`}
          </p>
        </div>
        {!showForm && (
          <button type="button" className="btn btn-primary" onClick={openAddForm}>
            <Plus size={18} strokeWidth={2} />
            Add transaction
          </button>
        )}
      </div>

      <div className="stack">
        {showForm && (
        <section className="panel">
          <div className="panel-head">
            <h2>{editingId ? 'Edit transaction' : 'Add transaction'}</h2>
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
            {isSmipay ? (
              <>
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
                ) : (
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
                      <select
                        name="geoState"
                        value={form.geoState}
                        onChange={onChange}
                      >
                        {GEO_STATES.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}

                <label>
                  Transaction category
                  <select
                    name="category"
                    value={form.category}
                    onChange={onChange}
                    required
                  >
                    {SMIPAY_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Channel
                  <select name="channel" value={form.channel} onChange={onChange}>
                    <option value="app">App</option>
                    <option value="web">Web</option>
                    <option value="agent">Agent</option>
                    <option value="ussd">USSD</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                {needsNetwork(form.category) && (
                  <label>
                    Network
                    <select
                      name="network"
                      value={form.network}
                      onChange={onChange}
                      required
                    >
                      {SMIPAY_NETWORKS.map((n) => (
                        <option key={n.value} value={n.value}>
                          {n.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {form.category === 'data' && (
                  <>
                    <label>
                      Data size
                      <select
                        name="dataPlanSelect"
                        value={form.dataPlanSelect}
                        onChange={onChange}
                        required
                      >
                        {SMIPAY_DATA_PLANS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Validity
                      <select
                        name="dataPlanDuration"
                        value={form.dataPlanDuration}
                        onChange={onChange}
                        required
                      >
                        {SMIPAY_DATA_DURATIONS.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {form.dataPlanSelect === 'custom' && (
                      <label>
                        Custom size (GB)
                        <input
                          type="number"
                          name="customDataGb"
                          min="0.01"
                          step="0.01"
                          value={form.customDataGb}
                          onChange={onChange}
                          placeholder="e.g. 1.2"
                          required
                        />
                      </label>
                    )}
                  </>
                )}

                <label>
                  Amount
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
                  Provider cost (optional)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="providerCost"
                    value={form.providerCost}
                    onChange={onChange}
                    placeholder="For margin tracking"
                  />
                </label>
                {form.category === 'deposit' && (
                  <label>
                    Payment method
                    <select
                      name="paymentMethod"
                      value={form.paymentMethod}
                      onChange={onChange}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  Promo / campaign code
                  <input
                    name="promoCode"
                    value={form.promoCode}
                    onChange={onChange}
                    placeholder="e.g. LAUNCH20"
                  />
                </label>
                <label>
                  Status
                  <select
                    name="status"
                    value={form.status}
                    onChange={onChange}
                    required
                  >
                    {(editingId ? SMIPAY_STATUSES : SMIPAY_CREATE_STATUSES).map(
                      (s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      )
                    )}
                  </select>
                </label>
                {form.status === 'pending' && (
                  <label>
                    Failure reason
                    <select
                      name="failureReason"
                      value={form.failureReason}
                      onChange={onChange}
                    >
                      <option value="">Select reason</option>
                      {FAILURE_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="full">
                  Transaction date & time
                  <input
                    type="datetime-local"
                    name="date"
                    value={form.date}
                    onChange={onChange}
                    required
                  />
                </label>
              </>
            ) : (
              <>
                <label className="full">
                  School / campus name
                  <input
                    name="schoolName"
                    value={form.schoolName}
                    onChange={onChange}
                    required
                  />
                </label>
                <label>
                  New enrollments
                  <input
                    type="number"
                    min="0"
                    name="newEnrollments"
                    value={form.newEnrollments}
                    onChange={onChange}
                    required
                  />
                </label>
                <label>
                  Active students
                  <input
                    type="number"
                    min="0"
                    name="activeStudents"
                    value={form.activeStudents}
                    onChange={onChange}
                    required
                  />
                </label>
                <label>
                  Fees collected
                  <input
                    type="number"
                    min="0"
                    name="feesCollected"
                    value={form.feesCollected}
                    onChange={onChange}
                    required
                  />
                </label>
                <label>
                  Attendance rate (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    name="attendanceRate"
                    value={form.attendanceRate}
                    onChange={onChange}
                  />
                </label>
                <label>
                  Date
                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={onChange}
                    required
                  />
                </label>
              </>
            )}

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
                    ? 'Update transaction'
                    : 'Save transaction'}
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
            <h2>Recent transactions</h2>
            {isSmipay && pendingCount > 0 && (
              <span className="badge badge-pending">
                {pendingCount} pending
              </span>
            )}
          </div>
          {loading ? (
            <p className="empty">Loading…</p>
          ) : records.length === 0 ? (
            <p className="empty">
              No transactions yet.{' '}
              <button type="button" className="link-btn" onClick={openAddForm}>
                Add transaction
              </button>
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {isSmipay ? (
                      <>
                        <th>Customer</th>
                        <th>Category</th>
                        <th>Network</th>
                        <th>Plan</th>
                        <th>Status</th>
                        <th>Amount</th>
                        <th>Date & time</th>
                        <th></th>
                      </>
                    ) : (
                      <>
                        <th>School</th>
                        <th>Enroll</th>
                        <th>Fees</th>
                        <th>Date</th>
                        <th></th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r._id}>
                      {isSmipay ? (
                        <>
                          <td>{r.customerName}</td>
                          <td>{categoryLabel(r.category)}</td>
                          <td>
                            {needsNetwork(r.category)
                              ? networkLabel(r.network)
                              : '—'}
                          </td>
                          <td>
                            {r.category === 'data' ? formatDataPlan(r) : '—'}
                          </td>
                          <td>
                            <span
                              className={`badge badge-status badge-${r.status || 'successful'}`}
                            >
                              {statusLabel(r.status || 'successful')}
                            </span>
                          </td>
                          <td>{formatMoney(r.totalAmount)}</td>
                          <td>{formatDateTime(r.date)}</td>
                        </>
                      ) : (
                        <>
                          <td>{r.schoolName}</td>
                          <td>{formatNumber(r.newEnrollments)}</td>
                          <td>{formatMoney(r.feesCollected)}</td>
                          <td>{formatDate(r.date)}</td>
                        </>
                      )}
                      <td>
                        <div className="row-actions">
                          {isSmipay && r.status === 'pending' && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => onResolve(r._id)}
                              disabled={resolvingId === r._id}
                            >
                              {resolvingId === r._id ? 'Resolving…' : 'Resolve'}
                            </button>
                          )}
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

const UserDashboard = () => {
  const { activeCompany } = useCompany();
  if (activeCompany?.slug === 'smart-edu-hub') {
    return <UserSmehDashboard />;
  }
  return <SmipayUserDashboard />;
};

export default UserDashboard;
