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
import { SafeAvatar } from './SafeAvatar';

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
      className={`nav-stripe-bg sticky top-0 z-40 px-5 sm:px-10 transition-all duration-200 ${
        scrolled
          ? 'backdrop-blur-md border-b border-white/[0.12] shadow-lg'
          : 'backdrop-blur-md border-b border-white/[0.08]'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between h-[4.5rem]">
        {/* Brand wordmark with true logo */}
        <div className="flex items-center gap-10 min-w-0">
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <img
              src="/vibely-logo.png"
              alt="Vibely"
              className="w-9 h-9 rounded-[6px] object-contain shadow-md transition-transform duration-200 group-hover:scale-105"
            />
            <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-widest text-[#ffffff] uppercase font-sans">
                Vibely
              </span>
              <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-[#ff7a1a] shadow-[0_0_8px_#ff7a1a] animate-pulse" />
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden xl:flex items-center gap-2" aria-label="Main navigation">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`group flex items-center gap-2 px-3.5 py-2 rounded-[4px] text-sm font-medium tracking-wide transition-[color,background-color,transform,box-shadow] duration-200 ease-out hover:-translate-y-[1px] active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none ${
                    active
                      ? 'bg-[#222222] text-[#ffffff] shadow-[inset_0_0_0_1px_rgba(255,122,26,0.35)]'
                      : 'text-[#999999] hover:text-[#ffffff] hover:bg-[#1a1a1a] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-colors duration-200 group-hover:text-[#ff7a1a] ${active ? 'text-[#ff7a1a]' : 'text-[#888888]'}`} aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Auth controls — desktop */}
        <div className="hidden xl:flex items-center gap-4">
          {user ? (
            <>
              <Link
                to="/profile"
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-[4px] transition-[color,background-color,transform,box-shadow] duration-200 ease-out hover:-translate-y-[1px] active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none ${
                  isActive('/profile')
                    ? 'bg-[#222222] shadow-[inset_0_0_0_1px_rgba(255,122,26,0.35)]'
                    : 'bg-[#181818] hover:bg-[#202020] border border-white/5'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-[#2a2a2a] border border-white/10 flex items-center justify-center text-[11px] font-bold text-[#ff7a1a] uppercase overflow-hidden shrink-0">
                  <SafeAvatar src={user.avatar} name={user.name} />
                </div>
                <span className="text-xs font-medium text-[#ffffff] max-w-[120px] truncate">
                  {user.name}
                </span>
              </Link>

              <button
                onClick={handleLogout}
                className="btn-ghost text-xs py-1.5 px-3 gap-1.5 hover:text-rose-400 transition-colors"
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
              <Link to="/register" className="btn-accent text-xs py-2 px-4 gap-1.5">
                <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                Create account
              </Link>
            </>
          )}
        </div>

        {/* Mobile: avatar + hamburger */}
        <div className="flex xl:hidden items-center gap-2">
          {user && (
            <Link
              to="/profile"
              className="w-8 h-8 rounded-[4px] bg-[#303030] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-xs font-bold text-[#ffffff] overflow-hidden"
            >
              {user.avatar ? (
                <SafeAvatar src={user.avatar} name={user.name} />
              ) : (
                user.name?.charAt(0) || <User className="w-4 h-4" />
              )}
            </Link>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-11 h-11 flex items-center justify-center rounded-[4px] bg-[#1e1e1e] text-[#cccccc] hover:text-white hover:bg-[#29221d] transition-[color,background-color,transform] duration-200 ease-out active:scale-95 motion-reduce:transform-none motion-reduce:transition-none"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <nav
          className="xl:hidden border-t border-[rgba(255,255,255,0.07)] py-3 space-y-1"
          aria-label="Mobile navigation"
        >
          {NAV_LINKS.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                className={`group flex min-h-11 items-center gap-3 px-3 py-3 rounded-[4px] text-sm font-medium transition-[color,background-color,transform] duration-200 ease-out hover:translate-x-[2px] active:translate-x-0 motion-reduce:transform-none motion-reduce:transition-none ${
                  active
                    ? 'bg-[#303030] text-[#ffffff]'
                    : 'text-[#999999] hover:text-[#ffffff] hover:bg-[#1e1e1e]'
                }`}
              >
                <Icon className="w-4 h-4 text-[#888888] transition-colors duration-200 group-hover:text-[#ff7a1a]" aria-hidden="true" />
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
