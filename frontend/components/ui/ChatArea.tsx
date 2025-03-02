import { Flex, Text } from "@chakra-ui/react";
import { ChatBubble } from "./ChatBubble";
import { useStateContext } from "../state/StateProvider";
import { UnAuthenticatedBox } from "./UnAuthenticatedBox";
import { useEffect, useMemo, useRef } from "react";

export const ChatArea = ({ ...props }) => {
  const { state } = useStateContext();
  const activeRoomId = state.activeRoom?.id;
  const roomMessages = useMemo(() => {
    return activeRoomId ? state.roomMessages?.[activeRoomId] : [];
  }, [state.roomMessages, activeRoomId]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [roomMessages]);

  if (!state.isAuthenticated) return <UnAuthenticatedBox viewName="Chats" />;

  if (state.isAuthenticated && !state.activeRoom)
    return (
      <Flex justifyContent={"center"} alignItems={"center"}>
        <Text>Select a room to see messages</Text>
      </Flex>
    );

  return (
    <Flex flexDirection="column" h="100%" overflowY="auto" rowGap={"1rem"} p={4} {...props}>
      {roomMessages?.map((message) => (
        <ChatBubble key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </Flex>
  );
};
