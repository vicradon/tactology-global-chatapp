import { Box, Button, Flex, Grid, HStack, Input, Text, VStack } from "@chakra-ui/react";

import {
  DialogRoot,
  DialogTrigger,
  DialogContent,
  DialogCloseTrigger,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useFetchMutation } from "@/network/fetch";
import { toaster } from "@/components/ui/toaster";
import { useStateContext } from "../state/StateProvider";
import { disconnectSocket, getSocket } from "@/network/socket";

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AuthDialog({ open, onClose }: AuthDialogProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const { dispatch } = useStateContext();
  const [formState, setFormState] = useState({
    username: "",
    password: "",
  });

  const { mutate: triggerLogin, loading: isLoginLoading, error: loginError } = useFetchMutation("/auth/login");

  const {
    mutate: triggerRegister,
    loading: isRegisterLoading,
    error: registerError,
  } = useFetchMutation("/auth/register");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trigger = mode === "login" ? triggerLogin : triggerRegister;

    try {
      const response = await trigger(formState);
      const user = response?.data?.user;

      dispatch({
        type: "UPDATE_AUTH_STATE",
        payload: true,
      });

      dispatch({
        type: "UPDATE_PROFILE",
        payload: user,
      });

      const socket = getSocket();
      socket?.connect();

      toaster.success({
        title: "Success",
        description: mode === "login" ? "Logged in successfully!" : "Registered successfully!",
      });

      onClose();
    } catch (error) {
      toaster.error({
        title: "Authentication Error",
        description: (error as Error).message || "Something went wrong.",
      });
    }
  };

  return (
    <DialogRoot open={open} onOpenChange={onClose}>
      <DialogContent onSubmit={handleSubmit} as={"form"}>
        <DialogHeader>
          <DialogTitle>{mode === "login" ? "Sign In" : "Sign Up"}</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody>
          <VStack gap={4} align="stretch">
            <Input
              name="username"
              value={formState.username}
              onChange={handleInputChange}
              placeholder="Username e.g. BugsBunny"
              type="text"
            />
            <Input
              name="password"
              value={formState.password}
              onChange={handleInputChange}
              placeholder="Password"
              type="password"
            />
          </VStack>
        </DialogBody>

        <DialogFooter>
          <Grid width="100%" rowGap="0.5rem">
            <Button type="submit" colorScheme="blue" w="full" loading={isLoginLoading || isRegisterLoading}>
              {mode === "login" ? "Login" : "Register"}
            </Button>
            <Flex justifyContent="space-between" alignItems="center">
              <Text fontSize="sm">{mode === "login" ? "Don't have an account?" : "Already have an account?"}</Text>
              <Button
                size="sm"
                variant="plain"
                colorScheme="blue"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
              >
                {mode === "login" ? "Sign Up" : "Sign In"}
              </Button>
            </Flex>
          </Grid>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

export function SigninButton() {
  const [isDialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button variant={"outline"} border={"2px solid"} onClick={() => setDialogOpen(true)}>
        Sign In
      </Button>
      <AuthDialog open={isDialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}

export const LogoutButton = () => {
  const { mutate, loading, error } = useFetchMutation("/auth/logout");
  const { dispatch } = useStateContext();

  const handleLogout = async () => {
    try {
      await mutate();

      dispatch({
        type: "RESET_STATE",
      });

      disconnectSocket();

      toaster.success({
        title: "Logout successfully",
      });
    } catch (error) {
      toaster.error({
        title: "Authentication Error",
        description: (error as Error).message || "Something went wrong.",
      });
    }
  };

  return (
    <Button loading={loading} border={"1px solid"} borderRadius={"1rem"} variant={"outline"} onClick={handleLogout}>
      Logout
    </Button>
  );
};
