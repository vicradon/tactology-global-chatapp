"use client";

import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { ThemeProvider } from "next-themes";
import { StateProvider } from "../state/StateProvider";
import { Toaster } from "./toaster";
import { ColorModeProvider } from "./color-mode";
import { ApolloProvider } from "@apollo/client";
import apolloClient from "../network/apollo-client";

export function Providers(props: { children: React.ReactNode }) {
  return (
    <ChakraProvider value={defaultSystem}>
      <ColorModeProvider>
        <ThemeProvider attribute="class" disableTransitionOnChange>
          <ApolloProvider client={apolloClient}>
            <StateProvider>{props.children}</StateProvider>
            <Toaster />
          </ApolloProvider>
        </ThemeProvider>
      </ColorModeProvider>
    </ChakraProvider>
  );
}
