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

function AppContent() {
  const { loading, authError, checkAuth } = useAuth();

  if (loading) {
    return <LoadingScreen error={authError} onRetry={checkAuth} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0e1322] to-slate-950 text-slate-100 flex flex-col font-sans relative">
      <Navbar />

                <main className="flex-1 flex flex-col">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/songs/:id" element={<SongDetail />} />
                    <Route path="/favorites" element={<Favorites />} />
                    <Route path="/play-later" element={<PlayLater />} />
                    <Route path="/library" element={<Library />} />
                    <Route path="/playlists/:id" element={<PlaylistDetail />} />
                    <Route path="/rooms" element={<Rooms />} />
                    <Route path="/rooms/:code" element={<RoomDetail />} />
                    <Route path="/social" element={<Social />} />
                    <Route path="/chat" element={<Social />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                  </Routes>
                </main>

                <footer className="border-t border-slate-800/80 py-6 px-4 mb-24 sm:mb-28 text-center text-xs text-slate-500">
                  <div className="flex items-center justify-center gap-2 mb-1.5">
                    <img
                      src="/vibely-logo.png"
                      alt="Vibely logo"
                      className="w-5 h-5 rounded-md object-contain opacity-85"
                    />
                    <span className="font-bold text-slate-300">Vibely</span>
                    <span>&copy; {new Date().getFullYear()}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Collaborative Music Streaming Platform &bull; Listen Together
                  </p>
                </footer>

      {/* Persistent Floating Bottom Audio Player */}
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
