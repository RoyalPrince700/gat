import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { homePathForUser, useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { user, loading, login, signup } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get('/auth/setup-status')
      .then((res) => setIsFirstUser(Boolean(res.data?.needsAdmin)))
      .catch(() => setIsFirstUser(false));
  }, []);

  if (!loading && user) {
    return <Navigate to={homePathForUser(user)} replace />;
  }

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedIn =
        mode === 'signup'
          ? await signup(name, email, password)
          : await login(email, password);
      navigate(homePathForUser(loggedIn));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (mode === 'signup' ? 'Signup failed' : 'Login failed')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>GAT</h1>
        <p className="lede">
          {mode === 'signup'
            ? isFirstUser
              ? 'Create the growth officer admin account to get started.'
              : 'Create an account. An admin will assign your role before you can access the platform.'
            : 'Sign in to enter growth data or open the analysis platform.'}
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={onSubmit}>
          {mode === 'signup' && (
            <label>
              Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </label>

          {error && <p className="error">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting
              ? mode === 'signup'
                ? 'Creating account…'
                : 'Signing in…'
              : mode === 'signup'
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
