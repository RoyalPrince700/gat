import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { homePathForUser, useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import CompanyRouteSync from './components/CompanyRouteSync';
import LegacyAdminRedirect from './components/LegacyAdminRedirect';
import SmipayOnlyRoute from './components/SmipayOnlyRoute';
import SmehOnlyRoute from './components/SmehOnlyRoute';
import BestTechOnlyRoute from './components/BestTechOnlyRoute';
import BestInPrintOnlyRoute from './components/BestInPrintOnlyRoute';
import AccessibleOnlyRoute from './components/AccessibleOnlyRoute';
import OxygenOnlyRoute from './components/OxygenOnlyRoute';
import TrifoneOnlyRoute from './components/TrifoneOnlyRoute';
import LoginPage from './pages/LoginPage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import UserDashboard from './pages/UserDashboard';
import UserRecords from './pages/UserRecords';
import UserCustomers from './pages/UserCustomers';
import UserTrifoneCustomers from './pages/UserTrifoneCustomers';
import UserSchools from './pages/UserSchools';
import UserClients from './pages/UserClients';
import UserBestInPrintClients from './pages/UserBestInPrintClients';
import UserAdvertisers from './pages/UserAdvertisers';
import UserSocialMedia from './pages/UserSocialMedia';
import UserDailyTotals from './pages/UserDailyTotals';
import UserAccessibleDailyTotals from './pages/UserAccessibleDailyTotals';
import UserAnalytics from './pages/UserAnalytics';
import AdminHub from './pages/AdminHub';
import AdminOverview from './pages/AdminOverview';
import AdminAccessibleOverview from './pages/AdminAccessibleOverview';
import AdminAccessibleDailyTotals from './pages/AdminAccessibleDailyTotals';
import AdminAccessibleSchoolPurchases from './pages/AdminAccessibleSchoolPurchases';
import AdminAccessibleDataAnalysis from './pages/AdminAccessibleDataAnalysis';
import AdminDashboard from './pages/AdminDashboard';
import AdminTotalAnalytics from './pages/AdminTotalAnalytics';
import AdminCustomers from './pages/AdminCustomers';
import AdminTransactions from './pages/AdminTransactions';
import AdminSchools from './pages/AdminSchools';
import AdminSubscriptions from './pages/AdminSubscriptions';
import AdminBesttechClients from './pages/AdminBesttechClients';
import AdminBesttechProjects from './pages/AdminBesttechProjects';
import AdminBestInPrintClients from './pages/AdminBestInPrintClients';
import AdminBestInPrintJobs from './pages/AdminBestInPrintJobs';
import AdminOxygenAdvertisers from './pages/AdminOxygenAdvertisers';
import AdminOxygenBookings from './pages/AdminOxygenBookings';
import AdminTrifoneCustomers from './pages/AdminTrifoneCustomers';
import AdminTrifoneSales from './pages/AdminTrifoneSales';
import AdminSocialMedia from './pages/AdminSocialMedia';
import AdminKpi from './pages/AdminKpi';
import AdminCosts from './pages/AdminCosts';
import AdminSurveys from './pages/AdminSurveys';
import PublicSurveyPage from './pages/PublicSurveyPage';
import CompaniesPage from './pages/CompaniesPage';
import UsersPage from './pages/UsersPage';
import AdminStaff from './pages/AdminStaff';
import MdAssessments from './pages/MdAssessments';
import MdScorecards from './pages/MdScorecards';
import { ACCESSIBLE_SLUG } from './constants/accessible';
import { BESTTECH_SLUG } from './constants/besttech';
import { BEST_IN_PRINT_SLUG } from './constants/bestinprint';
import { TRIFONE_SLUG } from './constants/trifone';
import {
  adminCompanyPath,
  hubRootFromPathname,
  pathToCompanySlug,
} from './constants/themes';
import { useCompany } from './context/CompanyContext';

/** Company-scoped overview: Accessible has its own KPIs from daily totals. */
const AdminCompanyOverview = () => {
  const { companySlug: pathSlug } = useParams();
  const slug = pathToCompanySlug(pathSlug);
  if (slug === ACCESSIBLE_SLUG) {
    return <AdminAccessibleOverview />;
  }
  return <AdminOverview />;
};

/** Customers page is used by Smipay and Trifone under the same path segment. */
const AdminCustomersGate = () => {
  const { companySlug: pathSlug } = useParams();
  const location = useLocation();
  const hubRoot = hubRootFromPathname(location.pathname);
  const slug = pathToCompanySlug(pathSlug);
  if (slug === 'smipay') return <AdminCustomers />;
  if (slug === TRIFONE_SLUG) return <AdminTrifoneCustomers />;
  return (
    <Navigate
      to={adminCompanyPath(slug || 'smipay', 'overview', hubRoot)}
      replace
    />
  );
};

/** Clients page is used by Best Technology IT and Best In Print. */
const AdminClientsGate = () => {
  const { companySlug: pathSlug } = useParams();
  const location = useLocation();
  const hubRoot = hubRootFromPathname(location.pathname);
  const slug = pathToCompanySlug(pathSlug);
  if (slug === BESTTECH_SLUG) return <AdminBesttechClients />;
  if (slug === BEST_IN_PRINT_SLUG) return <AdminBestInPrintClients />;
  return (
    <Navigate
      to={adminCompanyPath(slug || BESTTECH_SLUG, 'overview', hubRoot)}
      replace
    />
  );
};

const UserCustomersGate = () => {
  const { activeCompany } = useCompany();
  if (activeCompany?.slug === TRIFONE_SLUG) {
    return <UserTrifoneCustomers />;
  }
  return <UserCustomers />;
};

const UserClientsGate = () => {
  const { activeCompany } = useCompany();
  if (activeCompany?.slug === BEST_IN_PRINT_SLUG) {
    return <UserBestInPrintClients />;
  }
  return <UserClients />;
};

/** role: string | string[] — allow one or many roles */
const Protected = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="center-screen">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.status === 'pending') {
    return <Navigate to="/pending" replace />;
  }

  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(user.role)) {
      return <Navigate to={homePathForUser(user)} replace />;
    }
  }

  return children;
};

/** Company workspace pages under /admin/:slug or /md/:slug */
const companyWorkspaceRoute = (basePath) => (
  <Route path={`${basePath}/:companySlug`} element={<CompanyRouteSync />}>
    <Route index element={<Navigate to="overview" replace />} />
    <Route path="overview" element={<AdminCompanyOverview />} />
    <Route path="analytics" element={<AdminDashboard />} />
    <Route
      path="total-analytics"
      element={
        <SmipayOnlyRoute>
          <AdminTotalAnalytics />
        </SmipayOnlyRoute>
      }
    />
    <Route path="customers" element={<AdminCustomersGate />} />
    <Route
      path="transactions"
      element={
        <SmipayOnlyRoute>
          <AdminTransactions />
        </SmipayOnlyRoute>
      }
    />
    <Route
      path="social-media"
      element={
        <SmipayOnlyRoute>
          <AdminSocialMedia />
        </SmipayOnlyRoute>
      }
    />
    <Route
      path="kpi"
      element={
        <SmipayOnlyRoute>
          <AdminKpi />
        </SmipayOnlyRoute>
      }
    />
    <Route
      path="costs"
      element={
        <SmipayOnlyRoute>
          <AdminCosts />
        </SmipayOnlyRoute>
      }
    />
    <Route path="surveys" element={<AdminSurveys />} />
    <Route
      path="schools"
      element={
        <SmehOnlyRoute>
          <AdminSchools />
        </SmehOnlyRoute>
      }
    />
    <Route
      path="subscriptions"
      element={
        <SmehOnlyRoute>
          <AdminSubscriptions />
        </SmehOnlyRoute>
      }
    />
    <Route path="clients" element={<AdminClientsGate />} />
    <Route
      path="projects"
      element={
        <BestTechOnlyRoute>
          <AdminBesttechProjects />
        </BestTechOnlyRoute>
      }
    />
    <Route
      path="jobs"
      element={
        <BestInPrintOnlyRoute>
          <AdminBestInPrintJobs />
        </BestInPrintOnlyRoute>
      }
    />
    <Route
      path="advertisers"
      element={
        <OxygenOnlyRoute>
          <AdminOxygenAdvertisers />
        </OxygenOnlyRoute>
      }
    />
    <Route
      path="bookings"
      element={
        <OxygenOnlyRoute>
          <AdminOxygenBookings />
        </OxygenOnlyRoute>
      }
    />
    <Route
      path="sales"
      element={
        <TrifoneOnlyRoute>
          <AdminTrifoneSales />
        </TrifoneOnlyRoute>
      }
    />
    <Route
      path="daily-totals"
      element={
        <AccessibleOnlyRoute>
          <AdminAccessibleDailyTotals />
        </AccessibleOnlyRoute>
      }
    />
    <Route
      path="school-purchases"
      element={
        <AccessibleOnlyRoute>
          <AdminAccessibleSchoolPurchases />
        </AccessibleOnlyRoute>
      }
    />
    <Route
      path="data-analysis"
      element={
        <AccessibleOnlyRoute>
          <AdminAccessibleDataAnalysis />
        </AccessibleOnlyRoute>
      }
    />
  </Route>
);

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/pending" element={<PendingApprovalPage />} />
      <Route path="/survey/:slug" element={<PublicSurveyPage />} />

      <Route
        element={
          <Protected role="user">
            <AppLayout />
          </Protected>
        }
      >
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/dashboard/customers" element={<UserCustomersGate />} />
        <Route path="/dashboard/schools" element={<UserSchools />} />
        <Route path="/dashboard/clients" element={<UserClientsGate />} />
        <Route path="/dashboard/advertisers" element={<UserAdvertisers />} />
        <Route path="/dashboard/social-media" element={<UserSocialMedia />} />
        <Route path="/dashboard/daily-totals" element={<UserDailyTotals />} />
        <Route
          path="/dashboard/accessible-daily-totals"
          element={<UserAccessibleDailyTotals />}
        />
        <Route path="/dashboard/analytics" element={<UserAnalytics />} />
        <Route path="/dashboard/records" element={<UserRecords />} />
      </Route>

      <Route
        element={
          <Protected role="admin">
            <AppLayout />
          </Protected>
        }
      >
        <Route path="/admin" element={<AdminHub />} />
        <Route path="/admin/companies" element={<CompaniesPage />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/staff" element={<AdminStaff />} />
        <Route path="/admin/assessments" element={<MdAssessments />} />
        <Route path="/admin/scorecards" element={<MdScorecards />} />
        <Route
          path="/admin/scorecards/:staffId"
          element={<MdScorecards />}
        />

        <Route
          path="/admin/analytics"
          element={<LegacyAdminRedirect page="analytics" />}
        />
        <Route
          path="/admin/customers"
          element={<LegacyAdminRedirect page="customers" />}
        />
        <Route
          path="/admin/transactions"
          element={<LegacyAdminRedirect page="transactions" />}
        />
        <Route
          path="/admin/social-media"
          element={<LegacyAdminRedirect page="social-media" />}
        />
        <Route
          path="/admin/kpi"
          element={<LegacyAdminRedirect page="kpi" />}
        />
        <Route
          path="/admin/costs"
          element={<LegacyAdminRedirect page="costs" />}
        />
        <Route
          path="/admin/total-analytics"
          element={<LegacyAdminRedirect page="total-analytics" />}
        />
        <Route
          path="/admin/surveys"
          element={<LegacyAdminRedirect page="surveys" />}
        />

        {companyWorkspaceRoute('/admin')}
      </Route>

      <Route
        element={
          <Protected role="md">
            <AppLayout />
          </Protected>
        }
      >
        <Route path="/md" element={<AdminHub />} />
        <Route path="/md/assessments" element={<MdAssessments />} />
        <Route path="/md/scorecards" element={<MdScorecards />} />
        <Route path="/md/scorecards/:staffId" element={<MdScorecards />} />
        {companyWorkspaceRoute('/md')}
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
