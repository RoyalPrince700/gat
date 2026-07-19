import { Navigate, useParams } from 'react-router-dom';
import { adminCompanyPath, pathToCompanySlug } from '../constants/themes';

/** Redirects non-Smipay company URLs away from Smipay-only pages. */
const SmipayOnlyRoute = ({ children }) => {
  const { companySlug: pathSlug } = useParams();
  const slug = pathToCompanySlug(pathSlug);

  if (slug !== 'smipay') {
    return <Navigate to={adminCompanyPath(slug || 'smipay', 'overview')} replace />;
  }

  return children;
};

export default SmipayOnlyRoute;
