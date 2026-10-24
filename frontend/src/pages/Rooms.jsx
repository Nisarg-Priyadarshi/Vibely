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
        <div className="max-w-md w-full bg-[#1e1e1e] border border-[rgba(255,255,255,0.07)] rounded-[4px] p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-[4px] bg-[#303030] text-[#cccccc] flex items-center justify-center mx-auto">
            <Radio className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-light text-white">Vibely Rooms</h2>
          <p className="text-xs text-[#999999] leading-relaxed">
            Collaborative listening sessions with real-time audio synchronization. Sign in to create your own room or join with a room code.
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="btn-white text-xs px-5 py-2.5"
            >
              <LogIn className="w-4 h-4 mr-1.5" />
              Sign In to Enter Rooms
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.07)] pb-6">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#999999] mb-1">
            Real-Time Sync
          </div>
          <h1 className="text-3xl font-light text-white tracking-tight flex items-center gap-3">
            <Radio className="w-7 h-7 text-[#cccccc]" />
            Vibely Rooms
          </h1>
          <p className="text-sm text-[#999999] mt-1 max-w-xl">
            Stream music simultaneously with friends. The host directs playback while members can request their favorite tracks.
          </p>
        </div>

        {/* Real-time Connection Indicator */}
        <div className="flex items-center gap-2.5 bg-[#1e1e1e] border border-[rgba(255,255,255,0.07)] px-4 py-2 rounded-[4px] self-start md:self-auto">
          <span
            className={`w-2 h-2 rounded-full ${socketStatus === 'connected'
                ? 'bg-[#ffffff]'
                : socketStatus === 'connecting' || socketStatus === 'reconnecting'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-rose-400'
              }`}
          />
          <div className="text-xs">
            <span className="font-medium text-[#cccccc]">Socket: </span>
            <span
              className={`capitalize font-mono text-[11px] font-semibold ${socketStatus === 'connected'
                  ? 'text-[#ffffff]'
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
        <div className="bg-[#1e1e1e] border border-[rgba(255,255,255,0.07)] rounded-[4px] p-6 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-[4px] bg-[#303030] text-[#cccccc] flex items-center justify-center mb-4">
              <Plus className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-medium text-white">Create a New Room</h2>
            <p className="text-xs text-[#999999] mt-1">
              Become the host and guide the playback. You can approve or reject track change requests.
            </p>

            {createError && (
              <div className="mt-3 p-2.5 rounded-[4px] bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRoom} className="mt-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-[#cccccc] mb-1">
                  Room Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Midnight Synthwave Studio"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  maxLength={50}
                  className="w-full input-flat text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#cccccc] mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ambient electronic and chill instrumentals"
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  maxLength={100}
                  className="w-full input-flat text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full btn-white text-xs py-2.5 mt-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Creating Room...
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4 mr-1.5" />
                    Launch Room as Host
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Card 2: Join via Code */}
        <div className="bg-[#1e1e1e] border border-[rgba(255,255,255,0.07)] rounded-[4px] p-6 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-[4px] bg-[#303030] text-[#cccccc] flex items-center justify-center mb-4">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-medium text-white">Join with Room Code</h2>
            <p className="text-xs text-[#999999] mt-1">
              Have a shareable code from a host? Enter it below to join the listening party instantly.
            </p>

            {joinError && (
              <div className="mt-3 p-2.5 rounded-[4px] bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{joinError}</span>
              </div>
            )}

            <form onSubmit={handleJoinByCode} className="mt-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-[#cccccc] mb-1">
                  Room Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 7K3N"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="w-full input-flat text-sm font-mono tracking-widest text-center text-[#ffffff] uppercase font-bold"
                />
              </div>

              <button
                  type="submit"
                  disabled={isJoining}
                  className="w-full btn-white text-xs py-2.5"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 mr-1.5" />
                      Join Room
                    </>
                  )}
                </button>
            </form>
          </div>
        </div>
      </div>

      {/* Active Live Rooms Directory */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Disc className="w-4 h-4 text-[#cccccc]" />
            <h2 className="text-lg font-bold text-[#ffffff]">Active Listening Sessions</h2>
            <span className="text-[11px] font-mono bg-[#222222] text-[#cccccc] px-2 py-0.5 rounded-[2px] border border-[rgba(255,255,255,0.06)]">
              {activeRooms.length}
            </span>
          </div>

          <button
            onClick={fetchRooms}
            disabled={loadingRooms}
            className="btn-graphite text-xs px-3 py-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingRooms ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loadingRooms ? (
          <div className="py-12 flex flex-col items-center justify-center text-[#999999] space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#00e599]" />
            <p className="text-xs">Locating live sessions...</p>
          </div>
        ) : activeRooms.length === 0 ? (
          <div className="bg-[#181818] border border-dashed border-[rgba(255,255,255,0.08)] rounded-[4px] p-10 text-center space-y-3">
            <Radio className="w-8 h-8 text-[#666666] mx-auto" />
            <h3 className="text-sm font-semibold text-[#ffffff]">No Active Rooms Online</h3>
            <p className="text-xs text-[#999999] max-w-sm mx-auto">
              There are currently no active public listening sessions. Launch a new room above to stream music with friends.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeRooms.map((room) => (
              <div
                key={room.code}
                className="bg-[#181818] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] rounded-[4px] p-5 flex flex-col justify-between transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-[#ff7a1a] bg-[#26170f] px-2 py-0.5 rounded-[2px] border border-[#ff7a1a]/20">
                      #{room.code}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#999999]">
                      <Users className="w-3 h-3 text-[#cccccc]" />
                      {room.memberCount} listening
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#ffffff] truncate">
                    {room.name}
                  </h3>
                  {room.description && (
                    <p className="text-xs text-[#999999] mt-1 line-clamp-2">
                      {room.description}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 mt-3 text-xs text-[#777777]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#cccccc]" />
                    <span>Host: <strong className="text-[#cccccc]">{room.hostName}</strong></span>
                  </div>

                  {room.state?.currentSong && (
                    <div className="mt-3 p-2 rounded-[3px] bg-[#121212] border border-[rgba(255,255,255,0.06)] flex items-center gap-2 text-xs text-[#cccccc]">
                      <Music2 className="w-3.5 h-3.5 text-[#cccccc] shrink-0" />
                      <span className="truncate">
                        {room.state.currentSong.title} &bull; {room.state.currentSong.artist}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleJoinExisting(room.code)}
                  className="mt-4 w-full btn-graphite text-xs py-2 hover:bg-[#ffffff] hover:text-[#121212] transition-colors"
                >
                  Join Session
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
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
