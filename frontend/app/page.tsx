"use client";
import { ChatArea } from "@/components/ui/ChatArea";
import { ChatForm } from "@/components/ui/ChatForm";
import { ChatNavBar } from "@/components/ui/ChatNavBar";
import { OnlineUsersAndRooms } from "@/components/ui/OnlineUsersAndRooms";
import { TopNavBar } from "@/components/ui/TopNavBar";
import { Grid } from "@chakra-ui/react";

export default function Home() {
  const layoutHeight = "calc(100vh - 60px - 3rem)";
  return (
    <div>
      <main>
        <Grid
          height={"100vh"}
          rowGap="1rem"
          padding="1rem"
          gridTemplateRows={"60px 1fr"}
        >
          <TopNavBar />
          <Grid columnGap={"1rem"} gridTemplateColumns={"400px 1fr"}>
            <OnlineUsersAndRooms height={layoutHeight} />
            <Grid
              border={"2px solid black"}
              borderRadius={"1rem"}
              gridTemplateRows={"100px 1fr 100px"}
              height={layoutHeight}
              overflow={"hidden"}
            >
              <ChatNavBar />
              <ChatArea overflowY="auto" />
              <ChatForm alignSelf={"center"} paddingX="2rem" />
            </Grid>
          </Grid>
        </Grid>
      </main>
    </div>
  );
}
