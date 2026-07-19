const PRESETS = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'custom', label: 'Custom' },
];

const toYmd = (d) => {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const rangeFromPreset = (preset) => {
  const now = new Date();
  const to = toYmd(now);
  if (preset === '24h') {
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return { from: toYmd(from), to };
  }
  if (preset === '7d') {
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { from: toYmd(from), to };
  }
  if (preset === '30d') {
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from: toYmd(from), to };
  }
  if (preset === '90d') {
    const from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return { from: toYmd(from), to };
  }
  return null;
};

const AnalyticsFilters = ({
  preset,
  from,
  to,
  onPreset,
  onFrom,
  onTo,
  onApply,
}) => (
  <div className="filters panel analytics-filters">
    <div className="window-chips">
      {PRESETS.map((p) => (
        <button
          key={p.value}
          type="button"
          className={`window-chip${preset === p.value ? ' active' : ''}`}
          onClick={() => onPreset(p.value)}
        >
          {p.label}
        </button>
      ))}
    </div>
    <label>
      From
      <input
        type="date"
        value={from}
        onChange={(e) => onFrom(e.target.value)}
        disabled={preset !== 'custom'}
      />
    </label>
    <label>
      To
      <input
        type="date"
        value={to}
        onChange={(e) => onTo(e.target.value)}
        disabled={preset !== 'custom'}
      />
    </label>
    <button type="button" className="btn btn-ghost" onClick={onApply}>
      Apply filters
    </button>
  </div>
);

export default AnalyticsFilters;
