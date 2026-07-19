import {
  acquisitionLabel,
  categoryLabel,
  failureReasonLabel,
  networkLabel,
  paymentMethodLabel,
} from '../../constants/smipay';
import { formatMoney, formatNumber, formatWeekLabel } from '../../utils/format';

const FigureLine = ({ children }) => (
  <li className="numbers-line">{children}</li>
);

const NumbersBlock = ({ title, id, children, empty }) => (
  <section className="panel numbers-block" id={id}>
    <h2>{title}</h2>
    {empty ? (
      <p className="empty">{empty}</p>
    ) : (
      <ul className="numbers-list">{children}</ul>
    )}
  </section>
);

const outOf = (num, den) =>
  `${formatNumber(num || 0)} out of ${formatNumber(den || 0)}`;

const wowText = (pct) => {
  if (pct == null || pct === 0) return 'about the same as last week';
  return pct > 0
    ? `${pct.toFixed(1)}% more volume than last week`
    : `${Math.abs(pct).toFixed(1)}% less volume than last week`;
};

const NetworkLines = ({ label, rows, totalBuyers, product }) => {
  if (!rows?.length) {
    return (
      <FigureLine>
        {label}: nobody bought {product} in this window.
      </FigureLine>
    );
  }

  return (
    <>
      <FigureLine>
        <strong>{label}</strong> — among {formatNumber(totalBuyers || 0)} users
        who bought {product}:
      </FigureLine>
      {rows.map((n) => (
        <FigureLine key={`${label}-${n.network}`}>
          {outOf(n.uniqueCustomers, totalBuyers)} users bought{' '}
          {networkLabel(n.network)} ({formatMoney(n.volume)} ·{' '}
          {formatNumber(n.transactions)} transactions)
        </FigureLine>
      ))}
    </>
  );
};

const CategoryNumbers = ({ title, id, section, showNetwork }) => {
  if (!section) return null;
  const s = section.summary || {};
  const last4 = section.last4Weeks || [];
  const last4Txn = last4.reduce((n, w) => n + (w.transactions || 0), 0);
  const last4Vol = last4.reduce((n, w) => n + (w.volume || 0), 0);
  const topAmount = [...(section.byAmountRange || [])]
    .filter((r) => r.transactions > 0)
    .sort((a, b) => b.volume - a.volume)[0];
  const topTod = [...(section.byTimeOfDay || [])]
    .filter((r) => r.transactions > 0)
    .sort((a, b) => b.transactions - a.transactions)[0];
  const topChannel = (section.byChannel || [])[0];
  const product = title.toLowerCase();
  const buyers = section.byNetwork?.buyers || {};

  return (
    <NumbersBlock title={title} id={id}>
      <FigureLine>
        In this range, users made{' '}
        <strong>{formatNumber(s.transactions || 0)}</strong> {product}{' '}
        transactions worth <strong>{formatMoney(s.volume || 0)}</strong>. Typical
        purchase size was {formatMoney(s.averageTicket || 0)} ({wowText(s.wowVolumePct)}
        ).
      </FigureLine>
      <FigureLine>
        Over the last 4 weeks alone: {formatNumber(last4Txn)} {product}{' '}
        transactions totaling {formatMoney(last4Vol)}.
      </FigureLine>
      {last4.map((w, i) => {
        const prev = last4[i - 1];
        let delta = '';
        if (prev && prev.volume > 0) {
          const pct = ((w.volume - prev.volume) / prev.volume) * 100;
          delta =
            pct === 0
              ? ' — same as the week before'
              : pct > 0
                ? ` — ${pct.toFixed(1)}% more than the week before`
                : ` — ${Math.abs(pct).toFixed(1)}% less than the week before`;
        }
        return (
          <FigureLine key={w.period}>
            {formatWeekLabel(w.period)}: {formatNumber(w.transactions)} {product}{' '}
            transactions · {formatMoney(w.volume)}
            {delta}
          </FigureLine>
        );
      })}
      {showNetwork && (
        <>
          <NetworkLines
            label="Network — last 24 hours"
            rows={section.byNetwork?.h24}
            totalBuyers={buyers.h24}
            product={product}
          />
          <NetworkLines
            label="Network — past 7 days"
            rows={section.byNetwork?.week}
            totalBuyers={buyers.week}
            product={product}
          />
          <NetworkLines
            label="Network — past 30 days"
            rows={section.byNetwork?.month}
            totalBuyers={buyers.month}
            product={product}
          />
        </>
      )}
      {topAmount && (
        <FigureLine>
          Most money came from the {topAmount.label} range —{' '}
          {formatMoney(topAmount.volume)} across{' '}
          {formatNumber(topAmount.transactions)} transactions.
        </FigureLine>
      )}
      {(section.byAmountRange || [])
        .filter((r) => r.transactions > 0)
        .map((r) => (
          <FigureLine key={r.bucket}>
            {r.label}: {formatMoney(r.volume)} · {formatNumber(r.transactions)}{' '}
            transactions
          </FigureLine>
        ))}
      {topTod && (
        <FigureLine>
          Peak buying time was {topTod.label}, with{' '}
          {formatNumber(topTod.transactions)} transactions (
          {formatMoney(topTod.volume)}).
        </FigureLine>
      )}
      {(section.byTimeOfDay || [])
        .filter((r) => r.transactions > 0)
        .map((r) => (
          <FigureLine key={r.timeOfDay}>
            {r.label}: {formatNumber(r.transactions)} transactions ·{' '}
            {formatMoney(r.volume)}
          </FigureLine>
        ))}
      {topChannel && (
        <FigureLine>
          Top channel was {topChannel.channel} — {formatMoney(topChannel.volume)}{' '}
          · {formatNumber(topChannel.transactions)} transactions.
        </FigureLine>
      )}
      {(section.byDataPlan || []).slice(0, 8).map((p) => (
        <FigureLine key={p.plan}>
          Data plan {p.plan}: {formatMoney(p.volume)} ·{' '}
          {formatNumber(p.transactions)} transactions
        </FigureLine>
      ))}
    </NumbersBlock>
  );
};

const AnalyticsNumbersView = ({ data }) => {
  if (!data?.overview || !data?.sections) {
    return <p className="empty">No analytics figures available.</p>;
  }

  const { overview, sections, range } = data;
  const g = sections.growth || {};
  const fromLabel = range?.from ? String(range.from).slice(0, 10) : '—';
  const toLabel = range?.to ? String(range.to).slice(0, 10) : '—';

  const depositSpend = g.depositSpend?.summary || {};
  const secondTxn = g.secondTxn?.summary || {};
  const activation = sections.activationRate?.summary || {};
  const usersAdded = sections.usersAdded?.summary || {};
  const usersActivated = sections.usersActivated?.summary || {};
  const dormancy = g.dormancy?.summary || {};
  const pending = g.pendingAging?.summary || {};
  const concentration = g.concentration?.summary || {};
  const categoryAttach = g.categoryAttach?.summary || {};
  const retention = sections.retentionRate?.summary || {};

  const joinedForSecond = secondTxn.joined || 0;
  const withSecond = secondTxn.withSecondTxn || 0;
  const withFirst = secondTxn.withFirstTxn || 0;
  const joinedForActivation = activation.joined || 0;
  const activatedEver = activation.activatedEver || 0;
  const activated7d = activation.activatedWithin7d || 0;
  const totalCustomers = overview.customerCount || dormancy.total || 0;

  return (
    <div className="stack numbers-view analytics-deep">
      <section className="panel numbers-hero" id="overview">
        <h2>Plain-language overview</h2>
        <p className="numbers-lead">
          From <strong>{fromLabel}</strong> to <strong>{toLabel}</strong>, Smipay
          processed <strong>{formatNumber(overview.totalTransactions)}</strong>{' '}
          transactions worth <strong>{formatMoney(overview.totalVolume)}</strong>.{' '}
          <strong>{formatNumber(overview.activeCustomers)}</strong> out of{' '}
          {formatNumber(overview.customerCount)} registered users were active
          (they made at least one transaction). Average purchase size was{' '}
          {formatMoney(overview.averageTicket)}.
        </p>
        <ul className="numbers-list">
          <FigureLine>
            Money split: Deposit {formatMoney(overview.depositVolume)} · Airtime{' '}
            {formatMoney(overview.airtimeVolume)} · Data{' '}
            {formatMoney(overview.dataVolume)}
          </FigureLine>
          <FigureLine>
            {formatNumber(overview.usersAdded)} users signed up in this range ·{' '}
            {formatNumber(overview.usersActivated)} users were activated (they
            carried out their first transaction)
          </FigureLine>
          <FigureLine>
            {outOf(depositSpend.spentWithin7d, depositSpend.deposits)} deposits
            were followed by a spend within 7 days
          </FigureLine>
          <FigureLine>
            {outOf(withSecond, joinedForSecond)} users who joined made a second
            transaction
          </FigureLine>
          <FigureLine>
            {(overview.pendingRatePct ?? 0).toFixed(1)}% of records are still
            pending · Top 10% of customers drive{' '}
            {(overview.top10SharePct ?? 0).toFixed(1)}% of volume
          </FigureLine>
        </ul>
      </section>

      <NumbersBlock title="Alerts" id="alerts">
        {(g.alerts || []).length ? (
          (g.alerts || []).map((a) => (
            <FigureLine key={a.id}>
              [{a.severity}] {a.title}: {a.message}
            </FigureLine>
          ))
        ) : (
          <FigureLine>No alerts right now.</FigureLine>
        )}
      </NumbersBlock>

      <NumbersBlock title="Growth — what matters most" id="growth">
        <FigureLine>
          {outOf(depositSpend.spentWithin7d, depositSpend.deposits)} deposits
          were spent within 7 days (users put money in, then used it)
        </FigureLine>
        <FigureLine>
          {outOf(depositSpend.spentWithin24h, depositSpend.deposits)} deposits
          were spent within 24 hours
        </FigureLine>
        <FigureLine>
          {outOf(withFirst, joinedForSecond)} users who joined carried out their
          first transaction (activated)
        </FigureLine>
        <FigureLine>
          {outOf(withSecond, joinedForSecond)} users who joined made their second
          transaction
          {secondTxn.medianishHoursToSecond
            ? ` — typically about ${secondTxn.medianishHoursToSecond} hours after the first`
            : ''}
        </FigureLine>
        <FigureLine>
          {outOf(dormancy.dormant30Plus, totalCustomers)} registered users have
          been dormant for 30+ days (no recent transaction)
        </FigureLine>
        {(g.dormancy?.bands || []).map((b) => (
          <FigureLine key={b.band}>
            {outOf(b.count, totalCustomers)} users — {b.label.toLowerCase()}
          </FigureLine>
        ))}
        <FigureLine>
          Active users touch about {g.northStars?.avgCategories ?? 0} product
          categories on average
        </FigureLine>
        {(g.categoryAttach?.buckets || []).map((b) => (
          <FigureLine key={b.label}>
            {outOf(b.count, categoryAttach.activeCustomers)} active users used{' '}
            {b.label.toLowerCase()}
          </FigureLine>
        ))}
        <FigureLine>
          {outOf(
            concentration.top10Count,
            concentration.customers || overview.activeCustomers
          )}{' '}
          highest-volume customers (top 10%) drive{' '}
          {(concentration.top10SharePct ?? 0).toFixed(1)}% of all volume
        </FigureLine>
      </NumbersBlock>

      <NumbersBlock
        title="Channel quality"
        empty={
          g.channelQuality?.length ? null : 'No channel data in this range.'
        }
      >
        {(g.channelQuality || []).map((row) => (
          <FigureLine key={row.channel}>
            {row.channel}: {formatMoney(row.volume)} across{' '}
            {formatNumber(row.transactions)} transactions from{' '}
            {formatNumber(row.uniqueCustomers)} users
            {row.activatedCustomers != null
              ? ` — ${outOf(row.activatedCustomers, row.uniqueCustomers)} of those users are activated`
              : ''}
            · {row.pendingRatePct}% still pending
          </FigureLine>
        ))}
      </NumbersBlock>

      <NumbersBlock title="Pending & reliability">
        <FigureLine>
          {formatNumber(pending.pending || 0)} records are pending right now ·{' '}
          {formatNumber(pending.openOver24h || 0)} have been open over 24 hours
        </FigureLine>
        <FigureLine>
          Average time to resolve is {pending.avgResolveHours ?? 0} hours ·{' '}
          {(pending.pendingRatePct ?? 0).toFixed(1)}% of records in range are
          pending
        </FigureLine>
        {(g.failureReasons || []).map((r) => (
          <FigureLine key={r.reason}>
            {failureReasonLabel(r.reason)}: {formatNumber(r.count)} cases (
            {formatMoney(r.volume)})
          </FigureLine>
        ))}
      </NumbersBlock>

      <NumbersBlock
        title="How much each signup week earns (ARPU)"
        empty={g.cohortLtv?.length ? null : 'No join cohorts in this range.'}
      >
        {(g.cohortLtv || []).map((c) => (
          <FigureLine key={c.period}>
            {formatWeekLabel(c.period)}: {formatNumber(c.size)} users joined —
            average spend per user was {formatMoney(c.arpuD7)} by day 7,{' '}
            {formatMoney(c.arpuD30)} by day 30, and {formatMoney(c.arpuD90)} by
            day 90
          </FigureLine>
        ))}
      </NumbersBlock>

      <CategoryNumbers title="Deposit" id="deposit" section={sections.deposit} />
      <CategoryNumbers
        title="Airtime"
        id="airtime"
        section={sections.airtime}
        showNetwork
      />
      <CategoryNumbers
        title="Data"
        id="data"
        section={sections.data}
        showNetwork
      />

      <NumbersBlock title="Users added & activated" id="users">
        <FigureLine>
          {formatNumber(usersAdded.total || 0)} users signed up in this range
        </FigureLine>
        <FigureLine>
          {outOf(usersAdded.withFirstTxn, usersAdded.total)} of those signups
          already carried out their first transaction (activated)
        </FigureLine>
        <FigureLine>
          {formatNumber(usersActivated.total || 0)} users were activated in this
          range — meaning their first transaction happened in this period
          {usersActivated.joinedInRange
            ? ` (${outOf(usersActivated.total, usersActivated.joinedInRange)} vs users who joined in the same range)`
            : ''}
        </FigureLine>
        {(sections.usersAdded?.weekly || []).slice(-6).map((w) => (
          <FigureLine key={`add-${w.period}`}>
            {formatWeekLabel(w.period)}: {formatNumber(w.count)} users signed up
          </FigureLine>
        ))}
        {(sections.usersActivated?.weekly || []).slice(-6).map((w) => (
          <FigureLine key={`act-${w.period}`}>
            {formatWeekLabel(w.period)}: {formatNumber(w.count)} users were
            activated (first transaction)
          </FigureLine>
        ))}
      </NumbersBlock>

      <NumbersBlock title="Activation rate" id="activation">
        <FigureLine>
          {formatNumber(joinedForActivation)} users joined in this range
        </FigureLine>
        <FigureLine>
          {outOf(activated7d, joinedForActivation)} users were activated within 7
          days — meaning they carried out their first transaction within a week of
          signing up
        </FigureLine>
        <FigureLine>
          {outOf(activatedEver, joinedForActivation)} users have been activated
          ever (first transaction at any time after joining)
        </FigureLine>
        {(sections.activationRate?.byJoinWeek || []).map((w) => (
          <FigureLine key={w.period}>
            {formatWeekLabel(w.period)}:{' '}
            {outOf(w.activatedWithin7d, w.joined)} users were activated within 7
            days
          </FigureLine>
        ))}
      </NumbersBlock>

      <NumbersBlock title="Retention rate" id="retention">
        <FigureLine>
          Of users who joined in this range,{' '}
          {(retention.d7RetentionPct ?? 0).toFixed(1)}% came back within 7 days
          and {(retention.d30RetentionPct ?? 0).toFixed(1)}% came back within 30
          days ({formatNumber(retention.customers || 0)} users across{' '}
          {formatNumber(retention.cohorts || 0)} signup weeks)
        </FigureLine>
        {(sections.retentionRate?.cohorts || []).map((c) => (
          <FigureLine key={c.period}>
            {formatWeekLabel(c.period || c.label)} ({formatNumber(c.size)}{' '}
            joined): {c.w1Pct}% still active in week 1 · {c.w2Pct}% in week 2 ·{' '}
            {c.w3Pct}% in week 3 · {c.w4Pct}% in week 4
          </FigureLine>
        ))}
      </NumbersBlock>

      <NumbersBlock
        title="Acquisition & campaigns"
        id="attribution"
        empty={
          (g.acquisition || []).length || (g.campaigns || []).length
            ? null
            : 'No acquisition or promo data yet.'
        }
      >
        {(g.acquisition || []).map((a) => (
          <FigureLine key={a.source}>
            {acquisitionLabel(a.source)}: {outOf(a.activated, a.joined)} users
            who joined this way were activated · {formatMoney(a.volume)} volume
          </FigureLine>
        ))}
        {(g.campaigns || []).map((c) => (
          <FigureLine key={c.promoCode}>
            Promo “{c.promoCode}”: {formatMoney(c.volume)} from{' '}
            {formatNumber(c.transactions)} transactions by{' '}
            {formatNumber(c.uniqueCustomers)} users
          </FigureLine>
        ))}
        {(g.paymentMethods || []).map((m) => (
          <FigureLine key={m.method}>
            Deposit via {paymentMethodLabel(m.method)}: {formatMoney(m.volume)} ·{' '}
            {formatNumber(m.transactions)} transactions
          </FigureLine>
        ))}
      </NumbersBlock>

      <NumbersBlock
        title="Geo & margin"
        id="geo-margin"
        empty={
          (g.geo || []).length || (g.margin || []).length
            ? null
            : 'No geo or margin figures yet.'
        }
      >
        {(g.geo || []).slice(0, 12).map((row) => (
          <FigureLine key={row.state}>
            {row.state}: {formatNumber(row.customers)} users ·{' '}
            {formatMoney(row.volume)} volume · {row.activationPct}% activated
          </FigureLine>
        ))}
        {(g.margin || []).map((row) => (
          <FigureLine key={row.category}>
            {categoryLabel(row.category)}: {formatMoney(row.volume)} volume ·{' '}
            {formatMoney(row.margin)} estimated margin ({row.marginPct}%)
          </FigureLine>
        ))}
      </NumbersBlock>
    </div>
  );
};

export default AnalyticsNumbersView;
