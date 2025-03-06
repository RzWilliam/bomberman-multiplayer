import { useEffect, useState } from "react";
import { BombIcon, X } from "lucide-react";
import Game from "./components/Game";
import LobbyScreen from "./components/LobbyScreen";
import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

enum GameState {
  MENU,
  LOBBY,
  PLAYING,
  GAME_OVER,
}

function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string>("");
  const [playerId, setPlayerId] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");
  const [isHost, setIsHost] = useState<boolean>(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);

  useEffect(() => {
    const id = uuidv4();
    setPlayerId(id);

    const socketConnection = io(import.meta.env.VITE_SOCKET_URL);
    setSocket(socketConnection);

    socketConnection.on("connect", () => {
      console.log("Connected to server");
    });

    socketConnection.on("roomJoined", (data) => {
      setRoomId(data.roomId);
      setIsHost(data.isHost);
      setPlayers(data.players);
      setGameState(GameState.LOBBY);
      setShowJoinModal(false);
    });

    socketConnection.on("playerJoined", (data) => {
      setPlayers(data.players);
    });

    socketConnection.on("playerLeft", (data) => {
      setPlayers(data.players);
    });

    socketConnection.on("gameStarted", () => {
      setGameState(GameState.PLAYING);
    });

    socketConnection.on("gameOver", (data) => {
      setWinner(data.winner);
      setTimeout(() => {
        setGameState(GameState.GAME_OVER);
      }, 3000);
    });

    socketConnection.on("error", (data) => {
      alert(data.message);
    });

    return () => {
      socketConnection.disconnect();
    };
  }, []);

  const createRoom = () => {
    if (socket && playerName.trim()) {
      socket.emit("createRoom", { playerId, playerName });
    }
  };

  const joinRoom = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (socket && roomId && playerName.trim()) {
      socket.emit("joinRoom", { roomId, playerId, playerName });
    }
  };

  const startGame = () => {
    if (socket && isHost) {
      socket.emit("startGame", { roomId });
    }
  };

  const playAgain = () => {
    if (socket && isHost) {
      socket.emit("restartGame", { roomId });
      setGameState(GameState.LOBBY);
      setWinner(null);
    }
  };

  const leaveRoom = () => {
    if (socket) {
      socket.emit("leaveRoom", { roomId, playerId });
      setGameState(GameState.MENU);
      setRoomId("");
      setIsHost(false);
      setPlayers([]);
    }
  };

  const openJoinModal = () => {
    setShowJoinModal(true);
  };

  const closeJoinModal = () => {
    setShowJoinModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
      {gameState === GameState.MENU && (
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="flex items-center justify-center mb-6">
            <img src="/icon.png" alt="Logo Bomberman" className="w-12 mr-4" />
            <h1 className="text-3xl font-bold">Bomberman</h1>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Your Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded text-white"
              placeholder="Enter your name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={createRoom}
              disabled={!playerName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed p-3 rounded font-medium transition-all"
            >
              Create Room
            </button>

            <button
              onClick={openJoinModal}
              disabled={!playerName.trim()}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed p-3 rounded font-medium transition-all"
            >
              Join Room
            </button>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Join Room</h2>
              <button
                onClick={closeJoinModal}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={joinRoom}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Room ID
                </label>
                <input
                  type="text"
                  value={roomId}
                  required
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  className="w-full p-2 bg-gray-700 rounded text-white"
                  placeholder="Enter room ID"
                />
              </div>

              <button
                type="submit"
                disabled={!roomId || !playerName.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed p-3 rounded font-medium transition-all"
              >
                Join Game
              </button>
            </form>
          </div>
        </div>
      )}

      {gameState === GameState.LOBBY && (
        <LobbyScreen
          roomId={roomId}
          players={players}
          isHost={isHost}
          onStartGame={startGame}
          onLeaveRoom={leaveRoom}
        />
      )}

      {gameState === GameState.PLAYING && socket && (
        <Game socket={socket} roomId={roomId} playerId={playerId} />
      )}

      {gameState === GameState.GAME_OVER && (
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <h1 className="text-3xl font-bold mb-4">Game Over</h1>
          <p className="text-xl mb-6">{winner} wins!</p>

          {isHost ? (
            <button
              onClick={playAgain}
              className="bg-blue-600 hover:bg-blue-700 p-3 rounded font-medium transition-all mr-2"
            >
              Play Again
            </button>
          ) : (
            <p className="text-gray-400 mb-4">Waiting for host to restart...</p>
          )}

          <button
            onClick={leaveRoom}
            className="bg-red-600 hover:bg-red-700 p-3 rounded font-medium mt-4 transition-all"
          >
            Leave Room
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
