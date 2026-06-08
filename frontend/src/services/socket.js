import { io } from 'socket.io-client';

const SOCKET_URL = 'https://trading-pulse-backend.onrender.com';

const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  autoConnect: true,
});

socket.on('connect', () => {
  console.log('[Socket.io] ✅ Connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('[Socket.io] ⚠️ Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.log('[Socket.io] ❌ Connection error:', error.message);
});

export default socket;
