import { Navigate, useParams } from 'react-router-dom';
import { adminCompanyPath, pathToCompanySlug } from '../constants/themes';

/** Redirects non–Smart Edu Hub company URLs away from SMEH-only pages. */
const SmehOnlyRoute = ({ children }) => {
  const { companySlug: pathSlug } = useParams();
  const slug = pathToCompanySlug(pathSlug);

  if (slug !== 'smart-edu-hub') {
    return (
      <Navigate
        to={adminCompanyPath(slug || 'smart-edu-hub', 'overview')}
        replace
      />
    );
  }

  return children;
};

export default SmehOnlyRoute;
