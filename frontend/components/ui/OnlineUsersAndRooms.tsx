import { Box, Flex, Grid, Heading, Text } from "@chakra-ui/react";
import { RoomButton } from "./RoomButton";

export const OnlineUsersAndRooms = ({ ...props }) => {
  return (
    <Grid
      gridTemplateRows={"1fr 1fr"}
      borderRadius={"1rem"}
      border="2px solid black"
      padding="1rem"
      {...props}
    >
      <Box>
        <Heading>Online Users</Heading>
        <Text>Vicradon</Text>
        <Text>Guy</Text>
        <Text>Sophia</Text>
      </Box>

      <Box>
        <Heading>Rooms</Heading>

        <Flex flexDirection={"column"} rowGap={"1rem"}>
          <RoomButton />
          <RoomButton />
          <RoomButton />
        </Flex>
      </Box>
    </Grid>
  );
};
