import { io, Socket } from "socket.io-client";
import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

let socket: Socket | null = null;

const defaultOptions = {
  reconnectionDelayMax: 10000,
  withCredentials: true, // Uses cookies if available
  extraHeaders: {},
};

export function initializeSocket(endpoint = "", options = {}) {
  if (!socket) {
    const url = `${API_BASE_URL}${endpoint}`;

    // Get accessToken from sessionStorage as a fallback
    const accessToken = sessionStorage.getItem("accessToken");
    const headers: Record<string, string> = {};

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    socket = io(url, { ...defaultOptions, extraHeaders: headers, ...options });

    socket.on("connect", () => {
      console.log("Socket connected");
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    socket.on("connect_error", (error) => {
      console.log("Socket connection error:", error);

      if (socket) {
        socket.io.opts.transports = ["polling", "websocket"];
        socket.connect();
      }
    });
  }

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function useSocketConnection(autoConnect = true) {
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!socket && autoConnect) {
      initializeSocket();
    }

    if (!socket) return;

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleError = (err: Error) => setError(err);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleError);

    setConnected(socket.connected);

    return () => {
      socket?.off("connect", handleConnect);
      socket?.off("disconnect", handleDisconnect);
      socket?.off("connect_error", handleError);
    };
  }, [autoConnect]);

  return { socket, connected, error };
}

export function useSocketEvent<T = any>(event: string): [T | null, boolean] {
  const [data, setData] = useState<T | null>(null);
  const [received, setReceived] = useState<boolean>(false);

  useEffect(() => {
    if (!socket) return;

    const handler = (eventData: T) => {
      setData(eventData);
      setReceived(true);
    };

    socket.on(event, handler);

    return () => {
      socket?.off(event, handler);
    };
  }, [event]);

  return [data, received];
}

export function useSocketListener<T = any>(event: string, callback: (data: T) => void) {
  useEffect(() => {
    if (!socket) return;

    socket.on(event, callback);

    return () => {
      socket?.off(event, callback);
    };
  }, [event, callback]);
}
