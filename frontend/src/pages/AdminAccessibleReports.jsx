import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileText, Pencil, Plus, Save, X } from 'lucide-react';
import api from '../api/client';
import DepartmentReportView from '../components/DepartmentReportView';
import {
  ACCESSIBLE_DEPARTMENTS,
  ACCESSIBLE_SLUG,
} from '../constants/accessible';
import { adminCompanyPath, pathToCompanySlug } from '../constants/themes';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { formatDate } from '../utils/format';

const emptyCreate = () => {
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return {
    department: ACCESSIBLE_DEPARTMENTS[0].id,
    period,
    title: '',
    copyFromCurrent: true,
  };
};

const AdminAccessibleReports = () => {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { companySlug: pathSlug } = useParams();
  const isAdmin = user?.role === 'admin';

  const [reports, setReports] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [period, setPeriod] = useState('');
  const [department, setDepartment] = useState(ACCESSIBLE_DEPARTMENTS[0].id);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: '', periodLabel: '', content: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate);

  const slug = pathToCompanySlug(pathSlug) || activeCompany?.slug;

  const load = async (preferredPeriod) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/accessible/department-reports');
      const list = data.reports || [];
      const periodList = data.periods || [];
      setReports(list);
      setPeriods(periodList);

      const nextPeriod =
        preferredPeriod && periodList.includes(preferredPeriod)
          ? preferredPeriod
          : periodList[0] || '';
      setPeriod(nextPeriod);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load department reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug === ACCESSIBLE_SLUG) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const periodReports = useMemo(
    () => reports.filter((r) => r.period === period),
    [reports, period]
  );

  const activeReport = useMemo(
    () => periodReports.find((r) => r.department === department) || null,
    [periodReports, department]
  );

  useEffect(() => {
    setEditing(false);
    setSuccess('');
    if (activeReport) {
      setDraft({
        title: activeReport.title || '',
        periodLabel: activeReport.periodLabel || '',
        content: activeReport.content || '',
      });
    } else {
      setDraft({ title: '', periodLabel: '', content: '' });
    }
  }, [activeReport?._id]);

  const startEdit = () => {
    if (!isAdmin || !activeReport) return;
    setDraft({
      title: activeReport.title || '',
      periodLabel: activeReport.periodLabel || '',
      content: activeReport.content || '',
    });
    setEditing(true);
    setSuccess('');
    setError('');
  };

  const cancelEdit = () => {
    setEditing(false);
    if (activeReport) {
      setDraft({
        title: activeReport.title || '',
        periodLabel: activeReport.periodLabel || '',
        content: activeReport.content || '',
      });
    }
  };

  const saveEdit = async () => {
    if (!isAdmin || !activeReport) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await api.put(
        `/accessible/department-reports/${activeReport._id}`,
        draft
      );
      setReports((prev) =>
        prev.map((r) => (r._id === data._id ? data : r))
      );
      setEditing(false);
      setSuccess('Report updated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save report');
    } finally {
      setSaving(false);
    }
  };

  const createReport = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        department: createForm.department,
        period: createForm.period,
        title: createForm.title.trim() || undefined,
      };
      if (createForm.copyFromCurrent && activeReport) {
        payload.copyFromId = activeReport._id;
      }
      const { data } = await api.post('/accessible/department-reports', payload);
      setShowCreate(false);
      setCreateForm(emptyCreate());
      setSuccess('New period report created.');
      await load(data.period);
      setDepartment(data.department);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create report');
    } finally {
      setSaving(false);
    }
  };

  if (slug !== ACCESSIBLE_SLUG) {
    return (
      <div className="page">
        <p className="empty">
          Department reports are available for Accessible Publishers.
        </p>
      </div>
    );
  }

  return (
    <div className="page page-full">
      <Link to={adminCompanyPath(slug, 'overview')} className="back-to-hub">
        ← Overview
      </Link>
      <div className="page-header">
        <div>
          <h1>Department reports</h1>
          <p>
            Monthly performance reports for Admin / HR, System control, and
            Customer service. {isAdmin ? 'Admins can update each report.' : 'View only.'}
          </p>
        </div>
        {isAdmin && (
          <div className="page-header-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setCreateForm({
                  ...emptyCreate(),
                  department,
                });
                setShowCreate((v) => !v);
              }}
            >
              <Plus size={16} />
              New period
            </button>
            {activeReport && !editing && (
              <button type="button" className="btn btn-primary" onClick={startEdit}>
                <Pencil size={16} />
                Update report
              </button>
            )}
            {editing && (
              <>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={saveEdit}
                  disabled={saving}
                >
                  <Save size={16} />
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {isAdmin && showCreate && (
        <section className="panel" style={{ marginBottom: '1rem' }}>
          <div className="panel-head">
            <h2>Create report for a new month</h2>
          </div>
          <form className="form-grid" onSubmit={createReport}>
            <label>
              Department
              <select
                value={createForm.department}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    department: e.target.value,
                  }))
                }
              >
                {ACCESSIBLE_DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Period (YYYY-MM)
              <input
                type="month"
                value={createForm.period}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    period: e.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="full">
              Title (optional)
              <input
                type="text"
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="Leave blank to use the default department title"
              />
            </label>
            <label className="full" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={createForm.copyFromCurrent}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    copyFromCurrent: e.target.checked,
                  }))
                }
              />
              Copy content from the currently selected report (as a starting draft)
            </label>
            <div className="full row-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Creating…' : 'Create report'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowCreate(false)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel" style={{ marginBottom: '1rem' }}>
        <div className="form-grid">
          <label>
            Month
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              disabled={!periods.length}
            >
              {!periods.length && <option value="">No periods yet</option>}
              {periods.map((p) => {
                const sample = reports.find((r) => r.period === p);
                return (
                  <option key={p} value={p}>
                    {sample?.periodLabel || p}
                  </option>
                );
              })}
            </select>
          </label>
        </div>
      </section>

      <div className="analytics-tabs" role="tablist" aria-label="Departments">
        {ACCESSIBLE_DEPARTMENTS.map((d) => {
          const has = periodReports.some((r) => r.department === d.id);
          return (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={department === d.id}
              className={`analytics-tab${department === d.id ? ' active' : ''}`}
              onClick={() => setDepartment(d.id)}
            >
              {d.shortLabel}
              {!has && period ? ' · —' : ''}
            </button>
          );
        })}
      </div>

      {loading && <p className="empty">Loading reports…</p>}

      {!loading && !activeReport && (
        <div className="panel" style={{ marginTop: '1rem' }}>
          <p className="empty" style={{ margin: 0 }}>
            <FileText size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            No report for this department in the selected month.
            {isAdmin
              ? ' Use “New period” to add one, or pick another month.'
              : ' Ask an admin to publish an update.'}
          </p>
        </div>
      )}

      {!loading && activeReport && (
        <article className="panel report-panel" style={{ marginTop: '1rem' }}>
          <div className="panel-head">
            <div>
              <h2 className="report-panel-title">
                {editing ? draft.title || 'Untitled report' : activeReport.title}
              </h2>
              <p className="muted" style={{ margin: 0 }}>
                {activeReport.departmentLabel}
                {' · '}
                {editing
                  ? draft.periodLabel || activeReport.period
                  : activeReport.periodLabel || activeReport.period}
                {activeReport.updatedAt
                  ? ` · Updated ${formatDate(activeReport.updatedAt)}`
                  : ''}
                {activeReport.updatedBy?.name
                  ? ` by ${activeReport.updatedBy.name}`
                  : ''}
              </p>
            </div>
          </div>

          {editing ? (
            <div className="form-grid report-edit">
              <label className="full">
                Title
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </label>
              <label>
                Period label
                <input
                  type="text"
                  value={draft.periodLabel}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      periodLabel: e.target.value,
                    }))
                  }
                  placeholder="e.g. August 2026"
                />
              </label>
              <label className="full">
                Report body (Markdown)
                <textarea
                  rows={28}
                  value={draft.content}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, content: e.target.value }))
                  }
                  spellCheck
                />
              </label>
            </div>
          ) : (
            <DepartmentReportView content={activeReport.content} />
          )}
        </article>
      )}
    </div>
  );
};

export default AdminAccessibleReports;
