import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { SMIPAY_CATEGORIES } from '../constants/smipay';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney, formatNumber } from '../utils/format';

const today = () => new Date().toISOString().slice(0, 10);

const emptyCategory = () => ({ volume: '', count: '' });

const emptyForm = () => {
  const categories = {};
  SMIPAY_CATEGORIES.forEach(({ value }) => {
    categories[value] = emptyCategory();
  });
  return {
    date: today(),
    notes: '',
    categories,
  };
};

const formFromRecord = (record) => {
  const categories = {};
  SMIPAY_CATEGORIES.forEach(({ value }) => {
    const entry = record.categories?.[value] || {};
    categories[value] = {
      volume: entry.volume ? String(entry.volume) : '',
      count: entry.count ? String(entry.count) : '',
    };
  });
  return {
    date: formatDate(record.date),
    notes: record.notes || '',
    categories,
  };
};

const UserDailyTotals = () => {
  const { activeCompany } = useCompany();
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const listRange = useMemo(() => {
    const to = today();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);
    return { from: formatDate(fromDate), to };
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/smipay/daily-totals', {
        params: listRange,
      });
      setRecords(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load daily totals');
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
        <p className="empty">Daily totals are available for Smipay only.</p>
      </div>
    );
  }

  const onCategoryChange = (category, field, value) => {
    setForm((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: {
          ...prev.categories[category],
          [field]: value,
        },
      },
    }));
  };

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const buildPayload = () => {
    const categories = {};
    SMIPAY_CATEGORIES.forEach(({ value }) => {
      const entry = form.categories[value] || {};
      const volume =
        entry.volume === '' || entry.volume == null
          ? 0
          : Number(entry.volume);
      const count =
        entry.count === '' || entry.count == null ? 0 : Number(entry.count);
      categories[value] = { volume, count };
    });
    return {
      date: form.date,
      notes: form.notes,
      categories,
    };
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    const payload = buildPayload();

    try {
      if (editingId) {
        await api.put(`/smipay/daily-totals/${editingId}`, payload);
        setSuccess('Daily total updated.');
      } else {
        // Upsert by company + date
        await api.post('/smipay/daily-totals', payload);
        setSuccess('Daily total saved.');
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
    setForm(formFromRecord(record));
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this daily total?')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/smipay/daily-totals/${id}`);
      if (editingId === id) resetForm();
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Daily totals</h1>
          <p>
            Log one summary per day (deposit, airtime, data, and other volumes)
            when individual transaction entry is not practical. One total per
            calendar day for the company.
          </p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <section className="panel">
        <h2>{editingId ? 'Edit daily total' : 'Log daily total'}</h2>
        <p style={{ marginTop: 0, color: '#555555' }}>
          Enter volumes in ₦ and optional transaction counts. Leave unused
          categories blank. Saving again for the same date updates the existing
          entry.
        </p>
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            Date
            <input
              type="date"
              value={form.date}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, date: e.target.value }))
              }
              required
            />
          </label>
          <div className="full" />

          {SMIPAY_CATEGORIES.map(({ value, label }) => (
            <div key={value} className="full" style={{ display: 'contents' }}>
              <label>
                {label} volume (₦)
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={form.categories[value]?.volume ?? ''}
                  onChange={(e) =>
                    onCategoryChange(value, 'volume', e.target.value)
                  }
                />
              </label>
              <label>
                {label} count
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="optional"
                  value={form.categories[value]?.count ?? ''}
                  onChange={(e) =>
                    onCategoryChange(value, 'count', e.target.value)
                  }
                />
              </label>
            </div>
          ))}

          <label className="full">
            Notes (optional)
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="e.g. Millions pay day — bulk summary"
            />
          </label>

          <div className="full" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update' : 'Save daily total'}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  resetForm();
                  setSuccess('');
                  setError('');
                }}
                disabled={saving}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>Recent daily totals (last 30 days)</h2>
        {loading ? (
          <p className="empty">Loading…</p>
        ) : records.length === 0 ? (
          <p className="empty">No daily totals logged yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Total volume</th>
                  <th>Transactions</th>
                  <th>Deposit</th>
                  <th>Airtime</th>
                  <th>Data</th>
                  <th>Logged by</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row._id}>
                    <td>{formatDate(row.date)}</td>
                    <td>{formatMoney(row.totalVolume)}</td>
                    <td>{formatNumber(row.totalTransactions)}</td>
                    <td>
                      {formatMoney(row.categories?.deposit?.volume || 0)}
                    </td>
                    <td>
                      {formatMoney(row.categories?.airtime?.volume || 0)}
                    </td>
                    <td>{formatMoney(row.categories?.data?.volume || 0)}</td>
                    <td>{row.createdBy?.name || '—'}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => onEdit(row)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => onDelete(row._id)}
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
  );
};

export default UserDailyTotals;
