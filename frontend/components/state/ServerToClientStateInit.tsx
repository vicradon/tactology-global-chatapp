import { useEffect } from "react";
import { Profile, Room, useStateContext } from "./StateProvider";
import { getSocket, useSocketConnection } from "@/network/socket";

interface Props {
  isAuthenticated: boolean;
  profile: Profile;
}

export const ServerToClientStateInit = ({ isAuthenticated, profile }: Props) => {
  const { dispatch } = useStateContext();
  const { connected } = useSocketConnection();

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

  useEffect(() => {
    if (!connected) return;

    const lastActiveRoom = localStorage.getItem("activeRoom");
    if (lastActiveRoom) {
      try {
        const lastActiveRoomObj = JSON.parse(lastActiveRoom) as Room;
        dispatch({
          type: "CHANGE_ROOM",
          payload: lastActiveRoomObj,
        });

        const socket = getSocket();
        socket?.emit("switchToRoom", {
          roomId: lastActiveRoomObj.id,
        });
      } catch (error) {
        console.error("could not switch rooms because localstorage is stale or corrupt", error);
        localStorage.removeItem("activeRoom");
      }
    }
  }, [connected, dispatch]);

  return null;
};
