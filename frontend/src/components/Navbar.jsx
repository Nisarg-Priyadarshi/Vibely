import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Music, LogIn, UserPlus, LogOut, User, ListMusic, Compass, Radio, Users, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    { to: '/', label: 'Explore', icon: Compass },
    { to: '/library', label: 'Library', icon: ListMusic },
    { to: '/rooms', label: 'Rooms', icon: Radio },
    { to: '/social', label: 'Social', icon: Users },
  ];

  return (
    <header className="border-b border-[rgba(255,255,255,0.08)] bg-[#121212]/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Brand Wordmark */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-[4px] bg-[#ffffff] text-[#121212] flex items-center justify-center font-black transition-transform group-hover:scale-105">
              <Music className="w-4 h-4 fill-current text-[#121212]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-tight text-[#ffffff]">
                VIBELY
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00e599]" title="Live Network" />
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-[4px] text-xs font-semibold tracking-wide transition-colors ${
                    active
                      ? 'bg-[#222222] text-[#ffffff] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]'
                      : 'text-[#999999] hover:text-[#ffffff] hover:bg-[#1a1a1a]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: User / Auth Controls */}
        <div className="hidden sm:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Profile Badge */}
              <Link
                to="/profile"
                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] bg-[#1e1e1e] hover:bg-[#262626] border border-[rgba(255,255,255,0.08)] transition-all ${
                  isActive('/profile') ? 'border-[rgba(255,255,255,0.25)]' : ''
                }`}
              >
                <div className="w-6 h-6 rounded-[3px] bg-[#303030] flex items-center justify-center text-[11px] font-bold text-[#ffffff] uppercase overflow-hidden shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : user.name ? (
                    user.name.charAt(0)
                  ) : (
                    <User className="w-3.5 h-3.5" />
                  )}
                </div>
                <span className="text-xs font-semibold text-[#ffffff] max-w-[120px] truncate">
                  {user.name}
                </span>
              </Link>

              <button
                onClick={handleLogout}
                className="btn-ghost text-xs text-[#999999] hover:text-[#ffffff] px-2.5 py-1.5"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="btn-ghost text-xs text-[#999999] hover:text-[#ffffff]"
              >
                <LogIn className="w-3.5 h-3.5 mr-1" />
                Sign In
              </Link>
              <Link
                to="/register"
                className="btn-white text-xs px-3.5 py-1.5"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                Create account
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          {user && (
            <Link
              to="/profile"
              className="w-8 h-8 rounded-[4px] bg-[#222222] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-xs font-bold text-[#ffffff] overflow-hidden"
            >
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name?.charAt(0) || <User className="w-4 h-4" />
              )}
            </Link>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-[4px] bg-[#222222] text-[#cccccc] hover:text-white"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[rgba(255,255,255,0.08)] pt-3 pb-4 mt-3 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-[4px] text-xs font-semibold ${
                  active
                    ? 'bg-[#222222] text-[#ffffff]'
                    : 'text-[#999999] hover:text-[#ffffff] hover:bg-[#1a1a1a]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}

          <div className="pt-2 border-t border-[rgba(255,255,255,0.08)] mt-2">
            {user ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/20 rounded-[4px]"
              >
                <LogOut className="w-4 h-4" />
                Log Out ({user.name})
              </button>
            ) : (
              <div className="flex gap-2 px-1 pt-1">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 btn-graphite text-xs text-center py-2"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 btn-white text-xs text-center py-2"
                >
                  Create account
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
