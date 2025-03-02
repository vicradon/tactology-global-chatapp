import { Button, Flex, Text } from "@chakra-ui/react";
import { useStateContext } from "../state/StateProvider";
import { UnAuthenticatedBox } from "./UnAuthenticatedBox";
import { getSocket } from "@/network/socket";

export const ChatNavBar = () => {
  const { state } = useStateContext();

  if (!state.isAuthenticated) return <UnAuthenticatedBox viewName="" />;

  const currentUserIsMember = state.activeRoom?.isMember;
  const socket = getSocket();

  const handleJoinOrLeave = async () => {
    if (currentUserIsMember) {
      socket?.emit("leaveRoom", {
        roomId: state.activeRoom?.id,
      });
    } else {
      socket?.emit("joinRoom", {
        roomId: state.activeRoom?.id,
      });
    }
  };

  return (
    <Flex padding={"1rem"} justifyContent={"space-between"} alignItems={"center"}>
      <Text>Chat Room - {state.activeRoom?.name}</Text>
      <Button
        display={state.activeRoom ? "block" : "none"}
        onClick={handleJoinOrLeave}
        variant={"solid"}
        bgColor={currentUserIsMember ? "red.400" : "green.400"}
      >
        {currentUserIsMember ? "Leave Room" : "Join Room"}
      </Button>
    </Flex>
  );
};
