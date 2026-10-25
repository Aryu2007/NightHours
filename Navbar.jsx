import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navigation = [
  { label: 'Home', to: '/' },
  { label: 'Learning', to: '/learning' },
  { label: 'Rising', to: '/rising' },
  { label: 'Arena', to: '/arena' },
  { label: 'Golden', to: '/golden' },
];

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="navbar">
      <NavLink className="brand" to="/" aria-label="Night Hours home">
        <span className="brand-mark">☾</span>
        <span>NIGHT <strong>HOURS</strong></span>
      </NavLink>

      <nav
        id="primary-navigation"
        className={mobileMenuOpen ? 'is-open' : ''}
        aria-label="Main navigation"
      >
        {navigation.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="navbar-actions">
        {user ? (
          <div className="user-menu">
            <NavLink to="/profile" className="user-avatar" aria-label="Profile">
              <span>{user.avatar}</span>
              <span className="user-name">{user.name}</span>
            </NavLink>
            <button className="outline-button" type="button" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        ) : (
          <NavLink to="/login" className="primary-button">Join the night</NavLink>
        )}

        <button
          type="button"
          className="mobile-menu-toggle"
          aria-expanded={mobileMenuOpen}
          aria-controls="primary-navigation"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <span>{mobileMenuOpen ? '✕' : '☰'}</span>
        </button>
      </div>
    </header>
  );
}

export default Navbar;
