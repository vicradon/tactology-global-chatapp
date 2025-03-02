import { Button } from "@chakra-ui/react";
import { Room, useStateContext } from "../state/StateProvider";
import { getSocket } from "@/network/socket";

export const RoomButton = ({ room }: { room?: Room }) => {
  const { state, dispatch } = useStateContext();

  const switchToRoom = async () => {
    // approaches to solving this proble
    /**
     * 1. keep the state on the server so that when a user switches to a room, we fetch new messages they havane't seen
     * 2. Keep the state on the client and only fetch messages by timestamp
     * 2. In case 2, we send the last timestamp to the server and the server fetches the last 50 messages from the latest
     * 2. We maintain messages and rooms like an LRU cache. The rooms with the most recent messages are preserved in memeory.
     * most recent messages in rooms (top 50) are also preserved in memory
     *
     *
     * Easy solution right now is to fetch top 50 anytime we switch to a room
     */

    if (room) {
      const socket = getSocket();
      socket?.emit("switchToRoom", {
        roomId: room.id,
      });

      dispatch({
        type: "CHANGE_ROOM",
        payload: room,
      });

      localStorage.setItem("activeRoom", JSON.stringify(room));
    }
  };

  return (
    <Button
      bgColor={state.activeRoom?.id === room?.id ? "green.300" : ""}
      _dark={{ bg: state.activeRoom?.id === room?.id ? "green.700" : "" }}
      onClick={switchToRoom}
      type="button"
      variant={"outline"}
      border="1px solid"
    >
      {room?.name || "Generic Room"}
    </Button>
  );
};
