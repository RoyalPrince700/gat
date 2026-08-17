import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import {
  TRIFONE_SLUG,
  acquisitionSourceLabel,
  customerTypeLabel,
  productCategoryLabel,
} from '../constants/trifone';
import { adminCompanyPath } from '../constants/themes';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatMoney, formatNumber } from '../utils/format';

const AdminTrifoneCustomers = () => {
  const { activeCompany } = useCompany();
  const [customers, setCustomers] = useState([]);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);

  const slug = activeCompany?.slug;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/trifone/customers');
      setCustomers(data?.customers || []);
      setOverview(data?.overview || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug === TRIFONE_SLUG) load();
  }, [slug]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    api
      .get(`/trifone/customers/${selectedId}`)
      .then(({ data }) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  if (!activeCompany || slug !== TRIFONE_SLUG) {
    return (
      <div className="page">
        <p className="empty">Customers are available for Trifone.</p>
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
          <h1>Customers</h1>
          <p>Channel partners and key accounts for Trifone products.</p>
        </div>
      </div>

      {overview && (
        <div className="stats">
          <div className="stat">
            <div className="stat-label">Customers</div>
            <div className="stat-value">
              {formatNumber(overview.totalCustomers)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Sales</div>
            <div className="stat-value">
              {formatNumber(overview.totalSales)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Revenue</div>
            <div className="stat-value">
              {formatMoney(overview.totalRevenue)}
            </div>
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <div className="page-stack">
        <section className="panel">
          <h2>All customers</h2>
          {loading ? (
            <p className="empty">Loading…</p>
          ) : customers.length === 0 ? (
            <p className="empty">No customers yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Source</th>
                    <th>Sales</th>
                    <th>Revenue</th>
                    <th>First contact</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr
                      key={c._id}
                      className={selectedId === c._id ? 'row-selected' : ''}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedId(c._id)}
                    >
                      <td>{c.name}</td>
                      <td>{customerTypeLabel(c.customerType)}</td>
                      <td>{acquisitionSourceLabel(c.acquisitionSource)}</td>
                      <td>{formatNumber(c.saleCount || 0)}</td>
                      <td>{formatMoney(c.revenue)}</td>
                      <td>{formatDate(c.firstContactAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Customer detail</h2>
          {!selectedId ? (
            <p className="empty">Select a customer to see sales.</p>
          ) : !detail ? (
            <p className="empty">Loading…</p>
          ) : (
            <>
              <p>
                <strong>{detail.customer.name}</strong>
                {detail.customer.customerType
                  ? ` · ${customerTypeLabel(detail.customer.customerType)}`
                  : ''}
                {detail.customer.contactName
                  ? ` · ${detail.customer.contactName}`
                  : ''}
              </p>
              {detail.sales.length === 0 ? (
                <p className="empty">No sales for this customer.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Logged</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.sales.map((r) => (
                        <tr key={r._id}>
                          <td>{r.title || r.productName || '—'}</td>
                          <td>{productCategoryLabel(r.productCategory)}</td>
                          <td>{formatMoney(r.totalAmount)}</td>
                          <td>{formatDate(r.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminTrifoneCustomers;
