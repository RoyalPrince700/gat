import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import api from '../api/client';
import { DEPARTMENT_PRESETS } from '../constants/performance';
import { useCompany } from '../context/CompanyContext';

const emptyForm = {
  name: '',
  department: '',
  company: '',
  jobTitle: '',
  email: '',
  phone: '',
  status: 'active',
  notes: '',
};

const AdminStaff = () => {
  const { companies, ALL_COMPANIES, switchCompany } = useCompany();
  const fileInputRef = useRef(null);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/staff');
      setStaff(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    switchCompany(ALL_COMPANIES);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const departments = useMemo(() => {
    const set = new Set(staff.map((s) => s.department).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [staff]);

  const visible = useMemo(() => {
    return staff.filter((s) => {
      if (filterStatus !== 'all' && (s.status || 'active') !== filterStatus) {
        return false;
      }
      if (filterDept !== 'all' && s.department !== filterDept) return false;
      if (filterCompany !== 'all') {
        if (filterCompany === 'none') {
          if (s.company?._id) return false;
        } else if (s.company?._id !== filterCompany) {
          return false;
        }
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = [
          s.name,
          s.department,
          s.jobTitle,
          s.email,
          s.company?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [staff, filterStatus, filterDept, filterCompany, search]);

  const activeCount = staff.filter((s) => s.status === 'active').length;
  const inactiveCount = staff.filter((s) => s.status === 'inactive').length;

  const onFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (s) => {
    setEditingId(s._id);
    setForm({
      name: s.name || '',
      department: s.department || '',
      company: s.company?._id || '',
      jobTitle: s.jobTitle || '',
      email: s.email || '',
      phone: s.phone || '',
      status: s.status || 'active',
      notes: s.notes || '',
    });
    setSuccess('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    const payload = {
      name: form.name.trim(),
      department: form.department.trim(),
      company: form.company || null,
      jobTitle: form.jobTitle.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      status: form.status,
      notes: form.notes.trim(),
    };
    try {
      if (editingId) {
        await api.put(`/staff/${editingId}`, payload);
        setSuccess('Staff member updated');
      } else {
        await api.post('/staff', payload);
        setSuccess('Staff member added');
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save staff');
    } finally {
      setSaving(false);
    }
  };

  const setInactive = async (id) => {
    if (!window.confirm('Mark this staff member inactive?')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/staff/${id}`);
      setSuccess('Staff marked inactive');
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update staff');
    }
  };

  const reactivate = async (id) => {
    setError('');
    setSuccess('');
    try {
      await api.put(`/staff/${id}`, { status: 'active' });
      setSuccess('Staff reactivated');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update staff');
    }
  };

  const downloadTemplate = async () => {
    setError('');
    try {
      const { data } = await api.get('/staff/template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'gat-staff-template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Could not download template'
      );
    }
  };

  const onPickFile = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    setError('');
    setSuccess('');
    setImportResult(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const { data } = await api.post('/staff/import', body);
      setImportResult(data);
      const parts = [
        `${data.imported || 0} imported`,
        `${data.updated || 0} updated`,
        `${data.skipped || 0} skipped`,
      ];
      setSuccess(`Upload finished — ${parts.join(', ')}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not import spreadsheet');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page page-full">
      <div className="page-header">
        <div>
          <h1>Staff directory</h1>
          <p>
            Company staff roster for MD performance assessments — not login
            accounts. Platform logins live under Users.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={downloadTemplate}
            disabled={uploading}
          >
            <Download size={16} strokeWidth={1.75} />
            Download template
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onPickFile}
            disabled={uploading}
          >
            <Upload size={16} strokeWidth={1.75} />
            {uploading ? 'Uploading…' : 'Upload Excel'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            style={{ display: 'none' }}
            onChange={onFileChange}
          />
        </div>
      </div>

      <p className="hint">
        Bulk upload is for the staff directory only (not user logins). Required
        columns: <strong>name</strong>, <strong>department</strong>. Optional:{' '}
        company (name or slug), jobTitle, email, phone, status (active/inactive),
        notes. Headers are flexible (e.g. Job Title). Rows with email update an
        existing record with that email; others create new staff. Max file size 5
        MB (.xlsx, .xls, or .csv).
      </p>

      {importResult && (
        <section className="panel">
          <div className="panel-head">
            <h2>Import result</h2>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setImportResult(null)}
            >
              Dismiss
            </button>
          </div>
          <div className="stats" style={{ marginBottom: '0.75rem' }}>
            <div className="stat">
              <div className="stat-label">Imported</div>
              <div className="stat-value">{importResult.imported || 0}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Updated</div>
              <div className="stat-value">{importResult.updated || 0}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Skipped</div>
              <div className="stat-value">{importResult.skipped || 0}</div>
            </div>
          </div>
          {importResult.errors?.length > 0 && (
            <>
              <p className="hint" style={{ marginTop: 0 }}>
                Row errors (first {Math.min(importResult.errors.length, 25)} of{' '}
                {importResult.errors.length}):
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {importResult.errors.slice(0, 25).map((err, i) => (
                  <li key={`${err.row}-${i}`}>
                    Row {err.row}: {err.message}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Total staff</div>
          <div className="stat-value">{staff.length}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Active</div>
          <div className="stat-value">{activeCount}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Inactive</div>
          <div className="stat-value">{inactiveCount}</div>
        </div>
      </div>

      <div className="page-stack">
        <section className="panel">
          <div className="panel-head">
            <h2>{editingId ? 'Edit staff member' : 'Add staff member'}</h2>
            {editingId && (
              <button type="button" className="btn btn-ghost" onClick={resetForm}>
                Cancel edit
              </button>
            )}
          </div>
          <form className="stack" onSubmit={onSubmit}>
            <div className="form-grid">
              <label>
                Name
                <input
                  name="name"
                  value={form.name}
                  onChange={onFormChange}
                  required
                  placeholder="Full name"
                />
              </label>
              <label>
                Department
                <input
                  name="department"
                  value={form.department}
                  onChange={onFormChange}
                  required
                  list="staff-dept-presets"
                  placeholder="e.g. Finance, Ops, Sales"
                />
                <datalist id="staff-dept-presets">
                  {DEPARTMENT_PRESETS.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </label>
              <label>
                Job title
                <input
                  name="jobTitle"
                  value={form.jobTitle}
                  onChange={onFormChange}
                  placeholder="Optional"
                />
              </label>
              <label>
                Company
                <select
                  name="company"
                  value={form.company}
                  onChange={onFormChange}
                >
                  <option value="">Optional / portfolio</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={onFormChange}
                  placeholder="Optional (not a login)"
                />
              </label>
              <label>
                Phone
                <input
                  name="phone"
                  value={form.phone}
                  onChange={onFormChange}
                  placeholder="Optional"
                />
              </label>
              <label>
                Status
                <select
                  name="status"
                  value={form.status}
                  onChange={onFormChange}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="full">
                Notes
                <input
                  name="notes"
                  value={form.notes}
                  onChange={onFormChange}
                  placeholder="Optional internal notes"
                />
              </label>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving
                ? 'Saving…'
                : editingId
                  ? 'Save changes'
                  : 'Add staff member'}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>All staff</h2>
            <div className="filters" style={{ marginBottom: 0, flexWrap: 'wrap' }}>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name…"
                aria-label="Search staff"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                aria-label="Filter by department"
              >
                <option value="all">All departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                aria-label="Filter by company"
              >
                <option value="all">All companies</option>
                <option value="none">No company</option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="error">{error}</p>}
          {success && (
            <p
              className="hint"
              style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}
            >
              {success}
            </p>
          )}

          {loading ? (
            <p className="empty">Loading staff…</p>
          ) : visible.length === 0 ? (
            <p className="empty">
              {staff.length === 0
                ? 'No staff yet. Add people above so MD can run assessments.'
                : 'No staff match these filters.'}
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Company</th>
                    <th>Job title</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((s) => {
                    const inactive = s.status === 'inactive';
                    return (
                      <tr key={s._id} style={inactive ? { opacity: 0.7 } : undefined}>
                        <td>
                          <strong>{s.name}</strong>
                          {s.email ? (
                            <div style={{ fontSize: '0.85em', opacity: 0.75 }}>
                              {s.email}
                            </div>
                          ) : null}
                        </td>
                        <td>{s.department}</td>
                        <td>{s.company?.name || '—'}</td>
                        <td>{s.jobTitle || '—'}</td>
                        <td>
                          <span
                            className={`badge badge-status ${
                              inactive ? 'badge-inactive' : 'badge-active'
                            }`}
                          >
                            {inactive ? 'Inactive' : 'Active'}
                          </span>
                        </td>
                        <td>
                          <div className="stack-actions">
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => startEdit(s)}
                            >
                              Edit
                            </button>
                            {inactive ? (
                              <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => reactivate(s._id)}
                              >
                                Reactivate
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => setInactive(s._id)}
                              >
                                Deactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminStaff;
