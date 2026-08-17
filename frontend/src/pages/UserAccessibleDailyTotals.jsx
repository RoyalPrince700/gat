import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import {
  ACCESSIBLE_CATEGORIES,
  ACCESSIBLE_LEVELS,
  ACCESSIBLE_SLUG,
} from '../constants/accessible';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney } from '../utils/format';

const today = () => new Date().toISOString().slice(0, 10);

const emptyCategory = () => ({ volume: '', count: '' });

const emptyForm = () => {
  const categories = {};
  ACCESSIBLE_CATEGORIES.forEach(({ value }) => {
    categories[value] = emptyCategory();
  });
  const levels = {};
  ACCESSIBLE_LEVELS.forEach(({ value }) => {
    levels[value] = { volume: '' };
  });
  return {
    date: today(),
    totalCredit: '',
    totalDebit: '',
    notes: '',
    categories,
    levels,
  };
};

const formFromRecord = (record) => {
  const categories = {};
  ACCESSIBLE_CATEGORIES.forEach(({ value }) => {
    const entry = record.categories?.[value] || {};
    categories[value] = {
      volume: entry.volume ? String(entry.volume) : '',
      count: entry.count ? String(entry.count) : '',
    };
  });
  const levels = {};
  ACCESSIBLE_LEVELS.forEach(({ value }) => {
    const entry = record.levels?.[value] || {};
    levels[value] = {
      volume: entry.volume ? String(entry.volume) : '',
    };
  });
  return {
    date: formatDate(record.date),
    totalCredit: record.totalCredit ? String(record.totalCredit) : '',
    totalDebit: record.totalDebit ? String(record.totalDebit) : '',
    notes: record.notes || '',
    categories,
    levels,
  };
};

const UserAccessibleDailyTotals = () => {
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

  const categoryVolumeSum = useMemo(() => {
    return ACCESSIBLE_CATEGORIES.reduce((sum, { value }) => {
      const v = form.categories[value]?.volume;
      if (v === '' || v == null) return sum;
      const n = Number(v);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }, [form.categories]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/accessible/daily-totals', {
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
    if (activeCompany?.slug === ACCESSIBLE_SLUG) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany?.slug]);

  if (activeCompany?.slug !== ACCESSIBLE_SLUG) {
    return (
      <div className="page">
        <p className="empty">
          Daily totals are available for Accessible Publishers only.
        </p>
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

  const onLevelChange = (level, value) => {
    setForm((prev) => ({
      ...prev,
      levels: {
        ...prev.levels,
        [level]: { volume: value },
      },
    }));
  };

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const buildPayload = () => {
    const categories = {};
    ACCESSIBLE_CATEGORIES.forEach(({ value }) => {
      const entry = form.categories[value] || {};
      const volume =
        entry.volume === '' || entry.volume == null
          ? 0
          : Number(entry.volume);
      const count =
        entry.count === '' || entry.count == null ? 0 : Number(entry.count);
      categories[value] = { volume, count };
    });
    const levels = {};
    ACCESSIBLE_LEVELS.forEach(({ value }) => {
      const entry = form.levels[value] || {};
      const volume =
        entry.volume === '' || entry.volume == null
          ? 0
          : Number(entry.volume);
      levels[value] = { volume };
    });
    return {
      date: form.date,
      notes: form.notes,
      totalCredit:
        form.totalCredit === '' || form.totalCredit == null
          ? 0
          : Number(form.totalCredit),
      totalDebit:
        form.totalDebit === '' || form.totalDebit == null
          ? 0
          : Number(form.totalDebit),
      categories,
      levels,
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
        await api.put(`/accessible/daily-totals/${editingId}`, payload);
        setSuccess('Daily total updated.');
      } else {
        await api.post('/accessible/daily-totals', payload);
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
      await api.delete(`/accessible/daily-totals/${id}`);
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
            Log one company summary per calendar day — total credit and optional
            breakdowns by format (print, audio, e-book, Braille, etc.) and
            education level. No individual book sales.
          </p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <section className="panel">
        <h2>{editingId ? 'Edit daily total' : 'Log daily total'}</h2>
        <p style={{ marginTop: 0, color: '#555555' }}>
          Enter total credit in ₦, then optional category and level breakdowns.
          If category volumes are filled, total credit is set to their sum.
          Saving again for the same date updates the existing entry.
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
          <label>
            Total credit (₦)
            <input
              type="number"
              min="0"
              step="any"
              placeholder={
                categoryVolumeSum > 0
                  ? `Auto: ${categoryVolumeSum}`
                  : '0'
              }
              value={form.totalCredit}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, totalCredit: e.target.value }))
              }
              disabled={categoryVolumeSum > 0}
            />
          </label>
          <label>
            Total debit (₦, optional)
            <input
              type="number"
              min="0"
              step="any"
              placeholder="0"
              value={form.totalDebit}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, totalDebit: e.target.value }))
              }
            />
          </label>
          <div className="full" />

          <div className="full">
            <h3 style={{ margin: '0.5rem 0 0', fontSize: '1rem' }}>
              Format / line breakdown
            </h3>
          </div>

          {ACCESSIBLE_CATEGORIES.map(({ value, label }) => (
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

          <div className="full">
            <h3 style={{ margin: '0.75rem 0 0', fontSize: '1rem' }}>
              Education level (optional, ₦ credit)
            </h3>
          </div>

          {ACCESSIBLE_LEVELS.map(({ value, label }) => (
            <label key={value}>
              {label}
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={form.levels[value]?.volume ?? ''}
                onChange={(e) => onLevelChange(value, e.target.value)}
              />
            </label>
          ))}

          <label className="full">
            Notes (optional)
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="e.g. School procurement bulk day"
            />
          </label>

          <div
            className="full"
            style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}
          >
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
                  <th>Total credit</th>
                  <th>Total debit</th>
                  <th>Net</th>
                  <th>Print</th>
                  <th>Audio</th>
                  <th>E-books</th>
                  <th>Logged by</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row._id}>
                    <td>{formatDate(row.date)}</td>
                    <td>{formatMoney(row.totalCredit)}</td>
                    <td>{formatMoney(row.totalDebit || 0)}</td>
                    <td>{formatMoney(row.netTotal ?? row.totalCredit)}</td>
                    <td>
                      {formatMoney(
                        row.categories?.physical_print?.volume || 0
                      )}
                    </td>
                    <td>
                      {formatMoney(row.categories?.audio_books?.volume || 0)}
                    </td>
                    <td>
                      {formatMoney(row.categories?.ebooks?.volume || 0)}
                    </td>
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

export default UserAccessibleDailyTotals;
