import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Music, LogIn, UserPlus, LogOut, User, ListMusic, Compass, Radio, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Brand and Nav Links */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Music className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                VIBELY
              </span>
            </div>
          </Link>

          {/* Core Navigation Items */}
          <nav className="hidden sm:flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive('/')
                  ? 'bg-slate-800/80 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Explore
            </Link>

            <Link
              to="/library"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive('/library') || location.pathname.startsWith('/playlists')
                  ? 'bg-slate-800/80 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
              Library
            </Link>

            <Link
              to="/rooms"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive('/rooms') || location.pathname.startsWith('/rooms')
                  ? 'bg-slate-800/80 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Rooms
            </Link>

            <Link
              to="/social"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive('/social') || location.pathname.startsWith('/chat')
                  ? 'bg-slate-800/80 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Social
            </Link>
          </nav>
        </div>

        {/* Right: User Session Nav */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Profile Link Badge */}
              <Link
                to="/profile"
                className={`flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800 border rounded-full px-3 py-1.5 shadow-sm transition-all ${
                  isActive('/profile') ? 'border-emerald-500/40' : 'border-slate-800 hover:border-slate-700'
                }`}
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

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/40 text-xs font-semibold transition-all cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 text-xs font-semibold transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                Log In
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
