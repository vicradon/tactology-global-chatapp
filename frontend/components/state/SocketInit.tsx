import { useEffect } from "react";
import { Profile, useStateContext } from "./StateProvider";
import { getSocket, initializeSocket, useSocketConnection } from "@/network/socket";

interface Props {
  isAuthenticated: boolean;
  profile: Profile;
}

export const ClientStateInit = ({ isAuthenticated, profile }: Props) => {
  const { dispatch } = useStateContext();

  useEffect(() => {
    if (isAuthenticated) {
      const socket = initializeSocket();

      if (socket.connected) {
        socket.emit("getOnlineUsersUpdate");
        socket.emit("availableRooms");
        socket.emit("userConnected", { username: profile.username });
      }
    }
  }, [isAuthenticated, profile]);

  const { connected } = useSocketConnection();

  useEffect(() => {
    if (connected && isAuthenticated) {
      const socket = getSocket();
      if (socket) {
        socket.emit("getOnlineUsersUpdate");
        socket.emit("availableRooms");
        socket.emit("userConnected", { username: profile.username });
      }
    }
  }, [connected, isAuthenticated]);

  useEffect(() => {
    dispatch({
      type: "UPDATE_AUTH_STATE",
      payload: isAuthenticated,
    });

    dispatch({
      type: "UPDATE_PROFILE",
      payload: profile,
    });
  }, [isAuthenticated, profile, dispatch]);

  return null;
};
