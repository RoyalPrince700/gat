import { useEffect, useState } from 'react';
import api from '../api/client';
import {
  PLATFORM_COLORS,
  SOCIAL_MEDIA_PLATFORMS,
  platformLabel,
} from '../constants/socialMedia';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatNumber } from '../utils/format';

const today = () => new Date().toISOString().slice(0, 10);

const emptyDaily = () => ({
  date: today(),
  facebook: { newFollowers: '', totalFollowers: '' },
  linkedin: { newFollowers: '', totalFollowers: '' },
  instagram: { newFollowers: '', totalFollowers: '' },
  twitter: { newFollowers: '', totalFollowers: '' },
});

const emptySingle = {
  platform: 'facebook',
  newFollowers: '',
  totalFollowers: '',
  date: today(),
  notes: '',
};

const UserSocialMedia = () => {
  const { activeCompany } = useCompany();
  const [records, setRecords] = useState([]);
  const [daily, setDaily] = useState(emptyDaily);
  const [form, setForm] = useState(emptySingle);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/social-media');
      setRecords(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load social media records');
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
        <p className="empty">Social media tracking is available for Smipay only.</p>
      </div>
    );
  }

  const onDailyChange = (platform, field, value) => {
    setDaily((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: value },
    }));
  };

  const onFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetEdit = () => {
    setForm(emptySingle);
    setEditingId(null);
  };

  const onDailySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const entries = SOCIAL_MEDIA_PLATFORMS.map(({ value }) => ({
      platform: value,
      newFollowers: daily[value].newFollowers,
      totalFollowers: daily[value].totalFollowers,
    })).filter((entry) => entry.newFollowers !== '' && entry.newFollowers != null);

    try {
      await api.post('/social-media/bulk', {
        date: daily.date,
        entries,
      });
      setDaily(emptyDaily());
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onSingleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      platform: form.platform,
      newFollowers: Number(form.newFollowers),
      totalFollowers:
        form.totalFollowers === '' ? null : Number(form.totalFollowers),
      date: form.date,
      notes: form.notes,
    };

    try {
      if (editingId) {
        await api.put(`/social-media/${editingId}`, payload);
      } else {
        await api.post('/social-media', payload);
      }
      resetEdit();
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (record) => {
    setEditingId(record._id);
    setForm({
      platform: record.platform,
      newFollowers: String(record.newFollowers ?? ''),
      totalFollowers:
        record.totalFollowers == null ? '' : String(record.totalFollowers),
      date: formatDate(record.date),
      notes: record.notes || '',
    });
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this social media entry?')) return;
    try {
      await api.delete(`/social-media/${id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Social media growth</h1>
          <p>
            Log daily new followers for Facebook, LinkedIn, Instagram, and
            Twitter so the team can track growth over time.
          </p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <section className="panel">
        <h2>Log today&apos;s growth</h2>
        <p style={{ marginTop: 0, color: '#555555' }}>
          Enter new followers for each platform. Leave a platform blank to skip
          it. Optional total followers helps track absolute audience size.
        </p>
        <form className="form-grid" onSubmit={onDailySubmit}>
          <label>
            Date
            <input
              type="date"
              value={daily.date}
              onChange={(e) =>
                setDaily((prev) => ({ ...prev, date: e.target.value }))
              }
              required
            />
          </label>
          <div className="full" />
          {SOCIAL_MEDIA_PLATFORMS.map(({ value, label }) => (
            <div key={value} className="full" style={{ display: 'contents' }}>
              <label>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: PLATFORM_COLORS[value],
                    }}
                  />
                  {label} — new followers
                </span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={daily[value].newFollowers}
                  onChange={(e) =>
                    onDailyChange(value, 'newFollowers', e.target.value)
                  }
                />
              </label>
              <label>
                {label} — total (optional)
                <input
                  type="number"
                  min="0"
                  placeholder="Current total"
                  value={daily[value].totalFollowers}
                  onChange={(e) =>
                    onDailyChange(value, 'totalFollowers', e.target.value)
                  }
                />
              </label>
            </div>
          ))}
          <div className="full row-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save daily growth'}
            </button>
          </div>
        </form>
      </section>

      <div className="grid-2" style={{ marginTop: '1.25rem' }}>
        <section className="panel">
          <h2>{editingId ? 'Edit entry' : 'Add single entry'}</h2>
          <form className="form-grid" onSubmit={onSingleSubmit}>
            <label>
              Platform
              <select
                name="platform"
                value={form.platform}
                onChange={onFormChange}
                required
              >
                {SOCIAL_MEDIA_PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Date
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={onFormChange}
                required
              />
            </label>
            <label>
              New followers
              <input
                type="number"
                min="0"
                name="newFollowers"
                value={form.newFollowers}
                onChange={onFormChange}
                required
              />
            </label>
            <label>
              Total followers (optional)
              <input
                type="number"
                min="0"
                name="totalFollowers"
                value={form.totalFollowers}
                onChange={onFormChange}
              />
            </label>
            <label className="full">
              Notes
              <textarea
                name="notes"
                rows="2"
                value={form.notes}
                onChange={onFormChange}
              />
            </label>
            <div className="full row-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {editingId ? 'Update' : 'Save entry'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-ghost" onClick={resetEdit}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="panel">
          <h2>Recent entries</h2>
          {loading ? (
            <p className="empty">Loading…</p>
          ) : records.length === 0 ? (
            <p className="empty">No social media entries yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Platform</th>
                    <th>New</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r._id}>
                      <td>{formatDate(r.date)}</td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: PLATFORM_COLORS[r.platform],
                            }}
                          />
                          {platformLabel(r.platform)}
                        </span>
                      </td>
                      <td>+{formatNumber(r.newFollowers)}</td>
                      <td>
                        {r.totalFollowers == null
                          ? '—'
                          : formatNumber(r.totalFollowers)}
                      </td>
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

export default UserSocialMedia;
