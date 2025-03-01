import {
  DrawerRoot,
  DrawerContent,
  DrawerBody,
  DrawerHeader,
  DrawerCloseTrigger,
  DrawerBackdrop,
} from "@/components/ui/drawer";
import { HamburgerIcon } from "@/components/ui/Icons";
import { IconButton } from "@chakra-ui/react";

type Props = {
  open: boolean;
  setOpen: (state: boolean) => void;
  isMobile: boolean;
  children: React.ReactNode;
};

export const LayoutDrawer = ({ open, setOpen, isMobile, children }: Props) => (
  <DrawerRoot
    open={open}
    onOpenChange={(state) => {
      setOpen(!state);
    }}
  >
    {isMobile && (
      <IconButton
        variant={"outline"}
        aria-label="Open sidebar"
        onClick={() => setOpen(true)}
      >
        <HamburgerIcon width="40px" />
      </IconButton>
    )}

    <DrawerBackdrop />
    <DrawerContent>
      <DrawerHeader>
        <DrawerCloseTrigger />
      </DrawerHeader>
      <DrawerBody>{children}</DrawerBody>
    </DrawerContent>
  </DrawerRoot>
);
