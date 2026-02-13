// frontend/src/socket/socket.ts
import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "../config";

let socket: Socket | null = null;
let lastToken: string | null = null;

// ✅ ahora pasas token (JWT de tu app) para que el backend autentique el socket
export function connectSocket(token?: string | null): Socket {
  // si ya existe y está conectado con el mismo token, reutiliza
  if (socket && socket.connected && lastToken === (token ?? null)) return socket;

  // si cambia token, cerramos y recreamos
  if (socket && lastToken !== (token ?? null)) {
    try {
      socket.disconnect();
    } catch {}
    socket = null;
  }

  lastToken = token ?? null;

  socket = io(SOCKET_URL, {
    transports: ["websocket"],

    // ✅ NO fuerces secure:true en dev con http
    // socket.io decide según el esquema de SOCKET_URL (http vs https)

    // ✅ auth handshake (tu backend lo lee en socket.handshake.auth.token)
    auth: token ? { token } : {},

    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 10000,
  });

  socket.on("connect", () => {
    console.log("✅ socket connected", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("⚠️ socket disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.log("❌ socket connect_error:", err.message);
  });

  return socket;
}

// ✅ join/leave igual, pero acepta token opcional para asegurar conexión autenticada
export function joinChat(chatId: string | number, token?: string | null) {
  const s = connectSocket(token);
  s.emit("join_chat", String(chatId));
}

export function leaveChat(chatId: string | number, token?: string | null) {
  const s = connectSocket(token);
  s.emit("leave_chat", String(chatId));
}

export function disconnectSocket() {
  if (!socket) return;
  try {
    socket.disconnect();
  } catch {}
  socket = null;
  lastToken = null;
}
