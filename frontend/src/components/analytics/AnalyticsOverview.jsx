import { formatMoney, formatNumber } from '../../utils/format';

const AnalyticsOverview = ({ overview }) => {
  if (!overview) return null;

  const cards = [
    { label: 'Total volume', value: formatMoney(overview.totalVolume) },
    { label: 'Transactions', value: formatNumber(overview.totalTransactions) },
    { label: 'Deposit', value: formatMoney(overview.depositVolume) },
    { label: 'Airtime', value: formatMoney(overview.airtimeVolume) },
    { label: 'Data', value: formatMoney(overview.dataVolume) },
    { label: 'Users added', value: formatNumber(overview.usersAdded) },
    { label: 'Users activated', value: formatNumber(overview.usersActivated) },
    {
      label: 'Deposit→spend 7d',
      value: `${(overview.depositSpend7dPct ?? 0).toFixed(1)}%`,
    },
    {
      label: '2nd txn rate',
      value: `${(overview.secondTxnRatePct ?? 0).toFixed(1)}%`,
    },
    {
      label: 'Pending rate',
      value: `${(overview.pendingRatePct ?? 0).toFixed(1)}%`,
    },
    {
      label: 'Top 10% share',
      value: `${(overview.top10SharePct ?? 0).toFixed(1)}%`,
    },
    {
      label: 'Avg ticket',
      value: formatMoney(overview.averageTicket || 0),
    },
  ];

  return (
    <div className="stats analytics-overview-stats">
      {cards.map((c) => (
        <div className="stat" key={c.label}>
          <div className="stat-label">{c.label}</div>
          <div className="stat-value">{c.value}</div>
        </div>
      ))}
    </div>
  );
};

export default AnalyticsOverview;
