import { FileText } from 'lucide-react';
import DepartmentReportView from '../components/DepartmentReportView';
import { OXYGEN_SLUG } from '../constants/oxygen';
import { useCompany } from '../context/CompanyContext';
import reportContent from '../../oxygenfm/augreportoxygen.md?raw';

const AdminOxygenReports = () => {
  const { activeCompany } = useCompany();
  const slug = activeCompany?.slug;

  if (!activeCompany || slug !== OXYGEN_SLUG) {
    return (
      <div className="page">
        <p className="empty">Reports are available for Oxygen FM.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Reports</h1>
          <p className="muted">
            Monthly performance reports for Oxygen FM 96.9 — charts and KPI
            summaries from published MPR data.
          </p>
        </div>
      </header>

      <div className="analytics-tabs" role="tablist" aria-label="Report period">
        <button
          type="button"
          role="tab"
          aria-selected
          className="analytics-tab active"
        >
          August 2026
        </button>
      </div>

      <article className="panel report-panel" style={{ marginTop: '1rem' }}>
        <div className="panel-head">
          <div>
            <h2 style={{ marginBottom: '0.25rem' }}>
              Monthly Performance Report — August 2026
            </h2>
            <p className="muted" style={{ margin: 0 }}>
              <FileText
                size={14}
                style={{ verticalAlign: 'middle', marginRight: 6 }}
              />
              Oxygen FM 96.9 · April–August MPR cycle · Partial August analytics
            </p>
          </div>
        </div>

        <DepartmentReportView content={reportContent} />
      </article>
    </div>
  );
};

export default AdminOxygenReports;
