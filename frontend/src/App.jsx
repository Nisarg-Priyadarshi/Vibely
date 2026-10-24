import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import { PlaylistProvider } from './context/PlaylistContext';
import { RoomProvider } from './context/RoomContext';
import { Navbar } from './components/Navbar';
import { PlayerBar } from './components/PlayerBar';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Library } from './pages/Library';
import { PlaylistDetail } from './pages/PlaylistDetail';
import { Profile } from './pages/Profile';
import { Rooms } from './pages/Rooms';
import { RoomDetail } from './pages/RoomDetail';
import { Social } from './pages/Social';

function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <RoomProvider>
          <PlaylistProvider>
            <div className="min-h-screen bg-[#121212] text-[#f2f2f2] flex flex-col font-sans relative selection:bg-[#00e599] selection:text-[#121212]">
              <Navbar />

              <main className="flex-1 flex flex-col">
                <Routes>
                  <Route path="/" element={<Home />} />
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

              <footer className="border-t border-[rgba(255,255,255,0.07)] py-8 mb-24 text-center text-xs text-[#777777] bg-[#121212]">
                <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold tracking-wider text-sm text-[#ffffff]">VIBELY</span>
                    <span className="text-[11px] text-[#777777]">/ Concert-grade audio rooms</span>
                  </div>
                  <div className="text-[11px] text-[#777777]">
                    &copy; {new Date().getFullYear()} Vibely. All rights reserved.
                  </div>
                </div>
              </footer>

              {/* Persistent Floating Bottom Audio Player */}
              <PlayerBar />
            </div>
          </PlaylistProvider>
        </RoomProvider>
      </PlayerProvider>
    </AuthProvider>
  );
}

export default App;
