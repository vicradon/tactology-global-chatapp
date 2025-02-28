import { createContext, useReducer, Dispatch, useContext } from "react";

// Define types first to avoid mismatch
type User = {
  id: string;
  name: string;
  status: string; // Making status required to match initialState
};

type Room = {
  id: string;
  name: string;
};

type Message = {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  roomId: string;
};

// Define the state type explicitly
type AppState = {
  activeRoom: Room;
  rooms: Room[];
  messages: Message[];
  onlineUsers: User[];
  isConnected: boolean;
  currentUser: {
    id: string;
    name: string;
  };
};

const initialState: AppState = {
  activeRoom: {
    name: "General",
    id: "room-1",
  },
  rooms: [
    { id: "room-1", name: "General" },
    { id: "room-2", name: "Random" },
  ],
  messages: [
    {
      id: "38902487udj98983",
      sender: "Osi",
      text: "What's good guys",
      timestamp: Date.now() - 3600000, // 1 hour ago
      roomId: "room-1",
    },
    {
      id: "38902487udj98934",
      sender: "Vicradon",
      text: "Mehn, nothing much",
      timestamp: Date.now() - 3590000, // 59 minutes 50 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj9893980",
      sender: "Sophia",
      text: "I'm going Hiking",
      timestamp: Date.now() - 3580000, // 59 minutes 40 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389d3",
      sender: "Vicradon",
      text: "That's cool Sophia",
      timestamp: Date.now() - 3570000, // 59 minutes 30 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389d4",
      sender: "Osi",
      text: "Where are you hiking?",
      timestamp: Date.now() - 3500000, // 58 minutes 20 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389d5",
      sender: "Sophia",
      text: "Going to Blue Mountain Trail, it's about an hour from here",
      timestamp: Date.now() - 3450000, // 57 minutes 30 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389d6",
      sender: "Vicradon",
      text: "Nice! I've been wanting to check that place out",
      timestamp: Date.now() - 3400000, // 56 minutes 40 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389d7",
      sender: "Sophia",
      text: "You should join next time! The views are amazing",
      timestamp: Date.now() - 3350000, // 55 minutes 50 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389d8",
      sender: "Osi",
      text: "Anyone want to grab lunch later this week?",
      timestamp: Date.now() - 3000000, // 50 minutes ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389d9",
      sender: "Vicradon",
      text: "I'm down for Thursday or Friday",
      timestamp: Date.now() - 2950000, // 49 minutes 10 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389e1",
      sender: "Sophia",
      text: "Thursday works for me. Where are we thinking?",
      timestamp: Date.now() - 2900000, // 48 minutes 20 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389e2",
      sender: "Osi",
      text: "How about that new ramen place downtown?",
      timestamp: Date.now() - 2850000, // 47 minutes 30 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389e3",
      sender: "Vicradon",
      text: "Ohhh yes! I've heard great things about it",
      timestamp: Date.now() - 2800000, // 46 minutes 40 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389e4",
      sender: "Sophia",
      text: "Perfect! Let's do Thursday at 1pm?",
      timestamp: Date.now() - 2000000, // 33 minutes 20 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389e5",
      sender: "Osi",
      text: "Works for me 👍",
      timestamp: Date.now() - 1950000, // 32 minutes 30 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389e6",
      sender: "Vicradon",
      text: "Put it on the calendar! 🍜",
      timestamp: Date.now() - 1900000, // 31 minutes 40 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389e7",
      sender: "Sophia",
      text: "Hey, has anyone started on the project due next week?",
      timestamp: Date.now() - 1000000, // 16 minutes 40 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389e8",
      sender: "Osi",
      text: "I've done the research part but still working on implementation",
      timestamp: Date.now() - 950000, // 15 minutes 50 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389e9",
      sender: "Vicradon",
      text: "I can help with the UI part if anyone needs assistance",
      timestamp: Date.now() - 900000, // 15 minutes ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389f1",
      sender: "Sophia",
      text: "That would be great! I'm struggling with the responsive design",
      timestamp: Date.now() - 850000, // 14 minutes 10 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389f2",
      sender: "Vicradon",
      text: "No problem, I can send you some code snippets. Let's meet tomorrow to go through it?",
      timestamp: Date.now() - 800000, // 13 minutes 20 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389f3",
      sender: "Sophia",
      text: "Perfect! 10am in the library?",
      timestamp: Date.now() - 750000, // 12 minutes 30 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389f4",
      sender: "Vicradon",
      text: "Works for me!",
      timestamp: Date.now() - 700000, // 11 minutes 40 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389f5",
      sender: "Osi",
      text: "Can I join too? Could use some help with the frontend",
      timestamp: Date.now() - 650000, // 10 minutes 50 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389f6",
      sender: "Vicradon",
      text: "Of course! The more the merrier",
      timestamp: Date.now() - 600000, // 10 minutes ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389f7",
      sender: "Sophia",
      text: "Btw, did anyone see that new movie that came out last weekend?",
      timestamp: Date.now() - 300000, // 5 minutes ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389f8",
      sender: "Osi",
      text: "Which one? The sci-fi one or the thriller?",
      timestamp: Date.now() - 250000, // 4 minutes 10 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389f9",
      sender: "Sophia",
      text: "The sci-fi one! With the time travel plot",
      timestamp: Date.now() - 200000, // 3 minutes 20 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389g1",
      sender: "Vicradon",
      text: "I saw it! The ending was mind-blowing 🤯",
      timestamp: Date.now() - 150000, // 2 minutes 30 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389g2",
      sender: "Sophia",
      text: "I know right?! When they revealed the main character was actually...",
      timestamp: Date.now() - 100000, // 1 minute 40 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389g3",
      sender: "Osi",
      text: "No spoilers please! I'm planning to see it this weekend",
      timestamp: Date.now() - 50000, // 50 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389g4",
      sender: "Sophia",
      text: "Sorry! You're going to love it though",
      timestamp: Date.now() - 30000, // 30 seconds ago
      roomId: "room-1",
    },
    {
      id: "38902487udj92389g5",
      sender: "Vicradon",
      text: "Let's all go see the sequel when it comes out next month!",
      timestamp: Date.now() - 10000, // 10 seconds ago
      roomId: "room-1",
    },
  ],
  onlineUsers: [
    { id: "user-1", name: "Osi", status: "online" },
    { id: "user-2", name: "Vicradon", status: "online" },
    { id: "user-3", name: "Sophia", status: "away" },
  ],
  isConnected: true,
  currentUser: { id: "user-2", name: "Vicradon" },
};

type ACTIONTYPE =
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "UPDATE_MESSAGES"; payload: Message[] }
  | { type: "DELETE_MESSAGE"; payload: string }
  | { type: "CHANGE_ROOM"; payload: Room }
  | { type: "ADD_ROOM"; payload: Room }
  | { type: "DELETE_ROOM"; payload: string }
  | { type: "UPDATE_ROOMS"; payload: Room[] }
  | { type: "UPDATE_ONLINE_USERS"; payload: User[] }
  | { type: "SET_CONNECTION_STATUS"; payload: boolean }
  | { type: "CLEAR_ROOM_MESSAGES"; payload: string }
  | { type: "SET_USER_STATUS"; payload: { userId: string; status: string } };

type StateContextType = {
  state: AppState;
  dispatch: Dispatch<ACTIONTYPE>;
};

const StateContext = createContext<StateContextType>({
  state: initialState,
  dispatch: () => null,
});

type Props = {
  children: React.ReactNode;
};

export const StateProvider = ({ children }: Props) => {
  const reducer = (state: AppState, action: ACTIONTYPE): AppState => {
    switch (action.type) {
      case "ADD_MESSAGE":
        return {
          ...state,
          messages: [...state.messages, action.payload],
        };

      case "UPDATE_MESSAGES":
        return {
          ...state,
          messages: action.payload,
        };

      case "DELETE_MESSAGE":
        return {
          ...state,
          messages: state.messages.filter(
            (message) => message.id !== action.payload
          ),
        };

      case "CHANGE_ROOM":
        return {
          ...state,
          activeRoom: action.payload,
        };

      case "ADD_ROOM":
        return {
          ...state,
          rooms: [...state.rooms, action.payload],
        };

      case "DELETE_ROOM":
        return {
          ...state,
          rooms: state.rooms.filter((room) => room.id !== action.payload),
          messages: state.messages.filter(
            (message) => message.roomId !== action.payload
          ),
          activeRoom:
            state.activeRoom.id === action.payload
              ? state.rooms.find((room) => room.id !== action.payload) ||
                state.activeRoom
              : state.activeRoom,
        };

      case "UPDATE_ROOMS":
        return {
          ...state,
          rooms: action.payload,
        };

      case "UPDATE_ONLINE_USERS":
        return {
          ...state,
          onlineUsers: action.payload,
        };

      case "SET_CONNECTION_STATUS":
        return {
          ...state,
          isConnected: action.payload,
        };

      case "CLEAR_ROOM_MESSAGES":
        return {
          ...state,
          messages: state.messages.filter(
            (message) => message.roomId !== action.payload
          ),
        };

      case "SET_USER_STATUS":
        return {
          ...state,
          onlineUsers: state.onlineUsers.map((user) =>
            user.id === action.payload.userId
              ? { ...user, status: action.payload.status }
              : user
          ),
        };

      default:
        throw new Error("Unknown action type");
    }
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <StateContext.Provider value={{ state, dispatch }}>
      {children}
    </StateContext.Provider>
  );
};

export const useStateContext = () => {
  const context = useContext(StateContext);
  if (context === undefined) {
    throw new Error("useStateContext must be used within a StateProvider");
  }
  return context;
};
