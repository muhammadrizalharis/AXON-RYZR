import { io, Socket } from 'socket.io-client';
import { env } from './env';

let socket: Socket | null = null;

/**
 * Returns a singleton Socket.IO client connected to the API's /socket namespace,
 * authenticated with the current access token.
 */
export function getSocket(token: string): Socket {
  if (socket?.connected) return socket;
  if (socket) socket.disconnect();

  socket = io(`${env.socketUrl}/socket`, {
    transports: ['websocket'],
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    extraHeaders: { 'ngrok-skip-browser-warning': 'true' },
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
