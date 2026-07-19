import { useEffect, useState } from 'react';
import api from '../api/client';
import { categoryLabel } from '../constants/smipay';
import { statusLabel, yesNoLabel } from '../constants/smeh';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatDateTime, formatMoney, formatNumber } from '../utils/format';

const UserRecords = () => {
  const { activeCompany } = useCompany();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isSmipay = activeCompany?.slug === 'smipay';
  const isSmeh = activeCompany?.slug === 'smart-edu-hub';

  useEffect(() => {
    const load = async () => {
      if (!activeCompany) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const endpoint = isSmipay ? '/smipay' : isSmeh ? '/smeh' : null;
        if (!endpoint) {
          setRecords([]);
          return;
        }
        const { data } = await api.get(endpoint);
        setRecords(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load records');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeCompany, isSmipay, isSmeh]);

  if (!activeCompany) {
    return (
      <div className="page">
        <p className="empty">No company assigned. Ask an admin to assign you.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{activeCompany.name} records</h1>
          <p>
            {isSmeh
              ? 'All LMS subscription rows entered for Smart Edu Hub.'
              : 'All growth rows entered for your company.'}
          </p>
        </div>
      </div>

      <section className="panel">
        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="empty">Loading…</p>
        ) : records.length === 0 ? (
          <p className="empty">
            No records yet. Add from{' '}
            {isSmeh ? 'Subscriptions' : 'Transactions'}.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {isSmipay ? (
                    <>
                      <th>Customer</th>
                      <th>Category</th>
                      <th>Transactions</th>
                      <th>Amount</th>
                      <th>Channel</th>
                      <th>Date & time</th>
                    </>
                  ) : (
                    <>
                      <th>School</th>
                      <th>Status</th>
                      <th>Amount</th>
                      <th>Started</th>
                      <th>Ends</th>
                      <th>Platform</th>
                      <th>Logged</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r._id}>
                    {isSmipay ? (
                      <>
                        <td>{r.customerName}</td>
                        <td>{categoryLabel(r.category)}</td>
                        <td>{formatNumber(r.transactionCount)}</td>
                        <td>{formatMoney(r.totalAmount)}</td>
                        <td>{r.channel}</td>
                        <td>{formatDateTime(r.date)}</td>
                      </>
                    ) : (
                      <>
                        <td>{r.schoolName}</td>
                        <td>{statusLabel(r.subscriptionStatus)}</td>
                        <td>{formatMoney(r.amount)}</td>
                        <td>{formatDate(r.startedAt)}</td>
                        <td>{formatDate(r.endsAt)}</td>
                        <td>{yesNoLabel(r.platformInUse)}</td>
                        <td>{formatDate(r.date)}</td>
                      </>
                    )}
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

export default UserRecords;
