import { Button, Flex, Text } from "@chakra-ui/react";
import { useStateContext } from "../state/StateProvider";

export const ChatNavBar = () => {
  const { state, dispatch } = useStateContext();
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
