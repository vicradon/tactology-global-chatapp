import { Box, Button, Flex, Text, useBreakpointValue } from "@chakra-ui/react";
import { ColorModeButton } from "./color-mode";
import { LayoutDrawer } from "./LayoutDrawer";
import React, { useState } from "react";
import { useStateContext } from "../state/StateProvider";
import { SigninButton, LogoutButton } from "./AuthComponents";

type Props = {
  drawerChildren: React.ReactNode;
};

export const TopNavBar = ({ drawerChildren }: Props) => {
  const [open, setOpen] = useState(false);
  const isMobile = useBreakpointValue({ base: true, md: false });
  const { state } = useStateContext();

  return (
    <Flex
      border={"2px solid black"}
      justifyContent={"space-between"}
      alignItems={"center"}
      as="nav"
      padding="1rem"
      borderRadius={"1rem"}
    >
      <Flex columnGap={"1rem"} alignItems={"center"}>
        <LayoutDrawer
          isMobile={isMobile || false}
          open={open}
          setOpen={setOpen}
        >
          {drawerChildren}
        </LayoutDrawer>
        {state.isAuthenticated ? (
          <Text>Signed in as: Osi</Text>
        ) : (
          <Text>Not signed in</Text>
        )}
      </Flex>

      <Flex alignItems={"center"} columnGap={"1rem"}>
        {state.isAuthenticated ? <LogoutButton /> : <SigninButton />}
        <ColorModeButton />
      </Flex>
    </Flex>
  );
};
