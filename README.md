# WallChat 💬

WallChat is a real-time, peer-to-peer video chat app. No accounts, no profiles — just instant conversations. Meet a random stranger, or connect directly with a friend using their socket ID, then talk over live video, audio, and text.

The project has two parts, in two repos:

| Repo | Role | Stack |
|---|---|---|
| [`wallChat-client`](https://github.com/nitish100000100-found/wallChat-client) | The frontend web app users open in their browser | React 19, Vite, Socket.IO Client, WebRTC |
| [`wallChat-server`](https://github.com/nitish100000100-found/wallChat-server) | The signaling server that matches users and relays the WebRTC handshake | Node.js, Express, Socket.IO |

Video and audio never pass through the server — once two browsers are matched, media streams directly **peer-to-peer** over WebRTC. The server's only job is introductions: matching people up and relaying the offer/answer/ICE messages needed to set up that direct connection.

## Features

- 🔀 **Random matching** — get paired instantly with another online user
- 👥 **Personal rooms** — connect directly to a specific person using their socket ID
- 🎥 **Live video & audio** — peer-to-peer via WebRTC
- 💬 **In-call text chat** — send messages alongside your video call
- 🔇 **Mute / camera toggle** — control your own audio/video, with live status of the other participant
- ⚡ **No sign-up required** — jump straight into a conversation

## How It All Fits Together

```
┌────────────────────┐        Socket.IO (signaling)        ┌────────────────────┐
│   Browser A          │ ───────────────────────────────────▶ │   wallChat-server    │
│   (wallChat-client)  │ ◀─────────────────────────────────── │   (Express + Socket) │
└──────────┬───────────┘                                      └──────────┬───────────┘
           │                                                              │
           │                  matched / offer / answer /                 │
           │                  ice-candidate relayed via server            │
           │                                                              │
           ▼                                                              ▼
┌────────────────────┐         WebRTC (direct P2P media)       ┌────────────────────┐
│   Browser A video     │ ═══════════════════════════════════▶ │   Browser B video     │
│   & audio stream      │ ◀═══════════════════════════════════ │   & audio stream      │
└────────────────────┘                                        └────────────────────┘
```

1. Both browsers connect to the **server** over a Socket.IO WebSocket connection.
2. The server either pairs two random waiting users, or connects two users directly by socket ID (personal room).
3. The two browsers exchange a WebRTC `offer`, `answer`, and `ice-candidate`s — the server just relays these messages, it doesn't inspect or store them.
4. Once the WebRTC handshake completes, video/audio flows **directly between the two browsers**, bypassing the server entirely. Text chat messages continue to be relayed through the server.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or higher
- npm
- A browser with camera/microphone access (Chrome, Firefox, Edge, Safari)

## Running WallChat Locally

You need **both** the server and the client running at the same time.

### 1. Start the server

```bash
git clone https://github.com/nitish100000100-found/wallChat-server.git
cd wallChat-server
npm install
```

Create a `.env` file:

```env
PORT=3001
FRONTEND_URL=http://localhost:5173
```

Start it:

```bash
npm start
```

You should see:

```
Server running on http://localhost:3001
```

### 2. Start the client

In a separate terminal:

```bash
git clone https://github.com/nitish100000100-found/wallChat-client.git
cd wallChat-client
npm install
```

Create a `.env` file:

```env
VITE_BACKEND_URL=http://localhost:3001
```

Start it:

```bash
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`).

### 3. Try it out

- Open the client URL in two different browser tabs/windows (or two devices on the same network, pointed at the client's URL and using the server's local network IP for `VITE_BACKEND_URL`).
- Click **"Chat with Random People"** in both tabs — they'll be matched together automatically.
- Or, click **"Chat with Your Person"**, copy your socket ID from one tab, and paste it into the other to connect directly.
- Allow camera/microphone access when prompted, and you should see each other's video.

## Environment Variables Reference

| Variable | Used by | Description | Default |
|---|---|---|---|
| `PORT` | server | Port the signaling server listens on | `3001` |
| `FRONTEND_URL` | server | Allowed CORS origin — must match the client's URL | *(required)* |
| `VITE_BACKEND_URL` | client | URL of the signaling server the client connects to | `http://localhost:3001` |

## Repo-Specific Details

### `wallChat-client`

- **Pages:** `LandingPage` (choose random or personal chat), `Chat` (random matching + video), `PersonalRoom` (connect via socket ID + video), `Not-Found` (404).
- **Scripts:** `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`.
- Deploys as a static SPA — includes a `vercel.json` with rewrite rules for [Vercel](https://vercel.com/).
- Full details: see the client repo's README.

### `wallChat-server`

- **Core state:** an in-memory waiting queue (`waitingUsers`) for random matching, and a `Map` (`peers`) of currently paired socket IDs.
- **Random matching events:** `find-person` → `matched`, plus `offer` / `answer` / `ice-candidate` / `send-message` / `receive-message` / `end-call`.
- **Personal room events:** `connect-with-friend` → `friend-connected` / `friend-connect-error`, plus the parallel `yourfriend-offer` / `yourfriend-answer` / `yourfriend-ice-candidate` / `yourfriend-message` / `yourfriend-end-call`.
- **Script:** `npm start` runs `server.js`.
- Full details: see the server repo's README.

## Known Limitations

- Server state is **in-memory only** — restarting the server drops all active pairings, and it won't scale horizontally without an external store (e.g. Redis) or sticky sessions.
- No **TURN server** is configured, so WebRTC connections may fail behind strict NATs/firewalls. For production use, add TURN credentials to the client's `RTCPeerConnection` config.


## Deployment

- **Client:** build with `npm run build` and deploy the `dist/` folder to any static host (Vercel config included).
- **Server:** deploy to any Node.js host (Render, Railway, Fly.io, a VPS, etc.) and run `npm start`.
- Set `FRONTEND_URL` (server) and `VITE_BACKEND_URL` (client) to point at each other's **production** URLs before deploying.
