import { Box, Flex, Text } from "@chakra-ui/react";
import { Message, MessageTypes, useStateContext } from "../state/StateProvider";

type Props = {
  message: Message;
};

export const ChatBubble = ({ message }: Props) => {
  const { state } = useStateContext();
  const isCurrentUser = state.profile.username === message.sender.username;
  const isSystemMessage = message.messageType === MessageTypes.System;

  if (isSystemMessage)
    return (
      <Flex w="100%" justifyContent={"center"} mb={2}>
        <Text>{message.text.replace(state.profile.username, "you")}</Text>
      </Flex>
    );

  return (
    <Flex w="100%" justifyContent={isCurrentUser ? "flex-end" : "flex-start"} mb={2}>
      <Box
        maxW="70%"
        bg={isCurrentUser ? "blue.100" : "gray.100"}
        color={isCurrentUser ? "black" : "black"}
        borderRadius="lg"
        p={3}
        boxShadow="md"
      >
        <Text fontSize="xs" fontWeight="bold" mb={1}>
          ~{message.sender.username}
        </Text>
        <Text mb={2}>{message.text}</Text>
        <Flex justify="flex-end">
          <Text fontSize="xs" color="gray.500">
            {new Date(message.timestamp).toLocaleTimeString()}
          </Text>
        </Flex>
      </Box>
    </Flex>
  );
};
