import { useEffect } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import {
  applyThemeToDocument,
  pathToCompanySlug,
} from '../constants/themes';
import { useCompany } from '../context/CompanyContext';

/**
 * Syncs /admin/:companySlug/* with CompanyContext and document theme.
 */
const CompanyRouteSync = () => {
  const { companySlug: pathSlug } = useParams();
  const { companies, switchCompany, loadingCompanies } = useCompany();
  const companySlug = pathToCompanySlug(pathSlug);

  useEffect(() => {
    if (!companySlug) return;
    applyThemeToDocument(companySlug);
    if (!companies.length) return;
    const found = companies.find((c) => c.slug === companySlug);
    if (found) switchCompany(found);
  }, [companySlug, companies, switchCompany]);

  if (!companySlug) {
    return <Navigate to="/admin" replace />;
  }

  if (loadingCompanies && !companies.length) {
    return (
      <div className="page">
        <p className="empty">Loading…</p>
      </div>
    );
  }

  if (companies.length) {
    const found = companies.find((c) => c.slug === companySlug);
    if (!found) {
      return <Navigate to="/admin" replace />;
    }
  }

  return <Outlet />;
};

export default CompanyRouteSync;
