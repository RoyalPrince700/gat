import { Navigate, useLocation } from 'react-router-dom';
import {
  adminCompanyPath,
  hubRootFromPathname,
} from '../constants/themes';

/** Redirect flat /admin/* paths to the last (or default) company workspace. */
const LegacyAdminRedirect = ({ page = 'overview' }) => {
  const hubRoot = hubRootFromPathname(useLocation().pathname);
  const saved = localStorage.getItem('gat_active_company');
  const slug = saved && saved !== 'all' ? saved : 'smipay';
  return <Navigate to={adminCompanyPath(slug, page, hubRoot)} replace />;
};

export default LegacyAdminRedirect;
