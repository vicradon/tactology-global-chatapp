import { getSocket } from "@/network/socket";
import { Button, Flex, Input } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { useStateContext } from "../state/StateProvider";
import { toaster } from "./toaster";

export const ChatForm = ({ ...props }) => {
  const { state } = useStateContext();
  const [messageText, setMessageText] = useState("");
  const socket = getSocket();

  const sendNewMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!state.isAuthenticated) {
      toaster.error({
        title: "Sign in to send a message",
      });
      return;
    }

    if (!state.activeRoom) {
      toaster.error({
        title: "Select a room to send a message",
      });
      return;
    }

    if (!state.activeRoom.isMember) {
      toaster.error({
        title: "You must be a member of this room to send a message",
      });
      return;
    }

    socket?.emit("messageRoom", {
      roomId: state.activeRoom?.id,
      text: messageText,
    });
    setMessageText("");
  };

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [state.activeRoom?.id]);

  return (
    <Flex
      as="form"
      onSubmit={(event) => sendNewMessage(event as unknown as React.FormEvent<HTMLFormElement>)}
      columnGap={"1rem"}
      {...props}
    >
      <Input
        width={"100%"}
        value={messageText}
        onChange={({ target }) => setMessageText(target.value)}
        placeholder="Say something!"
        type="text"
        border={"1px solid"}
        ref={inputRef}
      />
      <Button type="submit">Send</Button>
    </Flex>
  );
};
