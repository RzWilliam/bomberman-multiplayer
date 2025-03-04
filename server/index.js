import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { GameRoom } from '/GameRoom.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// Store active game rooms
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create a new room
  socket.on('createRoom', ({ playerId, playerName }) => {
    const roomId = generateRoomId();
    const player = {
      id: playerId,
      name: playerName,
      isHost: true,
      isReady: false
    };
    
    // Create a new game room
    const room = new GameRoom(roomId, io);
    room.addPlayer(player);
    rooms.set(roomId, room);
    
    // Join the socket to the room
    socket.join(roomId);
    
    // Notify the client
    socket.emit('roomJoined', {
      roomId,
      isHost: true,
      players: room.getPlayers()
    });
    
    console.log(`Room created: ${roomId} by ${playerName}`);
  });

  // Join an existing room
  socket.on('joinRoom', ({ roomId, playerId, playerName }) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    if (room.getPlayers().length >= 4) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }
    
    if (room.isGameStarted()) {
      socket.emit('error', { message: 'Game already in progress' });
      return;
    }
    
    const player = {
      id: playerId,
      name: playerName,
      isHost: false,
      isReady: false
    };
    
    room.addPlayer(player);
    
    // Join the socket to the room
    socket.join(roomId);
    
    // Notify the client
    socket.emit('roomJoined', {
      roomId,
      isHost: false,
      players: room.getPlayers()
    });
    
    // Notify other players in the room
    socket.to(roomId).emit('playerJoined', {
      players: room.getPlayers()
    });
    
    console.log(`Player ${playerName} joined room ${roomId}`);
  });

  // Leave a room
  socket.on('leaveRoom', ({ roomId, playerId }) => {
    const room = rooms.get(roomId);
    
    if (!room) return;
    
    const player = room.getPlayerById(playerId);
    if (!player) return;
    
    const wasHost = player.isHost;
    room.removePlayer(playerId);
    
    // Leave the socket room
    socket.leave(roomId);
    
    // If the room is now empty, delete it
    if (room.getPlayers().length === 0) {
      rooms.delete(roomId);
      console.log(`Room ${roomId} deleted (empty)`);
      return;
    }
    
    // If the host left, assign a new host
    if (wasHost) {
      room.assignNewHost();
    }
    
    // Notify other players in the room
    io.to(roomId).emit('playerLeft', {
      players: room.getPlayers()
    });
    
    console.log(`Player ${player.name} left room ${roomId}`);
  });

  // Start the game
  socket.on('startGame', ({ roomId }) => {
    const room = rooms.get(roomId);
    
    if (!room) return;
    
    if (room.getPlayers().length < 2) {
      socket.emit('error', { message: 'Need at least 2 players to start' });
      return;
    }
    
    room.startGame();
    
    // Notify all players in the room
    io.to(roomId).emit('gameStarted');
    
    console.log(`Game started in room ${roomId}`);
  });

  // Player is ready to receive game updates
  socket.on('playerReady', ({ roomId, playerId }) => {
    const room = rooms.get(roomId);
    
    if (!room) return;
    
    room.setPlayerReady(playerId);
    
    // If all players are ready, start sending game state
    if (room.areAllPlayersReady()) {
      room.initializeGame();
      
      // Send initial map to all players
      io.to(roomId).emit('mapUpdate', {
        map: room.getMap()
      });
      
      // Start game loop
      room.startGameLoop();
    }
  });

  // Player movement
  socket.on('playerMove', ({ roomId, playerId, dirX, dirY }) => {
    const room = rooms.get(roomId);
    
    if (!room || !room.isGameStarted()) return;
    
    room.movePlayer(playerId, dirX, dirY);
  });

  // Place bomb
  socket.on('placeBomb', ({ roomId, playerId }) => {
    const room = rooms.get(roomId);
    
    if (!room || !room.isGameStarted()) return;
    
    room.placeBomb(playerId);
  });

  // Collect power-up
  socket.on('collectPowerUp', ({ roomId, playerId, powerUpId }) => {
    const room = rooms.get(roomId);
    
    if (!room || !room.isGameStarted()) return;
    
    room.collectPowerUp(playerId, powerUpId);
  });

  // Restart game
  socket.on('restartGame', ({ roomId }) => {
    const room = rooms.get(roomId);
    
    if (!room) return;
    
    room.resetGame();
    
    // Notify all players in the room
    io.to(roomId).emit('gameReset');
    
    console.log(`Game reset in room ${roomId}`);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Find and leave all rooms this socket was in
    rooms.forEach((room, roomId) => {
      const player = room.getPlayerBySocketId(socket.id);
      
      if (player) {
        const wasHost = player.isHost;
        room.removePlayer(player.id);
        
        // If the room is now empty, delete it
        if (room.getPlayers().length === 0) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty after disconnect)`);
          return;
        }
        
        // If the host left, assign a new host
        if (wasHost) {
          room.assignNewHost();
        }
        
        // Notify other players in the room
        io.to(roomId).emit('playerLeft', {
          players: room.getPlayers()
        });
        
        console.log(`Player ${player.name} disconnected from room ${roomId}`);
      }
    });
  });
});

// Generate a 6-character room ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});