import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import {
  PRODUCT_CATEGORIES,
  SALE_STATUSES,
  TRIFONE_SLUG,
  productCategoryLabel,
  saleChannelLabel,
  saleStatusLabel,
} from '../constants/trifone';
import { adminCompanyPath } from '../constants/themes';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney, formatNumber } from '../utils/format';

const AdminTrifoneSales = () => {
  const { activeCompany } = useCompany();
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState('all');
  const [productCategory, setProductCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const slug = activeCompany?.slug;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (status !== 'all') params.status = status;
      if (productCategory !== 'all') params.productCategory = productCategory;
      const { data } = await api.get('/trifone', { params });
      setRecords(data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug === TRIFONE_SLUG) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, status, productCategory]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        String(r.customerName || '')
          .toLowerCase()
          .includes(q) ||
        String(r.title || '')
          .toLowerCase()
          .includes(q) ||
        String(r.productName || '')
          .toLowerCase()
          .includes(q)
    );
  }, [records, search]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        acc.count += 1;
        if (r.status !== 'cancelled') {
          acc.revenue += r.totalAmount || 0;
          acc.quantity += r.quantity || 0;
        }
        if (r.status === 'confirmed') acc.confirmed += 1;
        if (r.status === 'delivered') acc.delivered += 1;
        return acc;
      },
      { count: 0, revenue: 0, quantity: 0, confirmed: 0, delivered: 0 }
    );
  }, [filtered]);

  if (!activeCompany || slug !== TRIFONE_SLUG) {
    return (
      <div className="page">
        <p className="empty">Sales are available for Trifone.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to={adminCompanyPath(slug, 'overview')} className="back-to-hub">
        ← Overview
      </Link>
      <div className="page-header">
        <div>
          <h1>Sales</h1>
          <p>
            Product sales across tablets, power banks, and smart electronics.
          </p>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Shown</div>
          <div className="stat-value">{formatNumber(totals.count)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Confirmed</div>
          <div className="stat-value">{formatNumber(totals.confirmed)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Delivered</div>
          <div className="stat-value">{formatNumber(totals.delivered)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Revenue</div>
          <div className="stat-value">{formatMoney(totals.revenue)}</div>
        </div>
      </div>

      <section className="panel">
        <div className="form-grid" style={{ marginBottom: '1rem' }}>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              {SALE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Product category
            <select
              value={productCategory}
              onChange={(e) => setProductCategory(e.target.value)}
            >
              <option value="all">All</option>
              {PRODUCT_CATEGORIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="full">
            Search
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Customer, label, or product"
            />
          </label>
        </div>

        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="empty">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="empty">No sales match.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Label / product</th>
                  <th>Customer</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r._id}>
                    <td>{r.title || r.productName || '—'}</td>
                    <td>{r.customerName}</td>
                    <td>{productCategoryLabel(r.productCategory)}</td>
                    <td>{formatNumber(r.quantity || 0)}</td>
                    <td>{saleChannelLabel(r.channel)}</td>
                    <td>
                      <span className={`badge badge-status badge-${r.status}`}>
                        {saleStatusLabel(r.status)}
                      </span>
                    </td>
                    <td>{formatMoney(r.totalAmount)}</td>
                    <td>{formatDate(r.date)}</td>
                    <td>{r.createdBy?.name || '—'}</td>
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

export default AdminTrifoneSales;
