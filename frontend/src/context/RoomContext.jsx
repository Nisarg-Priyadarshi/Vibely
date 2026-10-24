import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/api';
import { useAuth } from './AuthContext';
import { usePlayer } from './PlayerContext';

const RoomContext = createContext(null);

export const RoomProvider = ({ children }) => {
  const { user } = useAuth();
  const {
    currentTrack,
    currentTime,
    playTrack,
    forcePlay,
    forcePause,
    seek,
  } = usePlayer();

  const socketRef = useRef(null);

  const [socketStatus, setSocketStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
  const [connectionError, setConnectionError] = useState(null);

  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomMembers, setRoomMembers] = useState([]);
  const [roomState, setRoomState] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [roomNotification, setRoomNotification] = useState(null);

  // Clear transient room notification
  const notify = useCallback((message, type = 'info') => {
    setRoomNotification({ id: Date.now(), message, type });
    setTimeout(() => {
      setRoomNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  // Sync Audio instance with Room State
  const applyRoomSync = useCallback(
    (state) => {
      if (!state) return;

      const { currentSong, isPlaying, position, updatedAt } = state;

      // 1. If song changed or no track loaded
      if (currentSong && currentSong.audioUrl) {
        const curId = currentTrack ? (currentTrack.id || currentTrack._id) : null;
        const newId = currentSong.id || currentSong._id;

        if (curId !== newId) {
          playTrack(currentSong);
        }
      }

      // 2. Latency drift estimation
      const elapsedSinceUpdate = updatedAt ? Math.max(0, (Date.now() - updatedAt) / 1000) : 0;
      const estimatedPosition = isPlaying ? (position || 0) + elapsedSinceUpdate : (position || 0);

      // Seek only if drift exceeds 2.0s to avoid audio stutter
      if (typeof position === 'number' && Math.abs(currentTime - estimatedPosition) > 2.0) {
        seek(estimatedPosition);
      }

      // 3. Play / Pause state sync
      if (isPlaying) {
        forcePlay();
      } else {
        forcePause();
      }
    },
    [currentTrack, currentTime, playTrack, forcePlay, forcePause, seek]
  );

  // Initialize Socket connection
  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocketStatus('disconnected');
      setCurrentRoom(null);
      setRoomMembers([]);
      setRoomState(null);
      setPendingRequests([]);
      setChatMessages([]);
      return;
    }

    setSocketStatus('connecting');
    setConnectionError(null);

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketStatus('connected');
      setConnectionError(null);

      // If user was in a room before disconnect, re-sync state
      if (currentRoom?.code) {
        socket.emit('room:join', { code: currentRoom.code }, (res) => {
          if (res?.success) {
            setRoomMembers(res.room.members || []);
            setRoomState(res.room.state || null);
            setChatMessages(res.messages || []);
            applyRoomSync(res.room.state);
            notify('Reconnected to room successfully.', 'success');
          }
        });
      }
    });

    socket.on('connect_error', (err) => {
      setSocketStatus('error');
      setConnectionError(err.message || 'Failed to connect to room server.');
    });

    socket.on('disconnect', (reason) => {
      setSocketStatus('disconnected');
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    socket.on('reconnect_attempt', () => {
      setSocketStatus('reconnecting');
    });

    // Room events
    socket.on('room:members_updated', ({ members, hostId }) => {
      setRoomMembers(members || []);
      setCurrentRoom((prev) => (prev ? { ...prev, hostId } : null));
    });

    socket.on('room:chat_message', (message) => {
      setChatMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) return prev;
        return [...prev, message].slice(-200);
      });
    });

    socket.on('room:host_changed', ({ newHostId, newHostName }) => {
      setCurrentRoom((prev) => (prev ? { ...prev, hostId: newHostId, hostName: newHostName } : null));
      notify(`👑 ${newHostName} is now the room host.`, 'info');
    });

    socket.on('room:state_updated', ({ state, action }) => {
      setRoomState(state);
      applyRoomSync(state);
      if (action) {
        const actionLabel = action.replace('_', ' ');
        notify(`Playback updated: ${actionLabel}`, 'info');
      }
    });

    socket.on('room:request_received', (request) => {
      setPendingRequests((prev) => {
        // Prevent duplicate requestId
        if (prev.some((r) => r.requestId === request.requestId)) return prev;
        return [request, ...prev];
      });
      notify(`Incoming request from ${request.userName}: ${request.action.replace('_', ' ')}`, 'info');
    });

    socket.on('room:request_handled', ({ requestId, approved, action, userName }) => {
      setPendingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
      const statusText = approved ? 'approved' : 'rejected';
      notify(`Host ${statusText} ${userName}'s request to ${action.replace('_', ' ')}.`, approved ? 'success' : 'warning');
    });

    socket.on('room:closed', ({ reason }) => {
      notify(reason || 'The room has been closed.', 'warning');
      setCurrentRoom(null);
      setRoomMembers([]);
      setRoomState(null);
      setPendingRequests([]);
      setChatMessages([]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  // Create Room
  const createRoom = useCallback(
    ({ name, description = '' }) => {
      return new Promise((resolve, reject) => {
        if (!socketRef.current || !socketRef.current.connected) {
          return reject(new Error('Socket is not connected to server.'));
        }

        socketRef.current.emit('room:create', { name, description }, (res) => {
          if (!res || !res.success) {
            const errMsg = res?.error || 'Failed to create room.';
            notify(errMsg, 'error');
            return reject(new Error(errMsg));
          }

          setCurrentRoom(res.room);
          setRoomMembers(res.room.members || []);
          setRoomState(res.room.state || null);
          setPendingRequests(res.room.requests || []);
          setChatMessages(res.messages || []);
          notify(`Room "${res.room.name}" created! Share code: ${res.room.code}`, 'success');
          resolve(res.room);
        });
      });
    },
    [notify]
  );

  // Join Room
  const joinRoom = useCallback(
    (code) => {
      return new Promise((resolve, reject) => {
        if (!socketRef.current || !socketRef.current.connected) {
          return reject(new Error('Socket is not connected to server.'));
        }

        const normalizedCode = code ? code.trim().toUpperCase() : '';
        socketRef.current.emit('room:join', { code: normalizedCode }, (res) => {
          if (!res || !res.success) {
            const errMsg = res?.error || 'Failed to join room.';
            notify(errMsg, 'error');
            return reject(new Error(errMsg));
          }

          setCurrentRoom(res.room);
          setRoomMembers(res.room.members || []);
          setRoomState(res.room.state || null);
          setPendingRequests(res.room.requests || []);
          setChatMessages(res.messages || []);
          applyRoomSync(res.room.state);
          notify(`Joined room "${res.room.name}"`, 'success');
          resolve(res.room);
        });
      });
    },
    [applyRoomSync, notify]
  );

  // Leave Room
  const leaveRoom = useCallback(() => {
    return new Promise((resolve) => {
      if (socketRef.current && currentRoom) {
        socketRef.current.emit('room:leave', { code: currentRoom.code }, () => {
          setCurrentRoom(null);
          setRoomMembers([]);
          setRoomState(null);
          setPendingRequests([]);
          setChatMessages([]);
          notify('Left the room.', 'info');
          resolve();
        });
      } else {
        setCurrentRoom(null);
        setRoomMembers([]);
        setRoomState(null);
        setPendingRequests([]);
        setChatMessages([]);
        resolve();
      }
    });
  }, [currentRoom, notify]);

  const sendChatMessage = useCallback((text) => new Promise((resolve, reject) => {
    if (!socketRef.current?.connected || !currentRoom) return reject(new Error('Not connected to a room.'));
    socketRef.current.emit('room:chat_send', { code: currentRoom.code, text }, (res) => {
      if (!res?.success) return reject(new Error(res?.error || 'Failed to send message.'));
      resolve(res.message);
    });
  }), [currentRoom]);

  // Host Control Playback
  const hostControl = useCallback(
    ({ action, payload = {} }) => {
      return new Promise((resolve, reject) => {
        if (!socketRef.current || !currentRoom) {
          return reject(new Error('Not connected to a room.'));
        }

        socketRef.current.emit(
          'room:host_control',
          { code: currentRoom.code, action, payload },
          (res) => {
            if (!res || !res.success) {
              const errMsg = res?.error || 'Action failed.';
              notify(errMsg, 'error');
              return reject(new Error(errMsg));
            }
            setRoomState(res.state);
            applyRoomSync(res.state);
            resolve(res.state);
          }
        );
      });
    },
    [currentRoom, applyRoomSync, notify]
  );

  // Member Request Playback Action
  const requestAction = useCallback(
    ({ action, payload = {} }) => {
      return new Promise((resolve, reject) => {
        if (!socketRef.current || !currentRoom) {
          return reject(new Error('Not connected to a room.'));
        }

        socketRef.current.emit(
          'room:request_action',
          { code: currentRoom.code, action, payload },
          (res) => {
            if (!res || !res.success) {
              const errMsg = res?.error || 'Failed to submit request.';
              notify(errMsg, 'error');
              return reject(new Error(errMsg));
            }
            notify(`Request sent to host: ${action.replace('_', ' ')}`, 'info');
            resolve(res);
          }
        );
      });
    },
    [currentRoom, notify]
  );

  // Host Respond to Request
  const respondToRequest = useCallback(
    ({ requestId, approved }) => {
      return new Promise((resolve, reject) => {
        if (!socketRef.current || !currentRoom) {
          return reject(new Error('Not connected to a room.'));
        }

        socketRef.current.emit(
          'room:respond_request',
          { code: currentRoom.code, requestId, approved },
          (res) => {
            if (!res || !res.success) {
              const errMsg = res?.error || 'Failed to respond to request.';
              notify(errMsg, 'error');
              return reject(new Error(errMsg));
            }
            setPendingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
            resolve(res);
          }
        );
      });
    },
    [currentRoom, notify]
  );

  // Sync Room State on demand
  const syncRoomState = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !currentRoom) {
        return reject(new Error('Not in a room.'));
      }

      socketRef.current.emit('room:sync_request', { code: currentRoom.code }, (res) => {
        if (!res || !res.success) {
          return reject(new Error(res?.error || 'Sync failed.'));
        }
        setRoomState(res.state);
        applyRoomSync(res.state);
        notify('Synchronized with host playback.', 'success');
        resolve(res.state);
      });
    });
  }, [currentRoom, applyRoomSync, notify]);

  // Check if current user is host
  const isHost = Boolean(
    user && currentRoom && (currentRoom.hostId === (user.id || user._id)?.toString())
  );

  return (
    <RoomContext.Provider
      value={{
        socketStatus,
        connectionError,
        currentRoom,
        roomMembers,
        roomState,
        pendingRequests,
        chatMessages,
        roomNotification,
        isHost,
        createRoom,
        joinRoom,
        leaveRoom,
        hostControl,
        requestAction,
        respondToRequest,
        syncRoomState,
        sendChatMessage,
        notify,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
};

export default RoomContext;
