import { Navigate, useLocation, useParams } from 'react-router-dom';
import {
  adminCompanyPath,
  hubRootFromPathname,
  pathToCompanySlug,
} from '../constants/themes';

/** Redirects non-Smipay company URLs away from Smipay-only pages. */
const SmipayOnlyRoute = ({ children }) => {
  const { companySlug: pathSlug } = useParams();
  const hubRoot = hubRootFromPathname(useLocation().pathname);
  const slug = pathToCompanySlug(pathSlug);

  if (slug !== 'smipay') {
    return (
      <Navigate
        to={adminCompanyPath(slug || 'smipay', 'overview', hubRoot)}
        replace
      />
    );
  }

  return children;
};

export default SmipayOnlyRoute;
