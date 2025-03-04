import { Flex, Text } from "@chakra-ui/react";
import { ChatBubble } from "./ChatBubble";
import { useStateContext } from "../state/StateProvider";
import { UnAuthenticatedBox } from "./UnAuthenticatedBox";
import { useEffect, useMemo, useRef } from "react";

const formatDateLabel = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const ChatArea = ({ ...props }) => {
  const { state } = useStateContext();
  const activeRoomId = state.activeRoom?.id;
  const roomMessages = useMemo(() => {
    return activeRoomId ? state.roomMessages?.[activeRoomId] : [];
  }, [state.roomMessages, activeRoomId]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [roomMessages]);

  if (!state.isAuthenticated) return <UnAuthenticatedBox viewName="Chats" />;
  if (state.isAuthenticated && !state.activeRoom)
    return (
      <Flex justifyContent={"center"} alignItems={"center"}>
        <Text>Select a room to see messages</Text>
      </Flex>
    );

  let lastDateLabel = "";

  return (
    <Flex flexDirection="column" h="100%" overflowY="auto" rowGap={"1rem"} p={4} {...props}>
      {roomMessages?.map((message) => {
        const messageDateLabel = formatDateLabel(String(message.timestamp));
        const showDateLabel = messageDateLabel !== lastDateLabel;
        lastDateLabel = messageDateLabel;

        return (
          <div key={message.id}>
            {showDateLabel && (
              <Flex justifyContent="center" my={2}>
                <Text fontSize="sm" fontWeight="bold" color="gray.500">
                  {messageDateLabel}
                </Text>
              </Flex>
            )}
            <ChatBubble message={message} />
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </Flex>
  );
};
