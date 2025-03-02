import { useEffect } from "react";
import { Message, useStateContext } from "./StateProvider";
import { initializeSocket, useSocketListener } from "@/network/socket";
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
  }, [isAuthenticated, dispatch]);

  useSocketListener("notification", (data) => {
    if (data?.messageType === "system") {
      toaster.create({
        type: "info",
        title: data?.text,
      });
    }
  });

  useSocketListener("roomMessageHistory", ({ roomId, messages }: { roomId: string; messages: Message[] }) => {
    dispatch({
      type: "UPDATE_ROOM_MESSAGES",
      payload: {
        roomId: roomId,
        messages: messages || [],
      },
    });
  });

  useSocketListener("newRoomMessage", (data: Message) => {
    dispatch({
      type: "ADD_ROOM_MESSAGE",
      payload: data,
    });
  });

  return null;
};
