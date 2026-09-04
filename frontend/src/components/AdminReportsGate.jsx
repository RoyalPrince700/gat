import { Navigate, useLocation, useParams } from 'react-router-dom';
import { ACCESSIBLE_SLUG } from '../constants/accessible';
import { OXYGEN_SLUG } from '../constants/oxygen';
import {
  adminCompanyPath,
  hubRootFromPathname,
  pathToCompanySlug,
} from '../constants/themes';
import AdminAccessibleReports from '../pages/AdminAccessibleReports';
import AdminOxygenReports from '../pages/AdminOxygenReports';

/** Routes company reports to Oxygen FM or Accessible Publishers. */
const AdminReportsGate = () => {
  const { companySlug: pathSlug } = useParams();
  const hubRoot = hubRootFromPathname(useLocation().pathname);
  const slug = pathToCompanySlug(pathSlug);

  if (slug === ACCESSIBLE_SLUG) return <AdminAccessibleReports />;
  if (slug === OXYGEN_SLUG) return <AdminOxygenReports />;

  return (
    <Navigate
      to={adminCompanyPath(slug || ACCESSIBLE_SLUG, 'overview', hubRoot)}
      replace
    />
  );
};

export default AdminReportsGate;
