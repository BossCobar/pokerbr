import { io, Socket } from 'socket.io-client';
import { getClientToken } from './clientToken';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL ??
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    socket = io(url, {
      transports: ['websocket'],
      auth: { token: getClientToken() },
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
