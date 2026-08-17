import { useEffect } from 'react';
import { useCompany } from '../context/CompanyContext';

const CompaniesPage = () => {
  const {
    companies,
    refreshCompanies,
    switchCompany,
    ALL_COMPANIES,
  } = useCompany();

  useEffect(() => {
    switchCompany(ALL_COMPANIES);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshCompanies();
  }, [refreshCompanies]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Companies</h1>
          <p>
            Companies provisioned for the platform. Open a company workspace from
            the Companies hub to work with its data.
          </p>
        </div>
      </div>

      <section className="panel">
        <h2>All companies ({companies.length})</h2>
        {companies.length === 0 ? (
          <p className="empty">No companies provisioned yet.</p>
        ) : (
          <div className="company-list">
            {companies.map((c) => (
              <div key={c._id} className="company-row">
                <div>
                  <strong>{c.name}</strong>
                  <p>{c.description || 'No description'}</p>
                  <span className="meta">{c.slug}</span>
                </div>
                <div className="row-actions stack-actions">
                  <span className="badge">{c.type}</span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => switchCompany(c)}
                  >
                    Use
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default CompaniesPage;
