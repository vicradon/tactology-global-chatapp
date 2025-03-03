import { useEffect } from "react";
import { Profile, Room, useStateContext } from "./StateProvider";
import { getSocket, useSocketConnection } from "@/network/socket";
import { useGraphQLQuery } from "@/network/graphql";
import { PROFILE_QUERY } from "@/network/gql-queries-and-mutations";

interface Props {
  isAuthenticated: boolean | undefined;
  profile: Profile | undefined;
}

export const ServerToClientStateInit = ({ isAuthenticated, profile }: Props) => {
  const { dispatch } = useStateContext();
  const { connected } = useSocketConnection();

  const { refetch } = useGraphQLQuery(PROFILE_QUERY, {
    skip: isAuthenticated !== undefined && profile !== undefined,
  });

  useEffect(() => {
    // client side auth check fallback - nextjs server, for some reason, isn't getting the cookies on environments other than local
    async function fetchProfile() {
      try {
        const result = await refetch();
        if (result?.data?.profile) {
          dispatch({ type: "UPDATE_AUTH_STATE", payload: true });
          dispatch({ type: "UPDATE_PROFILE", payload: result.data.profile });
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error fetching profile:", error);
        }
      }
    }

    if (isAuthenticated === undefined && profile === undefined) {
      fetchProfile();
    } else {
      if (isAuthenticated !== undefined) dispatch({ type: "UPDATE_AUTH_STATE", payload: isAuthenticated });
      if (profile !== undefined) dispatch({ type: "UPDATE_PROFILE", payload: profile });
    }
  }, [isAuthenticated, profile, dispatch, refetch]);

  useEffect(() => {
    if (!connected) return;

    const lastActiveRoom = localStorage.getItem("activeRoom");
    if (lastActiveRoom) {
      try {
        const lastActiveRoomObj = JSON.parse(lastActiveRoom) as Room;
        dispatch({ type: "CHANGE_ROOM", payload: lastActiveRoomObj });

        const socket = getSocket();
        socket?.emit("switchToRoom", { roomId: lastActiveRoomObj.id });
      } catch (error) {
        console.error("Could not switch rooms because localStorage is stale or corrupt", error);
        localStorage.removeItem("activeRoom");
      }
    }
  }, [connected, dispatch]);

  return null;
};
