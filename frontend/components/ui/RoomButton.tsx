import { Button } from "@chakra-ui/react";
import { Room } from "../state/StateProvider";

export const RoomButton = ({ room }: { room: Room }) => {
  return (
    <Button type="button" variant={"outline"} border="1px solid">
      {room.name}
    </Button>
  );
};
