import { useEffect, useRef } from "react";
import { getSocket, connectSocket, disconnectSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth";
import type { Socket } from "socket.io-client";

export function useSocketConnection() {
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      connectSocket(user.id);
    }
    return () => {
      if (!isAuthenticated) {
        disconnectSocket();
      }
    };
  }, [isAuthenticated, user?.id]);
}

export function useSocketEvent<T = any>(event: string, handler: (data: T) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket: Socket = getSocket();
    const listener = (data: T) => handlerRef.current(data);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [event]);
}

export function useJoinConversation(conversationId: number | null) {
  useEffect(() => {
    if (!conversationId) return;
    const socket = getSocket();
    socket.emit("join:conversation", conversationId);
  }, [conversationId]);
}
