import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { emptyCostForm, COST_STATUS_LABELS } from '../constants/costs';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney, formatNumber } from '../utils/format';

const formatCac = (value) => {
  if (value == null || !Number.isFinite(value)) return '—';
  return formatMoney(value);
};

const AdminCosts = () => {
  const { activeCompany } = useCompany();
  const [meta, setMeta] = useState(null);
  const [costs, setCosts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(emptyCostForm);
  const [editingId, setEditingId] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quickActual, setQuickActual] = useState({});

  const showSmipay = activeCompany?.slug === 'smipay';

  const selectedCategory = useMemo(
    () => meta?.categories?.find((c) => c.value === form.category),
    [meta, form.category]
  );

  const previewExpectedCac = useMemo(() => {
    const amount = Number(form.amount);
    const expected = Number(form.expectedUsers);
    if (!Number.isFinite(amount) || !Number.isFinite(expected) || expected <= 0) {
      return null;
    }
    return amount / expected;
  }, [form.amount, form.expectedUsers]);

  const load = async () => {
    if (!showSmipay) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [metaRes, listRes] = await Promise.all([
        api.get('/smipay/costs/meta'),
        api.get('/smipay/costs'),
      ]);
      setMeta(metaRes.data);
      setCosts(listRes.data.costs || []);
      setSummary(listRes.data.summary || null);
      const nextQuick = {};
      for (const c of listRes.data.costs || []) {
        nextQuick[c._id] = String(c.actualUsers ?? 0);
      }
      setQuickActual(nextQuick);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load costs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSmipay]);

  const visibleCosts = useMemo(() => {
    return costs.filter((cost) => {
      if (filterCategory !== 'all' && cost.category !== filterCategory) {
        return false;
      }
      if (filterStatus === 'active' && !cost.active) return false;
      if (filterStatus === 'inactive' && cost.active) return false;
      if (
        ['met', 'on_track', 'at_risk', 'behind'].includes(filterStatus) &&
        cost.result?.status !== filterStatus
      ) {
        return false;
      }
      return true;
    });
  }, [costs, filterCategory, filterStatus]);

  const onFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm(emptyCostForm);
    setEditingId(null);
  };

  const onEdit = (cost) => {
    setEditingId(cost._id);
    setForm({
      label: cost.label || '',
      category: cost.category || 'activation',
      amount: String(cost.amount ?? ''),
      expectedUsers: String(cost.expectedUsers ?? ''),
      actualUsers: String(cost.actualUsers ?? 0),
      startDate: cost.startDate ? formatDate(cost.startDate) : '',
      endDate: cost.endDate ? formatDate(cost.endDate) : '',
      notes: cost.notes || '',
      active: cost.active !== false,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      label: form.label.trim(),
      category: form.category,
      amount: Number(form.amount),
      expectedUsers: Number(form.expectedUsers),
      actualUsers: Number(form.actualUsers) || 0,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      notes: form.notes.trim(),
      active: form.active,
    };

    try {
      if (editingId) {
        await api.put(`/smipay/costs/${editingId}`, payload);
        setSuccess('Cost updated');
      } else {
        await api.post('/smipay/costs', payload);
        setSuccess('Cost added');
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onToggleActive = async (cost) => {
    try {
      await api.put(`/smipay/costs/${cost._id}`, { active: !cost.active });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update cost');
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this cost line?')) return;
    try {
      await api.delete(`/smipay/costs/${id}`);
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  const onSaveActualUsers = async (costId) => {
    const value = Number(quickActual[costId]);
    if (!Number.isFinite(value) || value < 0) {
      setError('Actual users must be a non-negative number');
      return;
    }
    setError('');
    setSuccess('');
    try {
      await api.patch(`/smipay/costs/${costId}/actual-users`, {
        actualUsers: value,
      });
      setSuccess('Actual users updated');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update actual users');
    }
  };

  if (!showSmipay) {
    return (
      <div className="page">
        <p className="empty">
          Cost tracking is available when All or Smipay is selected.
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Costs & CAC</h1>
          <p>
            Log activation and growth spend with expected user KPIs. Track
            actual users as they come in to monitor CAC and whether each line
            is meeting its target.
          </p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {summary && (
        <div className="stats">
          <div className="stat">
            <div className="stat-label">Total spend</div>
            <div className="stat-value">{formatMoney(summary.totalSpend)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Blended expected CAC</div>
            <div className="stat-value">
              {formatCac(summary.blendedExpectedCac)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Blended actual CAC</div>
            <div className="stat-value">
              {formatCac(summary.blendedActualCac)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Users (actual / expected)</div>
            <div className="stat-value">
              {formatNumber(summary.totalActualUsers)} /{' '}
              {formatNumber(summary.totalExpectedUsers)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">KPI progress</div>
            <div
              className={`stat-value kpi-status-${
                summary.overallProgressPct >= 100
                  ? 'met'
                  : summary.overallProgressPct >= 70
                    ? 'on_track'
                    : summary.overallProgressPct >= 40
                      ? 'at_risk'
                      : 'behind'
              }`}
            >
              {formatNumber(summary.overallProgressPct || 0)}%
            </div>
          </div>
        </div>
      )}

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h2>{editingId ? 'Edit cost' : 'Add cost'}</h2>
          </div>
          <form className="stack" onSubmit={onSubmit}>
            <div className="form-grid">
              <label>
                Label
                <input
                  name="label"
                  value={form.label}
                  onChange={onFormChange}
                  required
                  placeholder="e.g. Marketing Partnership"
                />
              </label>
              <label>
                Category
                <select
                  name="category"
                  value={form.category}
                  onChange={onFormChange}
                  required
                >
                  {(meta?.categories || []).map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cost (NGN)
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="any"
                  value={form.amount}
                  onChange={onFormChange}
                  required
                  placeholder="e.g. 100000"
                />
              </label>
              <label>
                Expected users (KPI)
                <input
                  name="expectedUsers"
                  type="number"
                  min="0"
                  step="1"
                  value={form.expectedUsers}
                  onChange={onFormChange}
                  required
                  placeholder="e.g. 5000"
                />
              </label>
              <label>
                Actual users so far
                <input
                  name="actualUsers"
                  type="number"
                  min="0"
                  step="1"
                  value={form.actualUsers}
                  onChange={onFormChange}
                  placeholder="0"
                />
              </label>
              <label>
                Start date
                <input
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={onFormChange}
                />
              </label>
              <label>
                End date
                <input
                  name="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={onFormChange}
                />
              </label>
              <label className="full">
                Notes
                <input
                  name="notes"
                  value={form.notes}
                  onChange={onFormChange}
                  placeholder="Optional context for this spend"
                />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  name="active"
                  checked={form.active}
                  onChange={onFormChange}
                />
                Active (included in CAC totals)
              </label>
            </div>
            {selectedCategory?.description && (
              <p className="muted-note">{selectedCategory.description}</p>
            )}
            {previewExpectedCac != null && (
              <p className="muted-note">
                Expected CAC:{' '}
                <strong>{formatMoney(previewExpectedCac)}</strong> per user
              </p>
            )}
            <div className="row-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Update cost' : 'Add cost'}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>How CAC works here</h2>
          </div>
          <ul className="kpi-help-list">
            <li>
              <strong>Expected CAC</strong> = cost ÷ expected users (your
              planned acquisition cost).
            </li>
            <li>
              <strong>Actual CAC</strong> = cost ÷ actual users so far. Update
              actual users as acquisitions come in.
            </li>
            <li>
              If actual CAC is <em>lower</em> than expected, you are beating the
              plan (more users for the same spend).
            </li>
            <li>
              Compare blended actual CAC to cohort LTV (ARPU) in Analytics →
              Growth OS to judge unit economics.
            </li>
            <li>
              Example: ₦100,000 for 5,000 users → expected CAC ₦20. Update
              actual users to see if you are on track.
            </li>
          </ul>
          {summary?.categoryBreakdown?.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                By category
              </h3>
              <ul className="kpi-help-list">
                {summary.categoryBreakdown.map((row) => (
                  <li key={row.category}>
                    <strong>{row.label}</strong> — {formatMoney(row.spend)} ·
                    CAC {formatCac(row.actualCac)} actual /{' '}
                    {formatCac(row.expectedCac)} expected ·{' '}
                    {formatNumber(row.progressPct)}% of KPI
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <div className="filters panel" style={{ marginTop: '1.25rem' }}>
        <label>
          Category
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {(meta?.categories || []).map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All</option>
            <option value="active">Active only</option>
            <option value="met">Met</option>
            <option value="on_track">On track</option>
            <option value="at_risk">At risk</option>
            <option value="behind">Behind</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <button type="button" className="btn btn-ghost" onClick={load}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="empty">Loading costs…</p>
      ) : visibleCosts.length === 0 ? (
        <p className="empty">
          No costs yet. Add a spend line with label, amount, and expected users
          above.
        </p>
      ) : (
        <div className="kpi-grid">
          {visibleCosts.map((cost) => {
            const r = cost.result || {};
            const status = r.status || 'behind';
            const barWidth = Math.min(100, Math.max(0, r.progressPct || 0));
            return (
              <article
                key={cost._id}
                className={`kpi-card${cost.active ? '' : ' kpi-card-inactive'}`}
              >
                <div className="kpi-card-top">
                  <div>
                    <div className="kpi-card-name">{cost.label}</div>
                    <div className="kpi-card-meta">
                      {r.categoryLabel || cost.category}
                      {!cost.active && ' · Inactive'}
                      {cost.startDate && (
                        <> · from {formatDate(cost.startDate)}</>
                      )}
                    </div>
                  </div>
                  <span className={`kpi-badge kpi-badge-${status}`}>
                    {COST_STATUS_LABELS[status] || status}
                  </span>
                </div>

                <div className="kpi-compare">
                  <div>
                    <div className="stat-label">Spend</div>
                    <div className="kpi-actual">{formatMoney(r.amount)}</div>
                  </div>
                  <div>
                    <div className="stat-label">Expected CAC</div>
                    <div className="kpi-target">{formatCac(r.expectedCac)}</div>
                  </div>
                  <div>
                    <div className="stat-label">Actual CAC</div>
                    <div className="kpi-progress-num">
                      {formatCac(r.actualCac)}
                    </div>
                  </div>
                </div>

                <div className="kpi-compare" style={{ marginTop: '0.75rem' }}>
                  <div>
                    <div className="stat-label">Actual users</div>
                    <div className="kpi-actual">
                      {formatNumber(r.actualUsers)}
                    </div>
                  </div>
                  <div>
                    <div className="stat-label">Expected users</div>
                    <div className="kpi-target">
                      {formatNumber(r.expectedUsers)}
                    </div>
                  </div>
                  <div>
                    <div className="stat-label">KPI progress</div>
                    <div className="kpi-progress-num">
                      {formatNumber(r.progressPct || 0)}%
                    </div>
                  </div>
                </div>

                <div className="kpi-bar-track" aria-hidden="true">
                  <div
                    className={`kpi-bar-fill kpi-bar-${status}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                <div className="kpi-foot">
                  <span>
                    {formatNumber(r.usersRemaining || 0)} users remaining to hit
                    KPI
                  </span>
                  {r.cacDeltaPct != null && (
                    <span>
                      {r.cacDeltaPct >= 0
                        ? `${formatNumber(r.cacDeltaPct)}% better than plan`
                        : `${formatNumber(Math.abs(r.cacDeltaPct))}% worse than plan`}
                    </span>
                  )}
                </div>

                <div
                  className="row-actions"
                  style={{ marginTop: '0.75rem', alignItems: 'flex-end' }}
                >
                  <label style={{ flex: 1, minWidth: '8rem' }}>
                    Update actual users
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={quickActual[cost._id] ?? ''}
                      onChange={(e) =>
                        setQuickActual((prev) => ({
                          ...prev,
                          [cost._id]: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onSaveActualUsers(cost._id)}
                  >
                    Save users
                  </button>
                </div>

                {cost.notes && <p className="kpi-notes">{cost.notes}</p>}

                <div className="row-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => onEdit(cost)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => onToggleActive(cost)}
                  >
                    {cost.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => onDelete(cost._id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminCosts;
