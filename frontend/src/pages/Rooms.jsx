import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Radio,
  Plus,
  LogIn,
  Users,
  Music2,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Disc,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../context/RoomContext';
import { API_BASE_URL } from '../config/api';

export const Rooms = () => {
  const { user } = useAuth();
  const { createRoom, joinRoom, socketStatus } = useRoom();
  const navigate = useNavigate();

  // Create Room state
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Join Room state
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);

  // Active public rooms list
  const [activeRooms, setActiveRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await fetch(`${API_BASE_URL}/rooms`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setActiveRooms(data.data || []);
      }
    } catch (err) {
      console.warn('Failed to load active rooms:', err.message);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRooms();
    }
  }, [user]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!createName.trim()) {
      setCreateError('Please enter a room name.');
      return;
    }

    setCreateError(null);
    setIsCreating(true);

    try {
      const room = await createRoom({
        name: createName.trim(),
        description: createDesc.trim(),
      });
      navigate(`/rooms/${room.code}`);
    } catch (err) {
      setCreateError(err.message || 'Could not create room.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) {
      setJoinError('Please enter a valid room code.');
      return;
    }

    setJoinError(null);
    setIsJoining(true);

    try {
      const room = await joinRoom(cleanCode);
      navigate(`/rooms/${room.code}`);
    } catch (err) {
      setJoinError(err.message || 'Could not join room.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinExisting = async (code) => {
    try {
      const room = await joinRoom(code);
      navigate(`/rooms/${room.code}`);
    } catch (err) {
      setJoinError(err.message || 'Could not join room.');
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl backdrop-blur-xl">
          <img
            src="/vibely-logo.png"
            alt="Vibely logo"
            className="w-16 h-16 mx-auto rounded-2xl shadow-xl shadow-emerald-500/10 border border-slate-800/80 object-contain"
          />
          <h2 className="text-2xl font-black text-white">Vibely Rooms</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Collaborative listening sessions with real-time audio synchronization. Sign in to create your own room or join with a room code.
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
            >
              <LogIn className="w-4 h-4" />
              Sign In to Enter Rooms
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 pb-32">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Real-Time Audio Sync
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5 sm:gap-3">
            <Radio className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400 shrink-0" />
            <span>Vibely Rooms</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Stream music simultaneously with friends. The host directs playback while members can request their favorite tracks.
          </p>
        </div>

        {/* Real-time Connection Indicator */}
        <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-2xl shadow-inner self-start md:self-auto shrink-0">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              socketStatus === 'connected'
                ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-pulse'
                : socketStatus === 'connecting' || socketStatus === 'reconnecting'
                ? 'bg-amber-400 animate-ping'
                : 'bg-rose-400'
            }`}
          />
          <div className="text-xs">
            <span className="font-semibold text-slate-300">Socket: </span>
            <span
              className={`capitalize font-bold ${
                socketStatus === 'connected'
                  ? 'text-emerald-400'
                  : socketStatus === 'connecting' || socketStatus === 'reconnecting'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {socketStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Action Cards: Create & Join */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {/* Card 1: Create a Room */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />

          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <Plus className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white">Create a New Room</h2>
            <p className="text-xs text-slate-400 mt-1">
              Become the host and guide the playback. You can approve or reject track change requests.
            </p>

            {createError && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRoom} className="mt-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Room Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Midnight Beats & Chill"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  maxLength={50}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lo-Fi session with the crew"
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  maxLength={100}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer mt-2 min-h-[44px]"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Room...
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4" />
                    Launch Room as Host
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Card 2: Join via Code */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors pointer-events-none" />

          <div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white">Join with Room Code</h2>
            <p className="text-xs text-slate-400 mt-1">
              Have a shareable code from a host? Enter it below to join the listening party instantly.
            </p>

            {joinError && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{joinError}</span>
              </div>
            )}

            <form onSubmit={handleJoinByCode} className="mt-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Room Code (6 Characters) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 7K3N"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-base font-mono uppercase tracking-widest text-center text-cyan-400 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors font-bold"
                />
              </div>

              <div className="pt-2 sm:pt-9">
                <button
                  type="submit"
                  disabled={isJoining}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer min-h-[44px]"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      Join Room
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Active Live Rooms Directory */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Disc className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Active Vibely Rooms</h2>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
              {activeRooms.length}
            </span>
          </div>

          <button
            onClick={fetchRooms}
            disabled={loadingRooms}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingRooms ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loadingRooms ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            <p className="text-xs">Discovering active rooms...</p>
          </div>
        ) : activeRooms.length === 0 ? (
          <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-10 text-center space-y-3">
            <Radio className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-300">No Active Rooms Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are currently no active public sessions. Be the first to start a room and invite your friends!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeRooms.map((room) => (
              <div
                key={room.code}
                className="bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-5 shadow-lg flex flex-col justify-between group transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      #{room.code}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                      <Users className="w-3 h-3 text-emerald-400" />
                      {room.memberCount} listening
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                    {room.name}
                  </h3>
                  {room.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {room.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Host: <strong className="text-slate-200">{room.hostName}</strong></span>
                  </div>

                  {room.state?.currentSong && (
                    <div className="mt-3 p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 text-xs text-slate-300">
                      <Music2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">
                        {room.state.currentSong.title} &bull; {room.state.currentSong.artist}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleJoinExisting(room.code)}
                  className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                >
                  Join Session
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Rooms;
