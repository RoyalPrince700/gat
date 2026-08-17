import { Navigate, useLocation, useParams } from 'react-router-dom';
import {
  adminCompanyPath,
  hubRootFromPathname,
  pathToCompanySlug,
} from '../constants/themes';
import { BEST_IN_PRINT_SLUG } from '../constants/bestinprint';

/** Redirects non–Best In Print company URLs away from print-only pages. */
const BestInPrintOnlyRoute = ({ children }) => {
  const { companySlug: pathSlug } = useParams();
  const hubRoot = hubRootFromPathname(useLocation().pathname);
  const slug = pathToCompanySlug(pathSlug);

  if (slug !== BEST_IN_PRINT_SLUG) {
    return (
      <Navigate
        to={adminCompanyPath(slug || BEST_IN_PRINT_SLUG, 'overview', hubRoot)}
        replace
      />
    );
  }

  return children;
};

export default BestInPrintOnlyRoute;
