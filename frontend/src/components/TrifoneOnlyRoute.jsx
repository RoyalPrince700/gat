import { Navigate, useLocation, useParams } from 'react-router-dom';
import {
  adminCompanyPath,
  hubRootFromPathname,
  pathToCompanySlug,
} from '../constants/themes';
import { TRIFONE_SLUG } from '../constants/trifone';

/** Redirects non–Trifone company URLs away from Trifone-only pages. */
const TrifoneOnlyRoute = ({ children }) => {
  const { companySlug: pathSlug } = useParams();
  const hubRoot = hubRootFromPathname(useLocation().pathname);
  const slug = pathToCompanySlug(pathSlug);

  if (slug !== TRIFONE_SLUG) {
    return (
      <Navigate
        to={adminCompanyPath(slug || TRIFONE_SLUG, 'overview', hubRoot)}
        replace
      />
    );
  }

  return children;
};

export default TrifoneOnlyRoute;
