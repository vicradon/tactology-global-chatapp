import { Box, Flex, Grid, Text } from "@chakra-ui/react";
import { ChatBubble } from "./ChatBubble";
import { useStateContext } from "../state/StateProvider";
import { UnAuthenticatedBox } from "./UnAuthenticatedBox";

export const ChatArea = ({ ...props }) => {
  const { state } = useStateContext();
  const messages = state.messages;

  if (!state.isAuthenticated) return <UnAuthenticatedBox viewName="Chats" />;

  if (state.isAuthenticated && !state.activeRoom)
    return (
      <Flex justifyContent={"center"} alignItems={"center"}>
        <Text>Select a room to see messages</Text>
      </Flex>
    );
  return (
    <Flex flexDirection="column" h="100%" rowGap={"1rem"} p={4} {...props}>
      {messages.map((message) => {
        return <ChatBubble key={message.id} message={message} />;
      })}
    </Flex>
  );
};
