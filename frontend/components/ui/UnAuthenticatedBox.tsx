import { Box, Flex, Text } from "@chakra-ui/react";

export const UnAuthenticatedBox = ({ viewName }: { viewName?: string }) => {
  if (!viewName) return <Box></Box>;
  return (
    <Flex justifyContent={"center"} alignItems={"center"}>
      <Text>Sign in to see {viewName} </Text>
    </Flex>
  );
};
