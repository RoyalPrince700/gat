import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PendingApprovalPage = () => {
  const { user, loading, logout, refreshUser } = useAuth();

  useEffect(() => {
    if (!user || user.status !== 'pending') return undefined;

    const tick = () => {
      refreshUser?.().catch(() => {});
    };

    const id = setInterval(tick, 8000);
    return () => clearInterval(id);
  }, [user, refreshUser]);

  if (loading) {
    return <div className="center-screen">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.status !== 'pending') {
    return (
      <Navigate
        to={user.role === 'admin' ? '/admin' : '/dashboard'}
        replace
      />
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>GAT</h1>
        <p className="lede">
          Thanks for signing up, {user.name.split(' ')[0] || user.name}. Your
          account is waiting for an admin to assign your role and company before
          you can use the platform.
        </p>
        <p className="hint" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
          You can leave this page open; it will update automatically once you
          are approved. Or sign out and come back later.
        </p>
        <button type="button" className="btn btn-primary" onClick={logout}>
          Sign out
        </button>
      </div>
    </div>
  );
};

export default PendingApprovalPage;
