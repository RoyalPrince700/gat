import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Eye,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getSeriesColors,
  getTooltipStyle,
  REPORT_CHART,
} from './analytics/chartTheme';
import {
  parseBulletItem,
  parseDepartmentReport,
} from '../utils/parseDepartmentReport';

const PIE_COLORS = ['#16a34a', '#e11d48', '#2563eb', '#f59e0b'];

const axisLabel = (name) =>
  String(name || '')
    .replace(/\s*\(Target:\s*[^)]+\)\s*$/i, '')
    .trim();

const formatValue = (value, unit, hint = '') => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  if (unit === '%') return `${n}%`;
  if (/sales|revenue|amount|₦/i.test(hint) || Math.abs(n) >= 100000) {
    return `₦${n.toLocaleString('en-NG')}`;
  }
  if (Math.abs(n) >= 1000) return n.toLocaleString('en-NG');
  return String(n);
};

const statusTone = (status) => {
  const s = String(status || '').toLowerCase();
  if (/achieved|strong|on track|met|completed/.test(s)) return 'up';
  if (/lagging|needs focus|below|delay|risk|-\d/.test(s)) return 'down';
  if (/satisfactory|partial|minor/.test(s)) return 'mid';
  return '';
};

const ChartCard = ({ chart }) => {
  const colors = getSeriesColors();
  const tooltipStyle = getTooltipStyle();

  if (!chart?.points?.length) return null;

  if (chart.type === 'stat') {
    const p = chart.points[0];
    return (
      <section className="report-chart-card report-stat-card">
        <h3>{chart.title}</h3>
        <div className="report-stat-value">
          {formatValue(p.actual, chart.unit, chart.title)}
        </div>
        {p.target != null && (
          <div className="report-score-meta">
            Target {formatValue(p.target, chart.unit, chart.title)}
          </div>
        )}
      </section>
    );
  }

  if (chart.type === 'pie') {
    return (
      <section className="report-chart-card">
        <h3>{chart.title}</h3>
        <div className="report-chart-body report-chart-body-pie">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={chart.points}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={92}
                paddingAngle={3}
              >
                {chart.points.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [`${value}%`, 'Share']}
              />
              <Legend {...REPORT_CHART.legend} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
    );
  }

  const height = Math.max(
    REPORT_CHART.minHeight,
    chart.points.length * REPORT_CHART.rowHeight
  );
  const showTarget = chart.points.some((p) => p.target != null);
  const showPrevious = chart.points.some((p) => p.previous != null);
  const xDomain =
    chart.unit === '%'
      ? [
          0,
          Math.max(
            100,
            ...chart.points.flatMap((p) =>
              [p.target, p.actual, p.previous].filter((v) => v != null)
            )
          ),
        ]
      : ['auto', 'auto'];

  return (
    <section className="report-chart-card">
      <h3>{chart.title}</h3>

      {(chart.type === 'targetActual' || chart.type === 'compare') && (
        <div className="report-score-grid">
          {chart.points.map((p) => {
            const baseline = p.target ?? p.previous;
            const gap =
              baseline != null && p.actual != null ? p.actual - baseline : null;
            const tone =
              gap == null ? '' : gap >= 0 ? 'up' : gap >= -10 ? 'mid' : 'down';
            return (
              <div
                className={`report-score-pill ${tone}`}
                key={p.fullName || p.name}
              >
                <div className="report-score-value">
                  {formatValue(p.actual, chart.unit)}
                </div>
                <div className="report-score-label">
                  {axisLabel(p.fullName || p.name)}
                </div>
                {baseline != null && (
                  <div className="report-score-meta">
                    {p.target != null ? 'Target' : 'Prior'}{' '}
                    {formatValue(baseline, chart.unit)}
                    {gap != null
                      ? ` · ${gap >= 0 ? '+' : ''}${formatValue(gap, chart.unit)}`
                      : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="report-chart-body chart-box" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chart.points}
            layout="vertical"
            margin={REPORT_CHART.margin}
          >
            <CartesianGrid
              stroke="rgba(0,0,0,0.06)"
              strokeDasharray="3 3"
              horizontal={false}
            />
            <XAxis
              type="number"
              tickFormatter={(v) => formatValue(v, chart.unit)}
              domain={xDomain}
              stroke={REPORT_CHART.axisStroke}
              tick={REPORT_CHART.axisTick}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={REPORT_CHART.yAxisWidth}
              stroke={REPORT_CHART.axisStroke}
              tick={{
                ...REPORT_CHART.axisTick,
                fontSize: 13,
              }}
              tickFormatter={axisLabel}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => [
                formatValue(value, chart.unit),
                name === 'actual'
                  ? 'Actual'
                  : name === 'target'
                    ? 'Target'
                    : name === 'previous'
                      ? 'Previous'
                      : name,
              ]}
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.fullName ||
                payload?.[0]?.payload?.name ||
                ''
              }
            />
            <Legend {...REPORT_CHART.legend} />
            {showTarget && (
              <Bar
                dataKey="target"
                name="Target"
                fill={colors[1] || '#94a3b8'}
                radius={[0, 6, 6, 0]}
                barSize={REPORT_CHART.barSize.target}
              />
            )}
            {showPrevious && (
              <Bar
                dataKey="previous"
                name="Previous"
                fill={colors[2] || '#3b82f6'}
                radius={[0, 6, 6, 0]}
                barSize={REPORT_CHART.barSize.previous}
              />
            )}
            <Bar
              dataKey="actual"
              name="Actual"
              fill={colors[0]}
              radius={[0, 6, 6, 0]}
              barSize={REPORT_CHART.barSize.actual}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

const SectionHeader = ({ icon: Icon, title, tone = 'default' }) => (
  <div className={`report-md-section-head report-md-section-head-${tone}`}>
    <span className="report-md-section-icon" aria-hidden>
      <Icon size={22} strokeWidth={2.25} />
    </span>
    <h3>{title}</h3>
  </div>
);

const InsightCard = ({ item, tone = 'default' }) => {
  const parsed = parseBulletItem(item);
  return (
    <article className={`report-insight-card report-insight-card-${tone}`}>
      {parsed.metric && (
        <div className="report-insight-metric">{parsed.metric}</div>
      )}
      {parsed.title ? (
        <>
          <h4>{parsed.title}</h4>
          <p>{parsed.summary}</p>
        </>
      ) : (
        <p className="report-insight-single">{parsed.summary}</p>
      )}
    </article>
  );
};

const ActionCard = ({ item, index }) => {
  const parsed = parseBulletItem(item, 95);
  return (
    <article className="report-action-card">
      <span className="report-action-num">{index + 1}</span>
      <div>
        {parsed.title ? (
          <>
            <h4>{parsed.title}</h4>
            <p>{parsed.summary}</p>
          </>
        ) : (
          <p className="report-insight-single">{parsed.summary}</p>
        )}
      </div>
      <ArrowRight size={18} className="report-action-arrow" aria-hidden />
    </article>
  );
};

const KpiCard = ({ row }) => {
  const tone = statusTone(row.status);
  return (
    <article className={`report-kpi-card report-kpi-card-${tone || 'neutral'}`}>
      <h4>{row.kpi}</h4>
      <div className="report-kpi-values">
        {row.actual && (
          <span className="report-kpi-actual">{row.actual}</span>
        )}
        {row.target && (
          <span className="report-kpi-target">Target {row.target}</span>
        )}
      </div>
      {row.status && (
        <span className={`report-status-badge ${tone}`}>{row.status}</span>
      )}
    </article>
  );
};

const PriorityCard = ({ row }) => (
  <article className="report-priority-card">
    <h4>{row.priority}</h4>
    <dl className="report-priority-meta">
      {row.target && (
        <>
          <dt>Target</dt>
          <dd>{row.target}</dd>
        </>
      )}
      {(row.gap || row.actual) && (
        <>
          <dt>Gap</dt>
          <dd>{row.gap || row.actual}</dd>
        </>
      )}
      {row.commitment && (
        <>
          <dt>Commitment</dt>
          <dd>{parseBulletItem(row.commitment, 80).summary}</dd>
        </>
      )}
    </dl>
  </article>
);

const DepartmentReportView = ({ content }) => {
  const { charts, executive } = useMemo(
    () => parseDepartmentReport(content),
    [content]
  );

  const headlineKpis = useMemo(() => {
    const scorecard = charts.find(
      (c) =>
        c.type === 'targetActual' &&
        c.unit === '%' &&
        c.title?.toLowerCase().includes('scorecard')
    );
    if (scorecard?.points?.length) return scorecard.points.slice(0, 4);
    const anyPct = charts.find(
      (c) => c.type === 'targetActual' && c.unit === '%' && c.points?.length >= 3
    );
    return anyPct?.points?.slice(0, 4) || [];
  }, [charts]);

  const displayCharts = useMemo(() => {
    if (!headlineKpis.length) return charts;
    return charts.filter(
      (c) =>
        !(
          c.type === 'targetActual' &&
          c.unit === '%' &&
          c.title?.toLowerCase().includes('scorecard')
        )
    );
  }, [charts, headlineKpis.length]);

  if (!content?.trim()) {
    return <p className="empty">No content yet.</p>;
  }

  const hasExecutive =
    executive.summary ||
    executive.achievements.length ||
    executive.challenges.length ||
    executive.recommendations.length ||
    executive.priorities.length ||
    executive.statusRows.length;

  return (
    <div className="department-report-view report-md-view">
      {headlineKpis.length > 0 && (
        <div className="report-headline-kpis">
          {headlineKpis.map((p) => {
            const gap =
              p.target != null && p.actual != null ? p.actual - p.target : null;
            const tone =
              gap == null ? '' : gap >= 0 ? 'up' : gap >= -10 ? 'mid' : 'down';
            return (
              <div
                className={`report-headline-kpi ${tone}`}
                key={p.fullName || p.name}
              >
                <div className="report-headline-kpi-value">
                  {formatValue(p.actual, '%')}
                </div>
                <div className="report-headline-kpi-label">
                  {axisLabel(p.fullName || p.name)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {displayCharts.length > 0 && (
        <div className="report-charts-strip">
          {displayCharts.map((chart, idx) => (
            <ChartCard key={`${chart.title}-${idx}`} chart={chart} />
          ))}
        </div>
      )}

      {hasExecutive ? (
        <div className="report-exec-brief report-md-brief">
          {executive.summary && (
            <section className="report-md-hero">
              <SectionHeader icon={Eye} title="At a glance" tone="hero" />
              <p className="report-md-hero-text">{executive.summary}</p>
            </section>
          )}

          <div className="report-exec-grid report-md-grid">
            {executive.achievements.length > 0 && (
              <section className="report-md-block report-md-block-wins">
                <SectionHeader icon={Trophy} title="Key wins" tone="win" />
                <div className="report-insight-grid">
                  {executive.achievements.map((item) => (
                    <InsightCard key={item} item={item} tone="win" />
                  ))}
                </div>
              </section>
            )}

            {executive.challenges.length > 0 && (
              <section className="report-md-block report-md-block-risks">
                <SectionHeader icon={AlertTriangle} title="Issues & risks" tone="risk" />
                <div className="report-insight-grid">
                  {executive.challenges.map((item) => (
                    <InsightCard key={item} item={item} tone="risk" />
                  ))}
                </div>
              </section>
            )}
          </div>

          {executive.statusRows.length > 0 && charts.length === 0 && (
            <section className="report-md-block report-md-block-kpi">
              <SectionHeader icon={TrendingUp} title="KPI snapshot" tone="kpi" />
              <div className="report-kpi-grid">
                {executive.statusRows.map((row) => (
                  <KpiCard key={row.kpi} row={row} />
                ))}
              </div>
            </section>
          )}

          {executive.priorities.length > 0 && (
            <section className="report-md-block report-md-block-priority">
              <SectionHeader icon={Target} title="Next month focus" tone="priority" />
              <div className="report-priority-grid">
                {executive.priorities.map((row) => (
                  <PriorityCard key={row.priority} row={row} />
                ))}
              </div>
            </section>
          )}

          {executive.recommendations.length > 0 && (
            <section className="report-md-block report-md-block-actions">
              <SectionHeader icon={Zap} title="Actions requested" tone="action" />
              <div className="report-action-grid">
                {executive.recommendations.map((item, idx) => (
                  <ActionCard key={item} item={item} index={idx} />
                ))}
              </div>
              <p className="report-md-footnote">
                <ClipboardList size={16} aria-hidden />
                Full detail is in the source report — these are the decisions needed now.
              </p>
            </section>
          )}
        </div>
      ) : (
        <p className="empty">No executive summary available for this report.</p>
      )}
    </div>
  );
};

export default DepartmentReportView;
