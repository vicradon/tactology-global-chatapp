import { Button, HStack, Input, Text, VStack } from "@chakra-ui/react";

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

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AuthDialog({ open, onClose }: AuthDialogProps) {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <DialogRoot open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "login" ? "Sign In" : "Sign Up"}</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody>
          <VStack gap={4} align="stretch">
            {mode === "register" && <Input placeholder="Full Name" />}
            <Input placeholder="Email" type="email" />
            <Input placeholder="Password" type="password" />
          </VStack>
        </DialogBody>

        <DialogFooter>
          <VStack w="full">
            <Button colorScheme="blue" w="full">
              {mode === "login" ? "Login" : "Register"}
            </Button>
            <HStack gap={2}>
              <Text fontSize="sm">
                {mode === "login"
                  ? "Don't have an account?"
                  : "Already have an account?"}
              </Text>
              <Button
                size="sm"
                variant="solid"
                colorScheme="blue"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
              >
                {mode === "login" ? "Sign Up" : "Sign In"}
              </Button>
            </HStack>
          </VStack>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

export function SigninButton() {
  const [isDialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button
        variant={"outline"}
        border={"2px solid black"}
        onClick={() => setDialogOpen(true)}
      >
        Sign In
      </Button>
      <AuthDialog open={isDialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}

export const LogoutButton = () => {
  const handleLogout = () => {
    window.location.reload();
  };
  return (
    <Button
      border={"1px solid black"}
      borderRadius={"1rem"}
      variant={"outline"}
      onClick={handleLogout}
    >
      Logout
    </Button>
  );
};
