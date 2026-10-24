import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Music,
  LogIn,
  UserPlus,
  LogOut,
  User,
  ListMusic,
  Compass,
  Radio,
  Users,
  Heart,
  Bookmark,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { to: '/',          label: 'Explore',    icon: Compass   },
  { to: '/library',   label: 'Library',    icon: ListMusic  },
  { to: '/rooms',     label: 'Rooms',      icon: Radio      },
  { to: '/social',    label: 'Social',     icon: Users      },
  { to: '/favorites', label: 'Favorites',  icon: Heart      },
  { to: '/play-later',label: 'Play Later', icon: Bookmark   },
];

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Solid background on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    navigate('/login');
  };

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <header
      className={`sticky top-0 z-40 px-4 sm:px-6 transition-colors duration-200 ${
        scrolled
          ? 'bg-[#121212] border-b border-[rgba(255,255,255,0.07)]'
          : 'bg-[#121212]/90 backdrop-blur-sm border-b border-[rgba(255,255,255,0.05)]'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between h-14">
        {/* Brand wordmark */}
        <div className="flex items-center gap-8 min-w-0">
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-7 h-7 rounded-[4px] bg-[#ffffff] flex items-center justify-center transition-transform group-hover:scale-105">
              <Music className="w-4 h-4 text-[#121212]" aria-hidden="true" />
            </div>
            <span className="text-base font-semibold tracking-widest text-[#ffffff] uppercase">
              Vibely
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5" aria-label="Main navigation">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-[4px] text-xs font-medium tracking-wide transition-colors ${
                    active
                      ? 'bg-[#303030] text-[#ffffff]'
                      : 'text-[#999999] hover:text-[#ffffff] hover:bg-[#1e1e1e]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Auth controls — desktop */}
        <div className="hidden sm:flex items-center gap-2">
          {user ? (
            <>
              <Link
                to="/profile"
                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] transition-colors ${
                  isActive('/profile')
                    ? 'bg-[#303030] box-shadow-hairline'
                    : 'hover:bg-[#1e1e1e]'
                }`}
                style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)' }}
              >
                <div className="w-6 h-6 rounded-[3px] bg-[#303030] flex items-center justify-center text-[11px] font-bold text-[#ffffff] uppercase overflow-hidden shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name?.charAt(0) || <User className="w-3.5 h-3.5" />
                  )}
                </div>
                <span className="text-xs font-medium text-[#ffffff] max-w-[120px] truncate">
                  {user.name}
                </span>
              </Link>

              <button
                onClick={handleLogout}
                className="btn-ghost text-xs py-1.5 px-2.5 gap-1.5"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost text-xs py-1.5 px-3 gap-1.5">
                <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                Sign In
              </Link>
              <Link to="/register" className="btn-white text-xs py-1.5 px-4 gap-1.5">
                <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                Create account
              </Link>
            </>
          )}
        </div>

        {/* Mobile: avatar + hamburger */}
        <div className="flex lg:hidden items-center gap-2">
          {user && (
            <Link
              to="/profile"
              className="w-8 h-8 rounded-[4px] bg-[#303030] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-xs font-bold text-[#ffffff] overflow-hidden"
            >
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name?.charAt(0) || <User className="w-4 h-4" />
              )}
            </Link>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-[4px] bg-[#1e1e1e] text-[#cccccc] hover:text-white transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <nav
          className="lg:hidden border-t border-[rgba(255,255,255,0.07)] py-3 space-y-0.5"
          aria-label="Mobile navigation"
        >
          {NAV_LINKS.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[4px] text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#303030] text-[#ffffff]'
                    : 'text-[#999999] hover:text-[#ffffff] hover:bg-[#1e1e1e]'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {label}
              </Link>
            );
          })}

          <div className="pt-2 mt-2 border-t border-[rgba(255,255,255,0.07)]">
            {user ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-rose-400 hover:bg-[#1e1e1e] rounded-[4px] transition-colors"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                Log Out ({user.name})
              </button>
            ) : (
              <div className="flex gap-2 px-1">
                <Link
                  to="/login"
                  className="flex-1 btn-graphite text-xs text-center py-2"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="flex-1 btn-white text-xs text-center py-2"
                >
                  Create account
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
