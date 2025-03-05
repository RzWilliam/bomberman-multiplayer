import React from "react";
import { Users, Play, Gamepad2 } from "lucide-react";

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
    <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-2xl w-full">
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column: Room Info and Players */}
        <div>
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

        {/* Right Column: How to Play */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Gamepad2 size={24} />
            <h2 className="text-xl font-bold">How to Play</h2>
          </div>
          
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-1">Controls:</h3>
              <ul className="space-y-1 text-gray-300">
                <li>↑ ↓ ← → - Move your character</li>
                <li>SPACE - Place bomb</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-1">Power-ups:</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex gap-2 items-center"><img className="w-6 h-6" src="/assets/powerup_bomb.png"/>Increase bombs capacity</li>
                <li className="flex gap-2 items-center"><img className="w-6 h-6" src="/assets/powerup_speed.png"/>Move faster</li>
                <li className="flex gap-2 items-center"><img className="w-6 h-6" src="/assets/powerup_power.png"/>Increase explosion range</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-1">Objective:</h3>
              <p className="text-gray-300">
                Be the last player standing! Use bombs to destroy boxes and defeat other players. 
                Collect power-ups to gain advantages.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">Tips:</h3>
              <ul className="space-y-1 text-gray-300">
                <li>Don't get caught in your own explosions!</li>
                <li>Use boxes as cover from explosions</li>
                <li>Try to trap other players with bombs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
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