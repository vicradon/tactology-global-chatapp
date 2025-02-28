import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { ColorModeButton } from "./color-mode";

export const TopNavBar = () => {
  return (
    <Flex
      border={"2px solid black"}
      justifyContent={"space-between"}
      alignItems={"center"}
      as="nav"
      padding="1rem"
      borderRadius={"1rem"}
    >
      <Text>Signed in as: Osi</Text>
      <Flex columnGap={"1rem"}>
        <Button
          border={"1px solid black"}
          borderRadius={"1rem"}
          variant={"outline"}
        >
          Logout
        </Button>
        <ColorModeButton />
      </Flex>
    </Flex>
  );
};
