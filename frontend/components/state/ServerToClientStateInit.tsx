import { useEffect } from "react";
import { Profile, useStateContext } from "./StateProvider";

interface Props {
  isAuthenticated: boolean;
  profile: Profile;
}

export const ServerToClientStateInit = ({
  isAuthenticated,
  profile,
}: Props) => {
  const { dispatch } = useStateContext();

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
