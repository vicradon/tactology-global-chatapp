import { useEffect } from "react";
import { Profile, Room, useStateContext } from "./StateProvider";
import { getSocket, useSocketConnection } from "@/network/socket";
import { useGraphQLQuery } from "@/network/graphql";
import { PROFILE_QUERY } from "@/network/gql-queries-and-mutations";

interface Props {
  isAuthenticated: boolean | undefined;
  profile: Profile | undefined;
  apiBaseURL: string;
}

export const ServerToClientStateInit = ({ isAuthenticated, profile, apiBaseURL }: Props) => {
  const { dispatch } = useStateContext();
  const { connected } = useSocketConnection();

  const { refetch } = useGraphQLQuery(PROFILE_QUERY, {
    skip: isAuthenticated !== undefined && profile !== undefined,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("API_BASE_URL", apiBaseURL);
    }
  }, []);

  useEffect(() => {
    // client side auth check fallback - nextjs server, for some reason, isn't getting the cookies on environments other than local
    async function fetchProfile() {
      try {
        const result = await refetch();
        const user = result?.data?.user;
        if (user) {
          dispatch({ type: "UPDATE_AUTH_STATE", payload: true });
          dispatch({ type: "UPDATE_PROFILE", payload: user });
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
