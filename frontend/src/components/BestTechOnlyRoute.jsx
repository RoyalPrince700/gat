import { Navigate, useLocation, useParams } from 'react-router-dom';
import {
  adminCompanyPath,
  hubRootFromPathname,
  pathToCompanySlug,
} from '../constants/themes';
import { BESTTECH_SLUG } from '../constants/besttech';

/** Redirects non–Best Technology IT company URLs away from BestTech-only pages. */
const BestTechOnlyRoute = ({ children }) => {
  const { companySlug: pathSlug } = useParams();
  const hubRoot = hubRootFromPathname(useLocation().pathname);
  const slug = pathToCompanySlug(pathSlug);

  if (slug !== BESTTECH_SLUG) {
    return (
      <Navigate
        to={adminCompanyPath(slug || BESTTECH_SLUG, 'overview', hubRoot)}
        replace
      />
    );
  }

  return children;
};

export default BestTechOnlyRoute;
