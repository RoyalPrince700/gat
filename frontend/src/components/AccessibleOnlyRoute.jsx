import { Navigate, useLocation, useParams } from 'react-router-dom';
import { ACCESSIBLE_SLUG } from '../constants/accessible';
import {
  adminCompanyPath,
  hubRootFromPathname,
  pathToCompanySlug,
} from '../constants/themes';

/** Redirects non–Accessible Publishers company URLs away from Accessible-only pages. */
const AccessibleOnlyRoute = ({ children }) => {
  const { companySlug: pathSlug } = useParams();
  const hubRoot = hubRootFromPathname(useLocation().pathname);
  const slug = pathToCompanySlug(pathSlug);

  if (slug !== ACCESSIBLE_SLUG) {
    return (
      <Navigate
        to={adminCompanyPath(slug || ACCESSIBLE_SLUG, 'overview', hubRoot)}
        replace
      />
    );
  }

  return children;
};

export default AccessibleOnlyRoute;
