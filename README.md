# DaChatApp

This is a fullstack chat app built using Next.js and Nest.js (feels like a cool combo). It uses websockets for real-time updates and GraphQL for data fetching. 

Deployed Frontend: https://dachatapp.vercel.app/ \
Deployed Backend: https://dachatapp.onrender.com

## Events

1. `availableRooms` - client fires this event to fetch a list of available rooms. It takes an empty request body. Server responds on the same event name, a list of available rooms.
1. `joinRoom` - client fires this event to join a room
1. `leaveRoom` - client fires this event to leave a room
1. `messageRoom` - client fires this event to send a message to a room
1. `roomMessageHistory` - server fires this event when a user joins a room. It returns last 50 messages. The client can also fire this event to get the last 50 messages from the room.
1. `newRoomMessage` - server fires this event when a new message enters a room
1. `notification` - server fires this event for notifications on user triggered activities such as failed attempts to join or leave a room

## Events Request and Response

### availableRooms

Request - {}
Response

```json
   {
    "data": [
        {
            "id": "a0020def-9f63-4e7b-b5a4-f6d2dd1d1d74",
            "name": "General",
            "created_by_id": 1,
            "createdAt": "2025-02-28T13:59:03.754Z",
            "meta": {
                "isGeneral": true
            },
            "created_by": {
                "id": 1,
                "username": "system",
                "role": "system"
            }
        },
        {
            "id": "0416dae3-0636-42b8-b968-f5d68e00f8ce",
            "name": "Anime",
            "created_by_id": 1,
            "createdAt": "2025-02-28T13:59:03.757Z",
            "meta": {},
            "created_by": {
                "id": 1,
                "username": "system",
                "role": "system"
            }
        },
        {
            "id": "d41302fb-559d-483d-9403-a2d5d696335e",
            "name": "Video Games",
            "created_by_id": 1,
            "createdAt": "2025-02-28T13:59:03.763Z",
            "meta": {},
            "created_by": {
                "id": 1,
                "username": "system",
                "role": "system"
            }
        }
    ]
}
```

### roomMessageHistory

- Request: { roomId: "<ROOM-UUID>" }
- Response

```json
[
    {
        "id": "5738f778-9d56-46a1-9dae-8b265be4f256",
        "text": "guy was added",
        "messageType": "system",
        "timestamp": "2025-02-28T13:59:03.786Z",
        "updatedAt": "2025-02-28T13:59:03.786Z",
        "sender": "system"
    },
    {
        "id": "3fa4831b-90f4-41a2-bc73-6a9bf6b09744",
        "text": "fawks was added",
        "messageType": "system",
        "timestamp": "2025-02-28T13:59:03.798Z",
        "updatedAt": "2025-02-28T13:59:03.798Z",
        "sender": "system"
    }
]
```

### joinRoom

- Request: { roomId: "<ROOM-UUID>" }
- Response
  - to user: notification
  ```json
  {
    "text": "You joined Anime",
    "sender": "system",
    "messageType": "system",
    "timestamp": 1740757678980
  }
  ```

  - to users in room
  ```json
  {
    "text": "fawks joined",
    "sender": "system",
    "messageType": "system",
    "timestamp": 1740757754353
  }
  ```

### leaveRoom

- Request: { roomId: "<ROOM-UUID>" }
- Response
  - to user: notification
  ```json
  {
    "text": "You left Anime",
    "sender": "system",
    "messageType": "system",
    "timestamp": 1740757678980
  }
  ```

  - to users in room
  ```json
  {
    "text": "guy left",
    "sender": "system",
    "messageType": "system",
    "timestamp": 1740757754353
  }
  ```

### messageRoom

- Request: { roomId: "<ROOM-UUID>", text: "Eren Yaeger was a villian" }
- Response:
  ```json
  {
    "sender": "guy",
    "timestamp": "2025-02-28T15:53:18.418Z",
    "text": "Eren Yaeger was a villian"
  }
  ```

### newRoomMessage (server sent to room case)

- Request: N/A
- Response:
  ```json
  {
    "sender": "guy",
    "timestamp": "2025-02-28T15:53:18.418Z",
    "text": "Eren Yaeger was a villian"
  }
  ```

### notification

- Request: one of join room, leave room, etc
- Response
  ```json
  {
    "text": "You left Anime",
    "sender": "system",
    "messageType": "system",
    "timestamp": 1740757801082
  }
  ```

## Seeded Entries

### Users

Three users are seeded initially on the app

1. A system user with username: system (cannot be used to login)
2. A regular user with username: guy - password: the-guy
3. Another regular user with username: fawks - password: the-fawks

### Rooms

Three rooms are seeded initailly:

1. A room with name: "General"
2. Another room with name: "Anime"
3. A third room with name: "Video Games"

The three users are added to the General room while the other two rooms are available to join. No user can leave the General room as this room is designed to be a starting point for the application

## Running the App

To run the application, you must have Node.js (version 18 or higher), pnpm, and PostgreSQL installed. After cloning the code from Github, navigate to the backend directory and run the setup commands:

```sh
pnpm install
cp .env.example .env
pnpm start:dev
```

For the database setup, you can simply create a PostgreSQL database, then populate the database related entries in the .env file. For convinience, you can use [this script](https://gist.githubusercontent.com/vicradon/0d15031d236181122611c3ce1a29c687/raw/931722d6cab5e15c347d128444d0516c33010eae/pg-db-and-user-setup.sh) on Linux or MacOS to set up the database and its user.

The .env specifies the app to run on PORT 3500. You can change this port to suite your requirements.

### Frontend

The frontend is currently implemented in Vanilla HTML + JavaScript. You can run it by simply serving the files in the vanilla-frontend directory.

## Auth Considerations

The app supports Bearer token and cookie auth. The Bearer token contains a JWT, mapped as `Bearer ey...`. For cookie-based auth, a signed, http-only, secure cookie is sent. Both the plain token and cookie are set to expire after 3600 seconds. The token support was included for convinience as a cookie-based solution offers a more seamless flow because the browser will delete expired cookies, and the cookie being cryptographically signed means the server can verify if it was tampered with in transmission.

### CORS

WebSocket technology is designed to adapt to existing web security standards, which means you can use CORS. CORS is implemented with a requirement to set allowed orgins and allows credentials (to support cookies). You can include the allowed origins as an environment variable in the `ALLOWED_ORIGINS='["http://localhost:3200"]'` field.
