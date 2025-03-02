import { useEffect } from "react";
import { Profile, Room, useStateContext } from "./StateProvider";
import { getSocket, useSocketConnection } from "@/network/socket";
import { useFetchMutation } from "@/network/fetch";

interface Props {
  isAuthenticated: boolean | undefined;
  profile: Profile | undefined;
}

export const ServerToClientStateInit = ({ isAuthenticated, profile }: Props) => {
  const { dispatch } = useStateContext();
  const { connected } = useSocketConnection();

  const { mutate: triggerProfileFetch } = useFetchMutation("/auth/profile", {
    method: "GET",
  });

  useEffect(() => {
    // client side auth check fallback - nextjs server, for some reason, isn't getting the cookies on environments other than local
    async function fetchProfile() {
      try {
        const profile = await triggerProfileFetch();
        dispatch({
          type: "UPDATE_AUTH_STATE",
          payload: true,
        });
        dispatch({
          type: "UPDATE_PROFILE",
          payload: profile,
        });
      } catch (error) {}
    }

    if (isAuthenticated === undefined && profile === undefined) {
      fetchProfile();
    } else {
      if (isAuthenticated !== undefined)
        dispatch({
          type: "UPDATE_AUTH_STATE",
          payload: isAuthenticated,
        });

      if (profile !== undefined)
        dispatch({
          type: "UPDATE_PROFILE",
          payload: profile,
        });
    }
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
