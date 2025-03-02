import { createContext, useReducer, Dispatch, useContext, useMemo } from "react";

// Define types first to avoid mismatch
export type User = {
  id: number;
  username: string;
  isOnline?: boolean;
};

export type Room = {
  id: string;
  name: string;
  isMember?: boolean;
};

export enum MessageTypes {
  System = "system",
  User = "user",
}
export type Message = {
  id: string;
  sender: {
    username: string;
  };
  messageType: MessageTypes;
  text: string;
  timestamp: number;
  room?: Room;
  roomId?: string;
};

export type Profile = {
  id: number;
  username: string;
  role: string;
};

// Define the state type explicitly
type AppState = {
  isAuthenticated: boolean;
  isSocketConnected: boolean;
  profile: Profile;
  roomMessages?: {
    [roomId: string]: Message[];
  };
  activeRoom?: Room;
  rooms: Room[];
  users: User[];
  isConnected: boolean;
};

const initialState: AppState = {
  isAuthenticated: false,
  isSocketConnected: false,
  profile: {
    username: "",
    role: "user",
    id: 0,
  },
  activeRoom: undefined,
  rooms: [],
  roomMessages: undefined,
  users: [],
  isConnected: true,
};

type ACTIONTYPE =
  | { type: "UPDATE_AUTH_STATE"; payload: boolean }
  | { type: "UPDATE_PROFILE"; payload: Profile }
  | { type: "SET_IS_SOCKET_CONNECTED"; payload: boolean }
  | { type: "RESET_STATE"; payload?: null }
  | { type: "ADD_ROOM_MESSAGE"; payload: Message }
  | { type: "UPDATE_ROOM_MESSAGES"; payload: { messages: Message[]; roomId: string } }
  | { type: "DELETE_MESSAGE"; payload: string }
  | { type: "CHANGE_ROOM"; payload: Room }
  | { type: "ADD_ROOM"; payload: Room }
  | { type: "DELETE_ROOM"; payload: string }
  | { type: "UPDATE_ROOMS"; payload: Room[] }
  | { type: "UPDATE_USERS"; payload: User[] }
  | { type: "SET_CONNECTION_STATUS"; payload: boolean }
  | { type: "CLEAR_ROOM_MESSAGES"; payload: string }
  | { type: "SET_USER_STATUS"; payload: { userId: number; status: string } };

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
      case "UPDATE_AUTH_STATE":
        return {
          ...state,
          isAuthenticated: action.payload,
        };
      case "UPDATE_PROFILE":
        return {
          ...state,
          profile: action.payload,
        };
      case "SET_IS_SOCKET_CONNECTED":
        return {
          ...state,
          isSocketConnected: action.payload,
        };
      case "RESET_STATE":
        return {
          ...state,
          ...initialState,
        };

      case "ADD_ROOM_MESSAGE":
        if (action.payload.room) {
          const roomId = action.payload.room.id;
          const roomMessages = state.roomMessages?.[roomId];
          roomMessages?.push(action.payload);

          if (roomId && roomMessages) {
            return {
              ...state,
              roomMessages: {
                ...state.roomMessages,
                [roomId]: roomMessages,
              },
            };
          }
        }
        return state;

      case "UPDATE_ROOM_MESSAGES":
        if (action.payload.roomId)
          return {
            ...state,
            roomMessages: {
              ...state.roomMessages,
              [action.payload.roomId]: action.payload.messages,
            },
          };
        return state;

      case "CHANGE_ROOM":
        if (action.payload) {
          return {
            ...state,
            activeRoom: action.payload,
          };
        }
        return state;

      case "ADD_ROOM":
        return {
          ...state,
          rooms: [...state.rooms, action.payload],
        };

      case "UPDATE_ROOMS":
        const updatedActiveRoom: Room | undefined = action.payload.find((room) => state.activeRoom?.id === room.id);
        return {
          ...state,
          activeRoom: updatedActiveRoom || state.activeRoom,
          rooms: action.payload,
        };

      case "UPDATE_USERS":
        return {
          ...state,
          users: action.payload.filter((user) => user.username !== "system"),
        };

      case "SET_CONNECTION_STATUS":
        return {
          ...state,
          isConnected: action.payload,
        };

      case "SET_USER_STATUS":
        return {
          ...state,
          users: state.users.map((user) =>
            user.id === action.payload.userId ? { ...user, status: action.payload.status } : user
          ),
        };

      default:
        throw new Error("Unknown action type");
    }
  };

  const [state, dispatch] = useReducer(reducer, initialState);
  const memoizedcontext = useMemo(() => ({ state, dispatch }), [state]);

  return <StateContext.Provider value={memoizedcontext}>{children}</StateContext.Provider>;
};

export const useStateContext = () => {
  const context = useContext(StateContext);
  if (context === undefined) {
    throw new Error("useStateContext must be used within a StateProvider");
  }
  return context;
};
