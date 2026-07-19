const ChartTabs = ({ tabs, active, onChange }) => (
  <div className="analytics-tabs" role="tablist">
    {tabs.map((tab) => (
      <button
        key={tab.value}
        type="button"
        role="tab"
        aria-selected={active === tab.value}
        className={`analytics-tab${active === tab.value ? ' active' : ''}`}
        onClick={() => onChange(tab.value)}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export default ChartTabs;
