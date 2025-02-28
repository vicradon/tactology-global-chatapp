import { Box, Flex, Grid, Text } from "@chakra-ui/react";
import { ChatBubble } from "./ChatBubble";
import { useStateContext } from "../state/StateProvider";

export const ChatArea = ({ ...props }) => {
  const { state } = useStateContext();
  const messages = state.messages;
  return (
    <Flex flexDirection="column" h="100%" rowGap={"1rem"} p={4} {...props}>
      {messages.map((message) => {
        return <ChatBubble key={message.id} message={message} />;
      })}
    </Flex>
  );
};
