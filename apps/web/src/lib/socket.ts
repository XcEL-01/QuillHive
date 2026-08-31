import { io, Socket } from "socket.io-client";

const SOCKET_URL = (import.meta.env.VITE_API_URL as string | undefined) || undefined;

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      path: "/api/socket.io",
      autoConnect: false,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
    });

    socket.on("reconnect", (attempt: number) => {
      console.info(`[socket] Reconnected after ${attempt} attempt(s)`);
    });
    socket.on("reconnect_attempt", (attempt: number) => {
      if (attempt > 3) console.warn(`[socket] Reconnect attempt #${attempt}`);
    });
    socket.on("disconnect", (reason: string) => {
      console.warn("[socket] Disconnected:", reason);
    });
  }
  return socket;
}

export function connectSocket(userId: number) {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
    s.once("connect", () => {
      s.emit("join:user", userId);
    });
  } else {
    s.emit("join:user", userId);
  }
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export { socket };
