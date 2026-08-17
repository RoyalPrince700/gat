import { useEffect, useState } from 'react';
import api from '../api/client';
import { categoryLabel } from '../constants/smipay';
import { statusLabel, yesNoLabel } from '../constants/smeh';
import {
  BESTTECH_SLUG,
  projectStatusLabel,
  serviceLineLabel,
} from '../constants/besttech';
import {
  BEST_IN_PRINT_SLUG,
  jobStatusLabel,
  printTypeLabel,
} from '../constants/bestinprint';
import {
  OXYGEN_SLUG,
  bookingStatusLabel,
  bookingTypeLabel,
} from '../constants/oxygen';
import {
  TRIFONE_SLUG,
  productCategoryLabel,
  saleChannelLabel,
  saleStatusLabel,
} from '../constants/trifone';
import { ACCESSIBLE_SLUG } from '../constants/accessible';
import { useCompany } from '../context/CompanyContext';
import { formatDate, formatDateTime, formatMoney, formatNumber } from '../utils/format';

const UserRecords = () => {
  const { activeCompany } = useCompany();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isSmipay = activeCompany?.slug === 'smipay';
  const isSmeh = activeCompany?.slug === 'smart-edu-hub';
  const isBestTech = activeCompany?.slug === BESTTECH_SLUG;
  const isBestInPrint = activeCompany?.slug === BEST_IN_PRINT_SLUG;
  const isOxygen = activeCompany?.slug === OXYGEN_SLUG;
  const isTrifone = activeCompany?.slug === TRIFONE_SLUG;
  const isAccessible = activeCompany?.slug === ACCESSIBLE_SLUG;

  useEffect(() => {
    const load = async () => {
      if (!activeCompany) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const endpoint = isSmipay
          ? '/smipay'
          : isSmeh
            ? '/smeh'
            : isBestTech
              ? '/besttech'
              : isBestInPrint
                ? '/bestinprint'
                : isOxygen
                  ? '/oxygen'
                  : isTrifone
                    ? '/trifone'
                    : isAccessible
                      ? '/accessible/daily-totals'
                      : null;
        if (!endpoint) {
          setRecords([]);
          return;
        }
        const params =
          isBestTech || isBestInPrint || isOxygen || isTrifone
            ? { mine: '1' }
            : undefined;
        const { data } = await api.get(endpoint, { params });
        setRecords(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load records');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [
    activeCompany,
    isSmipay,
    isSmeh,
    isBestTech,
    isBestInPrint,
    isOxygen,
    isTrifone,
    isAccessible,
  ]);

  if (!activeCompany) {
    return (
      <div className="page">
        <p className="empty">No company assigned. Ask an admin to assign you.</p>
      </div>
    );
  }

  const entryLabel = isSmeh
    ? 'Subscriptions'
    : isBestTech
      ? 'Projects'
      : isBestInPrint
        ? 'Jobs'
        : isOxygen
          ? 'Bookings'
          : isTrifone
            ? 'Sales'
            : isAccessible
              ? 'Daily totals'
              : 'Transactions';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{activeCompany.name} records</h1>
          <p>
            {isSmeh
              ? 'All LMS subscription rows entered for Smart Edu Hub.'
              : isBestTech
                ? 'Your Best Technology IT project engagements.'
                : isBestInPrint
                  ? 'Your Best In Print jobs (books, fliers, and other print orders).'
                  : isOxygen
                    ? 'Your Oxygen FM airtime bookings and campaigns.'
                    : isTrifone
                      ? 'Your Trifone product sales for tablets, power banks, and smart electronics.'
                      : isAccessible
                        ? 'Company-wide daily totals logged for Accessible Publishers.'
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
            No records yet. Add from {entryLabel}.
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
                  ) : isBestTech ? (
                    <>
                      <th>Title</th>
                      <th>Client</th>
                      <th>Service line</th>
                      <th>Status</th>
                      <th>Contract</th>
                      <th>Logged</th>
                    </>
                  ) : isBestInPrint ? (
                    <>
                      <th>Title</th>
                      <th>Client</th>
                      <th>Print type</th>
                      <th>Status</th>
                      <th>Contract</th>
                      <th>Logged</th>
                    </>
                  ) : isOxygen ? (
                    <>
                      <th>Title</th>
                      <th>Advertiser</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Contract</th>
                      <th>Logged</th>
                    </>
                  ) : isTrifone ? (
                    <>
                      <th>Product</th>
                      <th>Customer</th>
                      <th>Category</th>
                      <th>Channel</th>
                      <th>Status</th>
                      <th>Amount</th>
                      <th>Logged</th>
                    </>
                  ) : isAccessible ? (
                    <>
                      <th>Date</th>
                      <th>Credit</th>
                      <th>Debit</th>
                      <th>Net</th>
                      <th>Print</th>
                      <th>Audio</th>
                      <th>E-books</th>
                      <th>Logged by</th>
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
                    ) : isBestTech ? (
                      <>
                        <td>{r.title}</td>
                        <td>{r.clientName}</td>
                        <td>{serviceLineLabel(r.serviceLine)}</td>
                        <td>{projectStatusLabel(r.status)}</td>
                        <td>{formatMoney(r.contractValue)}</td>
                        <td>{formatDate(r.date)}</td>
                      </>
                    ) : isBestInPrint ? (
                      <>
                        <td>{r.title}</td>
                        <td>{r.clientName}</td>
                        <td>{printTypeLabel(r.printType)}</td>
                        <td>{jobStatusLabel(r.status)}</td>
                        <td>{formatMoney(r.contractValue)}</td>
                        <td>{formatDate(r.date)}</td>
                      </>
                    ) : isOxygen ? (
                      <>
                        <td>{r.title}</td>
                        <td>{r.advertiserName}</td>
                        <td>{bookingTypeLabel(r.bookingType)}</td>
                        <td>{bookingStatusLabel(r.status)}</td>
                        <td>{formatMoney(r.contractValue)}</td>
                        <td>{formatDate(r.date)}</td>
                      </>
                    ) : isTrifone ? (
                      <>
                        <td>{r.title || r.productName || '—'}</td>
                        <td>{r.customerName}</td>
                        <td>{productCategoryLabel(r.productCategory)}</td>
                        <td>{saleChannelLabel(r.channel)}</td>
                        <td>{saleStatusLabel(r.status)}</td>
                        <td>{formatMoney(r.totalAmount)}</td>
                        <td>{formatDate(r.date)}</td>
                      </>
                    ) : isAccessible ? (
                      <>
                        <td>{formatDate(r.date)}</td>
                        <td>{formatMoney(r.totalCredit)}</td>
                        <td>{formatMoney(r.totalDebit || 0)}</td>
                        <td>
                          {formatMoney(
                            r.netTotal ??
                              (r.totalCredit || 0) - (r.totalDebit || 0)
                          )}
                        </td>
                        <td>
                          {formatMoney(
                            r.categories?.physical_print?.volume || 0
                          )}
                        </td>
                        <td>
                          {formatMoney(r.categories?.audio_books?.volume || 0)}
                        </td>
                        <td>
                          {formatMoney(r.categories?.ebooks?.volume || 0)}
                        </td>
                        <td>{r.createdBy?.name || '—'}</td>
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
