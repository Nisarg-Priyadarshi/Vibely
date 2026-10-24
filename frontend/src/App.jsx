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
    <AuthProvider>
      <PlayerProvider>
        <RoomProvider>
          <PlaylistProvider>
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

              <footer className="border-t border-slate-800/80 py-6 mb-24 text-center text-xs text-slate-500">
                Vibely &copy; {new Date().getFullYear()} &bull; Collaborative Music Streaming Platform
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
