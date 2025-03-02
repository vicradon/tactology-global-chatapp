import { Box, Flex, Grid, Heading, Text } from "@chakra-ui/react";
import { RoomButton } from "./RoomButton";
import { Room, User, useStateContext } from "../state/StateProvider";
import { UnAuthenticatedBox } from "./UnAuthenticatedBox";
import { getSocket, useSocketListener } from "@/network/socket";

export const OnlineUsersAndRooms = ({ ...props }) => {
  const { state, dispatch } = useStateContext();

  useSocketListener<{ data: User[] }>("usersWithStatus", ({ data }) => {
    dispatch({
      type: "UPDATE_USERS",
      payload: data,
    });
  });

  useSocketListener<{ data: Room[] }>("availableRooms", ({ data }) => {
    dispatch({
      type: "UPDATE_ROOMS",
      payload: data,
    });
  });

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
        <Heading>Users Status</Heading>
        <Flex
          flexDirection="column"
          rowGap="0.5rem"
          overflowY="auto"
          flex="1"
          paddingRight="0.5rem"
          paddingBottom={"1rem"}
        >
          {state.users.map((user, index) => (
            <Flex key={index} columnGap={"0.5rem"} alignItems={"center"}>
              <Box
                bgColor={user.isOnline ? "green.500" : "red.500"}
                borderRadius={"100%"}
                width={"10px"}
                height={"10px"}
              />
              <Text>{user.username}</Text>
            </Flex>
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
          {state.rooms.map((room, index) => (
            <RoomButton room={room} key={index} />
          ))}
        </Flex>
      </Grid>
    </Grid>
  );
};
