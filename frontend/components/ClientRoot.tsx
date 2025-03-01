"use client";
import React, { useEffect } from "react";
import { ChatArea } from "@/components/ui/ChatArea";
import { ChatForm } from "@/components/ui/ChatForm";
import { ChatNavBar } from "@/components/ui/ChatNavBar";
import { OnlineUsersAndRooms } from "@/components/ui/OnlineUsersAndRooms";
import { TopNavBar } from "@/components/ui/TopNavBar";
import { Grid, Box } from "@chakra-ui/react";
import { Providers } from "./ui/provider";
import { Profile, useStateContext } from "./state/StateProvider";
import { ServerToClientStateInit } from "./state/ServerToClientStateInit";

interface Props {
  isAuthenticated: boolean;
  profile: Profile;
}

export const ClientRoot = ({ ...props }: Props) => {
  const layoutHeight = "calc(100vh - 60px - 3rem)";

  return (
    <Providers>
      <ServerToClientStateInit {...props} />
      <Grid
        height="100vh"
        rowGap="1rem"
        padding="1rem"
        gridTemplateRows="60px 1fr"
      >
        <TopNavBar drawerChildren={<OnlineUsersAndRooms height="100%" />} />
        <Grid
          columnGap="1rem"
          gridTemplateColumns={{
            base: "1fr",
            md: "400px 1fr",
          }}
        >
          <Box display={{ base: "none", md: "block" }}>
            <OnlineUsersAndRooms height={layoutHeight} />
          </Box>

          <Grid
            border="2px solid"
            borderRadius="1rem"
            gridTemplateRows="100px 1fr 100px"
            height={layoutHeight}
            overflow="hidden"
          >
            <ChatNavBar />
            <ChatArea overflowY="auto" />
            <ChatForm alignSelf="center" paddingX="2rem" />
          </Grid>
        </Grid>
      </Grid>
    </Providers>
  );
};
