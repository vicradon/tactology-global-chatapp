import { Button, Flex, Text } from "@chakra-ui/react";
import { useStateContext } from "../state/StateProvider";
import { UnAuthenticatedBox } from "./UnAuthenticatedBox";

export const ChatNavBar = () => {
  const { state, dispatch } = useStateContext();

  if (!state.isAuthenticated) return <UnAuthenticatedBox viewName="" />;
  return (
    <Flex
      padding={"1rem"}
      justifyContent={"space-between"}
      alignItems={"center"}
    >
      <Text>Chat Room - {state.activeRoom.name}</Text>
      <Button
        onClick={() =>
          dispatch({
            type: "CHANGE_ROOM",
            payload: { id: "something", name: "The Fuckers" },
          })
        }
        variant={"solid"}
        bgColor={"red.400"}
      >
        Leave Room
      </Button>
    </Flex>
  );
};
