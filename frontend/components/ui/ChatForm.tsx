import { Button, Flex, Input } from "@chakra-ui/react";

export const ChatForm = ({ ...props }) => {
  return (
    <Flex as="form" columnGap={"1rem"} {...props}>
      <Input width={"100%"} placeholder="Say something!" type="text" />
      <Button>Send</Button>
    </Flex>
  );
};
