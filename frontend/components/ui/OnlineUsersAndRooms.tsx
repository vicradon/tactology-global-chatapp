import { Box, Flex, Grid, Heading, Text } from "@chakra-ui/react";
import { RoomButton } from "./RoomButton";
import { useStateContext } from "../state/StateProvider";
import { UnAuthenticatedBox } from "./UnAuthenticatedBox";

export const OnlineUsersAndRooms = ({ ...props }) => {
  const { state } = useStateContext();
  if (!state.isAuthenticated)
    return (
      <Flex
        flexDirection={"column"}
        justifyContent={"center"}
        alignItems={"center"}
        height="100%"
        border="2px solid"
        borderRadius={"1rem"}
      >
        <UnAuthenticatedBox viewName="Users and Rooms" />
      </Flex>
    );
  return (
    <Grid
      gridTemplateRows="1fr 1fr"
      rowGap="2rem"
      borderRadius="1rem"
      border="2px solid"
      padding="1rem"
      height="400px"
      {...props}
    >
      <Grid gridTemplateRows="50px 1fr" overflow="hidden">
        <Heading>Users</Heading>
        <Flex
          flexDirection="column"
          rowGap="0.5rem"
          overflowY="auto"
          flex="1"
          paddingRight="0.5rem"
          paddingBottom={"1rem"}
        >
          {Array.from({ length: 20 }).map((_, index) => (
            <Text key={index}>User {index + 1}</Text>
          ))}
        </Flex>
      </Grid>

      <Grid gridTemplateRows="50px 1fr" overflow="hidden">
        <Heading>Rooms</Heading>
        <Flex
          flexDirection="column"
          rowGap="1rem"
          overflowY="auto"
          flex="1"
          paddingRight="0.5rem"
          paddingBottom={"2rem"}
        >
          {Array.from({ length: 20 }).map((_, index) => (
            <RoomButton key={index} />
          ))}
        </Flex>
      </Grid>
    </Grid>
  );
};
