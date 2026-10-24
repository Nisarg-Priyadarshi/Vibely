import { useState, useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { PlaylistProvider } from './context/PlaylistContext';
import { RoomProvider } from './context/RoomContext';
import { SongListProvider } from './context/SongListContext';
import { Navbar } from './components/Navbar';
import { PlayerBar } from './components/PlayerBar';
import { LoadingScreen } from './components/LoadingScreen';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Library } from './pages/Library';
import { PlaylistDetail } from './pages/PlaylistDetail';
import { Profile } from './pages/Profile';
import { Rooms } from './pages/Rooms';
import { RoomDetail } from './pages/RoomDetail';
import { Social } from './pages/Social';
import { SongDetail } from './pages/SongDetail';
import { Favorites } from './pages/Favorites';
import { PlayLater } from './pages/PlayLater';

// Minimum time (ms) the LoadingScreen is displayed per user request
const LOADING_MIN_MS = 1200;

function AppContent() {
  const { loading, authError, checkAuth } = useAuth();
  const { isPlaying } = usePlayer();
  const [showLoader, setShowLoader] = useState(true);
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    if (loading) return; // auth is still resolving
    // Auth resolved — enforce minimum display time
    const elapsed = Date.now() - mountedAt.current;
    const remaining = LOADING_MIN_MS - elapsed;
    if (remaining > 0) {
      const t = setTimeout(() => setShowLoader(false), remaining);
      return () => clearTimeout(t);
    } else {
      setShowLoader(false);
    }
  }, [loading]);

  if (showLoader) {
    return <LoadingScreen error={authError} onRetry={checkAuth} />;
  }

  return (
    <div className={`app-shell min-h-screen text-[#f2f2f2] flex flex-col font-sans relative ${isPlaying ? 'app-shell-playing' : ''}`}>
      <Navbar />

      <main className="flex-1 flex flex-col page-enter">
        <Routes>
          <Route path="/"            element={<Home />} />
          <Route path="/songs/:id"   element={<SongDetail />} />
          <Route path="/favorites"   element={<Favorites />} />
          <Route path="/play-later"  element={<PlayLater />} />
          <Route path="/library"     element={<Library />} />
          <Route path="/playlists/:id" element={<PlaylistDetail />} />
          <Route path="/rooms"       element={<Rooms />} />
          <Route path="/rooms/:code" element={<RoomDetail />} />
          <Route path="/social"      element={<Social />} />
          <Route path="/chat"        element={<Social />} />
          <Route path="/profile"     element={<Profile />} />
          <Route path="/login"       element={<Login />} />
          <Route path="/register"    element={<Register />} />
        </Routes>
      </main>

      <footer className="border-t border-white/[0.06] py-8 mb-24 bg-[#121212]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/vibely-logo.png" alt="Vibely" className="w-5 h-5 rounded-[3px] object-contain opacity-80" />
            <span className="text-sm font-bold tracking-widest text-[#ffffff] uppercase font-sans">
              Vibely
            </span>
          </div>
          <span className="text-xs text-[#666666]">
            &copy; {new Date().getFullYear()} Vibely. High-fidelity synchronized music streaming.
          </span>
        </div>
      </footer>

      <PlayerBar />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <SongListProvider>
          <RoomProvider>
            <PlaylistProvider>
              <AppContent />
            </PlaylistProvider>
          </RoomProvider>
        </SongListProvider>
      </PlayerProvider>
    </AuthProvider>
  );
}

export default App;
