"use client";

import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { ThemeProvider } from "next-themes";
import { StateProvider } from "../state/StateProvider";
import { Toaster } from "./toaster";
import { ColorModeProvider } from "./color-mode";

export function Providers(props: { children: React.ReactNode }) {
  return (
    <ChakraProvider value={defaultSystem}>
      <ColorModeProvider>
        <ThemeProvider attribute="class" disableTransitionOnChange>
          <StateProvider>{props.children}</StateProvider>
          <Toaster />
        </ThemeProvider>
      </ColorModeProvider>
    </ChakraProvider>
  );
}
