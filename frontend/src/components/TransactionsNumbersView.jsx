import { useMemo } from 'react';
import {
  categoryLabel,
  networkLabel,
  SMIPAY_CATEGORIES,
} from '../constants/smipay';
import { formatMoney, formatNumber, formatWeekLabel } from '../utils/format';

const WINDOW_LABELS = {
  '5h': 'the past 5 hours',
  '12h': 'the past 12 hours',
  '24h': 'the past 24 hours',
  '7d': 'the past 7 days',
  '30d': 'the past 30 days',
  today: 'today',
  yesterday: 'yesterday',
  week: 'this week',
  month: 'this month',
  custom: 'the selected custom range',
  all: 'all time',
};

const startOfWeek = (dateStr) => {
  const x = new Date(`${dateStr}T12:00:00`);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - diff);
  return x.toISOString().slice(0, 10);
};

const buildLast4Weeks = (trend = []) => {
  if (!trend.length) return [];
  const byWeek = {};
  trend.forEach((row) => {
    const week = startOfWeek(row.date);
    if (!byWeek[week]) {
      byWeek[week] = {
        week,
        volume: 0,
        transactions: 0,
        records: 0,
      };
    }
    byWeek[week].volume += row.volume || 0;
    byWeek[week].transactions += row.transactions || 0;
    byWeek[week].records += row.records || 0;
  });

  return Object.values(byWeek)
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-4);
};

const FigureLine = ({ children }) => (
  <li className="numbers-line">{children}</li>
);

const NumbersBlock = ({ title, children, empty }) => (
  <section className="panel numbers-block">
    <h2>{title}</h2>
    {empty ? <p className="empty">{empty}</p> : <ul className="numbers-list">{children}</ul>}
  </section>
);

const TransactionsNumbersView = ({ data, appliedWindow }) => {
  const summary = data?.summary;
  const windows = data?.windows || {};
  const last4Weeks = useMemo(() => buildLast4Weeks(data?.trend), [data?.trend]);
  const windowLabel = WINDOW_LABELS[appliedWindow] || 'this period';

  if (!summary) {
    return <p className="empty">No figures for this filter set.</p>;
  }

  const pendingShare = summary.recordCount
    ? ((summary.pendingCount || 0) / summary.recordCount) * 100
    : 0;

  const topCategory = (data.byCategory || []).find((c) => c.volume > 0);
  const topNetwork = (data.byNetwork || [])[0];
  const topChannel = (data.byChannel || [])[0];

  const weekTotal = last4Weeks.reduce(
    (acc, w) => {
      acc.volume += w.volume;
      acc.transactions += w.transactions;
      return acc;
    },
    { volume: 0, transactions: 0 }
  );

  return (
    <div className="stack numbers-view">
      <section className="panel numbers-hero">
        <h2>Plain-language summary</h2>
        <p className="numbers-lead">
          In <strong>{windowLabel}</strong>, Smipay processed{' '}
          <strong>{formatNumber(summary.totalTransactions)}</strong> transactions
          worth <strong>{formatMoney(summary.totalVolume)}</strong> across{' '}
          <strong>{formatNumber(summary.uniqueCustomers)}</strong> customers.
          Average ticket was <strong>{formatMoney(summary.averageTicket)}</strong>.
        </p>
        <ul className="numbers-list">
          <FigureLine>
            Successful: {formatNumber(summary.successfulCount || 0)} records (
            {formatMoney(summary.successfulVolume || 0)})
          </FigureLine>
          <FigureLine>
            Still pending: {formatNumber(summary.pendingCount || 0)} records (
            {formatMoney(summary.pendingVolume || 0)}) — {pendingShare.toFixed(1)}%
            of records
          </FigureLine>
          <FigureLine>
            Resolved: {formatNumber(summary.resolvedCount || 0)} records (
            {formatMoney(summary.resolvedVolume || 0)})
          </FigureLine>
          {topCategory && (
            <FigureLine>
              Top category: {categoryLabel(topCategory.category)} with{' '}
              {formatMoney(topCategory.volume)} ({topCategory.share.toFixed(1)}% of
              volume) from {formatNumber(topCategory.customers || 0)} customers
            </FigureLine>
          )}
          {topNetwork && (
            <FigureLine>
              Top network: {networkLabel(topNetwork.network)} with{' '}
              {formatMoney(topNetwork.volume)} across{' '}
              {formatNumber(topNetwork.transactions)} transactions by{' '}
              {formatNumber(topNetwork.customers || 0)} customers
            </FigureLine>
          )}
          {topChannel && (
            <FigureLine>
              Top channel: {topChannel.channel} with {formatMoney(topChannel.volume)}{' '}
              by {formatNumber(topChannel.customers || 0)} customers
            </FigureLine>
          )}
        </ul>
      </section>

      <NumbersBlock
        title="Last 4 weeks"
        empty={
          last4Weeks.length
            ? null
            : 'Not enough daily trend points to show weekly figures.'
        }
      >
        <FigureLine>
          Across the last {last4Weeks.length} week
          {last4Weeks.length === 1 ? '' : 's'} in this filtered data:{' '}
          <strong>{formatNumber(weekTotal.transactions)}</strong> transactions totaling{' '}
          <strong>{formatMoney(weekTotal.volume)}</strong>
        </FigureLine>
        {last4Weeks.map((w, i) => {
          const prev = last4Weeks[i - 1];
          let delta = '';
          if (prev && prev.volume > 0) {
            const pct = ((w.volume - prev.volume) / prev.volume) * 100;
            delta =
              pct === 0
                ? ' (flat vs previous week)'
                : pct > 0
                  ? ` (up ${pct.toFixed(1)}% vs previous week)`
                  : ` (down ${Math.abs(pct).toFixed(1)}% vs previous week)`;
          }
          return (
            <FigureLine key={w.week}>
              {formatWeekLabel(w.week)}: {formatNumber(w.transactions)}{' '}
              transactions,{' '}
              {formatMoney(w.volume)} volume{delta}
            </FigureLine>
          );
        })}
      </NumbersBlock>

      <NumbersBlock title="Quick window comparison">
        {[
          { key: '5h', label: 'Past 5 hours' },
          { key: '12h', label: 'Past 12 hours' },
          { key: '24h', label: 'Past 24 hours' },
          { key: '7d', label: 'Past 7 days' },
          { key: '30d', label: 'Past 30 days' },
          { key: 'today', label: 'Today' },
        ].map((w) => {
          const stats = windows[w.key] || {};
          return (
            <FigureLine key={w.key}>
              {w.label}: {formatMoney(stats.volume || 0)} volume ·{' '}
              {formatNumber(stats.transactions || 0)} transactions ·{' '}
              {formatNumber(stats.records || 0)} records
            </FigureLine>
          );
        })}
      </NumbersBlock>

      <NumbersBlock title="Volume by category">
        {SMIPAY_CATEGORIES.map((cat) => {
          const row = (data.byCategory || []).find((c) => c.category === cat.value);
          const volume = row?.volume || 0;
          if (!volume && !(row?.transactions || 0)) {
            return (
              <FigureLine key={cat.value}>
                {cat.label}: no activity in this window
              </FigureLine>
            );
          }
          return (
            <FigureLine key={cat.value}>
              {cat.label}: {formatMoney(volume)} volume ·{' '}
              {formatNumber(row?.transactions || 0)} transactions ·{' '}
              {formatNumber(row?.customers || 0)} customers ·{' '}
              {(row?.share || 0).toFixed(1)}% of total volume
            </FigureLine>
          );
        })}
      </NumbersBlock>

      <NumbersBlock
        title="Network performance"
        empty={
          data.byNetwork?.length
            ? null
            : 'No network activity (airtime/data) in this window.'
        }
      >
        {(data.byNetwork || []).map((row) => (
          <FigureLine key={row.network}>
            {networkLabel(row.network)}: {formatMoney(row.volume)} in volume ·{' '}
            {formatNumber(row.transactions)} transactions by{' '}
            {formatNumber(row.customers || 0)} customers ·{' '}
            {formatNumber(row.records)} records
          </FigureLine>
        ))}
      </NumbersBlock>

      <NumbersBlock
        title="Channel performance"
        empty={
          data.byChannel?.length ? null : 'No channel breakdown for this window.'
        }
      >
        {(data.byChannel || []).map((row) => (
          <FigureLine key={row.channel}>
            {row.channel}: {formatMoney(row.volume)} volume ·{' '}
            {formatNumber(row.transactions)} transactions by{' '}
            {formatNumber(row.customers || 0)} customers
          </FigureLine>
        ))}
      </NumbersBlock>

      <NumbersBlock
        title="Data plan mix"
        empty={
          data.byDataPlan?.length
            ? null
            : 'No data-plan purchases in this window.'
        }
      >
        {(data.byDataPlan || []).map((row) => (
          <FigureLine key={row.plan}>
            {row.plan}: {formatMoney(row.volume)} volume ·{' '}
            {formatNumber(row.transactions)} transactions by{' '}
            {formatNumber(row.customers || 0)} customers
          </FigureLine>
        ))}
      </NumbersBlock>

      <NumbersBlock
        title="Daily trend (figures)"
        empty={
          data.trend?.length ? null : 'No daily trend points for this filter set.'
        }
      >
        {(data.trend || [])
          .slice()
          .reverse()
          .slice(0, 14)
          .map((row) => (
            <FigureLine key={row.date}>
              {row.date}: {formatNumber(row.transactions)} transactions totaling{' '}
              {formatMoney(row.volume)}
            </FigureLine>
          ))}
        {(data.trend || []).length > 14 && (
          <FigureLine>
            Showing the most recent 14 days of {data.trend.length} trend days.
          </FigureLine>
        )}
      </NumbersBlock>

      <section className="panel numbers-block">
        <h2>Records snapshot</h2>
        <p className="numbers-lead">
          This filter set matches <strong>{formatNumber(data.pagination?.total || 0)}</strong>{' '}
          records. You are on page {data.pagination?.page || 1} of{' '}
          {data.pagination?.pages || 1}. Switch to Charts view to browse the table.
        </p>
      </section>
    </div>
  );
};

export default TransactionsNumbersView;
