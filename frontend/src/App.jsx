import { useState, useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
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
    <div className="min-h-screen bg-[#121212] text-[#f2f2f2] flex flex-col font-sans relative">
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

      <footer className="border-t border-[rgba(255,255,255,0.07)] py-6 mb-24 bg-[#121212]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm font-semibold tracking-widest text-[#ffffff] uppercase">
            Vibely
          </span>
          <span className="text-xs text-[#666666]">
            &copy; {new Date().getFullYear()} Vibely. All rights reserved.
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
