import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'user',
  company: '',
};

const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const { companies, activeCompany, isAllCompanies, switchCompany, ALL_COMPANIES } =
    useCompany();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    switchCompany(ALL_COMPANIES);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAllCompanies && activeCompany?._id) {
      setForm((prev) => ({
        ...prev,
        company: prev.company || activeCompany._id,
      }));
    }
  }, [isAllCompanies, activeCompany]);

  const visibleUsers = useMemo(() => {
    if (filter === 'pending') {
      return users.filter((u) => (u.status || 'active') === 'pending');
    }
    if (filter === 'admins') return users.filter((u) => u.role === 'admin');
    if (filter === 'team') return users.filter((u) => u.role === 'user');
    if (filter === 'company' && activeCompany && !isAllCompanies) {
      return users.filter(
        (u) =>
          u.company?._id === activeCompany._id ||
          u.company?.slug === activeCompany.slug
      );
    }
    return users;
  }, [users, filter, activeCompany, isAllCompanies]);

  const teamCount = users.filter((u) => u.role === 'user').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const pendingCount = users.filter(
    (u) => (u.status || 'active') === 'pending'
  ).length;

  const updateUser = async (id, patch) => {
    setError('');
    setSuccess('');
    try {
      const { data } = await api.put(`/users/${id}`, patch);
      const activated =
        (users.find((u) => u._id === id)?.status || 'active') === 'pending' &&
        (data.status || 'active') === 'active';
      setSuccess(
        activated
          ? `${data.name} is now active and can sign in to the platform`
          : 'User updated'
      );
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    }
  };

  const onFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        company: form.company || null,
      };
      await api.post('/users', payload);
      setForm({
        ...emptyForm,
        company: !isAllCompanies && activeCompany?._id ? activeCompany._id : '',
      });
      setSuccess('Team member added');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Team members</h1>
          <p>
            {users.length} people on the site — {teamCount} team member
            {teamCount === 1 ? '' : 's'}, {adminCount} admin
            {adminCount === 1 ? '' : 's'}
            {pendingCount > 0
              ? `, ${pendingCount} waiting for role assignment`
              : ''}
            . Assign roles and companies below.
          </p>
        </div>
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h2>Add team member</h2>
          </div>
          <form className="stack" onSubmit={onCreate}>
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
                Email
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={onFormChange}
                  required
                  placeholder="name@example.com"
                />
              </label>
              <label>
                Temporary password
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={onFormChange}
                  required
                  minLength={6}
                  placeholder="Min. 6 characters"
                />
              </label>
              <label>
                Role
                <select name="role" value={form.role} onChange={onFormChange}>
                  <option value="user">Team member</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label className="full">
                Company
                <select
                  name="company"
                  value={form.company}
                  onChange={onFormChange}
                  required={form.role === 'user'}
                >
                  <option value="">
                    {form.role === 'admin' ? 'Optional' : 'Select company'}
                  </option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Adding…' : 'Add member'}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>All members</h2>
            <div className="filters" style={{ marginBottom: 0 }}>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filter members"
              >
                <option value="all">Everyone</option>
                <option value="pending">
                  Pending approval{pendingCount ? ` (${pendingCount})` : ''}
                </option>
                <option value="team">Team members</option>
                <option value="admins">Admins</option>
                {!isAllCompanies && activeCompany && (
                  <option value="company">{activeCompany.name} only</option>
                )}
              </select>
            </div>
          </div>

          {error && <p className="error">{error}</p>}
          {success && (
            <p className="hint" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
              {success}
            </p>
          )}

          {loading ? (
            <p className="empty">Loading team members…</p>
          ) : visibleUsers.length === 0 ? (
            <p className="empty">No members match this filter.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Role</th>
                    <th>Company</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((u) => {
                    const isPending = (u.status || 'active') === 'pending';
                    return (
                    <tr key={u._id}>
                      <td>
                        {u.name}
                        {currentUser?._id === u._id ? ' (you)' : ''}
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span
                          className={`badge badge-status ${isPending ? 'badge-pending' : 'badge-active'}`}
                        >
                          {isPending ? 'Pending' : 'Active'}
                        </span>
                      </td>
                      <td>
                        <select
                          value={u.role}
                          onChange={(e) => {
                            const role = e.target.value;
                            if (
                              role === 'user' &&
                              !u.company?._id &&
                              !isPending
                            ) {
                              setError(
                                `Assign a company to ${u.name} before setting Team member role`
                              );
                              return;
                            }
                            updateUser(u._id, { role });
                          }}
                          aria-label={`Role for ${u.name}`}
                        >
                          <option value="user">Team member</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>
                        <select
                          value={u.company?._id || ''}
                          onChange={(e) =>
                            updateUser(u._id, {
                              company: e.target.value || null,
                            })
                          }
                          aria-label={`Company for ${u.name}`}
                        >
                          <option value="">Unassigned</option>
                          {companies.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
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

export default UsersPage;
