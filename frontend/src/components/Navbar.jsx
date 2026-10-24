import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
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

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile navigation when location changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile navigation on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Prevent background scroll when mobile navigation is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    { to: '/', label: 'Explore', icon: Compass, activeColor: 'text-emerald-400' },
    { to: '/favorites', label: 'Favorites', icon: Heart, activeColor: 'text-rose-400' },
    { to: '/play-later', label: 'Play Later', icon: Bookmark, activeColor: 'text-amber-400' },
    { to: '/library', label: 'Library', icon: ListMusic, activeColor: 'text-emerald-400' },
    { to: '/rooms', label: 'Rooms', icon: Radio, activeColor: 'text-emerald-400' },
    { to: '/social', label: 'Social', icon: Users, activeColor: 'text-emerald-400' },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-3.5 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand and Desktop Nav Links */}
        <div className="flex items-center gap-4 lg:gap-6 min-w-0">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 group shrink-0"
            title="Vibely — Home"
          >
            <img
              src="/vibely-logo.png"
              alt="Vibely logo"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain shadow-lg shadow-emerald-500/15 group-hover:scale-105 transition-transform shrink-0"
            />
            <span className="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Vibely
            </span>
          </Link>

          {/* Core Desktop Navigation Items (>= lg screens) */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? `bg-slate-800/80 ${link.activeColor}`
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: User Session Nav + Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Profile Link Badge */}
              <Link
                to="/profile"
                className={`flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800 border rounded-full px-2.5 sm:px-3 py-1.5 shadow-sm transition-all ${
                  isActive('/profile') ? 'border-emerald-500/40' : 'border-slate-800 hover:border-slate-700'
                }`}
                title="Your Profile"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-[11px] font-bold text-slate-950 uppercase shrink-0 overflow-hidden ring-1 ring-emerald-500/30">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : user.name ? (
                    user.name.charAt(0)
                  ) : (
                    <User className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-bold text-slate-200 leading-tight truncate max-w-[120px]">
                    {user.name}
                  </div>
                </div>
              </Link>

              {/* Desktop Logout Button */}
              <button
                onClick={handleLogout}
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/40 text-xs font-semibold transition-all cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 text-xs font-semibold transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </Link>
              <Link
                to="/register"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up</span>
              </Link>
            </div>
          )}

          {/* Mobile & Tablet Hamburger Button (< lg) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="lg:hidden w-11 h-11 flex items-center justify-center rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-emerald-400" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-x-0 top-[57px] bottom-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 flex flex-col justify-between overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
        >
          <div className="p-4 space-y-2 max-w-lg mx-auto w-full">
            {/* User Info Header if logged in */}
            {user && (
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-slate-950 uppercase shrink-0 overflow-hidden ring-2 ring-emerald-500/30">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : user.name ? (
                    user.name.charAt(0)
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white truncate">{user.name}</div>
                  <div className="text-xs text-slate-400 truncate font-mono">{user.email}</div>
                </div>
              </div>
            )}

            {/* Navigation Links list with 44px+ tap targets */}
            <nav className="space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all min-h-[48px] ${
                      active
                        ? `bg-slate-900 ${link.activeColor} border border-slate-800 shadow-sm`
                        : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}

              {/* Profile in list if logged in */}
              {user && (
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all min-h-[48px] ${
                    isActive('/profile')
                      ? 'bg-slate-900 text-emerald-400 border border-slate-800 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <User className="w-5 h-5 shrink-0" />
                  <span>Profile Settings</span>
                </Link>
              )}
            </nav>
          </div>

          {/* Bottom Actions inside Mobile Drawer */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/80 max-w-lg mx-auto w-full pb-8">
            {user ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-sm font-bold transition-all cursor-pointer min-h-[48px]"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Vibely</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold min-h-[48px]"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Log In</span>
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold min-h-[48px] shadow-md shadow-emerald-500/20"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Sign Up</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
