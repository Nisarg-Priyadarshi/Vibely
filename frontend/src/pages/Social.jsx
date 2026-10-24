import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Users,
  MessageSquare,
  UserPlus,
  UserCheck,
  Search,
  Send,
  Radio,
  Check,
  X,
  Clock,
  AlertCircle,
  Loader2,
  Trash2,
  Smile,
  Shield,
  ArrowRight,
  ArrowLeft,
  LogOut,
  Mail,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../context/RoomContext';
import { API_BASE_URL } from '../config/api';

export const Social = () => {
  const { user } = useAuth();
  const { currentRoom, socket } = useRoom();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab: 'chat' | 'requests' | 'search' | 'invitations'
  const initialTab = searchParams.get('tab') || 'chat';
  const initialFriend = searchParams.get('friend') || null;

  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeFriendId, setActiveFriendId] = useState(initialFriend);

  // Friends & Chat State
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [conversationsOverview, setConversationsOverview] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Friend Requests State
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // User Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Room Invitations State
  const [roomInvites, setRoomInvites] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  // Feedback notifications
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const messagesEndRef = useRef(null);

  const showSuccess = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4500);
  };

  // 1. Fetch Friends & Conversations Overview
  const fetchFriends = useCallback(async () => {
    try {
      setLoadingFriends(true);
      const res = await fetch(`${API_BASE_URL}/friends`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setFriends(data.friends || []);
      }
    } catch (err) {
      console.warn('Failed to load friends:', err);
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  const fetchConversationsOverview = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/chat/conversations`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setConversationsOverview(data.conversations || []);
      }
    } catch (err) {
      console.warn('Failed to load conversations:', err);
    }
  }, []);

  // 2. Fetch Friend Requests
  const fetchRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);
      const res = await fetch(`${API_BASE_URL}/friends/requests`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setReceivedRequests(data.received || []);
        setSentRequests(data.sent || []);
      }
    } catch (err) {
      console.warn('Failed to load friend requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  // 3. Fetch Room Invitations
  const fetchRoomInvitations = useCallback(async () => {
    try {
      setLoadingInvites(true);
      const res = await fetch(`${API_BASE_URL}/rooms/invitations`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setRoomInvites(data.invitations || []);
      }
    } catch (err) {
      console.warn('Failed to load room invitations:', err);
    } finally {
      setLoadingInvites(false);
    }
  }, []);

  // Initial load on mount or tab change
  useEffect(() => {
    if (!user) return;
    fetchFriends();
    fetchConversationsOverview();
    fetchRequests();
    fetchRoomInvitations();
  }, [user, fetchFriends, fetchConversationsOverview, fetchRequests, fetchRoomInvitations]);

  // Load conversation messages when activeFriendId changes
  useEffect(() => {
    if (!activeFriendId || !user) {
      setActiveConversation(null);
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    fetch(`${API_BASE_URL}/chat/${activeFriendId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setActiveConversation(data.friend);
          setMessages(data.messages || []);
        } else {
          showError(data.error?.message || 'Failed to load conversation.');
        }
      })
      .catch((err) => showError(err.message))
      .finally(() => setLoadingMessages(false));
  }, [activeFriendId, user]);

  // Scroll to bottom of message stream
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for incoming chat messages
    const handleChatMessage = (msg) => {
      // If currently chatting with this user or we sent it
      if (
        (activeFriendId && msg.sender === activeFriendId) ||
        (activeFriendId && msg.recipient === activeFriendId)
      ) {
        setMessages((prev) => [...prev, msg]);
      }
      fetchConversationsOverview();
    };

    // Listen for friend request updates
    const handleRequestReceived = () => {
      fetchRequests();
      showSuccess('New friend request received!');
    };

    const handleRequestAccepted = (data) => {
      fetchFriends();
      fetchRequests();
      fetchConversationsOverview();
      showSuccess(`${data.user?.name || 'A user'} accepted your friend request!`);
    };

    const handleFriendRemoved = () => {
      fetchFriends();
      fetchConversationsOverview();
      if (activeFriendId) {
        setActiveFriendId(null);
      }
    };

    const handleRoomInvite = (invitation) => {
      fetchRoomInvitations();
      showSuccess(`Room Invite: ${invitation.sender?.name} invited you to "${invitation.roomName}"!`);
    };

    socket.on('chat:message', handleChatMessage);
    socket.on('friend:request_received', handleRequestReceived);
    socket.on('friend:request_accepted', handleRequestAccepted);
    socket.on('friend:removed', handleFriendRemoved);
    socket.on('room:invitation_received', handleRoomInvite);

    return () => {
      socket.off('chat:message', handleChatMessage);
      socket.off('friend:request_received', handleRequestReceived);
      socket.off('friend:request_accepted', handleRequestAccepted);
      socket.off('friend:removed', handleFriendRemoved);
      socket.off('room:invitation_received', handleRoomInvite);
    };
  }, [socket, activeFriendId, fetchFriends, fetchRequests, fetchConversationsOverview, fetchRoomInvitations]);

  // Handle Search Users
  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/friends/search?q=${encodeURIComponent(searchQuery.trim())}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.users || []);
      }
    } catch (err) {
      showError('Failed to search users.');
    } finally {
      setSearching(false);
    }
  };

  // Handle Send Friend Request
  const handleSendFriendRequest = async (recipientId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/friends/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ recipientId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to send request.');
      }
      showSuccess(data.message || 'Friend request sent!');
      fetchRequests();
      // Update status in search results if present
      setSearchResults((prev) =>
        prev.map((u) => (u.id === recipientId ? { ...u, relationshipStatus: 'pending_sent' } : u))
      );
    } catch (err) {
      showError(err.message);
    }
  };

  // Handle Accept Request
  const handleAcceptRequest = async (requestId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/friends/requests/${requestId}/accept`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to accept request.');
      }
      showSuccess('Friend request accepted!');
      fetchFriends();
      fetchRequests();
      fetchConversationsOverview();
    } catch (err) {
      showError(err.message);
    }
  };

  // Handle Decline Request
  const handleRejectRequest = async (requestId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/friends/requests/${requestId}/reject`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to decline request.');
      }
      showSuccess('Friend request declined.');
      fetchRequests();
    } catch (err) {
      showError(err.message);
    }
  };

  // Handle Cancel Request
  const handleCancelRequest = async (requestId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/friends/requests/${requestId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to cancel request.');
      }
      showSuccess('Friend request cancelled.');
      fetchRequests();
    } catch (err) {
      showError(err.message);
    }
  };

  // Handle Unfriend
  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/friends/${friendId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to remove friend.');
      }
      showSuccess('Friend removed.');
      if (activeFriendId === friendId) setActiveFriendId(null);
      fetchFriends();
      fetchConversationsOverview();
    } catch (err) {
      showError(err.message);
    }
  };

  // Handle Send Chat Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeFriendId || sendingMessage) return;

    const content = messageText.trim();
    setMessageText('');
    setSendingMessage(true);

    try {
      const res = await fetch(`${API_BASE_URL}/chat/${activeFriendId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to send message.');
      }
      // Note: socket will also emit, but we can optimistically append or let socket update
      fetchConversationsOverview();
    } catch (err) {
      showError(err.message);
      setMessageText(content); // Restore draft on failure
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle Accept Room Invitation
  const handleAcceptRoomInvite = async (invitationId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/rooms/invitations/${invitationId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accept: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to accept invitation.');
      }
      navigate(`/rooms/${data.roomCode}`);
    } catch (err) {
      showError(err.message);
    }
  };

  // Handle Decline Room Invitation
  const handleDeclineRoomInvite = async (invitationId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/rooms/invitations/${invitationId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accept: false }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to decline invitation.');
      }
      showSuccess('Room invitation declined.');
      fetchRoomInvitations();
    } catch (err) {
      showError(err.message);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <img
            src="/vibely-logo.png"
            alt="Vibely logo"
            className="w-14 h-14 mx-auto rounded-2xl shadow-xl shadow-emerald-500/10 border border-slate-800/80 object-contain"
          />
          <h2 className="text-xl font-bold text-white">Sign In Required</h2>
          <p className="text-xs text-slate-400">
            Please log in to chat with friends and receive room invitations.
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6 pb-28">
      {/* Social Hub Top Navigation Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Community Hub
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
              Social & Direct Chat
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Connect with fellow listeners, chat in real-time, and invite friends to Vibely Rooms.
            </p>
          </div>

          {/* Social Tabs */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 bg-slate-950/70 p-1.5 rounded-2xl border border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => {
                setActiveTab('chat');
                setSearchParams({ tab: 'chat' });
              }}
              className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span>Friends & Chat</span>
              {friends.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'chat' ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}>
                  {friends.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('requests');
                setSearchParams({ tab: 'requests' });
              }}
              className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'requests'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Requests</span>
              {receivedRequests.length > 0 && (
                <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.2 rounded-full font-mono animate-pulse">
                  {receivedRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('search');
                setSearchParams({ tab: 'search' });
              }}
              className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 shrink-0" />
              <span>Find Friends</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('invitations');
                setSearchParams({ tab: 'invitations' });
              }}
              className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'invitations'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5 shrink-0" />
              <span>Room Invites</span>
              {roomInvites.length > 0 && (
                <span className="text-[10px] bg-cyan-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full font-mono">
                  {roomInvites.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Floating Status & Error Alerts */}
      {statusMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: FRIENDS & PRIVATE CHAT                                  */}
      {/* ============================================================== */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
          {/* Left Column: Friends List & Conversations Sidebar */}
          <div
            className={`lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-xl flex flex-col gap-4 ${
              activeFriendId ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Your Friends</h3>
              </div>
              <button
                onClick={() => {
                  setActiveTab('search');
                  setSearchParams({ tab: 'search' });
                }}
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" />
                Add More
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loadingFriends ? (
                <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  <span>Loading friends...</span>
                </div>
              ) : friends.length === 0 ? (
                <div className="py-16 text-center space-y-3 px-4">
                  <Users className="w-12 h-12 text-slate-700 mx-auto" />
                  <p className="text-xs text-slate-400 font-semibold">No friends added yet</p>
                  <p className="text-[11px] text-slate-500">
                    Search for listeners to start private chats and invite them into listening rooms.
                  </p>
                  <button
                    onClick={() => {
                      setActiveTab('search');
                      setSearchParams({ tab: 'search' });
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Find Listeners
                  </button>
                </div>
              ) : (
                friends.map((friend) => {
                  const isSelected = activeFriendId === friend.id;
                  const conv = conversationsOverview.find((c) => c.friend.id === friend.id);

                  return (
                    <div
                      key={friend.id}
                      onClick={() => setActiveFriendId(friend.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                        isSelected
                          ? 'bg-slate-800/90 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                          : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Friend Avatar */}
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 font-bold text-sm uppercase shrink-0 overflow-hidden ring-1 ring-emerald-500/20">
                          {friend.avatar ? (
                            <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                          ) : (
                            friend.name.charAt(0)
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-white">
                            {friend.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            {conv?.lastMessage?.content || friend.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {conv && conv.unreadCount > 0 && (
                          <span className="text-[10px] font-bold bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-mono">
                            {conv.unreadCount}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFriend(friend.id);
                          }}
                          className="opacity-90 sm:opacity-0 sm:group-hover:opacity-100 p-2 sm:p-1.5 rounded-lg hover:bg-rose-950 hover:text-rose-400 text-slate-400 transition-all cursor-pointer"
                          title="Remove Friend"
                          aria-label={`Remove ${friend.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Active 1-to-1 Chat Window */}
          <div
            className={`lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between min-h-[540px] ${
              !activeFriendId ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {activeConversation ? (
              <>
                {/* Chat Top Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0 gap-2">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    {/* Back to Friends Button on Mobile */}
                    <button
                      onClick={() => {
                        setActiveFriendId(null);
                        setSearchParams({ tab: 'chat' });
                      }}
                      className="lg:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 -ml-1 transition-colors cursor-pointer"
                      title="Back to Friends"
                      aria-label="Back to Friends list"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 font-black text-sm uppercase shrink-0 overflow-hidden ring-1 ring-emerald-500/30">
                      {activeConversation.avatar ? (
                        <img src={activeConversation.avatar} alt={activeConversation.name} className="w-full h-full object-cover" />
                      ) : (
                        activeConversation.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2 truncate">
                        <span className="truncate">{activeConversation.name}</span>
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                      </h3>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{activeConversation.email}</p>
                    </div>
                  </div>

                  {currentRoom && (
                    <button
                      onClick={() => navigate(`/rooms/${currentRoom.code}`)}
                      className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer shrink-0 truncate max-w-[150px] sm:max-w-none"
                    >
                      <Radio className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate"><span className="hidden sm:inline">In Room: </span>{currentRoom.name}</span>
                    </button>
                  )}
                </div>

                {/* Messages Stream */}
                <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-2 min-h-[340px]">
                  {loadingMessages ? (
                    <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                      <span>Loading conversation history...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-24 text-center space-y-2">
                      <MessageSquare className="w-10 h-10 text-slate-700 mx-auto" />
                      <p className="text-xs font-bold text-slate-300">No messages yet</p>
                      <p className="text-[11px] text-slate-500">
                        Send a friendly message to {activeConversation.name} to start the conversation!
                      </p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.sender === (user.id || user._id)?.toString();
                      return (
                        <div
                          key={m.id || m._id}
                          className={`flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isMe && (
                            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 font-bold text-[10px] uppercase shrink-0 overflow-hidden ring-1 ring-emerald-500/20">
                              {activeConversation.avatar ? (
                                <img src={activeConversation.avatar} alt={activeConversation.name} className="w-full h-full object-cover" />
                              ) : (
                                activeConversation.name.charAt(0)
                              )}
                            </div>
                          )}

                          <div
                            className={`max-w-[75%] p-3.5 rounded-2xl text-xs space-y-1 shadow-md ${
                              isMe
                                ? 'bg-emerald-500 text-slate-950 font-medium rounded-br-none'
                                : 'bg-slate-950 border border-slate-800 text-slate-100 rounded-bl-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{m.content}</p>
                            <span
                              className={`block text-[9px] font-mono ${
                                isMe ? 'text-emerald-950 text-right font-semibold' : 'text-slate-500 text-left'
                              }`}
                            >
                              {new Date(m.createdAt || Date.now()).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          {isMe && (
                            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold text-[10px] uppercase shrink-0 overflow-hidden ring-1 ring-emerald-500/20">
                              {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                              ) : (
                                user.name.charAt(0)
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Form */}
                <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-800 flex items-center gap-2 shrink-0">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={`Message ${activeConversation.name}...`}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim() || sendingMessage}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    {sendingMessage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Send</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 shadow-inner">
                  <MessageSquare className="w-8 h-8 text-emerald-500/50" />
                </div>
                <h3 className="text-base font-bold text-white">Select a Friend to Chat</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Choose a friend from the left sidebar to start private messaging, share track recommendations, or coordinate Vibely listening rooms.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: FRIEND REQUESTS                                         */}
      {/* ============================================================== */}
      {activeTab === 'requests' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Incoming Requests */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Incoming Requests</h3>
              </div>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                {receivedRequests.length}
              </span>
            </div>

            {loadingRequests ? (
              <div className="py-12 flex justify-center text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              </div>
            ) : receivedRequests.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                <UserCheck className="w-8 h-8 text-slate-700 mx-auto" />
                <p>No incoming friend requests right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {receivedRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 font-bold text-xs uppercase shrink-0 overflow-hidden ring-1 ring-emerald-500/20">
                        {req.user?.avatar ? (
                          <img src={req.user.avatar} alt={req.user.name} className="w-full h-full object-cover" />
                        ) : (
                          req.user?.name?.charAt(0) || 'U'
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-200 truncate">{req.user?.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{req.user?.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => handleAcceptRequest(req.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-400 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sent Requests */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">Sent Requests</h3>
              </div>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                {sentRequests.length}
              </span>
            </div>

            {loadingRequests ? (
              <div className="py-12 flex justify-center text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              </div>
            ) : sentRequests.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                <Clock className="w-8 h-8 text-slate-700 mx-auto" />
                <p>No outgoing pending requests.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 font-bold text-xs uppercase shrink-0 overflow-hidden ring-1 ring-emerald-500/20">
                        {req.user?.avatar ? (
                          <img src={req.user.avatar} alt={req.user.name} className="w-full h-full object-cover" />
                        ) : (
                          req.user?.name?.charAt(0) || 'U'
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-200 truncate">{req.user?.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{req.user?.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCancelRequest(req.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer self-end sm:self-auto shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: USER SEARCH / ADD FRIENDS                               */}
      {/* ============================================================== */}
      {activeTab === 'search' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-xl space-y-6 max-w-3xl mx-auto w-full">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              Discover Vibely Listeners
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Search by display name or email to connect with friends and expand your musical network.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email address..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={!searchQuery.trim() || searching}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-500/20"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </form>

          {/* Search Results */}
          <div className="space-y-3 pt-2">
            {searching ? (
              <div className="py-12 flex justify-center text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((u) => {
                const status = u.relationshipStatus;
                return (
                  <div
                    key={u.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 font-black text-sm uppercase shrink-0 overflow-hidden ring-1 ring-emerald-500/30">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          u.name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{u.name}</h4>
                        <p className="text-[11px] text-slate-400 font-mono truncate">{u.email}</p>
                      </div>
                    </div>

                    <div className="self-end sm:self-auto shrink-0">
                      {status === 'friends' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Friends
                          </span>
                          <button
                            onClick={() => {
                              setActiveTab('chat');
                              setActiveFriendId(u.id);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3" /> Chat
                          </button>
                        </div>
                      ) : status === 'pending_sent' ? (
                        <span className="text-[11px] bg-slate-800 text-slate-400 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          Pending Request
                        </span>
                      ) : status === 'pending_received' ? (
                        <button
                          onClick={() => handleAcceptRequest(u.friendshipId)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md shadow-emerald-500/20"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Accept Request
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSendFriendRequest(u.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md shadow-emerald-500/20 transition-all"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Add Friend
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : searchQuery.trim() ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No listeners found matching &quot;{searchQuery}&quot;.
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: ROOM INVITATIONS                                        */}
      {/* ============================================================== */}
      {activeTab === 'invitations' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-xl space-y-6 max-w-3xl mx-auto w-full">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-400" />
              Incoming Room Invitations
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Join active listening rooms invited by your accepted friends.
            </p>
          </div>

          {loadingInvites ? (
            <div className="py-16 flex justify-center text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            </div>
          ) : roomInvites.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Radio className="w-12 h-12 text-slate-700 mx-auto" />
              <p className="text-xs font-bold text-slate-300">No active room invitations</p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                When your friends start or host a Vibely Room and invite you, their invitations will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {roomInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-inner"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 font-black text-sm uppercase shrink-0 overflow-hidden ring-1 ring-emerald-500/30">
                      {inv.sender?.avatar ? (
                        <img src={inv.sender.avatar} alt={inv.sender.name} className="w-full h-full object-cover" />
                      ) : (
                        inv.sender?.name?.charAt(0) || 'U'
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white truncate">{inv.roomName}</h4>
                        <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                          {inv.roomCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Invited by <strong className="text-slate-200">{inv.sender?.name}</strong> &bull; {inv.memberCount} listener{inv.memberCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleAcceptRoomInvite(inv.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      Join Room
                    </button>
                    <button
                      onClick={() => handleDeclineRoomInvite(inv.id)}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-400 text-xs font-semibold transition-all cursor-pointer"
                    >
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
  );
};

export default Social;
