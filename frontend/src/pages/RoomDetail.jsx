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

export const RoomDetail = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    socketStatus,
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


  // Auto-join room on mount if not currently connected to this room
  useEffect(() => {
    if (code && (!currentRoom || currentRoom.code !== code.toUpperCase())) {
      joinRoom(code).catch((err) => {
        console.warn('Auto-join room error:', err.message);
      });
    }
  }, [code, currentRoom, joinRoom]);

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
    const action = roomState?.isPlaying ? 'pause' : 'play';
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
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
          <p className="text-sm text-slate-300">You must be logged in to enter a Vibely Room.</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
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
    <div className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 py-5 sm:py-6 space-y-5 sm:space-y-6 pb-32">
      {/* Transient Notification Banner */}
      {roomNotification && (
        <div
          className={`px-4 py-3 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
            roomNotification.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : roomNotification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : 'bg-slate-900/95 border-emerald-500/30 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{roomNotification.message}</span>
          </div>
        </div>
      )}

      {/* Disconnection / Reconnecting Warning */}
      {socketStatus !== 'connected' && (
        <div className="px-4 py-3 rounded-2xl bg-amber-950/70 border border-amber-500/40 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 animate-spin" />
            <span>
              Connection status: <strong>{socketStatus}</strong>. Playback sync may be momentarily paused.
            </span>
          </div>
          <button
            onClick={syncRoomState}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Re-sync
          </button>
        </div>
      )}

      {/* Room Header Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" />
              #{currentRoom?.code || code}
            </span>

            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              title="Copy Room Code"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              {roomMembers.length} {roomMembers.length === 1 ? 'member' : 'members'}
            </span>

            {isHost ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                You are Host
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-xl truncate max-w-[200px]">
                <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Host: <strong className="text-slate-200 ml-1">{currentRoom?.hostName || 'Host'}</strong></span>
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight truncate">
            {currentRoom?.name || 'Vibely Room'}
          </h1>
          {currentRoom?.description && (
            <p className="text-xs text-slate-400 max-w-2xl">{currentRoom.description}</p>
          )}
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <button
            onClick={syncRoomState}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer min-h-[40px]"
            title="Force synchronization"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-sync</span>
          </button>

          <button
            onClick={handleLeave}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all cursor-pointer min-h-[40px]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Player Stage & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Collaborative Stage */}
        <div className="lg:col-span-2 space-y-6">
          {/* Synchronized Playback Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-8 shadow-xl backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            {currentSong ? (
              <div className="space-y-6">
                {/* Track Artwork and Info */}
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
                  <div className="relative group shrink-0">
                    <img
                      src={currentSong.coverUrl}
                      alt={currentSong.title}
                      className="w-32 h-32 sm:w-44 sm:h-44 rounded-2xl object-cover shadow-2xl border border-slate-700/80"
                    />
                    {isPlaying && (
                      <div className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-lg bg-emerald-500/90 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md backdrop-blur-sm flex items-center gap-1">
                        <Volume2 className="w-3 h-3 animate-pulse" />
                        Live
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] font-semibold text-emerald-400">
                      <Music2 className="w-3 h-3" />
                      {currentSong.genre || 'Vibely Audio'}
                    </div>

                    <h2 className="text-xl sm:text-3xl font-black text-white truncate leading-tight">
                      {currentSong.title}
                    </h2>
                    <p className="text-sm sm:text-base text-slate-400 font-medium truncate">
                      {currentSong.artist}
                    </p>

                    <div className="pt-2 text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-4">
                      <span>Synchronized with room</span>
                      <span>&bull;</span>
                      <span className="font-mono text-emerald-400">
                        {isPlaying ? 'Streaming Now' : 'Paused'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Host Scrubber */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
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
                      style={{ background: `linear-gradient(to right, #34d399 ${roomProgressPercent}%, #1e293b ${roomProgressPercent}%)` }}
                      className={`w-full h-2 bg-slate-800 rounded-lg appearance-none focus:outline-none transition-all ${
                        isHost ? 'cursor-pointer accent-emerald-400 hover:h-2.5' : 'cursor-not-allowed accent-slate-600'
                      }`}
                    />
                  </div>
                  {!isHost && (
                    <p className="text-[11px] text-slate-500 text-center sm:text-left">
                      Seeking is locked to the room host.
                    </p>
                  )}
                </div>

                {/* Playback Control Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
                  {/* Host Controls */}
                  {isHost ? (
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        onClick={handleHostTogglePlay}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-4 h-4 fill-current" />
                            Pause for All
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                            Play for All
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setSongModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                      >
                        <ListPlus className="w-4 h-4 text-emerald-400" />
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
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          Request Pause
                        </button>
                      ) : (
                        <button
                          onClick={handleMemberRequestPlay}
                          disabled={submittingAction}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Request Play
                        </button>
                      )}

                      <button
                        onClick={() => setSongModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Request Track Change
                      </button>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 font-mono">
                    Mode: <strong className="text-slate-300">{isHost ? 'Host Direct' : 'Member Sync'}</strong>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty Player State */
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
                  <Music2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">No Track Playing Yet</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {isHost
                    ? 'Select a track from the catalogue to begin broadcasting audio to everyone in this room.'
                    : 'The host has not started playback yet. You can request a song below or wait for the host.'}
                </p>

                <div className="pt-2">
                  <button
                    onClick={() => setSongModalOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <ListPlus className="w-4 h-4" />
                    {isHost ? 'Pick Song to Play' : 'Request a Song'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Host Pending Requests Approval Section */}
          {isHost && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <h3 className="text-base font-bold text-white">Member Playback Requests</h3>
                  <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono">
                    {pendingRequests.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">Approve or decline requests from listeners</p>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  No pending requests from members. Requests will appear here in real time.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.requestId}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-200">{req.userName}</span>
                          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            {req.action.replace('_', ' ')}
                          </span>
                        </div>
                        {req.action === 'change_track' && req.payload?.song && (
                          <p className="text-xs text-slate-400">
                            Song: <strong className="text-white">{req.payload.song.title}</strong> &bull; {req.payload.song.artist}
                          </p>
                        )}
                        {typeof req.payload?.position === 'number' && (
                          <p className="text-[11px] text-slate-500">
                            Requested position: {formatTime(req.payload.position)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => respondToRequest({ requestId: req.requestId, approved: true })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => respondToRequest({ requestId: req.requestId, approved: false })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-400 text-xs font-semibold transition-all cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
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

        {/* Right Col: Live Room Members Sidebar */}
        <div className="space-y-6">
          <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Room Chat</h3>
              </div>
              <span className="text-[10px] text-slate-500">Only members of #{currentRoom?.code || code}</span>
            </div>
            <div aria-live="polite" aria-label="Room chat messages" className="h-72 overflow-y-auto space-y-3 pr-1">
              {chatMessages.length === 0 ? (
                <p className="h-full flex items-center justify-center text-xs text-slate-500">Start the conversation.</p>
              ) : chatMessages.map((message) => {
                const mine = message.userId === (user.id || user._id)?.toString();
                return (
                  <article key={message.id} className={`max-w-[92%] rounded-2xl px-3 py-2 ${mine ? 'ml-auto bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-950/70 border border-slate-800'}`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[11px] font-bold text-emerald-300">{mine ? 'You' : message.userName}</span>
                      <time className="text-[9px] text-slate-500" dateTime={new Date(message.createdAt).toISOString()}>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                    </div>
                    <p className="text-xs text-slate-200 whitespace-pre-wrap break-words">{message.text}</p>
                  </article>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendChat} className="space-y-2">
              <label htmlFor="room-chat-input" className="sr-only">Message room members</label>
              <div className="flex gap-2">
                <input id="room-chat-input" value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} maxLength={2000} disabled={socketStatus !== 'connected' || sendingChat} placeholder="Write a message…" className="min-w-0 flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50" />
                <button type="submit" disabled={!chatDraft.trim() || socketStatus !== 'connected' || sendingChat} aria-label="Send message" className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-3 text-slate-950 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Send className="w-4 h-4" />
                </button>
              </div>
              {chatError && <p role="alert" className="text-[11px] text-rose-300">{chatError}</p>}
            </form>
          </section>

          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Listeners</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInviteModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer"
                  title="Invite accepted friends to this room"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Invite
                </button>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                  {roomMembers.length}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {roomMembers.map((member) => {
                const isMemberHost = member.userId === currentRoom?.hostId;
                const isCurrentUser = member.userId === (user.id || user._id)?.toString();

                return (
                  <div
                    key={member.userId}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isCurrentUser
                        ? 'bg-slate-950/80 border-emerald-500/30 shadow-sm'
                        : 'bg-slate-950/40 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-slate-950 uppercase shrink-0 overflow-hidden ring-1 ring-emerald-500/30">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                        ) : member.name ? (
                          member.name.charAt(0)
                        ) : (
                          'U'
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-200 truncate">
                            {member.name}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.2 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          Joined {new Date(member.joinedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {isMemberHost && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold shrink-0">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Music2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {isHost ? 'Select Song to Broadcast' : 'Request Song from Host'}
                </h3>
              </div>
              <button
                onClick={() => setSongModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer text-lg"
              >
                &times;
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search songs by title, artist, or genre..."
                value={songSearch}
                onChange={(e) => setSongSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Songs List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[240px]">
              {loadingSongs ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mb-2" />
                  <p className="text-xs">Loading catalogue...</p>
                </div>
              ) : filteredSongs.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-10">No matching songs found.</p>
              ) : (
                filteredSongs.map((song) => (
                  <div
                    key={song.id || song._id}
                    className="p-2.5 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800/80 flex items-center justify-between gap-3 group transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={song.coverUrl}
                        alt={song.title}
                        className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-800"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                          {song.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">{song.artist}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleHostSelectSong(song)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all cursor-pointer shrink-0"
                    >
                      {isHost ? (
                        <>
                          <Play className="w-3 h-3 fill-current" />
                          Play Now
                        </>
                      ) : (
                        <>
                          <Send className="w-3 h-3" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Invite Friends</h3>
              </div>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {inviteError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loadingFriends ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  <span>Loading your friends...</span>
                </div>
              ) : friendsList.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <User className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">
                    You have no accepted friends yet.
                  </p>
                  <Link
                    to="/social"
                    className="inline-block mt-2 text-xs font-bold text-emerald-400 hover:text-emerald-300"
                  >
                    Go to Social to find friends &rarr;
                  </Link>
                </div>
              ) : (
                friendsList.map((friend) => {
                  const isAlreadyIn = roomMembers.some((m) => m.userId === friend.id);
                  const isInvited = !!invitedMap[friend.id];

                  return (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-slate-950 uppercase shrink-0 overflow-hidden ring-1 ring-emerald-500/30">
                          {friend.avatar ? (
                            <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                          ) : (
                            friend.name.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-200 truncate">{friend.name}</h4>
                          <p className="text-[10px] text-slate-400 font-mono truncate">{friend.email}</p>
                        </div>
                      </div>

                      {isAlreadyIn ? (
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-1 rounded-xl font-semibold">
                          In Room
                        </span>
                      ) : isInvited ? (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Invited
                        </span>
                      ) : (
                        <button
                          onClick={() => handleInviteFriend(friend.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                        >
                          <UserPlus className="w-3 h-3" />
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
