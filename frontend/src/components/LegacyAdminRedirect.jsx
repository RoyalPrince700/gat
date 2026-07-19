import { Navigate } from 'react-router-dom';
import { adminCompanyPath } from '../constants/themes';

/** Redirect flat /admin/* paths to the last (or default) company workspace. */
const LegacyAdminRedirect = ({ page = 'overview' }) => {
  const saved = localStorage.getItem('gat_active_company');
  const slug = saved && saved !== 'all' ? saved : 'smipay';
  return <Navigate to={adminCompanyPath(slug, page)} replace />;
};

export default LegacyAdminRedirect;
