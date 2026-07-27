import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Hash, Wallet } from 'lucide-react';
import api from '../api/client';
import { tooltipStyle } from '../components/analytics/chartTheme';
import {
  SMIPAY_CATEGORIES,
  SMIPAY_COLORS,
} from '../constants/smipay';
import { useCompany } from '../context/CompanyContext';
import { formatMoney, formatNumber } from '../utils/format';

const MODE_OVERVIEW = 'overview';
const MODE_BY_WEEK = 'by-week';
const MODE_BY_DAY = 'by-day';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const toYm = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const toYmd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const daysInMonth = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};

const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
};

const dayLabel = (ym, day) => {
  const [y, m] = ym.split('-').map(Number);
  return `${Number(day)} ${MONTH_NAMES[m - 1]} ${y}`;
};

/** Monday on or before the given local date (Mon–Sun weeks). */
const mondayOnOrBefore = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
};

const formatDayMonth = (d) => `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;

const formatWeekSpanShort = (fromDate, toDate) =>
  `${formatDayMonth(fromDate)} – ${formatDayMonth(toDate)}`;

const formatWeekSpanLong = (fromDate, toDate) => {
  if (fromDate.getFullYear() !== toDate.getFullYear()) {
    return `${formatDayMonth(fromDate)} ${fromDate.getFullYear()} – ${formatDayMonth(toDate)} ${toDate.getFullYear()}`;
  }
  return `${formatDayMonth(fromDate)} – ${formatDayMonth(toDate)} ${toDate.getFullYear()}`;
};

/**
 * ISO-style Mon–Sun weeks that overlap the selected month.
 * Week ranges may spill into adjacent months; from/to are always full Mon–Sun.
 */
const buildWeekOptions = (monthYm) => {
  const [y, m] = monthYm.split('-').map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 0);
  let monday = mondayOnOrBefore(monthStart);
  const options = [];
  let weekNum = 1;

  while (monday <= monthEnd) {
    const sunday = new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() + 6
    );
    if (sunday >= monthStart) {
      const spanShort = formatWeekSpanShort(monday, sunday);
      options.push({
        value: weekNum,
        label: `Week ${weekNum} · ${spanShort}`,
        from: toYmd(monday),
        to: toYmd(sunday),
        spanShort,
        spanLong: formatWeekSpanLong(monday, sunday),
      });
      weekNum += 1;
    }
    monday = new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() + 7
    );
  }

  return options;
};

const resolveWeekIndex = (monthYm, weekIndex, now = new Date()) => {
  const weeks = buildWeekOptions(monthYm);
  if (!weeks.length) return 1;
  const n = Number(weekIndex);
  if (Number.isFinite(n) && n >= 1 && n <= weeks.length) return n;
  const todayYm = toYm(now);
  if (monthYm === todayYm) {
    const todayYmd = toYmd(now);
    const containing = weeks.find(
      (w) => w.from <= todayYmd && todayYmd <= w.to
    );
    if (containing) return containing.value;
  }
  return 1;
};

/** Last 12 months including current, newest first. */
const buildMonthOptions = (now = new Date()) => {
  const options = [];
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: toYm(d),
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
    });
  }
  return options;
};

const rangeFromSelection = (month, mode, day, weekIndex) => {
  const last = daysInMonth(month);
  if (mode === MODE_OVERVIEW) {
    return {
      from: `${month}-01`,
      to: `${month}-${String(last).padStart(2, '0')}`,
    };
  }
  if (mode === MODE_BY_WEEK) {
    const weeks = buildWeekOptions(month);
    const idx = resolveWeekIndex(month, weekIndex);
    const week = weeks[idx - 1] || weeks[0];
    return { from: week.from, to: week.to };
  }
  const n = Math.min(Math.max(Number(day) || 1, 1), last);
  const ymd = `${month}-${String(n).padStart(2, '0')}`;
  return { from: ymd, to: ymd };
};

const UserAnalytics = () => {
  const { activeCompany } = useCompany();
  const isSmipay = activeCompany?.slug === 'smipay';

  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const now = useMemo(() => new Date(), []);
  const initialMonth = toYm(now);
  const initialDay = String(now.getDate());
  const initialWeek = resolveWeekIndex(initialMonth, null, now);
  const initialRange = rangeFromSelection(
    initialMonth,
    MODE_OVERVIEW,
    initialDay,
    initialWeek
  );

  const [month, setMonth] = useState(initialMonth);
  const [mode, setMode] = useState(MODE_OVERVIEW);
  const [day, setDay] = useState(initialDay);
  const [weekIndex, setWeekIndex] = useState(initialWeek);
  const [applied, setApplied] = useState(initialRange);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const dayOptions = useMemo(() => {
    const last = daysInMonth(month);
    return Array.from({ length: last }, (_, i) => {
      const n = i + 1;
      return { value: String(n), label: `Day ${n}` };
    });
  }, [month]);

  const weekOptions = useMemo(() => buildWeekOptions(month), [month]);
  const selectedWeek =
    weekOptions.find((w) => w.value === weekIndex) || weekOptions[0];

  const applySelection = (nextMonth, nextMode, nextDay, nextWeek) => {
    const last = daysInMonth(nextMonth);
    const resolvedDay = String(
      Math.min(Math.max(Number(nextDay) || 1, 1), last)
    );
    const weeks = buildWeekOptions(nextMonth);
    const maxWeek = weeks.length || 1;
    let resolvedWeek = Number(nextWeek) || 1;
    if (resolvedWeek < 1 || resolvedWeek > maxWeek) {
      resolvedWeek = resolveWeekIndex(nextMonth, null, now);
    }
    setMonth(nextMonth);
    setMode(nextMode);
    setDay(resolvedDay);
    setWeekIndex(resolvedWeek);
    setApplied(
      rangeFromSelection(nextMonth, nextMode, resolvedDay, resolvedWeek)
    );
  };

  const onMonthChange = (value) => {
    const last = daysInMonth(value);
    const nextDay = String(Math.min(Number(day) || 1, last));
    if (mode === MODE_BY_WEEK) {
      const weeks = buildWeekOptions(value);
      const clamped = Math.min(weekIndex, weeks.length || 1);
      applySelection(value, mode, nextDay, clamped);
      return;
    }
    applySelection(value, mode, nextDay, weekIndex);
  };

  const onModeChange = (nextMode) => {
    if (nextMode === mode) return;
    if (nextMode === MODE_BY_DAY) {
      const last = daysInMonth(month);
      const todayYm = toYm(now);
      const preferred =
        month === todayYm
          ? String(Math.min(now.getDate(), last))
          : day;
      applySelection(month, MODE_BY_DAY, preferred, weekIndex);
      return;
    }
    if (nextMode === MODE_BY_WEEK) {
      const preferred = resolveWeekIndex(month, null, now);
      applySelection(month, MODE_BY_WEEK, day, preferred);
      return;
    }
    applySelection(month, MODE_OVERVIEW, day, weekIndex);
  };

  const onDayChange = (value) => {
    applySelection(month, MODE_BY_DAY, value, weekIndex);
  };

  const onWeekChange = (value) => {
    applySelection(month, MODE_BY_WEEK, day, Number(value));
  };

  const periodSubtitle =
    mode === MODE_OVERVIEW
      ? `Overview for ${monthLabel(month)}`
      : mode === MODE_BY_WEEK && selectedWeek
        ? `Overview for Week ${selectedWeek.value} (${selectedWeek.spanLong})`
        : `Overview for ${dayLabel(month, day)}`;

  useEffect(() => {
    if (!isSmipay) return undefined;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data: res } = await api.get('/smipay/analytics', {
          params: { from: applied.from, to: applied.to },
        });
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Failed to load analytics');
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isSmipay, applied.from, applied.to]);

  const categoryMap = useMemo(() => {
    const map = new Map(
      (data?.byCategory || []).map((row) => [row.category, row])
    );
    return map;
  }, [data]);

  const volumeFor = (cat) => categoryMap.get(cat)?.volume || 0;
  const countFor = (cat) =>
    categoryMap.get(cat)?.count ?? categoryMap.get(cat)?.transactions ?? 0;

  const categoryChart = useMemo(() => {
    return SMIPAY_CATEGORIES.map((cat) => {
      const row = categoryMap.get(cat.value);
      return {
        category: cat.value,
        label: cat.label,
        volume: row?.volume || 0,
        count: row?.count ?? row?.transactions ?? 0,
      };
    }).filter((row) => row.volume > 0 || row.count > 0);
  }, [categoryMap]);

  if (!isSmipay) {
    return (
      <div className="page">
        <p className="empty">Analytics is available for Smipay only.</p>
      </div>
    );
  }

  const summary = data?.summary;
  const hasAnyVolume =
    (summary?.totalVolume || 0) > 0 || (summary?.totalTransactions || 0) > 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p>{periodSubtitle}</p>
        </div>
      </div>

      <div className="filters panel analytics-filters">
        <label>
          Month
          <select value={month} onChange={(e) => onMonthChange(e.target.value)}>
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className="analytics-hint" style={{ display: 'block', marginBottom: '0.4rem' }}>
            View
          </span>
          <div className="window-chips" role="group" aria-label="Analytics view mode">
            <button
              type="button"
              className={`window-chip${mode === MODE_OVERVIEW ? ' active' : ''}`}
              onClick={() => onModeChange(MODE_OVERVIEW)}
            >
              Month overview
            </button>
            <button
              type="button"
              className={`window-chip${mode === MODE_BY_WEEK ? ' active' : ''}`}
              onClick={() => onModeChange(MODE_BY_WEEK)}
            >
              By week
            </button>
            <button
              type="button"
              className={`window-chip${mode === MODE_BY_DAY ? ' active' : ''}`}
              onClick={() => onModeChange(MODE_BY_DAY)}
            >
              By day
            </button>
          </div>
        </div>
        {mode === MODE_BY_WEEK && (
          <label>
            Week
            <select
              value={String(weekIndex)}
              onChange={(e) => onWeekChange(e.target.value)}
            >
              {weekOptions.map((opt) => (
                <option key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {mode === MODE_BY_DAY && (
          <label>
            Day
            <select value={day} onChange={(e) => onDayChange(e.target.value)}>
              {dayOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {loading && !data ? (
        <p className="empty">Loading…</p>
      ) : (
        <>
          <div className="stats">
            <div className="stat">
              <div className="stat-label">
                <Wallet size={14} strokeWidth={1.75} style={{ marginRight: 6, verticalAlign: -2 }} />
                Total transaction volume
              </div>
              <div className="stat-value">
                {formatMoney(summary?.totalVolume || 0)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">
                <Hash size={14} strokeWidth={1.75} style={{ marginRight: 6, verticalAlign: -2 }} />
                Transactions
              </div>
              <div className="stat-value">
                {formatNumber(summary?.totalTransactions || 0)}
              </div>
            </div>
          </div>

          <div className="stats">
            {SMIPAY_CATEGORIES.map((cat) => (
              <div className="stat" key={cat.value}>
                <div className="stat-label">{cat.label}</div>
                <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                  {formatMoney(volumeFor(cat.value))}
                </div>
                <div className="analytics-hint" style={{ margin: '0.25rem 0 0' }}>
                  {formatNumber(countFor(cat.value))} txn
                </div>
              </div>
            ))}
          </div>

          {!hasAnyVolume && !loading && (
            <p className="empty">No transactions for this period.</p>
          )}

          {categoryChart.length > 0 && (
            <section className="panel">
              <h3>Category overview</h3>
              <p className="analytics-hint">
                Volume by product category
                {mode === MODE_OVERVIEW
                  ? ` for ${monthLabel(month)}`
                  : mode === MODE_BY_WEEK && selectedWeek
                    ? ` for Week ${selectedWeek.value} (${selectedWeek.spanLong})`
                    : ` for ${dayLabel(month, day)}`}
                .
              </p>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#6e6e73"
                      fontSize={11}
                      tickLine={false}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={56}
                    />
                    <YAxis
                      stroke="#6e6e73"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, name) =>
                        name === 'Volume' ? formatMoney(value) : formatNumber(value)
                      }
                    />
                    <Bar
                      dataKey="volume"
                      name="Volume"
                      fill={SMIPAY_COLORS.orange}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default UserAnalytics;
