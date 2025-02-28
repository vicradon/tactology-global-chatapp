# Tactology Global Full-Stack Engineer Assessment

Assessment for the full-stack engineer role at Tactology Global. It consists of frontend and backend components of a chat application.

Deployed Frontend: https://dachatapp.vercel.app/
Deployed Backend: https://dachatapp.onrender.com

## Events

1. `getRooms` - client fires this event to fetch a list of available rooms
1. `joinRoom` - client fires this event to join a room
1. `leaveRoom` - client fires this event to leave a room
1. `messageRoom` - client fires this event to send a message to a room
1. `previousRoomMessage` - server fires this event when a user joins a room to return the last 50 messages
1. `newRoomMessage` - server fires this event when a new message enters a room
1. `notification` - server fires this event for notifications on user triggered activities such as failed attempts to join or leave a room

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
