import React from "react";
import { Users, Play } from "lucide-react";

interface LobbyScreenProps {
  roomId: string;
  players: any[];
  isHost: boolean;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

const LobbyScreen: React.FC<LobbyScreenProps> = ({
  roomId,
  players,
  isHost,
  onStartGame,
  onLeaveRoom,
}) => {
  const canStartGame = players.length >= 2;

  return (
    <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Game Lobby</h1>
        <div className="flex items-center">
          <Users size={20} className="mr-1" />
          <span>{players.length}/4</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Room ID:</span>
          <div className="flex items-center">
            <span className="bg-gray-700 px-2 py-1 rounded text-sm">
              {roomId}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(roomId)}
              className="ml-2 text-xs bg-gray-700 p-1 rounded hover:bg-gray-600"
            >
              Copy
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-medium mb-2">Players:</h2>
        <ul className="bg-gray-700 rounded divide-y divide-gray-600">
          {players.map((player, index) => (
            <li key={player.id} className="p-3 flex items-center">
              <div
                className={`w-3 h-3 rounded-full mr-3 ${getPlayerColor(index)}`}
              ></div>
              <span>{player.name}</span>
              {player.isHost && (
                <span className="ml-2 text-xs bg-blue-600 px-2 py-0.5 rounded">
                  Host
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onLeaveRoom}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-medium"
        >
          Leave
        </button>

        {isHost && (
          <button
            onClick={onStartGame}
            disabled={!canStartGame}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded font-medium flex items-center"
          >
            <Play size={16} className="mr-1" />
            Start Game
          </button>
        )}
      </div>

      {isHost && !canStartGame && (
        <p className="text-yellow-400 text-sm mt-2 text-center">
          Need at least 2 players to start
        </p>
      )}
    </div>
  );
};

function getPlayerColor(index: number): string {
  const colors = [
    "bg-blue-500", // Player 1
    "bg-red-500", // Player 2
    "bg-green-500", // Player 3
    "bg-yellow-500", // Player 4
  ];
  return colors[index % colors.length];
}

export default LobbyScreen;
