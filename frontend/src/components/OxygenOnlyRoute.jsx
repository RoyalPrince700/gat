import { Navigate, useLocation, useParams } from 'react-router-dom';
import {
  adminCompanyPath,
  hubRootFromPathname,
  pathToCompanySlug,
} from '../constants/themes';
import { OXYGEN_SLUG } from '../constants/oxygen';

/** Redirects non–Oxygen FM company URLs away from Oxygen-only pages. */
const OxygenOnlyRoute = ({ children }) => {
  const { companySlug: pathSlug } = useParams();
  const hubRoot = hubRootFromPathname(useLocation().pathname);
  const slug = pathToCompanySlug(pathSlug);

  if (slug !== OXYGEN_SLUG) {
    return (
      <Navigate
        to={adminCompanyPath(slug || OXYGEN_SLUG, 'overview', hubRoot)}
        replace
      />
    );
  }

  return children;
};

export default OxygenOnlyRoute;
