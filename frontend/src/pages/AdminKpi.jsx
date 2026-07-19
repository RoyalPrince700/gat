import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { emptyKpiForm, KPI_STATUS_LABELS } from '../constants/kpi';
import { useCompany } from '../context/CompanyContext';
import { formatMoney, formatNumber } from '../utils/format';

const formatValue = (value, unit) => {
  if (unit === 'money') return formatMoney(value);
  return formatNumber(value);
};

const periodShort = {
  day: 'Today',
  week: 'This week',
  month: 'This month',
};

const AdminKpi = () => {
  const { activeCompany } = useCompany();
  const [meta, setMeta] = useState(null);
  const [kpis, setKpis] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(emptyKpiForm);
  const [editingId, setEditingId] = useState(null);
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const showSmipay = activeCompany?.slug === 'smipay';

  const selectedMetric = useMemo(
    () => meta?.metrics?.find((m) => m.value === form.metric),
    [meta, form.metric]
  );

  const load = async () => {
    if (!showSmipay) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [metaRes, listRes] = await Promise.all([
        api.get('/smipay/kpi/meta'),
        api.get('/smipay/kpi'),
      ]);
      setMeta(metaRes.data);
      setKpis(listRes.data.kpis || []);
      setSummary(listRes.data.summary || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load KPIs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSmipay]);

  const visibleKpis = useMemo(() => {
    return kpis.filter((kpi) => {
      if (filterPeriod !== 'all' && kpi.period !== filterPeriod) return false;
      if (filterStatus === 'active' && !kpi.active) return false;
      if (filterStatus === 'inactive' && kpi.active) return false;
      if (
        ['met', 'on_track', 'at_risk', 'behind'].includes(filterStatus) &&
        kpi.result?.status !== filterStatus
      ) {
        return false;
      }
      return true;
    });
  }, [kpis, filterPeriod, filterStatus]);

  const onFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm(emptyKpiForm);
    setEditingId(null);
  };

  const onEdit = (kpi) => {
    setEditingId(kpi._id);
    setForm({
      name: kpi.name || '',
      metric: kpi.metric,
      period: kpi.period,
      target: String(kpi.target ?? ''),
      platform: kpi.platform || 'all',
      category: kpi.category || 'deposit',
      notes: kpi.notes || '',
      active: kpi.active !== false,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      name: form.name.trim(),
      metric: form.metric,
      period: form.period,
      target: Number(form.target),
      platform: form.platform,
      category: form.metric === 'category_volume' ? form.category : undefined,
      notes: form.notes.trim(),
      active: form.active,
    };

    try {
      if (editingId) {
        await api.put(`/smipay/kpi/${editingId}`, payload);
        setSuccess('KPI updated');
      } else {
        await api.post('/smipay/kpi', payload);
        setSuccess('KPI added');
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onToggleActive = async (kpi) => {
    try {
      await api.put(`/smipay/kpi/${kpi._id}`, { active: !kpi.active });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update KPI');
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this KPI?')) return;
    try {
      await api.delete(`/smipay/kpi/${id}`);
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  if (!showSmipay) {
    return (
      <div className="page">
        <p className="empty">
          KPI tracking is available when All or Smipay is selected.
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>KPI targets</h1>
          <p>
            Set targets for new users, transaction volume, social followers, and
            more — then compare live results for today, this week, and this
            month.
          </p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {summary && (
        <div className="stats">
          <div className="stat">
            <div className="stat-label">Active KPIs</div>
            <div className="stat-value">{formatNumber(summary.active)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Met</div>
            <div className="stat-value kpi-status-met">
              {formatNumber(summary.met)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">On track</div>
            <div className="stat-value kpi-status-on_track">
              {formatNumber(summary.onTrack)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Behind / at risk</div>
            <div className="stat-value kpi-status-behind">
              {formatNumber((summary.behind || 0) + (summary.atRisk || 0))}
            </div>
          </div>
        </div>
      )}

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h2>{editingId ? 'Edit KPI' : 'Add KPI'}</h2>
          </div>
          <form className="stack" onSubmit={onSubmit}>
            <div className="form-grid">
              <label>
                Metric
                <select
                  name="metric"
                  value={form.metric}
                  onChange={onFormChange}
                  required
                >
                  {(meta?.metrics || []).map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Period
                <select
                  name="period"
                  value={form.period}
                  onChange={onFormChange}
                  required
                >
                  {(meta?.periods || []).map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Target
                <input
                  name="target"
                  type="number"
                  min="0"
                  step="any"
                  value={form.target}
                  onChange={onFormChange}
                  required
                  placeholder={
                    selectedMetric?.unit === 'money' ? 'e.g. 500000' : 'e.g. 50'
                  }
                />
              </label>
              <label>
                Display name
                <input
                  name="name"
                  value={form.name}
                  onChange={onFormChange}
                  placeholder="Auto-filled if blank"
                />
              </label>
              {selectedMetric?.supportsPlatform && (
                <label>
                  Platform
                  <select
                    name="platform"
                    value={form.platform}
                    onChange={onFormChange}
                  >
                    {(meta?.platforms || []).map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {selectedMetric?.supportsCategory && (
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
              )}
              <label className="full">
                Notes
                <input
                  name="notes"
                  value={form.notes}
                  onChange={onFormChange}
                  placeholder="Optional context for this target"
                />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  name="active"
                  checked={form.active}
                  onChange={onFormChange}
                />
                Active (included in scoreboard)
              </label>
            </div>
            {selectedMetric?.description && (
              <p className="muted-note">{selectedMetric.description}</p>
            )}
            <div className="row-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Update KPI' : 'Add KPI'}
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
            <h2>How comparison works</h2>
          </div>
          <ul className="kpi-help-list">
            <li>
              <strong>Per day</strong> — actuals for today vs your daily target.
            </li>
            <li>
              <strong>Per week</strong> — Monday–Sunday window (so far) vs weekly
              target.
            </li>
            <li>
              <strong>Per month</strong> — calendar month (so far) vs monthly
              target.
            </li>
            <li>
              Status uses pace: if you are ahead of elapsed time, you are on
              track even before the period ends.
            </li>
            <li>
              Previous period is shown so you can see week-over-week /
              month-over-month movement.
            </li>
          </ul>
        </section>
      </div>

      <div className="filters panel" style={{ marginTop: '1.25rem' }}>
        <label>
          Period
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
          >
            <option value="all">All periods</option>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
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
          Refresh results
        </button>
      </div>

      {loading ? (
        <p className="empty">Loading KPIs…</p>
      ) : visibleKpis.length === 0 ? (
        <p className="empty">
          No KPIs yet. Add targets for new users, volume, or social followers
          above.
        </p>
      ) : (
        <div className="kpi-grid">
          {visibleKpis.map((kpi) => {
            const r = kpi.result || {};
            const status = r.status || 'behind';
            const barWidth = Math.min(100, Math.max(0, r.progressPct || 0));
            return (
              <article
                key={kpi._id}
                className={`kpi-card${kpi.active ? '' : ' kpi-card-inactive'}`}
              >
                <div className="kpi-card-top">
                  <div>
                    <div className="kpi-card-name">{kpi.name}</div>
                    <div className="kpi-card-meta">
                      {r.metricLabel || kpi.metric} ·{' '}
                      {periodShort[kpi.period] || kpi.period}
                      {!kpi.active && ' · Inactive'}
                    </div>
                  </div>
                  <span className={`kpi-badge kpi-badge-${status}`}>
                    {KPI_STATUS_LABELS[status] || status}
                  </span>
                </div>

                <div className="kpi-compare">
                  <div>
                    <div className="stat-label">Actual</div>
                    <div className="kpi-actual">
                      {formatValue(r.actual, r.unit)}
                    </div>
                  </div>
                  <div>
                    <div className="stat-label">Target</div>
                    <div className="kpi-target">
                      {formatValue(r.target, r.unit)}
                    </div>
                  </div>
                  <div>
                    <div className="stat-label">Progress</div>
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
                    Remaining{' '}
                    {formatValue(r.remaining, r.unit)}
                    {r.elapsedPct != null && (
                      <> · {formatNumber(r.elapsedPct)}% of period elapsed</>
                    )}
                  </span>
                  <span>
                    Prev period: {formatValue(r.previousActual, r.unit)}
                  </span>
                </div>

                {kpi.notes && <p className="kpi-notes">{kpi.notes}</p>}

                <div className="row-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => onEdit(kpi)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => onToggleActive(kpi)}
                  >
                    {kpi.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => onDelete(kpi._id)}
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

export default AdminKpi;
