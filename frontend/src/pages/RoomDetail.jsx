import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Radio,
  Users,
  Copy,
  Check,
  Play,
  Pause,
  Crown,
  LogOut,
  Music2,
  Sparkles,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  Send,
  Loader2,
  ListPlus,
  Shield,
  Volume2,
  UserPlus,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../context/RoomContext';
import { usePlayer } from '../context/PlayerContext';
import { formatTime } from '../utils/format';
import { API_BASE_URL } from '../config/api';
import { SafeImage } from '../components/SafeImage';
import { SafeAvatar } from '../components/SafeAvatar';

export const RoomDetail = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    socketStatus,
    isJoiningRoom,
    currentRoom,
    roomMembers,
    chatMessages,
    roomState,
    pendingRequests,
    roomNotification,
    isHost,
    joinRoom,
    leaveRoom,
    hostControl,
    requestAction,
    respondToRequest,
    syncRoomState,
    sendChatMessage,
  } = useRoom();

  const { currentTime, duration, isPlaying: localIsPlaying } = usePlayer();

  const [copied, setCopied] = useState(false);
  const [songModalOpen, setSongModalOpen] = useState(false);
  const [catalogueSongs, setCatalogueSongs] = useState([]);
  const [songSearch, setSongSearch] = useState('');
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [seekingValue, setSeekingValue] = useState(null);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chatMessages]);

  const handleSendChat = async (event) => {
    event.preventDefault();
    const text = chatDraft.trim();
    if (!text || sendingChat) return;
    setSendingChat(true);
    setChatError('');
    try {
      await sendChatMessage(text);
      setChatDraft('');
    } catch (err) {
      setChatError(err.message);
    } finally {
      setSendingChat(false);
    }
  };

  // Room Friend Invitations State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [invitedMap, setInvitedMap] = useState({});
  const [inviteError, setInviteError] = useState(null);

  // Auto-join / rejoin room on mount or reconnect once socket is connected
  const joiningCodeRef = useRef(null);
  useEffect(() => {
    if (!code || socketStatus !== 'connected') return;

    const normalizedCode = code.trim().toUpperCase();

    // Already in this room and active
    if (currentRoom?.code === normalizedCode) {
      joiningCodeRef.current = null;
      return;
    }

    // Avoid duplicate concurrent joinRoom calls for this room
    if (isJoiningRoom || joiningCodeRef.current === normalizedCode) {
      return;
    }

    joiningCodeRef.current = normalizedCode;
    joinRoom(normalizedCode)
      .catch((err) => {
        console.warn('Auto-join room error:', err.message);
        navigate('/rooms');
      })
      .finally(() => {
        joiningCodeRef.current = null;
      });
  }, [code, socketStatus, currentRoom?.code, isJoiningRoom, joinRoom, navigate]);

  // Load songs catalogue for track selection/requests
  useEffect(() => {
    if (songModalOpen && catalogueSongs.length === 0) {
      setLoadingSongs(true);
      fetch(`${API_BASE_URL}/songs?limit=50`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setCatalogueSongs(data.data || []);
          }
        })
        .catch((err) => console.warn('Failed to load songs catalogue:', err))
        .finally(() => setLoadingSongs(false));
    }
  }, [songModalOpen, catalogueSongs.length]);

  const filteredSongs = useMemo(() => {
    if (!songSearch.trim()) return catalogueSongs;
    const q = songSearch.toLowerCase();
    return catalogueSongs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        (s.genre && s.genre.toLowerCase().includes(q))
    );
  }, [catalogueSongs, songSearch]);

  const handleCopyCode = () => {
    if (!currentRoom?.code) return;
    navigator.clipboard.writeText(currentRoom.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = async () => {
    await leaveRoom();
    navigate('/rooms');
  };

  // Load friends when room invitation modal opens
  useEffect(() => {
    if (inviteModalOpen) {
      setLoadingFriends(true);
      setInviteError(null);
      fetch(`${API_BASE_URL}/friends`, { credentials: 'include' })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setFriendsList(data.friends || []);
          }
        })
        .catch((err) => console.warn('Failed to load friends for invite:', err))
        .finally(() => setLoadingFriends(false));
    }
  }, [inviteModalOpen]);

  const handleInviteFriend = async (friendId) => {
    if (!currentRoom?.code) return;
    try {
      setInviteError(null);
      const res = await fetch(`${API_BASE_URL}/rooms/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roomCode: currentRoom.code, friendId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to send invitation.');
      }
      setInvitedMap((prev) => ({ ...prev, [friendId]: true }));
    } catch (err) {
      setInviteError(err.message);
    }
  };

  // Host playback controls
  const handleHostTogglePlay = async () => {
    if (!isHost) return;
    const action = isPlaying ? 'pause' : 'play';
    const payload = { position: currentTime };
    await hostControl({ action, payload });
  };

  const handleHostSeekChange = (e) => {
    if (!isHost) return;
    setSeekingValue(parseFloat(e.target.value));
  };

  const handleHostSeekCommit = async (e) => {
    if (!isHost) return;
    const pos = parseFloat(e.target.value);
    setSeekingValue(null);
    await hostControl({ action: 'seek', payload: { position: pos } });
  };

  const handleHostSelectSong = async (song) => {
    setSongModalOpen(false);
    if (isHost) {
      await hostControl({
        action: 'change_track',
        payload: { songId: song.id || song._id },
      });
    } else {
      await requestAction({
        action: 'change_track',
        payload: { songId: song.id || song._id },
      });
    }
  };

  // Member request controls
  const handleMemberRequestPlay = async () => {
    setSubmittingAction(true);
    try {
      await requestAction({
        action: 'play',
        payload: { position: currentTime },
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleMemberRequestPause = async () => {
    setSubmittingAction(true);
    try {
      await requestAction({
        action: 'pause',
        payload: { position: currentTime },
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full bg-[#181818] border border-[rgba(255,255,255,0.08)] rounded-[4px] p-8 text-center space-y-4 shadow-2xl">
          <p className="text-sm text-[#cccccc]">You must be logged in to enter a Vibely Room.</p>
          <Link
            to="/login"
            className="btn-white text-xs px-5 py-2.5"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const currentSong = roomState?.currentSong;
  const isPlaying = roomState?.isPlaying ?? localIsPlaying;
  const displayPosition = seekingValue !== null ? seekingValue : currentTime;
  const songDuration = currentSong?.duration || duration || 0;
  const roomProgressPercent = songDuration > 0
    ? Math.min(100, Math.max(0, (displayPosition / songDuration) * 100))
    : 0;

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Transient Notification Banner */}
      {roomNotification && (
        <div
          className={`px-4 py-3 rounded-[4px] border text-xs font-semibold flex items-center justify-between shadow-lg transition-all ${roomNotification.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : roomNotification.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/50 text-amber-200'
                : roomNotification.type === 'success'
                  ? 'bg-[#122b1f] border-[#00e599]/50 text-[#00e599]'
                  : 'bg-[#1e1e1e] border-[rgba(255,255,255,0.1)] text-[#ffffff]'
            }`}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className={`w-4 h-4 shrink-0 ${roomNotification.type === 'warning' ? 'text-amber-400' : 'text-[#00e599]'}`} />
            <span>{roomNotification.message}</span>
          </div>
        </div>
      )}

      {/* Disconnection Warning */}
      {socketStatus !== 'connected' && (
        <div className="px-4 py-3 rounded-2xl bg-amber-950/70 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 animate-spin" />
            <span>
              Connection status: <strong>{socketStatus}</strong>. Sync may be paused.
            </span>
          </div>
          <button
            onClick={syncRoomState}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Re-sync
          </button>
        </div>
      )}

      {/* Room Header Card */}
      <div className="bg-[#181818] border border-white/[0.08] rounded-[6px] p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs font-bold text-[#ff7a1a] bg-[#26170f] px-3 py-1 rounded-[3px] border border-[#ff7a1a]/30 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" />
              #{currentRoom?.code || code}
            </span>

            <button
              onClick={handleCopyCode}
              className="btn-graphite text-xs px-2.5 py-1"
              title="Copy Room Code"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#ff7a1a] mr-1" />
                  <span className="text-[#ff7a1a]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <span className="inline-flex items-center gap-1.5 text-xs text-[#999999] bg-[#222222] px-2.5 py-1 rounded-[3px] border border-white/[0.06] font-mono">
              <Users className="w-3.5 h-3.5 text-[#cccccc]" />
              {roomMembers.length} {roomMembers.length === 1 ? 'member' : 'members'}
            </span>

            {isHost ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-[3px]">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                Host
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-[#999999] bg-[#222222] border border-white/10 px-2.5 py-1 rounded-[3px]">
                <Shield className="w-3.5 h-3.5 text-[#ff7a1a]" />
                Host: <strong className="text-white ml-1">{currentRoom?.hostName || 'Host'}</strong>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extralight text-white tracking-tight">
            {currentRoom?.name || 'Vibely Room'}
          </h1>
          {currentRoom?.description && (
            <p className="text-xs text-[#999999] max-w-2xl">{currentRoom.description}</p>
          )}
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <button
            onClick={syncRoomState}
            className="btn-graphite text-xs px-3.5 py-2 flex items-center gap-1.5 cursor-pointer"
            title="Force synchronization"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Re-sync Audio</span>
          </button>

          <button
            onClick={handleLeave}
            className="btn-danger text-xs px-3.5 py-2 flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Leave Room
          </button>
        </div>
      </div>

      {/* Main Grid: Player Stage & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Collaborative Stage */}
        <div className="lg:col-span-2 space-y-6">
          {/* Synchronized Playback Card */}
          <div className="bg-[#181818] border border-white/[0.08] rounded-[6px] p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-[#ff7a1a]/5 rounded-full blur-3xl pointer-events-none" />

            {currentSong ? (
              <div className="space-y-6">
                {/* Track Artwork and Info */}
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
                  <div className="relative group shrink-0">
                    <SafeImage
                      src={currentSong.coverUrl}
                      alt={currentSong.title}
                      songTitle={currentSong.title}
                      className="w-36 h-36 sm:w-44 sm:h-44 rounded-[6px] object-cover shadow-2xl border border-white/10"
                    />
                    {isPlaying && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-[2px] bg-[#121212]/90 text-[#ff7a1a] text-[10px] font-mono uppercase tracking-wider border border-white/10 flex items-center gap-1">
                        <Volume2 className="w-3 h-3 animate-pulse" />
                        Live
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-[#222222] border border-white/10 text-[10px] font-mono uppercase text-[#ff7a1a]">
                      <Music2 className="w-3 h-3" />
                      {currentSong.genre || 'Vibely Audio'}
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extralight text-white truncate leading-tight">
                      {currentSong.title}
                    </h2>
                    <p className="text-base text-[#cccccc] font-medium truncate">
                      {currentSong.artist}
                    </p>

                    <div className="pt-2 text-xs text-[#777777] flex items-center justify-center sm:justify-start gap-4">
                      <span>Synchronized playback</span>
                      <span>&bull;</span>
                      <span className="font-mono text-[#cccccc]">
                        {isPlaying ? 'Streaming Now' : 'Paused'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Host Scrubber */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs font-mono text-[#999999]">
                    <span>{formatTime(displayPosition)}</span>
                    <span>{formatTime(songDuration)}</span>
                  </div>

                  <div className="relative flex items-center">
                    <input
                      type="range"
                      min="0"
                      max={songDuration || 100}
                      step="0.5"
                      disabled={!isHost}
                      value={displayPosition}
                      onChange={handleHostSeekChange}
                      onMouseUp={handleHostSeekCommit}
                      onTouchEnd={handleHostSeekCommit}
                      style={{
                        background: `linear-gradient(to right, #ffffff ${roomProgressPercent}%, #2e2e2e ${roomProgressPercent}%)`,
                      }}
                      className={`w-full h-1.5 rounded-[2px] appearance-none focus:outline-none transition-all ${isHost ? 'cursor-pointer accent-[#ffffff]' : 'cursor-not-allowed accent-[#555555]'
                        }`}
                    />
                  </div>
                  {!isHost && (
                    <p className="text-[11px] text-[#777777] text-center sm:text-left">
                      Seeking is directed by the room host.
                    </p>
                  )}
                </div>

                {/* Playback Control Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[rgba(255,255,255,0.08)]">
                  {/* Host Controls */}
                  {isHost ? (
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        onClick={handleHostTogglePlay}
                        className="btn-white text-xs px-5 py-2.5"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-4 h-4 fill-current mr-2" />
                            Pause for All
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-current mr-2" />
                            Play for All
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setSongModalOpen(true)}
                        className="btn-graphite text-xs px-4 py-2.5"
                      >
                        <ListPlus className="w-4 h-4 mr-1.5 text-[#00e599]" />
                        Change Song
                      </button>
                    </div>
                  ) : (
                    /* Member Request Controls */
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      {isPlaying ? (
                        <button
                          onClick={handleMemberRequestPause}
                          disabled={submittingAction}
                          className="btn-graphite text-xs px-3.5 py-2"
                        >
                          <Pause className="w-3.5 h-3.5 mr-1.5" />
                          Request Pause
                        </button>
                      ) : (
                        <button
                          onClick={handleMemberRequestPlay}
                          disabled={submittingAction}
                          className="btn-graphite text-xs px-3.5 py-2"
                        >
                          <Play className="w-3.5 h-3.5 mr-1.5" />
                          Request Play
                        </button>
                      )}

                      <button
                        onClick={() => setSongModalOpen(true)}
                        className="btn-graphite text-xs px-3.5 py-2 text-[#00e599] border-[#00e599]/30"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Request Song Change
                      </button>
                    </div>
                  )}

                  <div className="text-[11px] text-[#777777] font-mono">
                    Mode: <strong className="text-[#cccccc]">{isHost ? 'Host Direct' : 'Member Sync'}</strong>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty Player State */
              <div className="py-12 text-center space-y-4">
                <div className="w-12 h-12 rounded-[4px] bg-[#222222] border border-[rgba(255,255,255,0.08)] flex items-center justify-center mx-auto text-[#666666]">
                  <Music2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-[#ffffff]">No Track Playing Yet</h3>
                <p className="text-xs text-[#999999] max-w-md mx-auto">
                  {isHost
                    ? 'Select a track from the catalogue to begin broadcasting audio to everyone in this room.'
                    : 'The host has not started playback yet. You can request a song below or wait for the host.'}
                </p>

                <div className="pt-2">
                  <button
                    onClick={() => setSongModalOpen(true)}
                    className="btn-white text-xs px-5 py-2.5"
                  >
                    <ListPlus className="w-4 h-4 mr-1.5" />
                    {isHost ? 'Select Track to Play' : 'Request a Track'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Host Pending Requests Approval Section */}
          {isHost && (
            <div className="bg-[#181818] border border-[rgba(255,255,255,0.08)] rounded-[4px] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-[#ffffff]">Member Playback Requests</h3>
                  <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-[2px]">
                    {pendingRequests.length}
                  </span>
                </div>
                <p className="text-[11px] text-[#777777]">Approve or decline member requests</p>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="p-6 rounded-[4px] bg-[#141414] border border-dashed border-[rgba(255,255,255,0.06)] text-center text-xs text-[#777777]">
                  No pending requests from listeners.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.requestId}
                      className="p-3.5 rounded-[4px] bg-[#1e1e1e] border border-[rgba(255,255,255,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-[#ffffff]">{req.userName}</span>
                          <span className="text-[10px] font-mono text-[#00e599] uppercase bg-[#122b1f] px-2 py-0.5 rounded-[2px] border border-[#00e599]/30">
                            {req.action.replace('_', ' ')}
                          </span>
                        </div>
                        {req.action === 'change_track' && req.payload?.song && (
                          <p className="text-xs text-[#999999]">
                            Track: <strong className="text-[#ffffff]">{req.payload.song.title}</strong> &bull; {req.payload.song.artist}
                          </p>
                        )}
                        {typeof req.payload?.position === 'number' && (
                          <p className="text-[11px] text-[#777777] font-mono">
                            Position: {formatTime(req.payload.position)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => respondToRequest({ requestId: req.requestId, approved: true })}
                          className="btn-white text-xs px-3 py-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Approve
                        </button>
                        <button
                          onClick={() => respondToRequest({ requestId: req.requestId, approved: false })}
                          className="btn-graphite text-xs px-3 py-1.5 text-rose-400"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Col: Live Chat & Member Sidebar */}
        <div className="space-y-6">
          {/* Live Chat */}
          <section className="bg-[#181818] border border-[rgba(255,255,255,0.08)] rounded-[4px] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-[#00e599]" />
                <h3 className="text-sm font-bold text-[#ffffff]">Room Chat</h3>
              </div>
              <span className="text-[10px] font-mono text-[#777777]">#{currentRoom?.code || code}</span>
            </div>

            <div aria-live="polite" aria-label="Room chat messages" className="h-72 overflow-y-auto space-y-2.5 pr-1">
              {chatMessages.length === 0 ? (
                <p className="h-full flex items-center justify-center text-xs text-[#777777]">No messages yet. Say hello!</p>
              ) : chatMessages.map((message) => {
                const mine = message.userId === (user.id || user._id)?.toString();
                return (
                  <article key={message.id} className={`max-w-[92%] rounded-[4px] px-3 py-2 ${mine ? 'ml-auto bg-[#242424] border border-[rgba(255,255,255,0.1)]' : 'bg-[#1b1b1b] border border-[rgba(255,255,255,0.06)]'}`}>
                    <div className="flex items-baseline justify-between gap-3 mb-0.5">
                      <span className="text-[11px] font-semibold text-[#00e599]">{mine ? 'You' : message.userName}</span>
                      <time className="text-[9px] text-[#777777] font-mono" dateTime={new Date(message.createdAt).toISOString()}>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                    </div>
                    <p className="text-xs text-[#e5e5e5] whitespace-pre-wrap break-words">{message.text}</p>
                  </article>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {(() => {
              const isChatRestoring =
                isJoiningRoom ||
                socketStatus !== 'connected' ||
                !currentRoom ||
                currentRoom.code !== code?.toUpperCase();
              const isChatInputDisabled = isChatRestoring || sendingChat;

              return (
                <form onSubmit={handleSendChat} className="space-y-2">
                  {isChatRestoring && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#00e599] font-mono animate-pulse pb-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>
                        {socketStatus !== 'connected'
                          ? `Connecting to room (${socketStatus})...`
                          : 'Restoring room membership...'}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      id="room-chat-input"
                      value={chatDraft}
                      onChange={(event) => setChatDraft(event.target.value)}
                      maxLength={2000}
                      disabled={isChatInputDisabled}
                      placeholder={
                        isChatRestoring
                          ? 'Restoring room membership...'
                          : 'Type a message...'
                      }
                      className="min-w-0 flex-1 input-flat text-xs py-2 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!chatDraft.trim() || isChatInputDisabled}
                      aria-label="Send message"
                      className="btn-white text-xs px-3.5 py-2 disabled:opacity-40"
                    >
                      {sendingChat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {chatError && <p role="alert" className="text-[11px] text-rose-300">{chatError}</p>}
                </form>
              );
            })()}
          </section>

          {/* Room Members */}
          <div className="bg-[#181818] border border-[rgba(255,255,255,0.08)] rounded-[4px] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#cccccc]" />
                <h3 className="text-sm font-bold text-[#ffffff]">Listeners</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInviteModalOpen(true)}
                  className="btn-graphite text-xs px-2.5 py-1"
                  title="Invite friends to room"
                >
                  <UserPlus className="w-3 h-3 mr-1 text-[#00e599]" />
                  Invite
                </button>
                <span className="text-[11px] font-mono bg-[#222222] text-[#cccccc] px-2 py-0.5 rounded-[2px] border border-[rgba(255,255,255,0.06)]">
                  {roomMembers.length}
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {roomMembers.map((member) => {
                const isMemberHost = member.userId === currentRoom?.hostId;
                const isCurrentUser = member.userId === (user.id || user._id)?.toString();

                return (
                  <div
                    key={member.userId}
                    className={`flex items-center justify-between p-2.5 rounded-[4px] border ${isCurrentUser
                        ? 'bg-[#222222] border-[rgba(255,255,255,0.12)]'
                        : 'bg-[#1b1b1b] border-[rgba(255,255,255,0.05)]'
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-[3px] bg-[#282828] flex items-center justify-center text-xs font-bold text-[#ffffff] uppercase shrink-0 overflow-hidden border border-[rgba(255,255,255,0.08)]">
                        <SafeAvatar src={member.avatar} name={member.name} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-[#ffffff] truncate">
                            {member.name}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[9px] text-[#00e599] font-mono uppercase">
                              (You)
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#777777] font-mono flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(member.joinedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {isMemberHost && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold shrink-0">
                        <Crown className="w-3 h-3 text-amber-400" />
                        Host
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Song Selection / Track Request Modal */}
      {songModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Music2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">
                  {isHost ? 'Select Song to Broadcast' : 'Request Song from Host'}
                </h3>
              </div>
              <button
                onClick={() => setSongModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#777777]" />
              <input
                type="text"
                placeholder="Search tracks by title, artist, or genre..."
                value={songSearch}
                onChange={(e) => setSongSearch(e.target.value)}
                className="w-full input-flat text-xs pl-10"
              />
            </div>

            {/* Songs List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[240px]">
              {loadingSongs ? (
                <div className="py-12 flex flex-col items-center justify-center text-[#999999]">
                  <Loader2 className="w-6 h-6 animate-spin text-[#00e599] mb-2" />
                  <p className="text-xs">Loading tracks...</p>
                </div>
              ) : filteredSongs.length === 0 ? (
                <p className="text-xs text-[#777777] text-center py-10">No matching songs found.</p>
              ) : (
                filteredSongs.map((song) => (
                  <div
                    key={song.id || song._id}
                    className="p-2.5 rounded-[4px] bg-[#161616] hover:bg-[#252525] border border-[rgba(255,255,255,0.06)] flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <SafeImage
                        src={song.coverUrl}
                        alt={song.title}
                        songTitle={song.title}
                        className="w-10 h-10 rounded-[4px] object-cover shrink-0 bg-[#242424]"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-[#ffffff] truncate">
                          {song.title}
                        </h4>
                        <p className="text-[11px] text-[#999999] truncate">{song.artist}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleHostSelectSong(song)}
                      className="btn-white text-xs px-3 py-1.5 shrink-0"
                    >
                      {isHost ? (
                        <>
                          <Play className="w-3 h-3 fill-current mr-1" />
                          Play Now
                        </>
                      ) : (
                        <>
                          <Send className="w-3 h-3 mr-1" />
                          Request
                        </>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invite Friends Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#00e599]" />
                <h3 className="text-base font-bold text-[#ffffff]">Invite Friends</h3>
              </div>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="p-1 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                &times;
              </button>
            </div>

            {inviteError && (
              <div className="p-3 rounded-[4px] bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loadingFriends ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#999999] text-xs">
                  <Loader2 className="w-5 h-5 animate-spin text-[#00e599]" />
                  <span>Loading friends...</span>
                </div>
              ) : friendsList.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <User className="w-8 h-8 text-[#666666] mx-auto" />
                  <p className="text-xs text-[#999999]">
                    You have no accepted friends yet.
                  </p>
                  <Link
                    to="/social"
                    className="inline-block mt-2 text-xs font-semibold text-[#00e599] hover:underline"
                  >
                    Go to Social to find friends
                  </Link>
                </div>
              ) : (
                friendsList.map((friend) => {
                  const isAlreadyIn = roomMembers.some((m) => m.userId === friend.id);
                  const isInvited = !!invitedMap[friend.id];

                  return (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between p-2.5 rounded-[4px] bg-[#161616] border border-[rgba(255,255,255,0.06)]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-[3px] bg-[#252525] flex items-center justify-center text-xs font-bold text-[#ffffff] uppercase shrink-0 overflow-hidden border border-[rgba(255,255,255,0.08)]">
                          <SafeAvatar src={friend.avatar} name={friend.name} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-[#ffffff] truncate">{friend.name}</h4>
                          <p className="text-[10px] text-[#777777] font-mono truncate">{friend.email}</p>
                        </div>
                      </div>

                      {isAlreadyIn ? (
                        <span className="text-[10px] bg-[#222222] text-[#777777] px-2 py-0.5 rounded-[2px] font-mono">
                          In Room
                        </span>
                      ) : isInvited ? (
                        <span className="text-[10px] bg-[#122b1f] text-[#00e599] border border-[#00e599]/30 px-2 py-0.5 rounded-[2px] font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Invited
                        </span>
                      ) : (
                        <button
                          onClick={() => handleInviteFriend(friend.id)}
                          className="btn-white text-xs px-3 py-1"
                        >
                          <UserPlus className="w-3 h-3 mr-1" />
                          Invite
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomDetail;
