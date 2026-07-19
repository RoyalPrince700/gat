import { useEffect, useState } from 'react';
import api from '../api/client';
import { useCompany } from '../context/CompanyContext';

const emptyForm = {
  name: '',
  type: 'fintech',
  description: '',
};

const CompaniesPage = () => {
  const {
    companies,
    refreshCompanies,
    switchCompany,
    ALL_COMPANIES,
  } = useCompany();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    switchCompany(ALL_COMPANIES);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleCompanies = companies;

  useEffect(() => {
    refreshCompanies();
  }, [refreshCompanies]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const reset = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.put(`/companies/${editingId}`, form);
      } else {
        const { data } = await api.post('/companies', form);
        switchCompany(data);
      }
      reset();
      await refreshCompanies();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save company');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (company) => {
    setEditingId(company._id);
    setForm({
      name: company.name,
      type: company.type,
      description: company.description || '',
    });
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this company?')) return;
    try {
      await api.delete(`/companies/${id}`);
      await refreshCompanies();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Companies</h1>
          <p>
            Add and manage every company you track — Smipay, Smart Edu Hub, and
            more. Open a company workspace from the Companies hub to edit its
            data.
          </p>
        </div>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2>{editingId ? 'Edit company' : 'Add company'}</h2>
          <form className="form-grid" onSubmit={onSubmit}>
            <label className="full">
              Company name
              <input
                name="name"
                value={form.name}
                onChange={onChange}
                placeholder="e.g. Smipay"
                required
              />
            </label>
            <label className="full">
              Type
              <select name="type" value={form.type} onChange={onChange}>
                <option value="fintech">Fintech</option>
                <option value="education">Education</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="full">
              Description
              <textarea
                name="description"
                rows="3"
                value={form.description}
                onChange={onChange}
                placeholder="What growth metrics does this company track?"
              />
            </label>
            {error && <p className="error full">{error}</p>}
            <div className="full row-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Update company' : 'Add company'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-ghost" onClick={reset}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="panel">
          <h2>All companies ({visibleCompanies.length})</h2>
          {visibleCompanies.length === 0 ? (
            <p className="empty">No companies for this selection.</p>
          ) : (
            <div className="company-list">
              {visibleCompanies.map((c) => (
                <div key={c._id} className="company-row">
                  <div>
                    <strong>{c.name}</strong>
                    <p>{c.description || 'No description'}</p>
                    <span className="meta">{c.slug}</span>
                  </div>
                  <div className="row-actions stack-actions">
                    <span className="badge">{c.type}</span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        switchCompany(c);
                      }}
                    >
                      Use
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => onEdit(c)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => onDelete(c._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CompaniesPage;
