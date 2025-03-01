import { Box, Flex, Grid, Heading, Text } from "@chakra-ui/react";
import { RoomButton } from "./RoomButton";

export const OnlineUsersAndRooms = ({ ...props }) => {
  return (
    <Grid
      gridTemplateRows="1fr 1fr"
      rowGap="2rem"
      borderRadius="1rem"
      border="2px solid black"
      padding="1rem"
      height="400px"
      {...props}
    >
      <Grid gridTemplateRows="50px 1fr" overflow="hidden">
        <Heading>Online Users</Heading>
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
