<p align="center">
	<img src="public/icon.png" alt="Bomberman Multiplayer" width="140" />
</p>

<br>

---

# Bomberman — Multiplayer

>A small multiplayer Bomberman-like game built with React, Phaser and Socket.io.

## Quick demo

Open the app locally (see instructions below) and create or join a room to play with friends on the same network.

## Requirements

- Node.js (recommended 18+)
- npm (or a compatible package manager)

## Install

Clone the repo and install dependencies:

```bash
git clone https://github.com/RzWilliam/bomberman-multiplayer.git
cd bomberman-multiplayer
npm install
```

## Run (development)

- Start the frontend dev server:

```bash
npm run dev
```

- Start only the backend server:

```bash
npm run server
```

- Start both the frontend and backend together (uses concurrently):

```bash
npm run start
```

## Build & Preview

Build a production bundle for the client:

```bash
npm run build
```

Preview the built client locally:

```bash
npm run preview
```

## Project structure

- public/
	- assets/ (game sprites and icons)
	- icon.png (project logo used in README)
- server/
	- index.js (Express + Socket.io server entry)
	- GameRoom.js (server game room logic)
- src/
	- components/ (React UI components: Lobby, Game, etc.)
	- game/ (Phaser scenes and entities)
	- main.tsx (React entry)

## How to play locally

1. Start the server (`npm run server`) or run both with `npm run start`.
2. Open the frontend (usually at http://localhost:5173) in multiple browser windows or on different devices on the same network.
3. Create a room, share the room ID, and have others join to start playing.

## Notes

- This project is an experimental/demo implementation. Expect rough edges.