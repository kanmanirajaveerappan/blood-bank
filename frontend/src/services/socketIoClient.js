// src/services/socketIoClient.js
import { io } from "socket.io-client";

// Determine backend URL: point to the Flask server on port 8000
const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL
  }
  if (typeof window === 'undefined') return 'http://localhost:8000'
  const hostname = window.location.hostname || 'localhost'
  return `http://${hostname}:8000`
}
export const SOCKET_URL = getSocketUrl()


const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on("connect", () => {
  console.info(`Socket.IO connected: ${socket.id}`);
});

socket.on("disconnect", (reason) => {
  console.warn(`Socket.IO disconnected: ${reason}`);
});

export default socket;
