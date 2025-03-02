import { Button, Flex, Text } from "@chakra-ui/react";
import { useStateContext } from "../state/StateProvider";
import { UnAuthenticatedBox } from "./UnAuthenticatedBox";

export const ChatNavBar = () => {
  const { state, dispatch } = useStateContext();

  if (!state.isAuthenticated) return <UnAuthenticatedBox viewName="" />;

  const currentUserIsMember = state.activeRoom?.isMember;

  return (
    <Flex padding={"1rem"} justifyContent={"space-between"} alignItems={"center"}>
      <Text>Chat Room - {state.activeRoom?.name}</Text>
      <Button
        display={state.activeRoom ? "block" : "none"}
        onClick={() => {}}
        variant={"solid"}
        bgColor={currentUserIsMember ? "red.400" : "green.400"}
      >
        {currentUserIsMember ? "Leave Room" : "Join Room"}
      </Button>
    </Flex>
  );
};
