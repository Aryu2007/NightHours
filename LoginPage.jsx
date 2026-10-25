import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectPath = location.state?.from?.pathname || '/';

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        if (!form.name.trim()) {
          setError('Name is required');
          setLoading(false);
          return;
        }
        await register(form.email, form.password, form.name);
      }
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-icon">☾</span>
          <h1>{isLogin ? 'Welcome back' : 'Create account'}</h1>
          <p>{isLogin ? 'Sign in to continue your night' : 'Join the Night Hours universe'}</p>
        </div>

        {error && <div className="auth-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <label>
              <span>Display name</span>
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Your gamer name"
                maxLength="20"
                required
                autoFocus
              />
            </label>
          )}

          <label>
            <span>Email</span>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              autoFocus={isLogin}
            />
          </label>

          <label>
            <span>Password</span>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              minLength="6"
              required
            />
          </label>

          <button className="primary-button" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Please wait…' : (isLogin ? 'Sign in →' : 'Create account →')}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); setForm({ email: '', password: '', name: '' }); }}>
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>

        <div className="auth-demo">
          <p className="eyebrow">DEMO MODE</p>
          <p>Or continue as guest (local only)</p>
          <Link to="/" className="outline-button" style={{ width: '100%', textAlign: 'center' }}>Continue as guest →</Link>
        </div>
      </div>
    </section>
  );
}

export default LoginPage;
