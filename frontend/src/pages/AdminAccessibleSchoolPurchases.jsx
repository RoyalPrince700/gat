import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Upload } from 'lucide-react';
import api from '../api/client';
import {
  ACCESSIBLE_SEASONS,
  ACCESSIBLE_SLUG,
  inferSeasonFromFilename,
} from '../constants/accessible';
import { adminCompanyPath } from '../constants/themes';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { formatMoney, formatNumber } from '../utils/format';

const AdminAccessibleSchoolPurchases = () => {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const fileInputRef = useRef(null);
  const isAdmin = user?.role === 'admin';

  const [items, setItems] = useState([]);
  const [bySchool, setBySchool] = useState([]);
  const [summary, setSummary] = useState({
    rowCount: 0,
    schoolCount: 0,
    totalAmount: 0,
    bySeason: [],
  });
  const [filterSeason, setFilterSeason] = useState('all');
  const [uploadSeason, setUploadSeason] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('schools');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const slug = activeCompany?.slug;

  const load = async (season = filterSeason) => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (season && season !== 'all') params.season = season;
      const { data } = await api.get('/accessible/purchases', { params });
      setItems(data.items || []);
      setBySchool(data.bySchool || []);
      setSummary(
        data.summary || {
          rowCount: 0,
          schoolCount: 0,
          totalAmount: 0,
          bySeason: [],
        }
      );
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to load school purchases'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug === ACCESSIBLE_SLUG) load(filterSeason);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, filterSeason]);

  const q = search.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    if (!q) return items;
    return items.filter((row) =>
      String(row.schoolName || '')
        .toLowerCase()
        .includes(q)
    );
  }, [items, q]);

  const filteredSchools = useMemo(() => {
    if (!q) return bySchool;
    return bySchool.filter((row) =>
      String(row.schoolName || '')
        .toLowerCase()
        .includes(q)
    );
  }, [bySchool, q]);

  const kpis = useMemo(() => {
    if (!q) {
      return {
        schools: summary.schoolCount || 0,
        rows: summary.rowCount || 0,
        total: summary.totalAmount || 0,
      };
    }
    const keys = new Set();
    let total = 0;
    for (const row of filteredItems) {
      keys.add(String(row.schoolName || '').trim().toLowerCase());
      total += row.amount || 0;
    }
    return { schools: keys.size, rows: filteredItems.length, total };
  }, [q, summary, filteredItems]);

  const onPickFile = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const inferred = inferSeasonFromFilename(file.name);
    if (inferred && !uploadSeason) {
      setUploadSeason(inferred);
    }
    const season = uploadSeason || inferred;
    if (!season) {
      setError(
        'Select a season before uploading (or use a filename like 2023-2024 SEASON.xlsx)'
      );
      setSuccess('');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');
    setImportResult(null);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('season', season);
      body.append('mode', 'replace');
      const { data } = await api.post('/accessible/purchases/import', body);
      setImportResult(data);
      const parts = [
        `${data.imported || 0} imported`,
        `${data.skipped || 0} skipped`,
      ];
      if (data.replaced) {
        parts.push(`${data.replaced} previous ${season} rows replaced`);
      }
      setSuccess(
        `Upload finished for ${season} — ${parts.join(', ')}. Total ${formatMoney(
          data.totalAmount || 0
        )}.`
      );
      if (filterSeason === season) {
        await load(season);
      } else {
        setFilterSeason(season);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not import spreadsheet');
    } finally {
      setUploading(false);
    }
  };

  const seasonToDelete =
    uploadSeason || (filterSeason !== 'all' ? filterSeason : '');

  const clearSeason = async (seasonOverride) => {
    if (!isAdmin) return;
    const target = seasonOverride || seasonToDelete;
    if (!target) {
      setError('Select a season to delete (2023-2024, 2024-2025, or 2025-2026)');
      setSuccess('');
      return;
    }
    if (
      !window.confirm(
        `Delete all school purchase rows for ${target}? This cannot be undone. Other seasons are not affected.`
      )
    ) {
      return;
    }
    setClearing(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await api.delete('/accessible/purchases', {
        params: { season: target },
      });
      setSuccess(
        `Deleted ${data.deleted || 0} rows for ${target}. Other seasons were left as they are.`
      );
      setImportResult(null);
      await load(filterSeason);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete season data');
    } finally {
      setClearing(false);
    }
  };

  if (!activeCompany || slug !== ACCESSIBLE_SLUG) {
    return (
      <div className="page">
        <p className="empty">
          School purchases are available for Accessible Publishers.
        </p>
      </div>
    );
  }

  const emptyAll = !loading && items.length === 0 && !q;
  const tableRows = view === 'schools' ? filteredSchools : filteredItems;
  const emptyFiltered = !loading && !emptyAll && tableRows.length === 0;

  return (
    <div className="page page-full">
      <Link to={adminCompanyPath(slug, 'overview')} className="back-to-hub">
        ← Overview
      </Link>
      <div className="page-header">
        <div>
          <h1>School purchases</h1>
          <p>
            Historical school book-purchase amounts for loyalty analysis — not
            daily totals. Upload one academic season at a time.
          </p>
        </div>
        {isAdmin && (
          <div className="page-header-actions">
            <label style={{ margin: 0 }}>
              Season
              <select
                value={uploadSeason}
                onChange={(e) => setUploadSeason(e.target.value)}
                disabled={uploading || clearing}
              >
                <option value="">Select season…</option>
                {ACCESSIBLE_SEASONS.map((season) => (
                  <option key={season} value={season}>
                    {season}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onPickFile}
              disabled={uploading || clearing}
            >
              <Upload size={16} strokeWidth={1.75} />
              {uploading ? 'Uploading…' : 'Upload data'}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => clearSeason()}
              disabled={uploading || clearing}
            >
              <Trash2 size={16} strokeWidth={1.75} />
              {clearing ? 'Deleting…' : 'Delete season'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              style={{ display: 'none' }}
              onChange={onFileChange}
            />
          </div>
        )}
      </div>

      {isAdmin && (
        <p className="hint" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
          Re-uploading a season <strong>replaces</strong> that year&apos;s rows so
          totals stay honest. Filename like <code>2023-2024 SEASON.xlsx</code> can
          pre-select the year. School names are cleaned (customer-care text after{' '}
          <code>;</code> or <code>(</code> is dropped). Max 10 MB.
        </p>
      )}

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {importResult && (
        <section className="panel">
          <div className="panel-head">
            <h2>Import result — {importResult.season}</h2>
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
              <div className="stat-value">
                {formatNumber(importResult.imported || 0)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Skipped</div>
              <div className="stat-value">
                {formatNumber(importResult.skipped || 0)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Replaced</div>
              <div className="stat-value">
                {formatNumber(importResult.replaced || 0)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Season total</div>
              <div className="stat-value">
                {formatMoney(importResult.totalAmount || 0)}
              </div>
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
          <div className="stat-label">Schools</div>
          <div className="stat-value">{formatNumber(kpis.schools)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Rows</div>
          <div className="stat-value">{formatNumber(kpis.rows)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total amount</div>
          <div className="stat-value">{formatMoney(kpis.total)}</div>
        </div>
      </div>

      {filterSeason === 'all' && summary.bySeason?.length > 0 && !q && (
        <div className="stats">
          {summary.bySeason.map((row) => (
            <div className="stat" key={row.season}>
              <div className="stat-label">{row.season}</div>
              <div className="stat-value">{formatMoney(row.totalAmount)}</div>
            </div>
          ))}
        </div>
      )}

      <section className="panel">
        <div className="form-grid" style={{ marginBottom: '1rem' }}>
          <label>
            Season
            <select
              value={filterSeason}
              onChange={(e) => setFilterSeason(e.target.value)}
            >
              <option value="all">All</option>
              {ACCESSIBLE_SEASONS.map((season) => (
                <option key={season} value={season}>
                  {season}
                </option>
              ))}
            </select>
          </label>
          <label>
            View
            <select value={view} onChange={(e) => setView(e.target.value)}>
              <option value="schools">By school (totals)</option>
              <option value="rows">Line items</option>
            </select>
          </label>
          <label>
            Search
            <input
              type="search"
              placeholder="School name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        {loading ? (
          <p className="empty">Loading…</p>
        ) : emptyAll ? (
          <p className="empty">
            {isAdmin
              ? `No school purchase history yet. Upload the ${ACCESSIBLE_SEASONS[0]}, ${ACCESSIBLE_SEASONS[1]}, and ${ACCESSIBLE_SEASONS[2]} season Excel files to build loyalty spend totals.`
              : `No school purchase history yet. An admin can upload the ${ACCESSIBLE_SEASONS[0]}, ${ACCESSIBLE_SEASONS[1]}, and ${ACCESSIBLE_SEASONS[2]} season files.`}
          </p>
        ) : emptyFiltered ? (
          <p className="empty">No schools match this filter.</p>
        ) : view === 'schools' ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>School</th>
                  <th>Seasons</th>
                  <th>Rows</th>
                  <th>Total paid</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.map((row) => (
                  <tr key={`${row.schoolName}-${(row.seasons || []).join(',')}`}>
                    <td>{row.schoolName}</td>
                    <td>{(row.seasons || []).join(', ') || '—'}</td>
                    <td>{formatNumber(row.rowCount)}</td>
                    <td>{formatMoney(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>School</th>
                  <th>Amount</th>
                  <th>Season</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((row) => (
                  <tr key={row._id}>
                    <td>{row.schoolName}</td>
                    <td>{formatMoney(row.amount)}</td>
                    <td>{row.season}</td>
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

export default AdminAccessibleSchoolPurchases;
