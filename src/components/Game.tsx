import React, { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { Socket } from "socket.io-client";
import { BootScene } from "../game/scenes/BootScene";
import { GameScene } from "../game/scenes/GameScene";

interface PowerUpCounts {
  bomb: number;
  speed: number;
  power: number;
}

interface GameProps {
  socket: Socket;
  roomId: string;
  playerId: string;
}

const Game: React.FC<GameProps> = ({ socket, roomId, playerId }) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);
  const [powerUpCounts, setPowerUpCounts] = useState<PowerUpCounts>({
    bomb: 0,
    speed: 0,
    power: 0,
  });

  useEffect(() => {
    const handlePowerUpCollected = (data: any) => {
      if (data.playerId === playerId) {
        setPowerUpCounts((prev) => ({
          ...prev,
          [data.powerUpType]: prev[data.powerUpType as keyof PowerUpCounts] + 1,
        }));
      }
    };

    const handleGameReset = () => {
      setPowerUpCounts({
        bomb: 0,
        speed: 0,
        power: 0,
      });
    };

    socket.on("powerUpCollected", handlePowerUpCollected);
    socket.on("gameReset", handleGameReset);

    if (gameRef.current && !gameInstance.current) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 600,
        height: 600,
        parent: gameRef.current,
        physics: {
          default: "arcade",
          arcade: {
            gravity: { y: 0 },
            debug: false,
          },
        },
        scene: [BootScene, GameScene],
        scale: {
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      };

      gameInstance.current = new Phaser.Game(config);
      gameInstance.current.registry.set("socket", socket);
      gameInstance.current.registry.set("roomId", roomId);
      gameInstance.current.registry.set("playerId", playerId);
    }

    return () => {
      socket.off("powerUpCollected", handlePowerUpCollected);
      socket.off("gameReset", handleGameReset);

      if (gameInstance.current) {
        gameInstance.current.destroy(true);
        gameInstance.current = null;
      }
    };
  }, [socket, roomId, playerId]);

  return (
    <div className="flex flex-col items-center">
      <div className="bg-gray-800 p-4 rounded-lg mb-4 flex gap-6">
        <div className="flex items-center gap-2">
          <img src="/assets/powerup_bomb.png" alt="Bomb" className="w-6 h-6" />
          <span className="text-white">×{powerUpCounts.bomb + 1}</span>
        </div>
        <div className="flex items-center gap-2">
          <img
            src="/assets/powerup_speed.png"
            alt="Speed"
            className="w-6 h-6"
          />
          <span className="text-white">×{powerUpCounts.speed}</span>
        </div>
        <div className="flex items-center gap-2">
          <img
            src="/assets/powerup_power.png"
            alt="Power"
            className="w-6 h-6"
          />
          <span className="text-white">×{powerUpCounts.power + 1}</span>
        </div>
      </div>
      <div ref={gameRef} className="rounded-lg overflow-hidden shadow-lg"></div>
    </div>
  );
};

export default Game;
