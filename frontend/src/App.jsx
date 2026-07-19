import { Navigate, Route, Routes } from 'react-router-dom';
import { homePathForUser, useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import CompanyRouteSync from './components/CompanyRouteSync';
import LegacyAdminRedirect from './components/LegacyAdminRedirect';
import SmipayOnlyRoute from './components/SmipayOnlyRoute';
import LoginPage from './pages/LoginPage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import UserDashboard from './pages/UserDashboard';
import UserRecords from './pages/UserRecords';
import UserCustomers from './pages/UserCustomers';
import UserSchools from './pages/UserSchools';
import UserSocialMedia from './pages/UserSocialMedia';
import AdminHub from './pages/AdminHub';
import AdminOverview from './pages/AdminOverview';
import AdminDashboard from './pages/AdminDashboard';
import AdminCustomers from './pages/AdminCustomers';
import AdminTransactions from './pages/AdminTransactions';
import AdminSchools from './pages/AdminSchools';
import AdminSubscriptions from './pages/AdminSubscriptions';
import AdminSocialMedia from './pages/AdminSocialMedia';
import AdminKpi from './pages/AdminKpi';
import AdminCosts from './pages/AdminCosts';
import AdminSurveys from './pages/AdminSurveys';
import PublicSurveyPage from './pages/PublicSurveyPage';
import CompaniesPage from './pages/CompaniesPage';
import UsersPage from './pages/UsersPage';
import SmehOnlyRoute from './components/SmehOnlyRoute';

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

  if (role && user.role !== role) {
    return <Navigate to={homePathForUser(user)} replace />;
  }

  return children;
};

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
        <Route path="/dashboard/customers" element={<UserCustomers />} />
        <Route path="/dashboard/schools" element={<UserSchools />} />
        <Route path="/dashboard/social-media" element={<UserSocialMedia />} />
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

        {/* Legacy flat admin paths → company-scoped */}
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
          path="/admin/surveys"
          element={<LegacyAdminRedirect page="surveys" />}
        />

        <Route path="/admin/:companySlug" element={<CompanyRouteSync />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<AdminOverview />} />
          <Route path="analytics" element={<AdminDashboard />} />
          <Route
            path="customers"
            element={
              <SmipayOnlyRoute>
                <AdminCustomers />
              </SmipayOnlyRoute>
            }
          />
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
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
