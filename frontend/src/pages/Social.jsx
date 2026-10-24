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

    const handlePrivateMessage = (payload) => {
      const { message } = payload;
      if (
        message &&
        activeFriendId &&
        (message.sender === activeFriendId || message.recipient === activeFriendId)
      ) {
        setMessages((prev) => [...prev, message]);
      }
      fetchConversationsOverview();
    };

    const handleFriendRequestReceived = () => {
      fetchRequests();
      showSuccess('You have a new friend request!');
    };

    const handleFriendRequestAccepted = () => {
      fetchFriends();
      fetchRequests();
      showSuccess('A friend request was accepted.');
    };

    const handleRoomInvite = (payload) => {
      fetchRoomInvitations();
      showSuccess(`You were invited to room #${payload.roomCode}`);
    };

    socket.on('private_message', handlePrivateMessage);
    socket.on('friend_request_received', handleFriendRequestReceived);
    socket.on('friend_request_accepted', handleFriendRequestAccepted);
    socket.on('room_invitation_received', handleRoomInvite);

    return () => {
      socket.off('private_message', handlePrivateMessage);
      socket.off('friend_request_received', handleFriendRequestReceived);
      socket.off('friend_request_accepted', handleFriendRequestAccepted);
      socket.off('room_invitation_received', handleRoomInvite);
    };
  }, [socket, activeFriendId, fetchConversationsOverview, fetchFriends, fetchRequests, fetchRoomInvitations]);

  // Handle Search Users
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/friends/search?q=${encodeURIComponent(searchQuery.trim())}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.users || []);
      } else {
        showError(data.error?.message || 'Search failed.');
      }
    } catch (err) {
      showError(err.message);
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
      showSuccess('Friend request sent!');
      setSearchResults((prev) =>
        prev.map((u) => (u.id === recipientId ? { ...u, relationshipStatus: 'pending_sent' } : u))
      );
      fetchRequests();
    } catch (err) {
      showError(err.message);
    }
  };

  // Handle Accept Friend Request
  const handleAcceptRequest = async (requestId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/friends/requests/${requestId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to accept request.');
      }
      showSuccess('Friend request accepted.');
      fetchFriends();
      fetchRequests();
    } catch (err) {
      showError(err.message);
    }
  };

  // Handle Reject Friend Request
  const handleRejectRequest = async (requestId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/friends/requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Handle Cancel Outgoing Friend Request
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

  // Handle Remove Friend
  const handleRemoveFriend = async (friendId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/friends/${friendId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to remove friend.');
      }
      showSuccess('Friend removed from your contacts.');
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
      fetchConversationsOverview();
    } catch (err) {
      showError(err.message);
      setMessageText(content);
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
      <div className="flex-1 flex items-center justify-center px-[24px] py-[64px]">
        <div className="max-w-[560px] w-full bg-[#1e1e1e] border border-white/10 rounded-[6px] p-[32px] sm:p-[40px] text-center space-y-[20px] shadow-2xl">
          <div className="w-[64px] h-[64px] rounded-[4px] bg-[#303030] flex items-center justify-center mx-auto">
            <Users className="w-[28px] h-[28px] text-[#ff7a1a]" />
          </div>
          <h2 className="text-[24px] font-bold text-white">Sign In Required</h2>
          <p className="max-w-[440px] mx-auto text-[15px] text-[#999999] leading-relaxed">
            Please log in to chat with friends and receive room invitations.
          </p>
          <div className="pt-[4px]">
            <Link
              to="/login"
              className="btn-accent text-[14px] px-[28px] py-[12px]"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-[2rem] sm:px-[3rem] pt-[3rem] pb-36 flex flex-col gap-[2rem]">
      {/* Social Hub Top Navigation Header */}
      <div className="bg-[#181818] border border-[rgba(255,255,255,0.08)] rounded-[4px] p-[2rem] relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-[2rem]">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-[#ff7a1a] font-bold mb-[0.5rem]">
              Social Network
            </div>
            <h1 className="text-2xl sm:text-3xl font-extralight text-[#ffffff] tracking-tight">
              Community and Direct Messages
            </h1>
            <p className="text-xs text-[#999999] mt-[0.5rem]">
              Connect with fellow listeners, coordinate listening sessions, and share room invitations.
            </p>
          </div>

          {/* Social Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#141414] p-1.5 rounded-[4px] border border-white/10">
            <button
              onClick={() => {
                setActiveTab('chat');
                setSearchParams({ tab: 'chat' });
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[3px] text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-white text-[#121212] shadow-sm'
                  : 'text-[#999999] hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Friends & Chat
              {friends.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${activeTab === 'chat' ? 'bg-[#121212] text-[#ffffff]' : 'bg-[#222222] text-[#cccccc]'
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
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[3px] text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'requests'
                  ? 'bg-white text-[#121212] shadow-sm'
                  : 'text-[#999999] hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Requests</span>
              {receivedRequests.length > 0 && (
                <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.2 rounded font-mono">
                  {receivedRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('search');
                setSearchParams({ tab: 'search' });
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[3px] text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-white text-[#121212] shadow-sm'
                  : 'text-[#999999] hover:text-white'
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
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[3px] text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'invitations'
                  ? 'bg-white text-[#121212] shadow-sm'
                  : 'text-[#999999] hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5 shrink-0" />
              <span>Room Invites</span>
              {roomInvites.length > 0 && (
                <span className="text-[10px] bg-[#ff7a1a] text-[#121212] font-mono px-1.5 py-0.2 rounded font-bold">
                  {roomInvites.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Floating Status & Error Alerts */}
      {statusMsg && (
        <div className="p-3 rounded-[4px] bg-[#122b1f] border border-[#00e599]/30 text-[#00e599] text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-[#00e599] shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-[4px] bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TAB 1: FRIENDS & PRIVATE CHAT */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-[1.5rem] min-h-[580px]">
          {/* Left Column: Friends List & Conversations Sidebar */}
          <div className="lg:col-span-4 bg-[#181818] border border-white/[0.08] rounded-[6px] p-[1.75rem] shadow-xl flex flex-col gap-[1.25rem]">
            <div className="flex items-center justify-between pb-[1rem] border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#cccccc]" />
                <h3 className="text-sm font-bold text-[#ffffff]">Your Friends</h3>
              </div>
              <button
                onClick={() => {
                  setActiveTab('search');
                  setSearchParams({ tab: 'search' });
                }}
                className="text-[11px] font-semibold text-[#00e599] hover:underline flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" />
                Add More
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {loadingFriends ? (
                <div className="py-16 text-center text-[#999999] text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#00e599]" />
                  <span>Loading friends...</span>
                </div>
              ) : friends.length === 0 ? (
                <div className="py-[4rem] text-center space-y-[1rem] px-[1rem]">
                  <Users className="w-[3rem] h-[3rem] text-[#777777] mx-auto" />
                  <p className="text-sm text-[#cccccc] font-semibold">No friends added yet</p>
                  <p className="text-[13px] leading-relaxed text-[#999999]">
                    Search for listeners to start private chats and invite them into listening rooms.
                  </p>
                  <button
                    onClick={() => {
                      setActiveTab('search');
                      setSearchParams({ tab: 'search' });
                    }}
                    className="btn-white text-sm px-5 py-2.5 mt-[0.5rem]"
                  >
                    <Search className="w-3.5 h-3.5 mr-1" />
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
                      className={`p-2.5 rounded-[4px] border transition-colors cursor-pointer flex items-center justify-between gap-3 group ${isSelected
                          ? 'bg-[#222222] border-[rgba(255,255,255,0.2)]'
                          : 'bg-[#161616] border-[rgba(255,255,255,0.06)] hover:bg-[#202020]'
                        }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Friend Avatar */}
                        <div className="w-9 h-9 rounded-[3px] bg-[#252525] flex items-center justify-center text-[#ffffff] font-bold text-xs uppercase shrink-0 overflow-hidden border border-[rgba(255,255,255,0.08)]">
                          {friend.avatar ? (
                            <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                          ) : (
                            friend.name.charAt(0)
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-[#ffffff] truncate">
                            {friend.name}
                          </h4>
                          <p className="text-[11px] text-[#777777] truncate">
                            {conv?.lastMessage?.content || friend.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {conv && conv.unreadCount > 0 && (
                          <span className="text-[10px] font-bold bg-[#00e599] text-[#121212] px-1.5 py-0.2 rounded font-mono">
                            {conv.unreadCount}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFriend(friend.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-950 hover:text-rose-400 text-slate-500 transition-all cursor-pointer"
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
          <div className="lg:col-span-8 bg-[#181818] border border-white/[0.08] rounded-[6px] p-[1.75rem] shadow-xl flex flex-col justify-between min-h-[540px]">
            {activeConversation ? (
              <>
                {/* Chat Top Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-[4px] bg-[#222222] border border-white/10 flex items-center justify-center text-white font-bold text-sm uppercase shrink-0 overflow-hidden">
                      {activeConversation.avatar ? (
                        <img src={activeConversation.avatar} alt={activeConversation.name} className="w-full h-full object-cover" />
                      ) : (
                        activeConversation.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        {activeConversation.name}
                        <span className="inline-block w-2 h-2 rounded-full bg-[#ff7a1a] animate-pulse"></span>
                      </h3>
                      <p className="text-[10px] text-[#999999] font-mono">{activeConversation.email}</p>
                    </div>
                  </div>

                  {currentRoom && (
                    <button
                      onClick={() => navigate(`/rooms/${currentRoom.code}`)}
                      className="btn-accent text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      In Room: {currentRoom.name}
                    </button>
                  )}
                </div>

                {/* Messages Stream */}
                <div className="flex-1 overflow-y-auto py-4 space-y-2.5 pr-2 min-h-[340px]">
                  {loadingMessages ? (
                    <div className="py-20 text-center text-[#999999] text-xs flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#00e599]" />
                      <span>Loading messages...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-24 text-center space-y-2">
                      <MessageSquare className="w-8 h-8 text-[#666666] mx-auto" />
                      <p className="text-xs font-semibold text-[#cccccc]">No messages yet</p>
                      <p className="text-[11px] text-[#777777]">
                        Send a message to start communicating with {activeConversation.name}!
                      </p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.sender === (user.id || user._id)?.toString();
                      return (
                        <div
                          key={m.id || m._id}
                          className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isMe && (
                            <div className="w-6 h-6 rounded-[2px] bg-[#252525] flex items-center justify-center text-[#ffffff] font-bold text-[9px] uppercase shrink-0 overflow-hidden">
                              {activeConversation.avatar ? (
                                <img src={activeConversation.avatar} alt={activeConversation.name} className="w-full h-full object-cover" />
                              ) : (
                                activeConversation.name.charAt(0)
                              )}
                            </div>
                          )}

                          <div
                            className={`max-w-[75%] p-3 rounded-[4px] text-xs space-y-1 ${isMe
                                ? 'bg-[#262626] border border-[rgba(255,255,255,0.12)] text-[#ffffff]'
                                : 'bg-[#141414] border border-[rgba(255,255,255,0.06)] text-[#e5e5e5]'
                              }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{m.content}</p>
                            <span
                              className={`block text-[9px] font-mono ${isMe ? 'text-[#999999] text-right' : 'text-[#777777] text-left'
                                }`}
                            >
                              {new Date(m.createdAt || Date.now()).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          {isMe && (
                            <div className="w-6 h-6 rounded-[2px] bg-[#333333] flex items-center justify-center text-[#ffffff] font-bold text-[9px] uppercase shrink-0 overflow-hidden">
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
                <form onSubmit={handleSendMessage} className="pt-3 border-t border-[rgba(255,255,255,0.08)] flex items-center gap-2 shrink-0">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={`Message ${activeConversation.name}...`}
                    className="flex-1 input-flat text-xs py-2"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim() || sendingMessage}
                    className="btn-white text-xs px-4 py-2 disabled:opacity-40"
                  >
                    {sendingMessage ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 mr-1" />
                        <span>Send</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-[2rem] space-y-[1rem]">
                <div className="w-[4rem] h-[4rem] rounded-[4px] bg-[#141414] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#666666]">
                  <MessageSquare className="w-[1.75rem] h-[1.75rem] text-[#999999]" />
                </div>
                <h3 className="text-base font-semibold text-[#ffffff]">Select a Friend to Chat</h3>
                <p className="text-sm leading-relaxed text-[#999999] max-w-md">
                  Choose a contact from the left list to start private direct messages or coordinate live sessions.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FRIEND REQUESTS */}
      {activeTab === 'requests' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[1.5rem]">
          {/* Incoming Requests */}
          <div className="bg-[#181818] border border-[rgba(255,255,255,0.08)] rounded-[4px] p-[1.75rem] space-y-[1.25rem]">
            <div className="flex items-center justify-between pb-[1rem] border-b border-[rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#00e599]" />
                <h3 className="text-base font-bold text-[#ffffff]">Incoming Requests</h3>
              </div>
              <span className="text-[11px] font-mono bg-[#122b1f] text-[#00e599] border border-[#00e599]/30 px-2 py-0.5 rounded-[2px]">
                {receivedRequests.length}
              </span>
            </div>

            {loadingRequests ? (
              <div className="py-12 flex justify-center text-[#999999] text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-[#00e599]" />
              </div>
            ) : receivedRequests.length === 0 ? (
              <div className="py-[3rem] text-center text-sm text-[#999999] space-y-[0.75rem]">
                <UserCheck className="w-[2rem] h-[2rem] text-[#777777] mx-auto" />
                <p>No incoming friend requests right now.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {receivedRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-[4px] bg-[#141414] border border-white/10 flex items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-[3px] bg-[#252525] flex items-center justify-center text-[#ffffff] font-bold text-xs uppercase shrink-0 overflow-hidden border border-[rgba(255,255,255,0.08)]">
                        {req.user?.avatar ? (
                          <img src={req.user.avatar} alt={req.user.name} className="w-full h-full object-cover" />
                        ) : (
                          req.user?.name?.charAt(0) || 'U'
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-[#ffffff] truncate">{req.user?.name}</h4>
                        <p className="text-[10px] text-[#777777] font-mono truncate">{req.user?.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => handleAcceptRequest(req.id)}
                        className="btn-accent text-xs px-3 py-1.5"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="btn-graphite text-xs px-3 py-1.5 text-rose-400"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sent Requests */}
          <div className="bg-[#181818] border border-[rgba(255,255,255,0.08)] rounded-[4px] p-[1.75rem] space-y-[1.25rem]">
            <div className="flex items-center justify-between pb-[1rem] border-b border-[rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#cccccc]" />
                <h3 className="text-base font-bold text-[#ffffff]">Sent Requests</h3>
              </div>
              <span className="text-[11px] font-mono bg-[#222222] text-[#cccccc] px-2 py-0.5 rounded-[2px] border border-[rgba(255,255,255,0.06)]">
                {sentRequests.length}
              </span>
            </div>

            {loadingRequests ? (
              <div className="py-12 flex justify-center text-[#999999] text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-[#ff7a1a]" />
              </div>
            ) : sentRequests.length === 0 ? (
              <div className="py-[3rem] text-center text-sm text-[#999999] space-y-[0.75rem]">
                <Clock className="w-[2rem] h-[2rem] text-[#777777] mx-auto" />
                <p>No outgoing pending requests.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-[4px] bg-[#141414] border border-white/10 flex items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-[3px] bg-[#252525] flex items-center justify-center text-[#ffffff] font-bold text-xs uppercase shrink-0 overflow-hidden border border-[rgba(255,255,255,0.08)]">
                        {req.user?.avatar ? (
                          <img src={req.user.avatar} alt={req.user.name} className="w-full h-full object-cover" />
                        ) : (
                          req.user?.name?.charAt(0) || 'U'
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-[#ffffff] truncate">{req.user?.name}</h4>
                        <p className="text-[10px] text-[#777777] font-mono truncate">{req.user?.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCancelRequest(req.id)}
                      className="btn-graphite text-xs px-3 py-1.5 cursor-pointer"
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

      {/* TAB 3: USER SEARCH */}
      {activeTab === 'search' && (
        <div className="bg-[#181818] border border-[rgba(255,255,255,0.08)] rounded-[4px] p-[1.5rem] sm:p-[2rem] space-y-[1.5rem] max-w-3xl mx-auto w-full">
          <div>
            <h2 className="text-base font-bold text-[#ffffff] flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#00e599]" />
              Discover Vibely Listeners
            </h2>
            <p className="text-xs text-[#999999] mt-[0.5rem]">
              Search by display name or email to connect with friends and expand your musical network.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#777777] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email address..."
                className="w-full input-flat text-xs pl-10"
              />
            </div>
            <button
              type="submit"
              disabled={!searchQuery.trim() || searching}
              className="btn-white text-xs px-5 py-2.5 disabled:opacity-50"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </form>

          {/* Search Results */}
          <div className="space-y-2.5 pt-2">
            {searching ? (
              <div className="py-12 flex justify-center text-[#999999] text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-[#00e599]" />
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((u) => {
                const status = u.relationshipStatus;
                return (
                  <div
                    key={u.id}
                    className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 shadow-inner"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-[3px] bg-[#252525] flex items-center justify-center text-[#ffffff] font-bold text-xs uppercase shrink-0 overflow-hidden border border-[rgba(255,255,255,0.08)]">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          u.name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-[#ffffff] truncate">{u.name}</h4>
                        <p className="text-[10px] text-[#777777] font-mono truncate">{u.email}</p>
                      </div>
                    </div>

                    <div className="self-end sm:self-auto shrink-0">
                      {status === 'friends' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-[#122b1f] text-[#00e599] border border-[#00e599]/30 px-2 py-0.5 rounded-[2px] font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Friends
                          </span>
                          <button
                            onClick={() => {
                              setActiveTab('chat');
                              setActiveFriendId(u.id);
                            }}
                            className="btn-graphite text-xs px-2.5 py-1"
                          >
                            <MessageSquare className="w-3 h-3 mr-1" /> Chat
                          </button>
                        </div>
                      ) : status === 'pending_sent' ? (
                        <span className="text-[11px] bg-[#222222] text-[#777777] px-2.5 py-1 rounded-[2px] font-mono flex items-center gap-1.5 border border-[rgba(255,255,255,0.06)]">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          Pending Request
                        </span>
                      ) : status === 'pending_received' ? (
                        <button
                          onClick={() => handleAcceptRequest(u.friendshipId)}
                          className="btn-white text-xs px-3 py-1"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Accept Request
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSendFriendRequest(u.id)}
                          className="btn-white text-xs px-3.5 py-1"
                        >
                          <UserPlus className="w-3.5 h-3.5 mr-1" />
                          Add Friend
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : searchQuery.trim() ? (
              <div className="py-12 text-center text-xs text-[#777777]">
                No listeners found matching &quot;{searchQuery}&quot;.
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* TAB 4: ROOM INVITATIONS */}
      {activeTab === 'invitations' && (
        <div className="bg-[#181818] border border-[rgba(255,255,255,0.08)] rounded-[4px] p-[1.5rem] sm:p-[2rem] space-y-[1.5rem] max-w-3xl mx-auto w-full">
          <div>
            <h2 className="text-base font-bold text-[#ffffff] flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#00e599]" />
              Incoming Room Invitations
            </h2>
            <p className="text-xs text-[#999999] mt-[0.5rem]">
              Join active listening rooms invited by your contacts.
            </p>
          </div>

          {loadingInvites ? (
            <div className="py-16 flex justify-center text-[#999999] text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-[#00e599]" />
            </div>
          ) : roomInvites.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Radio className="w-10 h-10 text-[#555555] mx-auto" />
              <p className="text-xs font-semibold text-[#cccccc]">No active room invitations</p>
              <p className="text-[11px] text-[#777777] max-w-md mx-auto">
                When friends host a Vibely Room and invite you, invitations will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {roomInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 rounded-[4px] bg-[#161616] border border-[rgba(255,255,255,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-[3px] bg-[#252525] flex items-center justify-center text-[#ffffff] font-bold text-xs uppercase shrink-0 overflow-hidden border border-[rgba(255,255,255,0.08)]">
                      {inv.sender?.avatar ? (
                        <img src={inv.sender.avatar} alt={inv.sender.name} className="w-full h-full object-cover" />
                      ) : (
                        inv.sender?.name?.charAt(0) || 'U'
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-[#ffffff] truncate">{inv.roomName}</h4>
                        <span className="text-[10px] font-mono bg-[#122b1f] text-[#00e599] px-2 py-0.5 rounded-[2px] border border-[#00e599]/30">
                          {inv.roomCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#777777] mt-0.5">
                        Invited by <strong className="text-[#cccccc]">{inv.sender?.name}</strong> &bull; {inv.memberCount} listener{inv.memberCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleAcceptRoomInvite(inv.id)}
                      className="btn-white text-xs px-3.5 py-1.5"
                    >
                      <Radio className="w-3.5 h-3.5 mr-1" />
                      Join Room
                    </button>
                    <button
                      onClick={() => handleDeclineRoomInvite(inv.id)}
                      className="btn-graphite text-xs px-3 py-1.5 text-rose-400"
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
