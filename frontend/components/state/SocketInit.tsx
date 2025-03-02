import { useEffect } from "react";
import { Profile, useStateContext } from "./StateProvider";
import { getSocket, initializeSocket, useSocketConnection, useSocketListener } from "@/network/socket";
import { toaster } from "../ui/toaster";

export const SocketInit = () => {
  const { dispatch, state } = useStateContext();
  const isAuthenticated = state.isAuthenticated;

  useEffect(() => {
    if (isAuthenticated) {
      const socket = initializeSocket();

      if (socket.connected) {
        dispatch({
          type: "SET_IS_SOCKET_CONNECTED",
          payload: true,
        });
      }
    }
  }, [isAuthenticated]);

  useSocketListener("notification", (data) => {
    if (data?.messageType === "system") {
      toaster.create({
        type: "info",
        title: data?.text,
      });
    }
  });

  return null;
};
